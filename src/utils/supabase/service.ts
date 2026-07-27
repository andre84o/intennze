import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — SERVER-ONLY. Used ONLY by trusted server code
 * that has no user session (the Stripe webhook). Its requests carry the
 * service_role JWT, so the SECURITY DEFINER settlement RPCs recognize
 * request.jwt.claims.role = 'service_role'.
 *
 * SECURITY: the service-role key bypasses RLS. This module is import-guarded by
 * `server-only`; the key is NEVER exposed to the client and callers must only use
 * it for the narrow, gated RPCs (mark_domain_order_paid / _terminal). No session
 * is persisted.
 */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service-role client is not configured.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
