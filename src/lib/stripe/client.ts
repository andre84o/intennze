import "server-only";
import Stripe from "stripe";

/**
 * Stripe client — SERVER-ONLY, TEST MODE. Phase 5A is checkout-only: it creates a
 * Checkout Session and verifies webhook signatures. It never captures a live
 * payment (the secret key MUST be a test key) and never creates a Hostup order.
 *
 * Keys are read at CALL time (like the Hostup client) so the app builds without
 * them and they can be configured per environment. The secret key is never
 * logged and never sent to the client — only the returned Session `url` is.
 *
 * Env:
 *   STRIPE_SECRET_KEY       required, MUST start with "sk_test_" (test mode)
 *   STRIPE_WEBHOOK_SECRET   required for the webhook route ("whsec_...")
 */

export class StripeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigError";
  }
}

/** True iff a Stripe TEST secret key is configured. */
export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return typeof key === "string" && key.startsWith("sk_test_");
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.trim() === "") {
    throw new StripeConfigError("STRIPE_SECRET_KEY is not set.");
  }
  if (!key.startsWith("sk_test_")) {
    // Hard stop: Phase 5A must never run against a live key.
    throw new StripeConfigError("STRIPE_SECRET_KEY must be a TEST key (sk_test_...).");
  }
  // apiVersion omitted → uses the SDK's pinned default; avoids a brittle literal.
  return new Stripe(key);
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.trim() === "") {
    throw new StripeConfigError("STRIPE_WEBHOOK_SECRET is not set.");
  }
  return secret;
}

export type CheckoutLineItem = {
  domainName: string;
  operation: string;
  years: number;
  /** GROSS amount incl. VAT, integer minor units. Server-computed — never from the browser. */
  amountGrossMinor: number;
};

export type CreateCheckoutSessionInput = {
  /** One or more domain line items (a cart). Each is priced at its gross amount. */
  items: CheckoutLineItem[];
  currency: string; // lowercase ISO, e.g. "sek"
  successUrl: string;
  cancelUrl: string;
  /** Opaque reference for traceability (e.g. the first order id). Settlement is by session id. */
  reference?: string;
  customerEmail?: string | null;
};

export type CheckoutSessionResult = {
  sessionId: string;
  url: string;
};

/**
 * Create a TEST-mode Checkout Session for a domain cart. Each item is one line,
 * priced at its already-VAT-inclusive gross amount (automatic tax is NOT enabled,
 * so Stripe adds nothing on top). All orders in this session share its id, so the
 * webhook settles every order for the session together (see mark_domain_order_paid).
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<CheckoutSessionResult> {
  if (!input.items?.length) {
    throw new StripeConfigError("Checkout requires at least one item.");
  }
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: input.items.map((it) => ({
      quantity: 1,
      price_data: {
        currency: input.currency,
        unit_amount: it.amountGrossMinor,
        product_data: {
          name: `Domän ${it.domainName}`,
          description: `${it.operation} · ${it.years} år (inkl. moms)`,
        },
      },
    })),
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    ...(input.reference ? { client_reference_id: input.reference } : {}),
    metadata: { item_count: String(input.items.length) },
    ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
  });

  if (!session.url) {
    throw new StripeConfigError("Stripe did not return a checkout URL.");
  }
  return { sessionId: session.id, url: session.url };
}

/** Verify + parse a webhook payload. Throws if the signature is invalid. */
export function constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(rawBody, signature, getWebhookSecret());
}
