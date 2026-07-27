import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDomainQuoteSnapshot,
  isQuoteExpired,
  isQuoteOperation,
  QUOTE_TTL_MS,
} from "./quote.ts";
import { computeVatSplit } from "./money.ts";

const NOW = Date.parse("2026-07-27T12:00:00.000Z");

test("snapshot carries the recomputed net/vat/gross and NO provider price", () => {
  const net = computeVatSplit(19900);
  const snap = buildDomainQuoteSnapshot(
    {
      domainName: "intenzze.se",
      tld: "se",
      operation: "register",
      years: 1,
      currencyCode: "SEK",
      premium: false,
      priceConfigured: true,
      net,
    },
    NOW
  );
  assert.equal(snap.netAmountMinor, 19900);
  assert.equal(snap.vatAmountMinor, 4975);
  assert.equal(snap.grossAmountMinor, 24875);
  assert.equal(snap.priceConfigured, true);

  // No provider / margin field may ever appear on a customer quote.
  const keys = Object.keys(snap);
  for (const forbidden of ["providerAmountMinor", "provider", "marginAmountMinor", "margin", "cost"]) {
    assert.ok(!keys.includes(forbidden), `snapshot must not expose ${forbidden}`);
  }
});

test("unconfigured price → null amounts, never a fabricated 0", () => {
  const snap = buildDomainQuoteSnapshot(
    {
      domainName: "premium.se",
      tld: "se",
      operation: "register",
      years: 1,
      currencyCode: "SEK",
      premium: true,
      priceConfigured: false,
      net: null,
    },
    NOW
  );
  assert.equal(snap.priceConfigured, false);
  assert.equal(snap.netAmountMinor, null);
  assert.equal(snap.grossAmountMinor, null);
});

test("issued/expiry stamped from the injected clock", () => {
  const snap = buildDomainQuoteSnapshot(
    {
      domainName: "x.se", tld: "se", operation: "register", years: 1,
      currencyCode: "SEK", premium: false, priceConfigured: true,
      net: computeVatSplit(10000),
    },
    NOW
  );
  assert.equal(snap.issuedAtMs, NOW);
  assert.equal(snap.expiresAtMs, NOW + QUOTE_TTL_MS);
});

test("isQuoteExpired: fresh valid, past-expiry rejected (boundary at expiry)", () => {
  const snap = buildDomainQuoteSnapshot(
    {
      domainName: "x.se", tld: "se", operation: "register", years: 1,
      currencyCode: "SEK", premium: false, priceConfigured: true,
      net: computeVatSplit(10000),
    },
    NOW
  );
  assert.equal(isQuoteExpired(snap, NOW), false);
  assert.equal(isQuoteExpired(snap, NOW + QUOTE_TTL_MS - 1), false);
  assert.equal(isQuoteExpired(snap, snap.expiresAtMs), true); // exactly at expiry
  assert.equal(isQuoteExpired(snap, NOW + QUOTE_TTL_MS + 1), true);
});

test("registration and renewal/transfer operations are validated", () => {
  assert.ok(isQuoteOperation("register"));
  assert.ok(isQuoteOperation("transfer"));
  assert.ok(!isQuoteOperation("renew"));
  assert.ok(!isQuoteOperation("delete"));
  assert.ok(!isQuoteOperation(null));
});
