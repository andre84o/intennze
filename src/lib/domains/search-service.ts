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
import { providerQuoteFrom, quoteForCustomer, type CustomerPrice } from "@/lib/pricing";
import { cached, searchCacheKey } from "@/lib/hostup/search-cache";
import { domainSearchIpLimiter, domainSearchUserLimiter, tryLimit, getClientIp } from "@/lib/ratelimit";

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

export type SearchInput = { query: string; tlds?: string[] };

/** Turn {query, tlds} into concrete domain names (full domain, or SLD × TLDs). */
export function buildCandidateNames(
  input: SearchInput
): { ok: true; names: string[]; truncated: boolean } | { ok: false; error: string } {
  const raw = (input?.query ?? "").trim();
  if (!raw) return { ok: false, error: "Enter a domain or keyword." };

  const full = normalizeDomainName(raw);
  if (full.ok) return { ok: true, names: [full.name], truncated: false };

  // Treat as a keyword/SLD combined with the selected TLDs.
  const sld = raw.toLowerCase().replace(/^\.+|\.+$/g, "");
  if (!SLD_RE.test(sld)) return { ok: false, error: "Enter a valid domain or keyword." };

  const tldsIn = Array.isArray(input.tlds) ? input.tlds : [];
  const tlds = Array.from(
    new Set(tldsIn.map((t) => t.trim().toLowerCase().replace(/^\.+/, "")).filter((t) => /^[a-z0-9.-]{2,}$/.test(t)))
  );
  if (tlds.length === 0) return { ok: false, error: "Select at least one extension." };

  const truncated = tlds.length > MAX_TLDS;
  const names: string[] = [];
  for (const tld of tlds.slice(0, MAX_TLDS)) {
    const n = normalizeDomainName(`${sld}.${tld}`);
    if (n.ok) names.push(n.name);
  }
  if (names.length === 0) return { ok: false, error: "No valid domains to check." };
  return { ok: true, names: names.slice(0, MAX_NAMES), truncated };
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
  price: CustomerPrice;
};

function toCustomerResult(a: DomainAvailability): CustomerDomainResult {
  const providerQuote = providerQuoteFrom({
    registrationAmount: a.providerBilling?.amount ?? null,
    renewalAmount: a.providerRenewalAmount,
    currencyCode: a.currencyCode ?? a.providerBilling?.currencyCode ?? null,
    billingCycle: null,
    premium: a.premium,
    requiresRegistrarFeeAcceptance: a.requiresRegistrarFeeAcceptance,
  });
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
    // Sale price only — provider amounts intentionally never included.
    price: quoteForCustomer(a.tld ?? "", providerQuote),
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
    const availability = await cached(key, AVAILABILITY_TTL_MS, () => runAvailability(built.names));
    const results = availability.map(toCustomerResult);
    const bulk = built.names.length > 1;
    await audit(gate.actor, bulk ? "DOMAIN_BULK_AVAILABILITY_CHECKED" : "DOMAIN_AVAILABILITY_CHECKED", "success", {
      domain_count: built.names.length,
      result_count: results.length,
      truncated: built.truncated,
    });
    return { ok: true, data: { results, truncated: built.truncated } };
  } catch (err) {
    await audit(gate.actor, "HOSTUP_AVAILABILITY_FAILED", "error", { domain_count: built.names.length });
    if (err instanceof HostupError && err.code === "RATE_LIMITED") {
      return fail("The registry is busy. Please try again shortly.", 429);
    }
    return fail("Could not check availability. Please try again.", 502);
  }
}

// ── ADMIN diagnostics (provider price + raw state allowed) ───────────────────
export type AdminAvailabilityDiagnostics = {
  results: DomainAvailability[];
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
    const results = await runAvailability(built.names);
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
