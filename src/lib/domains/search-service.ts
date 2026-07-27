import "server-only";
import { headers } from "next/headers";
import { getEffectiveActor, type EffectiveActor } from "@/lib/auth/customerView";
import type { ServiceResult } from "@/lib/domains/service";
import { normalizeDomainName } from "@/lib/domains/normalize";
import {
  checkBulkDomainAvailability,
  getDomainAvailabilityJob,
  isHostupConfigured,
  getHostupRateLimit,
  previewDomainOrder as clientPreviewDomainOrder,
  type OrderPreviewInput,
} from "@/lib/hostup/client";
import { HostupError } from "@/lib/hostup/types";
import type { DomainAvailability, OrderPreviewResult } from "@/lib/hostup/search-types";
import { nextBulkPollStep, requirementsForDisplay, type RequirementDisplay } from "@/lib/hostup/search-logic";
import {
  customerPricingFor,
  loadActiveRules,
  type CustomerDomainPricing,
} from "@/lib/domains/pricing-service";
import { providerMajorToMinor } from "@/lib/domains/money";
import type { DomainPricingRuleConfig } from "@/lib/domains/pricing-engine";
import { cached, searchCacheKey } from "@/lib/hostup/search-cache";
import { domainSearchIpLimiter, domainSearchUserLimiter, tryLimit, getClientIp } from "@/lib/ratelimit";
import { logCustomerEvent } from "@/lib/domains/customer-audit";

/**
 * Domain-search service (server-only). The Hostup API key never leaves the
 * server; a CUSTOMER response NEVER carries a provider (purchase) price — only a
 * computed sale price (currently `notConfigured` → "Pris kommer snart"). Admin
 * diagnostics expose provider data separately. Read-only: no order is created.
 */

const MAX_TLDS = 20;
const MAX_NAMES = 25;
const AVAILABILITY_TTL_MS = 60_000;

function fail(error: string, status: number): { ok: false; error: string; status: number } {
  return { ok: false, error, status };
}

const SLD_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

// Curated, ordered list of the popular extensions we offer. A search expands the
// name across this set; the extension the user actually typed is always pinned
// first. There is intentionally NO per-search extension filter — like other
// registrars, a name is expanded across a fixed popular set of what we sell.
const FEATURED_TLDS = [
  "se", "com", "nu", "online", "info", "shop", "store", "one", "tech",
  "net", "org", "eu", "io", "co", "site", "xyz", "me", "biz",
];

// Broader known-extension set used ONLY to reject a bare-extension query
// ("se", ".com"): a lone extension has no name to register, so it returns no
// results rather than expanding into nonsense.
const KNOWN_TLDS = new Set<string>([
  ...FEATURED_TLDS,
  "app", "dev", "cloud", "email", "live", "pro", "name", "tv", "cc", "blog",
  "de", "dk", "no", "fi", "uk", "fr", "es", "it", "nl", "link", "click",
  "design", "agency", "digital", "group", "world", "today", "life", "fun",
  "space", "website", "host", "press", "solutions", "art", "studio", "media",
]);

export type SearchInput = { query: string; tlds?: string[] };

/** SLD × the curated popular extensions, with `pinnedTld` (the one the user
 *  typed) first, deduped and capped. */
function expandAcrossFeaturedTlds(
  sld: string,
  pinnedTld: string | null
): { ok: true; names: string[]; truncated: boolean } | { ok: false; error: string } {
  const order: string[] = [];
  const push = (t: string) => {
    if (t && !order.includes(t)) order.push(t);
  };
  if (pinnedTld) push(pinnedTld);
  for (const t of FEATURED_TLDS) push(t);

  const capped = order.slice(0, MAX_TLDS);
  const names: string[] = [];
  const seen = new Set<string>();
  for (const tld of capped) {
    const n = normalizeDomainName(`${sld}.${tld}`);
    if (n.ok && !seen.has(n.name)) {
      seen.add(n.name);
      names.push(n.name);
    }
  }
  if (names.length === 0) return { ok: false, error: "No valid domains to check." };
  const limited = names.slice(0, MAX_NAMES);
  return {
    ok: true,
    names: limited,
    truncated: order.length > capped.length || names.length > limited.length,
  };
}

/**
 * Turn a query into concrete domain names to check.
 *  - keyword ("myntan")           → SLD × featured extensions
 *  - full domain ("myntan.com")   → same, but the typed extension is pinned first
 *  - bare extension ("se"/".com") → rejected (no name to register)
 * There is no per-search extension filter (`input.tlds` is accepted but ignored).
 */
export function buildCandidateNames(
  input: SearchInput
): { ok: true; names: string[]; truncated: boolean } | { ok: false; error: string } {
  const raw = (input?.query ?? "").trim();
  if (!raw) return { ok: false, error: "Enter a domain or keyword." };

  const lower = raw.toLowerCase();
  const core = lower.replace(/^\.+|\.+$/g, "");
  if (core === "") return { ok: false, error: "Enter a domain or keyword." };

  // No inner dot → either a keyword to expand, or a bare extension to reject.
  if (!core.includes(".")) {
    if (lower.startsWith(".") || KNOWN_TLDS.has(core)) {
      return { ok: false, error: "Skriv ett domännamn, t.ex. mittnamn eller mittnamn.se." };
    }
    if (!SLD_RE.test(core)) return { ok: false, error: "Ange ett giltigt domännamn eller sökord." };
    return expandAcrossFeaturedTlds(core, null);
  }

  // Has an extension → normalize, then expand the first label across the featured
  // set with the typed extension pinned first.
  const full = normalizeDomainName(lower);
  if (!full.ok) return { ok: false, error: "Ange ett giltigt domännamn." };
  const dot = full.name.indexOf(".");
  const sld = full.name.slice(0, dot);
  const tld = full.name.slice(dot + 1);
  if (!SLD_RE.test(sld)) {
    // Multi-label host (e.g. a subdomain) — just check the exact name.
    return { ok: true, names: [full.name], truncated: false };
  }
  return expandAcrossFeaturedTlds(sld, tld);
}

/** Reorder availability results to match our candidate order (the typed
 *  extension first, then the featured list). Hostup returns results in an
 *  arbitrary/queue-arrival order, so the UI relies on this for the "match on
 *  top" requirement. */
function orderByCandidates<T extends { name: string }>(results: T[], names: string[]): T[] {
  const rank = new Map(names.map((n, i) => [n.toLowerCase(), i]));
  return [...results].sort(
    (a, b) =>
      (rank.get(a.name.toLowerCase()) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b.name.toLowerCase()) ?? Number.MAX_SAFE_INTEGER)
  );
}

/** Run a bulk availability check, polling a queued job with a bounded loop. */
async function runAvailability(names: string[]): Promise<DomainAvailability[]> {
  const res = await checkBulkDomainAvailability(names);
  if (res.kind === "inline") return res.results;

  // Queued job → bounded poll (never infinite).
  const merged = new Map<string, DomainAvailability>();
  const started = Date.now();
  const ctx = { maxAttempts: 8, maxElapsedMs: 15_000, baseDelayMs: 500, capMs: 5_000 };
  for (let attempt = 0; ; attempt++) {
    let job;
    try {
      job = await getDomainAvailabilityJob(res.jobId);
    } catch (err) {
      if (err instanceof HostupError && (err.code === "TIMEOUT" || err.code === "SERVER_ERROR" || err.code === "NETWORK")) break;
      throw err;
    }
    for (const r of job.results) merged.set(r.name, r);
    const rl = getHostupRateLimit();
    const minDelayMs = rl?.remaining === 0 && rl.reset ? Math.max(0, Date.parse(rl.reset) - Date.now()) : undefined;
    const step = nextBulkPollStep(job.status, merged.size > 0, {
      attempt,
      elapsedMs: Date.now() - started,
      ...ctx,
      minDelayMs,
    });
    if (!step.shouldPoll) break;
    await new Promise((r2) => setTimeout(r2, step.delayMs));
  }
  return [...merged.values()];
}

// ── customer-facing result (NO provider price) ───────────────────────────────
export type CustomerDomainResult = {
  name: string;
  tld: string | null;
  state: DomainAvailability["state"];
  unknownReason: string | null;
  canRegister: boolean;
  registerReason: string | null;
  canTransfer: boolean;
  transferReason: string | null;
  premium: boolean | null;
  supportedRegisterYears: number[];
  supportedTransferYears: number[];
  requirements: RequirementDisplay[];
  // Customer sale pricing (net/vat/gross), NEVER a provider price or margin.
  pricing: CustomerDomainPricing;
};

/** Compute the customer sale price (net/vat/gross, with the configured markup)
 *  for one availability result. Shared by the customer search and the admin
 *  diagnostics (admin additionally sees the provider price alongside). */
function pricingForAvailability(
  a: DomainAvailability,
  rules: DomainPricingRuleConfig[]
): CustomerDomainPricing {
  const premium = a.premium ?? false;
  const providerReg = providerMajorToMinor(a.providerBilling?.amount ?? null);
  return customerPricingFor(rules, {
    tld: a.tld,
    years: 1,
    currencyCode: a.currencyCode ?? a.providerBilling?.currencyCode ?? null,
    premium,
    requiresRegistrarFeeAcceptance: a.requiresRegistrarFeeAcceptance ?? false,
    providerRegistrationAmountMinor: providerReg,
    providerRenewalAmountMinor: providerMajorToMinor(a.providerRenewalAmount),
    // For a premium domain the registration provider amount IS the premium price.
    premiumProviderAmountMinor: premium ? providerReg : null,
  });
}

/** Currency key used to bucket a result for its active pricing rules. */
function currencyKeyOf(a: DomainAvailability): string {
  return (a.currencyCode ?? a.providerBilling?.currencyCode ?? "SEK").toUpperCase();
}

function toCustomerResult(
  a: DomainAvailability,
  rules: DomainPricingRuleConfig[]
): CustomerDomainResult {
  const pricing = pricingForAvailability(a, rules);
  return {
    name: a.name,
    tld: a.tld,
    state: a.state,
    unknownReason: a.unknownReason,
    canRegister: a.actions.canRegister.allowed,
    registerReason: a.actions.canRegister.reason,
    canTransfer: a.actions.canTransfer.allowed,
    transferReason: a.actions.canTransfer.reason,
    premium: a.premium,
    supportedRegisterYears: a.supportedRegisterYears,
    supportedTransferYears: a.supportedTransferYears,
    requirements: requirementsForDisplay(a.registryRequirements, "register"),
    // Customer sale price only — provider amounts intentionally never included.
    pricing,
  };
}

async function gateActor(): Promise<
  | { ok: true; actor: EffectiveActor }
  | { ok: false; error: string; status: number }
> {
  const actor = await getEffectiveActor();
  if (!actor.realUserId) return fail("Not authenticated.", 401);
  // Customer OR an admin previewing a customer's portal. Staff/seller excluded.
  if (!actor.isCustomerView && actor.realRole !== "customer" && actor.realRole !== "admin") {
    return fail("Forbidden.", 403);
  }
  return { ok: true, actor };
}

async function rateLimited(actor: EffectiveActor): Promise<boolean> {
  const h = await headers();
  const ip = getClientIp(new Request("https://x", { headers: h }));
  const ipL = await tryLimit(domainSearchIpLimiter, `domain-search:${ip}`);
  if (ipL && !ipL.success) return true;
  if (actor.realUserId) {
    const uL = await tryLimit(domainSearchUserLimiter, `domain-search:u:${actor.realUserId}`);
    if (uL && !uL.success) return true;
  }
  return false;
}

async function audit(
  actor: EffectiveActor,
  action: string,
  outcome: "success" | "error",
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await actor.supabase.rpc("log_hostup_event", {
      p_action: action,
      p_domain_id: null,
      p_provider_domain_id: null,
      p_effective_user_id: actor.effectiveUserId,
      p_outcome: outcome,
      p_metadata: metadata,
    });
  } catch (err) {
    console.error("[domain-search.audit]", action, err instanceof Error ? err.message : "unknown");
  }
}

/** CUSTOMER-facing search. Returns availability + sale price (never provider price). */
export async function searchDomainsForCustomer(
  input: SearchInput
): Promise<ServiceResult<{ results: CustomerDomainResult[]; truncated: boolean }>> {
  const gate = await gateActor();
  if (!gate.ok) return fail(gate.error, gate.status);
  if (!isHostupConfigured()) return fail("Domain search is not configured.", 503);

  const built = buildCandidateNames(input);
  if (!built.ok) return fail(built.error, 400);

  if (await rateLimited(gate.actor)) return fail("Too many searches. Please wait a moment.", 429);

  const key = searchCacheKey(["cust", ...built.names]);
  try {
    const availability = orderByCandidates(
      await cached(key, AVAILABILITY_TTL_MS, () => runAvailability(built.names)),
      built.names
    );

    // Load active pricing rules once per distinct currency (config only, no
    // provider price), then resolve per result in-memory.
    const currencies = new Set(
      availability.map((a) => (a.currencyCode ?? a.providerBilling?.currencyCode ?? "SEK").toUpperCase())
    );
    const rulesByCurrency = new Map<string, DomainPricingRuleConfig[]>();
    for (const cur of currencies) {
      rulesByCurrency.set(cur, await loadActiveRules(gate.actor, cur));
    }
    const results = availability.map((a) =>
      toCustomerResult(
        a,
        rulesByCurrency.get((a.currencyCode ?? a.providerBilling?.currencyCode ?? "SEK").toUpperCase()) ?? []
      )
    );
    const bulk = built.names.length > 1;
    // Customer-callable audit (works for a real customer AND admin-in-view);
    // log_hostup_event silently no-ops for a real customer session.
    await logCustomerEvent(gate.actor, "CUSTOMER_DOMAIN_SEARCH_VIEWED", {
      metadata: {
        domain_count: built.names.length,
        result_count: results.length,
        bulk,
        truncated: built.truncated,
      },
    });
    return { ok: true, data: { results, truncated: built.truncated } };
  } catch (err) {
    await logCustomerEvent(gate.actor, "CUSTOMER_DOMAIN_SEARCH_VIEWED", {
      outcome: "error",
      metadata: { domain_count: built.names.length },
    });
    if (err instanceof HostupError && err.code === "RATE_LIMITED") {
      return fail("The registry is busy. Please try again shortly.", 429);
    }
    return fail("Could not check availability. Please try again.", 502);
  }
}

// ── ADMIN diagnostics (provider price + raw state allowed) ───────────────────
/** Raw availability PLUS the computed customer sale price (net/vat/gross with
 *  the configured markup). Admin-only, so provider price + customer price may
 *  both be shown. */
export type AdminDomainResult = DomainAvailability & { pricing: CustomerDomainPricing };

export type AdminAvailabilityDiagnostics = {
  results: AdminDomainResult[];
  rateLimit: ReturnType<typeof getHostupRateLimit>;
};

export async function searchDomainsForAdmin(
  input: SearchInput
): Promise<ServiceResult<AdminAvailabilityDiagnostics>> {
  const actor = await getEffectiveActor();
  if (!actor.realUserId) return fail("Not authenticated.", 401);
  if (actor.realRole !== "admin") return fail("Forbidden.", 403);
  if (!isHostupConfigured()) return fail("Domain search is not configured.", 503);

  const built = buildCandidateNames(input);
  if (!built.ok) return fail(built.error, 400);
  if (await rateLimited(actor)) return fail("Too many searches. Please wait a moment.", 429);

  try {
    const availability = orderByCandidates(await runAvailability(built.names), built.names);

    // Load active pricing rules once per distinct currency, then compute the
    // customer sale price (with the configured markup) for each result.
    const rulesByCurrency = new Map<string, DomainPricingRuleConfig[]>();
    for (const cur of new Set(availability.map(currencyKeyOf))) {
      rulesByCurrency.set(cur, await loadActiveRules(actor, cur));
    }
    const results: AdminDomainResult[] = availability.map((a) => ({
      ...a,
      pricing: pricingForAvailability(a, rulesByCurrency.get(currencyKeyOf(a)) ?? []),
    }));

    await audit(actor, "DOMAIN_AVAILABILITY_CHECKED", "success", { domain_count: built.names.length, admin: true });
    return { ok: true, data: { results, rateLimit: getHostupRateLimit() } };
  } catch (err) {
    await audit(actor, "HOSTUP_AVAILABILITY_FAILED", "error", { domain_count: built.names.length });
    if (err instanceof HostupError && err.code === "RATE_LIMITED") return fail("Registry busy. Try again shortly.", 429);
    return fail("Could not check availability.", 502);
  }
}

/** ADMIN order preview (dry-run quote; creates nothing). Provider amounts shown. */
export async function previewOrderForAdmin(
  input: OrderPreviewInput
): Promise<ServiceResult<OrderPreviewResult>> {
  const actor = await getEffectiveActor();
  if (!actor.realUserId) return fail("Not authenticated.", 401);
  if (actor.realRole !== "admin") return fail("Forbidden.", 403);
  if (actor.isCustomerView) return fail("Customer-view cannot run order previews.", 403);
  if (!isHostupConfigured()) return fail("Domain search is not configured.", 503);

  if (!Array.isArray(input?.items) || input.items.length === 0 || input.items.length > 10) {
    return fail("Invalid preview request.", 400);
  }
  for (const it of input.items) {
    const n = normalizeDomainName(it?.domainName);
    if (!n.ok) return fail("Invalid domain name in preview.", 400);
    if (it.action !== "register" && it.action !== "transfer") return fail("Invalid action.", 400);
    if (!Number.isInteger(it.years) || it.years < 1 || it.years > 10) return fail("Invalid period.", 400);
  }

  try {
    const preview = await clientPreviewDomainOrder(input);
    await audit(actor, "DOMAIN_ORDER_PREVIEWED", "success", {
      item_count: preview.items.length,
      creates_nothing: preview.createsNothing,
    });
    return { ok: true, data: preview };
  } catch (err) {
    await audit(actor, "HOSTUP_ORDER_PREVIEW_FAILED", "error", { item_count: input.items.length });
    if (err instanceof HostupError && err.code === "RATE_LIMITED") return fail("Registry busy. Try again shortly.", 429);
    return fail("Could not preview the order.", 502);
  }
}
