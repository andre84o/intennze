/**
 * Domain-order status model + payment state machine + Stripe event mapping.
 * PURE — no server-only, no I/O, injectable clock — so the transitions, the
 * idempotent re-apply, and the "what amount goes to Stripe" logic are unit-tested
 * and shared by the server (webhook + checkout) and the client (labels).
 *
 * The paid state is only ever reached through a verified Stripe webhook, never a
 * browser redirect (see the webhook route). This module encodes WHICH transitions
 * are legal; the DB RPCs enforce them again with row locks (defense in depth).
 */
import { isQuoteExpired, type DomainQuoteSnapshot } from "./quote.ts";

export const ORDER_STATUSES = [
  "DRAFT",
  "CHECKOUT_CREATED",
  "PAID_AWAITING_REGISTRATION",
  "PAYMENT_FAILED",
  "EXPIRED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ORDER_STATUS_SET = new Set<string>(ORDER_STATUSES);
export function isOrderStatus(v: unknown): v is OrderStatus {
  return typeof v === "string" && ORDER_STATUS_SET.has(v);
}

/** Pre-payment states may still transition; everything else is terminal. */
const PRE_PAYMENT: ReadonlySet<OrderStatus> = new Set<OrderStatus>(["DRAFT", "CHECKOUT_CREATED"]);

export function isTerminalOrderStatus(s: OrderStatus): boolean {
  return !PRE_PAYMENT.has(s);
}

const LEGAL: Record<OrderStatus, ReadonlySet<OrderStatus>> = {
  DRAFT: new Set<OrderStatus>(["CHECKOUT_CREATED", "CANCELLED", "EXPIRED"]),
  CHECKOUT_CREATED: new Set<OrderStatus>([
    "PAID_AWAITING_REGISTRATION",
    "PAYMENT_FAILED",
    "EXPIRED",
    "CANCELLED",
  ]),
  PAID_AWAITING_REGISTRATION: new Set<OrderStatus>(),
  PAYMENT_FAILED: new Set<OrderStatus>(),
  EXPIRED: new Set<OrderStatus>(),
  CANCELLED: new Set<OrderStatus>(),
};

/** True iff `from → to` is a legal, non-identity transition. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return LEGAL[from]?.has(to) ?? false;
}

// ── Stripe event → payment outcome (pure, string-in/enum-out) ─────────────────
export type PaymentOutcome = "paid" | "failed" | "expired" | "ignore";

export function mapStripeEventToOutcome(eventType: string | null | undefined): PaymentOutcome {
  switch (eventType) {
    case "checkout.session.completed":
      return "paid";
    case "checkout.session.expired":
      return "expired";
    case "checkout.session.async_payment_failed":
    case "payment_intent.payment_failed":
      return "failed";
    default:
      return "ignore";
  }
}

const OUTCOME_STATUS: Record<Exclude<PaymentOutcome, "ignore">, OrderStatus> = {
  paid: "PAID_AWAITING_REGISTRATION",
  failed: "PAYMENT_FAILED",
  expired: "EXPIRED",
};

export type ApplyResult = {
  /** The status to persist (unchanged when the outcome does not apply). */
  status: OrderStatus;
  /** True only when the status actually changes — the DB write is skipped otherwise. */
  changed: boolean;
};

/**
 * Apply a payment outcome to the current order status. IDEMPOTENT: a repeated
 * webhook (e.g. Stripe re-delivery) on an already-settled order is a no-op. A
 * failure/expiry NEVER overrides a successful payment. `ignore` is always a no-op.
 */
export function applyPaymentOutcome(current: OrderStatus, outcome: PaymentOutcome): ApplyResult {
  if (outcome === "ignore") return { status: current, changed: false };
  const target = OUTCOME_STATUS[outcome];
  if (!PRE_PAYMENT.has(current)) return { status: current, changed: false }; // already settled
  if (!canTransition(current, target)) return { status: current, changed: false };
  return { status: target, changed: true };
}

// ── Amount charged to Stripe (gross, incl. VAT, integer minor units) ──────────
export type CheckoutAmount =
  | { ok: true; amountMinor: number; currency: string }
  | { ok: false; reason: "expired" | "unpriced" };

/**
 * Validate a prepared quote for checkout and derive the Stripe charge amount.
 * The amount is the GROSS (VAT-inclusive) total in integer minor units — Stripe
 * `unit_amount` is already minor units, so there is no re-conversion. NEVER a
 * provider price (the snapshot has none) and NEVER a browser-supplied number.
 */
export function checkoutAmountFromQuote(
  snapshot: DomainQuoteSnapshot,
  nowMs: number
): CheckoutAmount {
  if (isQuoteExpired(snapshot, nowMs)) return { ok: false, reason: "expired" };
  const gross = snapshot.grossAmountMinor;
  if (!snapshot.priceConfigured || gross == null || !Number.isInteger(gross) || gross <= 0) {
    return { ok: false, reason: "unpriced" };
  }
  return { ok: true, amountMinor: gross, currency: snapshot.currencyCode.toLowerCase() };
}

// ── Presentation data (pure; the UI adds icons) ───────────────────────────────
export type OrderTone = "neutral" | "warning" | "positive" | "critical";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: "Utkast",
  CHECKOUT_CREATED: "Väntar på betalning",
  PAID_AWAITING_REGISTRATION: "Betald – väntar på registrering",
  PAYMENT_FAILED: "Betalning misslyckades",
  EXPIRED: "Utgången",
  CANCELLED: "Avbruten",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, OrderTone> = {
  DRAFT: "neutral",
  CHECKOUT_CREATED: "warning",
  PAID_AWAITING_REGISTRATION: "positive",
  PAYMENT_FAILED: "critical",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
};
