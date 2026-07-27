import "server-only";
import { createServiceRoleClient } from "@/utils/supabase/service";
import type { OrderStatus } from "@/lib/domains/order-status";

/**
 * Webhook-side order settlement (SERVER-ONLY, service-role). Called ONLY from the
 * verified Stripe webhook. Delegates to the SECURITY DEFINER RPCs, which are
 * gated on service_role and are idempotent (row-locked status guard) — a Stripe
 * re-delivery is a safe no-op. No Hostup order is created here.
 */

export async function settleOrderPaid(
  sessionId: string,
  paymentIntentId: string | null
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("mark_domain_order_paid", {
    p_session_id: sessionId,
    p_payment_intent_id: paymentIntentId,
  });
  if (error) throw new Error(`mark_domain_order_paid: ${error.message}`);
}

export async function settleOrderTerminal(
  sessionId: string,
  status: Extract<OrderStatus, "PAYMENT_FAILED" | "EXPIRED" | "CANCELLED">
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("mark_domain_order_terminal", {
    p_session_id: sessionId,
    p_status: status,
  });
  if (error) throw new Error(`mark_domain_order_terminal: ${error.message}`);
}
