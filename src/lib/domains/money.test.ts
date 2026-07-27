import { test } from "node:test";
import assert from "node:assert/strict";
import { computeVatSplit, providerMajorToMinor, DEFAULT_VAT_BASIS_POINTS } from "./money.ts";

test("VAT split keeps net/vat/gross separate (25% default)", () => {
  const s = computeVatSplit(19900);
  assert.equal(s.netAmountMinor, 19900);
  assert.equal(s.vatAmountMinor, 4975); // 19900 * 0.25
  assert.equal(s.grossAmountMinor, 24875);
  assert.equal(s.vatRateBasisPoints, DEFAULT_VAT_BASIS_POINTS);
});

test("VAT split rounds half-up once on the net total", () => {
  // 100 * 0.25 = 25 exactly; 101*0.25 = 25.25 -> 25
  assert.equal(computeVatSplit(100).vatAmountMinor, 25);
  assert.equal(computeVatSplit(101).vatAmountMinor, 25);
  assert.equal(computeVatSplit(102).vatAmountMinor, 26); // 25.5 -> 26 (half-up)
});

test("VAT split accepts a custom rate in basis points", () => {
  const s = computeVatSplit(10000, 600); // 6%
  assert.equal(s.vatAmountMinor, 600);
  assert.equal(s.grossAmountMinor, 10600);
});

test("provider major→minor converts kronor to öre", () => {
  assert.equal(providerMajorToMinor(99), 9900);
  assert.equal(providerMajorToMinor(99.5), 9950);
  assert.equal(providerMajorToMinor(null), null);
});
