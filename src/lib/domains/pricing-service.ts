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
import { computeVatSplit, type VatSplit } from "@/lib/domains/money";
import { bumpPricingRulesVersion, cachedPricingRules } from "@/lib/domains/pricing-cache";

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

/**
 * Admin live preview: hypothetical provider price → customer price + margin +
 * VAT, using the SAME engine as production. Uses the rule params entered in the
 * form (not necessarily persisted). Audited as DOMAIN_PRICE_PREVIEWED.
 */
export async function previewPricingForAdmin(input: {
  operation: DomainOperation;
  calculationType: CalculationType;
  tld?: string | null;
  years?: number;
  providerAmountMinor: number;
  currencyCode?: string | null;
  premium?: boolean;
  appliesToPremium?: boolean;
  fixedCustomerPriceMinor?: number | null;
  fixedPriceYears?: number | null;
  markupFixedMinor?: number | null;
  markupPercentageBasisPoints?: number | null;
  minimumCustomerPriceMinor?: number | null;
}): Promise<ServiceResult<AdminPricePreview>> {
  const g = await requireAdmin();
  if (!g.ok) return fail(g.error, g.status);
  if (!isDomainOperation(input.operation)) return fail("Invalid operation.", 400);
  if (!isCalculationType(input.calculationType)) return fail("Invalid calculation type.", 400);
  if (typeof input.providerAmountMinor !== "number" || !Number.isInteger(input.providerAmountMinor) || input.providerAmountMinor < 0) {
    return fail("Provider amount must be a non-negative integer (minor units).", 400);
  }
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
    providerAmountMinor: input.providerAmountMinor,
    premiumProviderAmountMinor: input.providerAmountMinor,
    currencyCode: currency,
    premium,
    rule,
  });
  if (!res.ok) return fail(res.error, 400);

  try {
    await g.actor.supabase.rpc("log_hostup_event", {
      p_action: "DOMAIN_PRICE_PREVIEWED",
      p_domain_id: null,
      p_provider_domain_id: null,
      p_effective_user_id: g.actor.effectiveUserId,
      p_outcome: "success",
      p_metadata: {
        operation: input.operation,
        calculation_type: input.calculationType,
        tld: input.tld ?? null,
      },
    });
  } catch (e) {
    console.error("[pricing.preview.audit]", e instanceof Error ? e.message : "unknown");
  }

  const v = res.value;
  return {
    ok: true,
    data: {
      priceConfigured: v.priceConfigured,
      premiumRequiresManualPrice: v.premiumRequiresManualPrice,
      providerAmountMinor: input.providerAmountMinor,
      customerNet: v.customerAmountMinor == null ? null : computeVatSplit(v.customerAmountMinor),
      marginAmountMinor: v.marginAmountMinor,
      marginBasisPoints: v.marginBasisPoints,
      currencyCode: currency,
      operation: v.operation,
      years: v.years,
    },
  };
}
