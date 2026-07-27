/**
 * Domain pricing ENGINE — pure, deterministic, integer minor units (öre).
 *
 * Turns a Hostup PROVIDER amount into an Intennze CUSTOMER sale price via an
 * already-resolved admin rule. This is the ONE place markup math lives (no
 * duplicate price logic anywhere). It never throws across the boundary
 * (Validated result), never mutates global state, and never lets a provider
 * amount or margin escape into a customer DTO (see toCustomerPrice).
 *
 * Money: all *Minor are integers in the currency minor unit. Rounding is half-up
 * (Math.round) applied ONCE to the percentage term, before the minimum-price
 * clamp. VAT is handled separately (see money.ts) — the engine returns NET.
 */

export const DOMAIN_OPERATIONS = ["register", "renew", "transfer"] as const;
export type DomainOperation = (typeof DOMAIN_OPERATIONS)[number];
const OPERATION_SET = new Set<string>(DOMAIN_OPERATIONS);
export function isDomainOperation(v: unknown): v is DomainOperation {
  return typeof v === "string" && OPERATION_SET.has(v);
}

export const CALCULATION_TYPES = [
  "fixed",
  "fixed_markup",
  "percentage_markup",
  "fixed_and_percentage",
] as const;
export type CalculationType = (typeof CALCULATION_TYPES)[number];
const CALC_SET = new Set<string>(CALCULATION_TYPES);
export function isCalculationType(v: unknown): v is CalculationType {
  return typeof v === "string" && CALC_SET.has(v);
}

/** An already-resolved pricing rule (selection/priority is a separate concern). */
export type DomainPricingRuleConfig = {
  id: string;
  tld: string | null; // null = default rule for the operation
  operation: DomainOperation;
  currencyCode: string;
  calculationType: CalculationType;
  appliesToPremium: boolean;
  fixedCustomerPriceMinor?: number | null;
  fixedPriceYears?: number | null; // years a FIXED price covers (default 1)
  markupFixedMinor?: number | null;
  markupPercentageBasisPoints?: number | null;
  minimumCustomerPriceMinor?: number | null;
};

export type CalculateInput = {
  tld: string;
  operation: DomainOperation;
  years: number;
  providerAmountMinor: number | null;
  currencyCode: string;
  premium: boolean;
  premiumProviderAmountMinor?: number | null;
  calculatedAt?: string;
  rule: DomainPricingRuleConfig | null;
};

/** ADMIN result — full transparency incl. provider + margin. INTERNAL ONLY. */
export type AdminDomainPriceResult = {
  priceConfigured: boolean;
  premiumRequiresManualPrice: boolean;
  customerAmountMinor: number | null;
  currencyCode: string;
  operation: DomainOperation;
  years: number;
  premium: boolean;
  appliedRuleId: string | null;
  calculationType: CalculationType | null;
  // admin-only:
  providerAmountMinor: number | null;
  marginAmountMinor: number | null;
  marginBasisPoints: number | null;
};

/** CUSTOMER result — NEVER provider, margin, or internal rule fields. */
export type CustomerDomainPriceResult = {
  priceConfigured: boolean;
  premiumRequiresManualPrice: boolean;
  customerAmountMinor: number | null;
  currencyCode: string;
  operation: DomainOperation;
  years: number;
  premium: boolean;
};

export type EngineResult =
  | { ok: true; value: AdminDomainPriceResult }
  | { ok: false; error: string };

function isNonNegInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

/**
 * Pick the most specific active rule for (tld, operation) from a candidate set
 * that already matches the operation + premium flag: exact tld > default (null).
 * Deterministic — never "latest wins". Register rules are never used for renew
 * because `operation` is part of the candidate filter upstream.
 */
export function resolveDomainPricingRule(
  candidates: DomainPricingRuleConfig[],
  tld: string,
  operation: DomainOperation
): DomainPricingRuleConfig | null {
  const bare = tld.trim().toLowerCase().replace(/^\.+/, "");
  const forOp = candidates.filter((r) => r.operation === operation);
  const exact = forOp
    .filter((r) => (r.tld ?? "").toLowerCase() === bare)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (exact.length > 0) return exact[0];
  const def = forOp.filter((r) => r.tld == null).sort((a, b) => a.id.localeCompare(b.id));
  return def[0] ?? null;
}

/** Compute the NET customer sale price. Never throws; returns a typed result. */
export function calculateDomainCustomerPrice(input: CalculateInput): EngineResult {
  if (!isDomainOperation(input?.operation)) return { ok: false, error: "Invalid operation." };
  if (!Number.isInteger(input.years) || input.years < 1) {
    return { ok: false, error: "years must be a positive integer." };
  }
  const currency = (input.currencyCode ?? "").toUpperCase();
  if (currency.length !== 3) return { ok: false, error: "Invalid currency code." };

  const base: AdminDomainPriceResult = {
    priceConfigured: false,
    premiumRequiresManualPrice: false,
    customerAmountMinor: null,
    currencyCode: currency,
    operation: input.operation,
    years: input.years,
    premium: !!input.premium,
    appliedRuleId: null,
    calculationType: null,
    providerAmountMinor: null,
    marginAmountMinor: null,
    marginBasisPoints: null,
  };

  // Base provider amount (premium uses the premium provider amount when present).
  const providerAmountMinor = input.premium
    ? input.premiumProviderAmountMinor ?? input.providerAmountMinor
    : input.providerAmountMinor;
  if (providerAmountMinor != null && !isNonNegInt(providerAmountMinor)) {
    return { ok: false, error: "providerAmountMinor must be a non-negative integer." };
  }
  base.providerAmountMinor = providerAmountMinor ?? null;

  const rule = input.rule;

  // No rule → not configured. For a premium domain this is "manual price required".
  if (!rule) {
    return {
      ok: true,
      value: { ...base, premiumRequiresManualPrice: !!input.premium },
    };
  }

  // A premium domain may only be priced by a rule that explicitly opts in.
  if (input.premium && !rule.appliesToPremium) {
    return { ok: true, value: { ...base, premiumRequiresManualPrice: true } };
  }

  if (rule.currencyCode.toUpperCase() !== currency) {
    return {
      ok: false,
      error: `Currency mismatch: rule is ${rule.currencyCode.toUpperCase()}, input is ${currency}. No auto-conversion.`,
    };
  }
  if (!isCalculationType(rule.calculationType)) return { ok: false, error: "Invalid calculation type." };

  const bps = rule.markupPercentageBasisPoints ?? null;
  const fixedMarkup = rule.markupFixedMinor ?? null;
  const fixedPrice = rule.fixedCustomerPriceMinor ?? null;
  const min = rule.minimumCustomerPriceMinor ?? 0;

  if (min !== 0 && !isNonNegInt(min)) return { ok: false, error: "Invalid minimum price." };

  let raw: number;
  switch (rule.calculationType) {
    case "fixed": {
      if (!isNonNegInt(fixedPrice)) return { ok: false, error: "Fixed rule needs a fixed price." };
      // FIXED is period-scoped: it covers exactly fixedPriceYears (default 1).
      // Other periods are rejected — a fixed price is NEVER multiplied.
      const coversYears = rule.fixedPriceYears ?? 1;
      if (input.years !== coversYears) {
        return { ok: false, error: `Fixed price is only defined for ${coversYears} year(s).` };
      }
      raw = fixedPrice;
      break;
    }
    case "fixed_markup": {
      if (providerAmountMinor == null) return { ok: false, error: "Provider amount required for markup." };
      if (!isNonNegInt(fixedMarkup)) return { ok: false, error: "Fixed-markup rule needs a fixed markup." };
      raw = providerAmountMinor + fixedMarkup; // fixed markup applied ONCE per line
      break;
    }
    case "percentage_markup": {
      if (providerAmountMinor == null) return { ok: false, error: "Provider amount required for markup." };
      if (!isNonNegInt(bps)) return { ok: false, error: "Percentage rule needs basis points." };
      raw = providerAmountMinor + Math.round((providerAmountMinor * bps) / 10000);
      break;
    }
    case "fixed_and_percentage": {
      if (providerAmountMinor == null) return { ok: false, error: "Provider amount required for markup." };
      if (!isNonNegInt(fixedMarkup)) return { ok: false, error: "Rule needs a fixed markup." };
      if (!isNonNegInt(bps)) return { ok: false, error: "Rule needs basis points." };
      raw = providerAmountMinor + fixedMarkup + Math.round((providerAmountMinor * bps) / 10000);
      break;
    }
    default:
      return { ok: false, error: "Invalid calculation type." };
  }

  const customer = Math.max(raw, min);
  const margin = providerAmountMinor == null ? null : customer - providerAmountMinor;
  const marginBps =
    providerAmountMinor == null || providerAmountMinor === 0 || margin == null
      ? null
      : Math.round((margin * 10000) / providerAmountMinor);

  return {
    ok: true,
    value: {
      ...base,
      priceConfigured: true,
      customerAmountMinor: customer,
      appliedRuleId: rule.id,
      calculationType: rule.calculationType,
      marginAmountMinor: margin,
      marginBasisPoints: marginBps,
    },
  };
}

/**
 * Map an admin result to the customer-safe DTO. Explicit field-by-field pluck —
 * NEVER spread `a` (that would leak providerAmountMinor / margin / internal rule
 * fields). Enforced by a no-leak test.
 */
export function toCustomerPrice(a: AdminDomainPriceResult): CustomerDomainPriceResult {
  return {
    priceConfigured: a.priceConfigured,
    premiumRequiresManualPrice: a.premiumRequiresManualPrice,
    customerAmountMinor: a.customerAmountMinor,
    currencyCode: a.currencyCode,
    operation: a.operation,
    years: a.years,
    premium: a.premium,
  };
}
