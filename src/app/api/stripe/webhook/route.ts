import "server-only";
import type Stripe from "stripe";
import { constructWebhookEvent, isStripeConfigured } from "@/lib/stripe/client";
import { mapStripeEventToOutcome } from "@/lib/domains/order-status";
import { settleOrderPaid, settleOrderTerminal } from "@/lib/domains/order-webhook";

/**
 * Stripe webhook — SERVER-ONLY, node runtime (raw body + signature verification).
 *
 * Security:
 *   • The Stripe signature is verified with STRIPE_WEBHOOK_SECRET before any
 *     processing — the raw body is used, never parsed JSON.
 *   • The success/redirect URL is NEVER trusted; the paid state is set ONLY here.
 *   • Settlement is idempotent (service-role RPCs with a row-locked status guard),
 *     so a Stripe re-delivery is a safe no-op.
 *   • No Hostup order/invoice/domain/transfer/DNS is created.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}

export async function POST(req: Request): Promise<Response> {
  if (!isStripeConfigured()) {
    return new Response("Stripe not configured", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (err) {
    // Bad signature / malformed payload — reject; do not process.
    console.error("[stripe.webhook] signature verification failed", err instanceof Error ? err.message : "unknown");
    return new Response("Invalid signature", { status: 400 });
  }

  const outcome = mapStripeEventToOutcome(event.type);
  if (outcome === "ignore") return new Response("ignored", { status: 200 });

  // Only Checkout.Session events carry the stored session id we settle on.
  const obj = event.data.object as { object?: string };
  if (obj?.object !== "checkout.session") {
    return new Response("ignored", { status: 200 });
  }
  const session = event.data.object as Stripe.Checkout.Session;

  try {
    if (outcome === "paid") {
      await settleOrderPaid(session.id, paymentIntentId(session));
    } else if (outcome === "expired") {
      await settleOrderTerminal(session.id, "EXPIRED");
    } else if (outcome === "failed") {
      await settleOrderTerminal(session.id, "PAYMENT_FAILED");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    // Unknown session (e.g. from another environment) → acknowledge, don't retry.
    if (/not found/i.test(message)) {
      return new Response("no matching order", { status: 200 });
    }
    console.error("[stripe.webhook] settlement failed", message);
    return new Response("settlement error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
