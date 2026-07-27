import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ORDER_STATUSES,
  isOrderStatus,
  isTerminalOrderStatus,
  canTransition,
  mapStripeEventToOutcome,
  applyPaymentOutcome,
  checkoutAmountFromQuote,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
} from "./order-status.ts";
import { buildDomainQuoteSnapshot } from "./quote.ts";
import { computeVatSplit } from "./money.ts";

test("isOrderStatus guards the allowlist", () => {
  for (const s of ORDER_STATUSES) assert.ok(isOrderStatus(s));
  assert.ok(!isOrderStatus("PAID"));
  assert.ok(!isOrderStatus(""));
  assert.ok(!isOrderStatus(null));
});

test("terminal vs pre-payment states", () => {
  assert.ok(!isTerminalOrderStatus("DRAFT"));
  assert.ok(!isTerminalOrderStatus("CHECKOUT_CREATED"));
  assert.ok(isTerminalOrderStatus("PAID_AWAITING_REGISTRATION"));
  assert.ok(isTerminalOrderStatus("PAYMENT_FAILED"));
  assert.ok(isTerminalOrderStatus("EXPIRED"));
  assert.ok(isTerminalOrderStatus("CANCELLED"));
});

test("legal transitions", () => {
  assert.ok(canTransition("DRAFT", "CHECKOUT_CREATED"));
  assert.ok(canTransition("CHECKOUT_CREATED", "PAID_AWAITING_REGISTRATION"));
  assert.ok(canTransition("CHECKOUT_CREATED", "PAYMENT_FAILED"));
  assert.ok(canTransition("CHECKOUT_CREATED", "EXPIRED"));
  assert.ok(canTransition("DRAFT", "CANCELLED"));
});

test("illegal transitions rejected", () => {
  assert.ok(!canTransition("PAID_AWAITING_REGISTRATION", "DRAFT"));
  assert.ok(!canTransition("PAID_AWAITING_REGISTRATION", "PAYMENT_FAILED"));
  assert.ok(!canTransition("EXPIRED", "PAID_AWAITING_REGISTRATION"));
  assert.ok(!canTransition("CANCELLED", "PAID_AWAITING_REGISTRATION"));
  assert.ok(!canTransition("DRAFT", "DRAFT")); // identity is not a transition
});

test("Stripe event → outcome mapping (unknown → ignore)", () => {
  assert.equal(mapStripeEventToOutcome("checkout.session.completed"), "paid");
  assert.equal(mapStripeEventToOutcome("checkout.session.expired"), "expired");
  assert.equal(mapStripeEventToOutcome("checkout.session.async_payment_failed"), "failed");
  assert.equal(mapStripeEventToOutcome("payment_intent.payment_failed"), "failed");
  assert.equal(mapStripeEventToOutcome("invoice.paid"), "ignore");
  assert.equal(mapStripeEventToOutcome(""), "ignore");
  assert.equal(mapStripeEventToOutcome(undefined), "ignore");
});

test("applyPaymentOutcome advances a pending order to paid", () => {
  const r = applyPaymentOutcome("CHECKOUT_CREATED", "paid");
  assert.deepEqual(r, { status: "PAID_AWAITING_REGISTRATION", changed: true });
});

test("applyPaymentOutcome is idempotent — repeated paid is a no-op", () => {
  const r = applyPaymentOutcome("PAID_AWAITING_REGISTRATION", "paid");
  assert.deepEqual(r, { status: "PAID_AWAITING_REGISTRATION", changed: false });
});

test("failure/expiry never override a successful payment", () => {
  assert.deepEqual(applyPaymentOutcome("PAID_AWAITING_REGISTRATION", "failed"), {
    status: "PAID_AWAITING_REGISTRATION",
    changed: false,
  });
  assert.deepEqual(applyPaymentOutcome("PAID_AWAITING_REGISTRATION", "expired"), {
    status: "PAID_AWAITING_REGISTRATION",
    changed: false,
  });
});

test("failed/expired apply to a pending order", () => {
  assert.deepEqual(applyPaymentOutcome("CHECKOUT_CREATED", "failed"), { status: "PAYMENT_FAILED", changed: true });
  assert.deepEqual(applyPaymentOutcome("CHECKOUT_CREATED", "expired"), { status: "EXPIRED", changed: true });
});

test("ignore outcome is always a no-op", () => {
  assert.deepEqual(applyPaymentOutcome("CHECKOUT_CREATED", "ignore"), { status: "CHECKOUT_CREATED", changed: false });
});

const NOW = Date.parse("2026-07-27T12:00:00.000Z");

function quote(over: Partial<Parameters<typeof buildDomainQuoteSnapshot>[0]> = {}) {
  return buildDomainQuoteSnapshot(
    {
      domainName: "intenzze.se",
      tld: "se",
      operation: "register",
      years: 1,
      currencyCode: "SEK",
      premium: false,
      priceConfigured: true,
      net: computeVatSplit(19900),
      ...over,
    },
    NOW
  );
}

test("checkoutAmountFromQuote charges the GROSS (incl VAT) in minor units", () => {
  const r = checkoutAmountFromQuote(quote(), NOW);
  assert.deepEqual(r, { ok: true, amountMinor: 24875, currency: "sek" });
});

test("checkoutAmountFromQuote rejects an expired quote at the boundary", () => {
  const q = quote();
  assert.deepEqual(checkoutAmountFromQuote(q, q.expiresAtMs), { ok: false, reason: "expired" });
});

test("checkoutAmountFromQuote rejects an unpriced quote (never charges 0)", () => {
  const q = quote({ priceConfigured: false, net: null });
  assert.deepEqual(checkoutAmountFromQuote(q, NOW), { ok: false, reason: "unpriced" });
});

test("every status has a label and tone", () => {
  for (const s of ORDER_STATUSES) {
    assert.ok(ORDER_STATUS_LABEL[s].length > 0);
    assert.ok(ORDER_STATUS_TONE[s].length > 0);
  }
});
