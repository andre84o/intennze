import "server-only";
import type { EffectiveActor } from "@/lib/auth/customerView";

/**
 * Customer-portal audit writer (SERVER-ONLY). Routes CUSTOMER_DOMAIN_* events
 * through the log_customer_event RPC (20260731000000), whose gate admits an
 * ACTIVE portal customer as well as an admin/service caller — unlike
 * log_hostup_event, which is admin/service-only and silently no-ops for a real
 * customer session.
 *
 * Fire-and-safe: an audit failure must never break the read/refresh it records.
 * Metadata is passed to the RPC which redacts it server-side; never put PII,
 * provider prices, or raw provider responses here.
 */

export type CustomerAuditAction =
  | "CUSTOMER_DOMAIN_LIST_VIEWED"
  | "CUSTOMER_DOMAIN_DETAIL_VIEWED"
  | "CUSTOMER_DOMAIN_STATUS_REFRESHED"
  | "CUSTOMER_DOMAIN_SEARCH_VIEWED"
  | "CUSTOMER_DOMAIN_QUOTE_PREPARED";

export async function logCustomerEvent(
  actor: EffectiveActor,
  action: CustomerAuditAction,
  opts: {
    domainId?: string | null;
    outcome?: "success" | "blocked" | "error";
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  try {
    await actor.supabase.rpc("log_customer_event", {
      p_action: action,
      p_domain_id: opts.domainId ?? null,
      p_effective_user_id: actor.effectiveUserId,
      p_outcome: opts.outcome ?? "success",
      p_metadata: opts.metadata ?? {},
    });
  } catch (err) {
    console.error("[customer-audit]", action, err instanceof Error ? err.message : "unknown");
  }
}
