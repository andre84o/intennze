import "server-only";
import { getEffectiveActor, type EffectiveActor } from "@/lib/auth/customerView";
import type { ServiceResult } from "@/lib/domains/service";
import {
  calculateDomainCustomerPrice,
  isCalculationType,
  isDomainOperation,
  resolveDomainPricingRule,
  toCustomerPrice,
  type CalculationType,
  type DomainOperation,
  type DomainPricingRuleConfig,
} from "@/lib/domains/pricing-engine";
import { computeVatSplit, providerMajorToMinor, type VatSplit } from "@/lib/domains/money";
import { bumpPricingRulesVersion, cachedPricingRules } from "@/lib/domains/pricing-cache";
import { getDomainProduct, isHostupConfigured, listDomainProducts } from "@/lib/hostup/client";
import { HostupError } from "@/lib/hostup/types";
import {
  parseTldSelection,
  type TldSelection,
} from "@/lib/domains/pricing-rules-selection";

/**
 * Server-side domain pricing service. Loads admin rule CONFIG (never provider
 * price) through the SECURITY DEFINER RPC, runs the pure engine, splits VAT, and
 * maps to a customer-safe result. Admin CRUD + preview go through SECURITY
 * DEFINER RPCs and are audited in the DB.
 */

function fail(error: string, status: number): { ok: false; error: string; status: number } {
  return { ok: false, error, status };
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

type RuleRow = {
  id: string;
  tld: string | null;
  operation: string;
  calculation_type: string;
  fixed_customer_price_minor: number | string | null;
  fixed_price_years: number | string | null;
  markup_fixed_minor: number | string | null;
  markup_percentage_basis_points: number | string | null;
  minimum_customer_price_minor: number | string | null;
  currency_code: string;
  applies_to_premium: boolean;
};

function toRuleConfig(r: RuleRow): DomainPricingRuleConfig | null {
  if (!isDomainOperation(r.operation) || !isCalculationType(r.calculation_type)) return null;
  return {
    id: r.id,
    tld: r.tld,
    operation: r.operation,
    currencyCode: r.currency_code,
    calculationType: r.calculation_type,
    appliesToPremium: r.applies_to_premium,
    fixedCustomerPriceMinor: num(r.fixed_customer_price_minor),
    fixedPriceYears: num(r.fixed_price_years),
    markupFixedMinor: num(r.markup_fixed_minor),
    markupPercentageBasisPoints: num(r.markup_percentage_basis_points),
    minimumCustomerPriceMinor: num(r.minimum_customer_price_minor),
  };
}

/** Load every active rule for a currency (config only). Cached (browsing only). */
export async function loadActiveRules(
  actor: EffectiveActor,
  currency: string
): Promise<DomainPricingRuleConfig[]> {
  const cur = (currency || "SEK").toUpperCase();
  return cachedPricingRules(cur, async () => {
    const { data, error } = await actor.supabase.rpc("get_active_domain_pricing_rules", {
      p_currency: cur,
    });
    if (error) {
      console.error("[pricing.loadActiveRules]", error.message);
      return [];
    }
    return ((data ?? []) as RuleRow[]).map(toRuleConfig).filter((r): r is DomainPricingRuleConfig => r !== null);
  });
}

// ── customer-facing price (net + vat + gross, never provider/margin) ──────────
export type CustomerPriceView = {
  priceConfigured: boolean;
  premiumRequiresManualPrice: boolean;
  net: VatSplit | null; // net/vat/gross for the operation
  currencyCode: string;
  years: number;
};

export type CustomerDomainPricing = {
  currencyCode: string;
  premium: boolean;
  requiresRegistrarFeeAcceptance: boolean;
  registration: CustomerPriceView;
  renewal: CustomerPriceView;
  /** Rules are stored ex-VAT; the customer UI shows net and computed gross. */
  vatIncludedInStored: false;
};

function priceView(
  rules: DomainPricingRuleConfig[],
  args: {
    tld: string;
    operation: DomainOperation;
    years: number;
    providerAmountMinor: number | null;
    premiumProviderAmountMinor: number | null;
    currency: string;
    premium: boolean;
  }
): CustomerPriceView {
  const candidates = rules.filter((r) => r.appliesToPremium === args.premium);
  const rule = resolveDomainPricingRule(candidates, args.tld, args.operation);
  const res = calculateDomainCustomerPrice({
    tld: args.tld,
    operation: args.operation,
    years: args.years,
    providerAmountMinor: args.providerAmountMinor,
    premiumProviderAmountMinor: args.premiumProviderAmountMinor,
    currencyCode: args.currency,
    premium: args.premium,
    rule,
  });

  if (!res.ok) {
    // Engine validation failure (e.g. currency mismatch, unsupported fixed period)
    // is treated as "not configured" for the customer — never an error, never a price.
    return {
      priceConfigured: false,
      premiumRequiresManualPrice: args.premium,
      net: null,
      currencyCode: args.currency,
      years: args.years,
    };
  }
  const safe = toCustomerPrice(res.value);
  return {
    priceConfigured: safe.priceConfigured,
    premiumRequiresManualPrice: safe.premiumRequiresManualPrice,
    net: safe.customerAmountMinor == null ? null : computeVatSplit(safe.customerAmountMinor),
    currencyCode: safe.currencyCode,
    years: safe.years,
  };
}

/**
 * Compute the customer registration + renewal pricing for one availability
 * result. `rules` is the pre-loaded active rule set (load once per search).
 */
export function customerPricingFor(
  rules: DomainPricingRuleConfig[],
  args: {
    tld: string | null;
    years: number;
    currencyCode: string | null;
    premium: boolean;
    requiresRegistrarFeeAcceptance: boolean;
    providerRegistrationAmountMinor: number | null;
    providerRenewalAmountMinor: number | null;
    premiumProviderAmountMinor: number | null;
  }
): CustomerDomainPricing {
  const currency = (args.currencyCode || "SEK").toUpperCase();
  const tld = args.tld ?? "";
  const shared = {
    tld,
    years: args.years,
    currency,
    premium: args.premium,
  };
  return {
    currencyCode: currency,
    premium: args.premium,
    requiresRegistrarFeeAcceptance: args.requiresRegistrarFeeAcceptance,
    registration: priceView(rules, {
      ...shared,
      operation: "register",
      providerAmountMinor: args.providerRegistrationAmountMinor,
      premiumProviderAmountMinor: args.premiumProviderAmountMinor,
    }),
    renewal: priceView(rules, {
      ...shared,
      operation: "renew",
      providerAmountMinor: args.providerRenewalAmountMinor,
      premiumProviderAmountMinor: args.premiumProviderAmountMinor,
    }),
    vatIncludedInStored: false,
  };
}

// ── admin guard ───────────────────────────────────────────────────────────────
async function requireAdmin(): Promise<
  { ok: true; actor: EffectiveActor } | { ok: false; error: string; status: number }
> {
  const actor = await getEffectiveActor();
  if (!actor.realUserId) return { ok: false, error: "Not authenticated.", status: 401 };
  if (actor.realRole !== "admin") return { ok: false, error: "Forbidden.", status: 403 };
  return { ok: true, actor };
}

// ── admin: list rules (full config incl. margin knobs) ────────────────────────
export type AdminPricingRule = RuleRow & {
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listPricingRules(): Promise<ServiceResult<AdminPricingRule[]>> {
  const g = await requireAdmin();
  if (!g.ok) return fail(g.error, g.status);
  const { data, error } = await g.actor.supabase
    .from("domain_pricing_rules")
    .select(
      "id, tld, operation, calculation_type, fixed_customer_price_minor, fixed_price_years, markup_fixed_minor, markup_percentage_basis_points, minimum_customer_price_minor, currency_code, applies_to_premium, is_active, starts_at, ends_at, created_at, updated_at"
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[pricing.list]", error.message);
    return fail("Could not load pricing rules.", 500);
  }
  return { ok: true, data: (data ?? []) as AdminPricingRule[] };
}

// ── admin: input validation (separate create/update schemas, no mass-assign) ──
export type PricingRuleInput = {
  operation: DomainOperation;
  calculationType: CalculationType;
  tld?: string | null;
  fixedCustomerPriceMinor?: number | null;
  fixedPriceYears?: number | null;
  markupFixedMinor?: number | null;
  markupPercentageBasisPoints?: number | null;
  minimumCustomerPriceMinor?: number | null;
  currencyCode?: string | null;
  appliesToPremium?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

function nonNegIntOrNull(v: unknown): number | null | "invalid" {
  if (v == null) return null;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) return "invalid";
  return v;
}

function validateRuleShape(
  input: PricingRuleInput
): { ok: true } | { ok: false; error: string } {
  if (!isDomainOperation(input.operation)) return { ok: false, error: "Invalid operation." };
  if (!isCalculationType(input.calculationType)) return { ok: false, error: "Invalid calculation type." };
  for (const [k, v] of Object.entries({
    fixedCustomerPriceMinor: input.fixedCustomerPriceMinor,
    markupFixedMinor: input.markupFixedMinor,
    markupPercentageBasisPoints: input.markupPercentageBasisPoints,
    minimumCustomerPriceMinor: input.minimumCustomerPriceMinor,
  })) {
    if (nonNegIntOrNull(v) === "invalid") return { ok: false, error: `${k} must be a non-negative integer.` };
  }
  if (input.calculationType === "fixed" && nonNegIntOrNull(input.fixedCustomerPriceMinor) === null) {
    return { ok: false, error: "Fixed rule needs a fixed price." };
  }
  if (
    (input.calculationType === "percentage_markup" || input.calculationType === "fixed_and_percentage") &&
    nonNegIntOrNull(input.markupPercentageBasisPoints) === null
  ) {
    return { ok: false, error: "Percentage rule needs basis points." };
  }
  if (
    (input.calculationType === "fixed_markup" || input.calculationType === "fixed_and_percentage") &&
    nonNegIntOrNull(input.markupFixedMinor) === null
  ) {
    return { ok: false, error: "Fixed-markup rule needs a fixed markup." };
  }
  if (input.startsAt != null && input.endsAt != null && new Date(input.endsAt) <= new Date(input.startsAt)) {
    return { ok: false, error: "End date must be after the start date." };
  }
  return { ok: true };
}

function mapRpcError(error: { code?: string; message: string }): { error: string; status: number } {
  if (error.code === "23505") return { error: "An active rule already exists for this key.", status: 409 };
  if (error.code === "P0001") return { error: error.message, status: 400 };
  console.error("[pricing.rpc]", error.message);
  return { error: "Could not save the pricing rule.", status: 500 };
}

export async function createPricingRule(input: PricingRuleInput): Promise<ServiceResult<{ id: string }>> {
  const g = await requireAdmin();
  if (!g.ok) return fail(g.error, g.status);
  const v = validateRuleShape(input);
  if (!v.ok) return fail(v.error, 400);

  const { data, error } = await g.actor.supabase.rpc("create_domain_pricing_rule", {
    p_operation: input.operation,
    p_calculation_type: input.calculationType,
    p_tld: input.tld ?? null,
    p_fixed_customer_price_minor: input.fixedCustomerPriceMinor ?? null,
    p_fixed_price_years: input.fixedPriceYears ?? null,
    p_markup_fixed_minor: input.markupFixedMinor ?? null,
    p_markup_percentage_basis_points: input.markupPercentageBasisPoints ?? null,
    p_minimum_customer_price_minor: input.minimumCustomerPriceMinor ?? null,
    p_currency_code: (input.currencyCode ?? "SEK").toUpperCase(),
    p_applies_to_premium: input.appliesToPremium ?? false,
    p_starts_at: input.startsAt ?? null,
    p_ends_at: input.endsAt ?? null,
  });
  if (error) {
    const m = mapRpcError(error);
    return fail(m.error, m.status);
  }
  bumpPricingRulesVersion();
  return { ok: true, data: { id: data as string } };
}

export type PricingRuleUpdate = {
  calculationType: CalculationType;
  fixedCustomerPriceMinor?: number | null;
  fixedPriceYears?: number | null;
  markupFixedMinor?: number | null;
  markupPercentageBasisPoints?: number | null;
  minimumCustomerPriceMinor?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

export async function updatePricingRule(
  id: string,
  input: PricingRuleUpdate
): Promise<ServiceResult<{ id: string }>> {
  const g = await requireAdmin();
  if (!g.ok) return fail(g.error, g.status);
  if (typeof id !== "string" || id.length < 10) return fail("Invalid rule id.", 400);
  const v = validateRuleShape({ operation: "register", ...input });
  if (!v.ok) return fail(v.error, 400);

  const { error } = await g.actor.supabase.rpc("update_domain_pricing_rule", {
    p_id: id,
    p_calculation_type: input.calculationType,
    p_fixed_customer_price_minor: input.fixedCustomerPriceMinor ?? null,
    p_fixed_price_years: input.fixedPriceYears ?? null,
    p_markup_fixed_minor: input.markupFixedMinor ?? null,
    p_markup_percentage_basis_points: input.markupPercentageBasisPoints ?? null,
    p_minimum_customer_price_minor: input.minimumCustomerPriceMinor ?? null,
    p_starts_at: input.startsAt ?? null,
    p_ends_at: input.endsAt ?? null,
  });
  if (error) {
    const m = mapRpcError(error);
    return fail(m.error, m.status);
  }
  bumpPricingRulesVersion();
  return { ok: true, data: { id } };
}

export async function setPricingRuleActive(id: string, active: boolean): Promise<ServiceResult<{ id: string }>> {
  const g = await requireAdmin();
  if (!g.ok) return fail(g.error, g.status);
  if (typeof id !== "string" || id.length < 10) return fail("Invalid rule id.", 400);
  const { error } = await g.actor.supabase.rpc("set_domain_pricing_rule_active", {
    p_id: id,
    p_active: !!active,
  });
  if (error) {
    const m = mapRpcError(error);
    return fail(m.error, m.status);
  }
  bumpPricingRulesVersion();
  return { ok: true, data: { id } };
}

// ── admin: live preview (provider + margin allowed) ───────────────────────────
export type AdminPricePreview = {
  priceConfigured: boolean;
  premiumRequiresManualPrice: boolean;
  providerAmountMinor: number;
  customerNet: VatSplit | null;
  marginAmountMinor: number | null;
  marginBasisPoints: number | null;
  currencyCode: string;
  operation: DomainOperation;
  years: number;
};

/** Rule params shared by the manual and Hostup-backed admin previews. */
type AdminPreviewParams = {
  operation: DomainOperation;
  calculationType: CalculationType;
  tld?: string | null;
  years?: number;
  currencyCode?: string | null;
  premium?: boolean;
  appliesToPremium?: boolean;
  fixedCustomerPriceMinor?: number | null;
  fixedPriceYears?: number | null;
  markupFixedMinor?: number | null;
  markupPercentageBasisPoints?: number | null;
  minimumCustomerPriceMinor?: number | null;
};

/**
 * Core admin preview: run the SAME production engine on a KNOWN provider amount
 * and the entered rule params, mapping to the admin DTO (provider + margin).
 * Pure w.r.t. I/O — no auth, no audit. Callers gate + audit.
 */
function computeAdminPreview(
  providerAmountMinor: number,
  input: AdminPreviewParams
): { ok: true; data: AdminPricePreview } | { ok: false; error: string } {
  if (!isDomainOperation(input.operation)) return { ok: false, error: "Invalid operation." };
  if (!isCalculationType(input.calculationType)) return { ok: false, error: "Invalid calculation type." };
  const currency = (input.currencyCode ?? "SEK").toUpperCase();
  const years = Number.isInteger(input.years) && (input.years as number) >= 1 ? (input.years as number) : 1;
  const premium = !!input.premium;

  const rule: DomainPricingRuleConfig = {
    id: "preview",
    tld: input.tld ?? null,
    operation: input.operation,
    currencyCode: currency,
    calculationType: input.calculationType,
    appliesToPremium: input.appliesToPremium ?? false,
    fixedCustomerPriceMinor: input.fixedCustomerPriceMinor ?? null,
    fixedPriceYears: input.fixedPriceYears ?? null,
    markupFixedMinor: input.markupFixedMinor ?? null,
    markupPercentageBasisPoints: input.markupPercentageBasisPoints ?? null,
    minimumCustomerPriceMinor: input.minimumCustomerPriceMinor ?? null,
  };

  const res = calculateDomainCustomerPrice({
    tld: input.tld ?? "",
    operation: input.operation,
    years,
    providerAmountMinor,
    premiumProviderAmountMinor: providerAmountMinor,
    currencyCode: currency,
    premium,
    rule,
  });
  if (!res.ok) return { ok: false, error: res.error };

  const v = res.value;
  return {
    ok: true,
    data: {
      priceConfigured: v.priceConfigured,
      premiumRequiresManualPrice: v.premiumRequiresManualPrice,
      providerAmountMinor,
      customerNet: v.customerAmountMinor == null ? null : computeVatSplit(v.customerAmountMinor),
      marginAmountMinor: v.marginAmountMinor,
      marginBasisPoints: v.marginBasisPoints,
      currencyCode: currency,
      operation: v.operation,
      years: v.years,
    },
  };
}

async function auditPricePreview(
  actor: EffectiveActor,
  input: AdminPreviewParams,
  source: "manual" | "hostup"
): Promise<void> {
  try {
    await actor.supabase.rpc("log_hostup_event", {
      p_action: "DOMAIN_PRICE_PREVIEWED",
      p_domain_id: null,
      p_provider_domain_id: null,
      p_effective_user_id: actor.effectiveUserId,
      p_outcome: "success",
      p_metadata: {
        operation: input.operation,
        calculation_type: input.calculationType,
        tld: input.tld ?? null,
        source,
      },
    });
  } catch (e) {
    console.error("[pricing.preview.audit]", e instanceof Error ? e.message : "unknown");
  }
}

/**
 * Admin live preview from a MANUAL, hypothetical provider price. Kept for the
 * "advanced / test" section — the Hostup-backed preview is the default.
 * Audited as DOMAIN_PRICE_PREVIEWED (source: manual).
 */
export async function previewPricingForAdmin(
  input: AdminPreviewParams & { providerAmountMinor: number }
): Promise<ServiceResult<AdminPricePreview>> {
  const g = await requireAdmin();
  if (!g.ok) return fail(g.error, g.status);
  if (typeof input.providerAmountMinor !== "number" || !Number.isInteger(input.providerAmountMinor) || input.providerAmountMinor < 0) {
    return fail("Provider amount must be a non-negative integer (minor units).", 400);
  }
  const computed = computeAdminPreview(input.providerAmountMinor, input);
  if (!computed.ok) return fail(computed.error, 400);
  await auditPricePreview(g.actor, input, "manual");
  return { ok: true, data: computed.data };
}

// ── admin: LIVE Hostup pricing for a TLD (provider prices — admin page only) ───
export type HostupTldPricing = {
  tld: string;
  currencyCode: string | null;
  premium: boolean | null;
  registerMinor: number | null;
  renewMinor: number | null;
  transferMinor: number | null;
  transferAvailable: boolean;
};

export type AdminHostupPricePreview = {
  hostup: HostupTldPricing;
  /** Preview for the SELECTED operation. null when that operation has no Hostup price. */
  preview: AdminPricePreview | null;
  /** True when the selected operation's provider price is missing at the provider. */
  operationPriceUnavailable: boolean;
};

function moneyToMinor(m: { amount: number | null } | null): number | null {
  return m ? providerMajorToMinor(m.amount) : null;
}

/**
 * Fetch Hostup's CURRENT provider prices for a TLD (register / renew / transfer,
 * currency, premium) and compute the customer preview for the SELECTED operation
 * with the entered rule. Provider price + margin are returned — this is exposed
 * ONLY on /admin/domaner/priser (admin-gated). Audited as DOMAIN_PRICE_PREVIEWED.
 */
export async function previewPricingWithHostupForAdmin(
  input: AdminPreviewParams & { tld: string }
): Promise<ServiceResult<AdminHostupPricePreview>> {
  const g = await requireAdmin();
  if (!g.ok) return fail(g.error, g.status);
  if (!isDomainOperation(input.operation)) return fail("Invalid operation.", 400);
  if (!isCalculationType(input.calculationType)) return fail("Invalid calculation type.", 400);
  const tld = (input.tld ?? "").trim().toLowerCase().replace(/^\.+/, "");
  if (!/^[a-z0-9.-]{2,}$/.test(tld)) return fail("Ange en giltig TLD.", 400);
  if (!isHostupConfigured()) return fail("Leverantörstjänsten är inte konfigurerad.", 503);

  let product;
  try {
    product = await getDomainProduct(tld);
  } catch (err) {
    if (err instanceof HostupError && err.code === "NOT_FOUND") {
      return fail("TLD:n finns inte hos leverantören.", 404);
    }
    if (
      err instanceof HostupError &&
      (err.code === "TIMEOUT" || err.code === "NETWORK" || err.code === "SERVER_ERROR")
    ) {
      return fail("Leverantören är tillfälligt otillgänglig.", 502);
    }
    return fail("Kunde inte hämta pris från leverantören.", 502);
  }

  const registerMinor = moneyToMinor(product.providerRegister);
  const renewMinor = moneyToMinor(product.providerRenew);
  const transferMinor = moneyToMinor(product.providerTransfer);
  const currencyCode =
    product.providerRegister?.currencyCode ??
    product.providerRenew?.currencyCode ??
    product.providerTransfer?.currencyCode ??
    (input.currencyCode ?? "SEK").toUpperCase();

  const hostup: HostupTldPricing = {
    tld: product.tld.replace(/^\.+/, ""),
    currencyCode,
    premium: product.premium,
    registerMinor,
    renewMinor,
    transferMinor,
    transferAvailable: transferMinor != null,
  };

  const opAmount =
    input.operation === "register" ? registerMinor : input.operation === "renew" ? renewMinor : transferMinor;

  await auditPricePreview(g.actor, input, "hostup");

  if (opAmount == null) {
    // The provider does not price this operation for this TLD (e.g. no transfer).
    return { ok: true, data: { hostup, preview: null, operationPriceUnavailable: true } };
  }

  const computed = computeAdminPreview(opAmount, { ...input, currencyCode });
  if (!computed.ok) return fail(computed.error, 400);
  return { ok: true, data: { hostup, preview: computed.data, operationPriceUnavailable: false } };
}

// ── admin: list Hostup TLDs for the selector ─────────────────────────────────
/** TLD options for the pricing-rule selector (bare, lowercase). Empty if Hostup
 *  is unconfigured or unreachable — the UI still offers Alla + the pinned TLDs. */
export async function getTldOptionsForAdmin(): Promise<ServiceResult<string[]>> {
  const g = await requireAdmin();
  if (!g.ok) return fail(g.error, g.status);
  if (!isHostupConfigured()) return { ok: true, data: [] };
  try {
    const tlds = await listDomainProducts();
    const cleaned = Array.from(
      new Set(tlds.map((t) => t.trim().toLowerCase().replace(/^\.+/, "")).filter((t) => /^[a-z0-9.-]{2,}$/.test(t)))
    ).sort();
    return { ok: true, data: cleaned };
  } catch {
    return { ok: true, data: [] };
  }
}

// ── admin: create the SAME rule for many TLDs (or the Alla/null default) ───────
export type BulkCreateResult = {
  created: { tld: string | null; id: string }[];
  skipped: { tld: string | null; error: string }[];
};

/**
 * Create the same pricing rule for a validated TLD selection. "Alla" creates ONE
 * default rule (tld=null); specific TLDs create one rule EACH. Selection is
 * validated server-side (Alla-xor-specific, de-duped) — the frontend guard is not
 * trusted. The DB still enforces the one-active-rule-per-key + overlap
 * constraints, so a conflicting TLD/Alla is reported per row and skipped, never
 * duplicated.
 */
export async function createPricingRulesForTlds(
  input: Omit<PricingRuleInput, "tld"> & { selection: { all: boolean; tlds: string[] } }
): Promise<ServiceResult<BulkCreateResult>> {
  const g = await requireAdmin();
  if (!g.ok) return fail(g.error, g.status);

  const shape = validateRuleShape({ ...input, tld: null });
  if (!shape.ok) return fail(shape.error, 400);

  const parsed = parseTldSelection(input.selection ?? { all: false, tlds: [] });
  if (!parsed.ok) return fail(parsed.error, 400);
  const selection: TldSelection = parsed.selection;

  const targets: (string | null)[] = selection.scope === "all" ? [null] : selection.tlds;

  const created: { tld: string | null; id: string }[] = [];
  const skipped: { tld: string | null; error: string }[] = [];

  for (const tld of targets) {
    const res = await createPricingRule({ ...input, tld });
    if (res.ok) created.push({ tld, id: res.data.id });
    else skipped.push({ tld, error: res.error });
  }

  if (created.length === 0) {
    // Nothing created — surface the first reason (e.g. Alla already exists).
    return fail(skipped[0]?.error ?? "Ingen regel kunde skapas.", 409);
  }
  return { ok: true, data: { created, skipped } };
}
