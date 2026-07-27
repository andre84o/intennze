import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDomainCustomerPrice,
  resolveDomainPricingRule,
  toCustomerPrice,
  type DomainPricingRuleConfig,
  type CalculateInput,
} from "./pricing-engine.ts";

function rule(over: Partial<DomainPricingRuleConfig> = {}): DomainPricingRuleConfig {
  return {
    id: "r1",
    tld: "se",
    operation: "register",
    currencyCode: "SEK",
    calculationType: "percentage_markup",
    appliesToPremium: false,
    markupPercentageBasisPoints: 2500,
    ...over,
  };
}

function input(over: Partial<CalculateInput> = {}): CalculateInput {
  return {
    tld: "se",
    operation: "register",
    years: 1,
    providerAmountMinor: 10000,
    currencyCode: "SEK",
    premium: false,
    rule: rule(),
    ...over,
  };
}

function ok(i: CalculateInput) {
  const r = calculateDomainCustomerPrice(i);
  assert.ok(r.ok, "expected ok result: " + (r.ok ? "" : r.error));
  return r.value;
}

test("FIXED uses the fixed price and ignores provider", () => {
  const v = ok(input({ rule: rule({ calculationType: "fixed", fixedCustomerPriceMinor: 14900 }) }));
  assert.equal(v.customerAmountMinor, 14900);
  assert.equal(v.marginAmountMinor, 4900);
  assert.equal(v.priceConfigured, true);
});

test("FIXED_MARKUP adds provider + fixed", () => {
  const v = ok(input({ rule: rule({ calculationType: "fixed_markup", markupFixedMinor: 5000 }) }));
  assert.equal(v.customerAmountMinor, 15000);
});

test("PERCENTAGE_MARKUP adds bps of provider", () => {
  const v = ok(input({ rule: rule({ calculationType: "percentage_markup", markupPercentageBasisPoints: 2500 }) }));
  assert.equal(v.customerAmountMinor, 12500);
  assert.equal(v.marginBasisPoints, 2500);
});

test("FIXED_AND_PERCENTAGE adds provider + fixed + pct", () => {
  const v = ok(
    input({
      rule: rule({ calculationType: "fixed_and_percentage", markupFixedMinor: 3000, markupPercentageBasisPoints: 2000 }),
    })
  );
  assert.equal(v.customerAmountMinor, 15000);
});

test("minimum price clamps the result", () => {
  const v = ok(
    input({
      providerAmountMinor: 1000,
      rule: rule({ calculationType: "percentage_markup", markupPercentageBasisPoints: 1000, minimumCustomerPriceMinor: 1500 }),
    })
  );
  assert.equal(v.customerAmountMinor, 1500);
});

test("basis points percentage rounds half-up", () => {
  // 334 * 2500 / 10000 = 83.5 -> 84
  const v = ok(input({ providerAmountMinor: 334, rule: rule({ markupPercentageBasisPoints: 2500 }) }));
  assert.equal(v.customerAmountMinor, 334 + 84);
  // 333 * 2500 / 10000 = 83.25 -> 83
  const v2 = ok(input({ providerAmountMinor: 333, rule: rule({ markupPercentageBasisPoints: 2500 }) }));
  assert.equal(v2.customerAmountMinor, 333 + 83);
});

test("negative / non-integer provider amount is rejected", () => {
  const r = calculateDomainCustomerPrice(input({ providerAmountMinor: -5, rule: rule({ calculationType: "fixed_markup", markupFixedMinor: 100 }) }));
  assert.equal(r.ok, false);
  const r2 = calculateDomainCustomerPrice(input({ providerAmountMinor: 10.5, rule: rule({ calculationType: "fixed_markup", markupFixedMinor: 100 }) }));
  assert.equal(r2.ok, false);
});

test("currency mismatch between input and rule is rejected (no conversion)", () => {
  const r = calculateDomainCustomerPrice(input({ currencyCode: "EUR", rule: rule({ currencyCode: "SEK" }) }));
  assert.equal(r.ok, false);
});

test("no rule -> priceConfigured false (not an error)", () => {
  const v = ok(input({ rule: null }));
  assert.equal(v.priceConfigured, false);
  assert.equal(v.customerAmountMinor, null);
  assert.equal(v.appliedRuleId, null);
});

test("premium without a premium rule -> manual price required", () => {
  const v = ok(input({ premium: true, rule: rule({ appliesToPremium: false }) }));
  assert.equal(v.priceConfigured, false);
  assert.equal(v.premiumRequiresManualPrice, true);
});

test("premium WITH a premium rule prices it", () => {
  const v = ok(
    input({
      premium: true,
      premiumProviderAmountMinor: 500000,
      rule: rule({ appliesToPremium: true, calculationType: "percentage_markup", markupPercentageBasisPoints: 1000 }),
    })
  );
  assert.equal(v.priceConfigured, true);
  assert.equal(v.customerAmountMinor, 500000 + 50000);
});

test("FIXED rejects a period it does not cover (never multiplies)", () => {
  const r = calculateDomainCustomerPrice(
    input({ years: 3, rule: rule({ calculationType: "fixed", fixedCustomerPriceMinor: 14900, fixedPriceYears: 1 }) })
  );
  assert.equal(r.ok, false);
});

test("resolver: exact TLD beats default", () => {
  const exact = rule({ id: "exact", tld: "se" });
  const def = rule({ id: "def", tld: null });
  assert.equal(resolveDomainPricingRule([def, exact], "se", "register")?.id, "exact");
  assert.equal(resolveDomainPricingRule([def], "se", "register")?.id, "def");
  assert.equal(resolveDomainPricingRule([], "se", "register"), null);
});

test("resolver: register rule is never used for renew", () => {
  const reg = rule({ id: "reg", operation: "register", tld: "se" });
  assert.equal(resolveDomainPricingRule([reg], "se", "renew"), null);
});

test("toCustomerPrice never leaks provider or margin", () => {
  const v = ok(input());
  const cust = toCustomerPrice(v);
  assert.ok(!("providerAmountMinor" in cust));
  assert.ok(!("marginAmountMinor" in cust));
  assert.ok(!("marginBasisPoints" in cust));
  assert.equal(cust.customerAmountMinor, v.customerAmountMinor);
});
