/**
 * Domain pricing service (pure).
 *
 * Hard rule: Hostup amounts are Intennze's PROVIDER (purchase) cost. They must
 * NEVER be presented to a CUSTOMER as the sale price. The customer sale price is
 * computed by a pluggable Intennze rule. No such rule is configured yet, so the
 * default returns `notConfigured` (customer sees "Pris kommer snart") — we do NOT
 * invent margins, percentages, or fall back to the provider price.
 */

export type ProviderQuote = {
  providerRegistrationAmount: number | null;
  providerRenewalAmount: number | null;
  currencyCode: string | null;
  billingCycle: string | null;
  premium: boolean;
  requiresRegistrarFeeAcceptance: boolean;
};

export type CustomerPrice = {
  state: "priced" | "notConfigured";
  registrationAmount: number | null;
  renewalAmount: number | null;
  currencyCode: string | null;
};

/** A pluggable Intennze sale-price rule. Future: driven by admin/business config. */
export interface CustomerPriceRule {
  compute(input: { tld: string; provider: ProviderQuote }): {
    registrationAmount: number | null;
    renewalAmount: number | null;
    currencyCode: string | null;
  };
}

/** Default rule until Intennze configures real pricing: nothing is priced. */
export const notConfiguredRule: CustomerPriceRule = {
  compute: () => ({ registrationAmount: null, renewalAmount: null, currencyCode: null }),
};

let activeRule: CustomerPriceRule = notConfiguredRule;

/** Swap the sale-price rule (e.g. once admin business-settings exist). */
export function setCustomerPriceRule(rule: CustomerPriceRule): void {
  activeRule = rule;
}

export function quoteForCustomer(tld: string, provider: ProviderQuote): CustomerPrice {
  const r = activeRule.compute({ tld, provider });
  const priced = r.registrationAmount != null || r.renewalAmount != null;
  return {
    state: priced ? "priced" : "notConfigured",
    registrationAmount: r.registrationAmount,
    renewalAmount: r.renewalAmount,
    currencyCode: r.currencyCode,
  };
}

/**
 * Build a ProviderQuote from parsed availability/product fields. Kept here so the
 * provider→internal mapping is in one place and never leaks field names that
 * imply a customer price.
 */
export function providerQuoteFrom(input: {
  registrationAmount: number | null;
  renewalAmount: number | null;
  currencyCode: string | null;
  billingCycle: string | null;
  premium: boolean | null;
  requiresRegistrarFeeAcceptance: boolean | null;
}): ProviderQuote {
  return {
    providerRegistrationAmount: input.registrationAmount,
    providerRenewalAmount: input.renewalAmount,
    currencyCode: input.currencyCode,
    billingCycle: input.billingCycle,
    premium: input.premium ?? false,
    requiresRegistrarFeeAcceptance: input.requiresRegistrarFeeAcceptance ?? false,
  };
}
