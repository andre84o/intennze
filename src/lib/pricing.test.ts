import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  quoteForCustomer,
  providerQuoteFrom,
  setCustomerPriceRule,
  notConfiguredRule,
  type ProviderQuote,
} from "./pricing.ts";

const provider: ProviderQuote = {
  providerRegistrationAmount: 99,
  providerRenewalAmount: 169,
  currencyCode: "SEK",
  billingCycle: "annually",
  premium: false,
  requiresRegistrarFeeAcceptance: false,
};

afterEach(() => setCustomerPriceRule(notConfiguredRule));

test("default: no sale rule configured → notConfigured, no amounts, provider NOT leaked", () => {
  const q = quoteForCustomer("se", provider);
  assert.equal(q.state, "notConfigured");
  assert.equal(q.registrationAmount, null);
  assert.equal(q.renewalAmount, null);
  // The customer quote object never carries provider* fields.
  assert.ok(!("providerRegistrationAmount" in q));
});

test("providerQuoteFrom maps availability fields to provider-scoped names", () => {
  const p = providerQuoteFrom({
    registrationAmount: 120,
    renewalAmount: 119,
    currencyCode: "SEK",
    billingCycle: "annually",
    premium: true,
    requiresRegistrarFeeAcceptance: null,
  });
  assert.equal(p.providerRegistrationAmount, 120);
  assert.equal(p.providerRenewalAmount, 119);
  assert.equal(p.premium, true);
  assert.equal(p.requiresRegistrarFeeAcceptance, false);
});

test("a configured rule produces a priced customer quote (never the raw provider price by default)", () => {
  // Example future rule: +50% markup, rounded. (Only active because a rule is set.)
  setCustomerPriceRule({
    compute: ({ provider: p }) => ({
      registrationAmount: p.providerRegistrationAmount != null ? Math.round(p.providerRegistrationAmount * 1.5) : null,
      renewalAmount: p.providerRenewalAmount != null ? Math.round(p.providerRenewalAmount * 1.5) : null,
      currencyCode: p.currencyCode,
    }),
  });
  const q = quoteForCustomer("se", provider);
  assert.equal(q.state, "priced");
  assert.equal(q.registrationAmount, 149); // 99*1.5 rounded, NOT the provider 99
  assert.equal(q.renewalAmount, 254);
  assert.equal(q.currencyCode, "SEK");
});
