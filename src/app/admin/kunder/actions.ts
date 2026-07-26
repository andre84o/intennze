"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  PROFILE_COLUMNS,
  isActiveProfile,
  normalizeRole,
  todayStockholm,
  type GuardProfile,
} from "@/lib/auth/activeProfile";
import {
  CUSTOMER_VIEW_COOKIE,
  CUSTOMER_VIEW_MAX_AGE_S,
  getEffectiveActor,
  signCustomerViewToken,
} from "@/lib/auth/customerView";

/**
 * Admin "customer-view" server actions.
 *
 * SECURITY: every entry point re-verifies the REAL user is an active admin
 * server-side (never trust the client, the URL, or the cookie's mere presence).
 * The customerId is validated to exist before a view is minted, so it can never
 * be an arbitrary id supplied by the frontend. Node `crypto` (via the signed
 * cookie helper) runs here in the Node runtime — never in Edge middleware.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle<GuardProfile>();

  if (!isActiveProfile(profile, todayStockholm()) || normalizeRole(profile) !== "admin") {
    redirect("/admin");
  }

  return { supabase, user };
}

function clientMeta(h: Headers): { ip: string | null; userAgent: string | null } {
  const xff = h.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]?.trim() || null : h.get("x-real-ip");
  return { ip: ip ?? null, userAgent: h.get("user-agent") };
}

/**
 * Start viewing the portal AS the given customer. Verifies admin, validates the
 * customer exists, writes an audit row (admin's real id + customer id + time),
 * sets the signed httpOnly cookie, and redirects to /portal.
 */
export async function startCustomerView(customerId: string): Promise<void> {
  const { supabase, user } = await requireAdmin();

  if (typeof customerId !== "string" || !UUID_RE.test(customerId)) {
    redirect("/admin/kunder");
  }

  // Validate the customer exists (RLS-scoped admin read). Blocks arbitrary ids.
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .maybeSingle<{ id: string }>();
  if (!customer) {
    redirect("/admin/kunder");
  }

  const { ip, userAgent } = clientMeta(await headers());

  // Audit BEFORE minting the cookie. The RPC re-asserts admin + customer server
  // side; actor is auth.uid() (the real admin), so it can't be spoofed.
  await supabase.rpc("log_customer_view", {
    p_customer_id: customerId,
    p_action: "customer_view.start",
    p_ip: ip,
    p_user_agent: userAgent,
  });

  const token = signCustomerViewToken({
    customerId,
    adminUserId: user.id,
    issuedAt: Date.now(),
  });

  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_VIEW_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_VIEW_MAX_AGE_S,
  });

  redirect("/portal");
}

/**
 * Exit customer-view: audit the exit, clear the cookie, return to the admin
 * customer page. Safe to call even if no view is active.
 */
export async function exitCustomerView(): Promise<void> {
  const actor = await getEffectiveActor();

  // Only an admin can ever be in customer-view; re-verify server-side.
  if (actor.realRole !== "admin") {
    redirect("/admin");
  }

  const viewedCustomerId = actor.viewedCustomerId;

  if (actor.isCustomerView && viewedCustomerId) {
    const { ip, userAgent } = clientMeta(await headers());
    await actor.supabase.rpc("log_customer_view", {
      p_customer_id: viewedCustomerId,
      p_action: "customer_view.exit",
      p_ip: ip,
      p_user_agent: userAgent,
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_VIEW_COOKIE);

  redirect(viewedCustomerId ? `/admin/kunder/${viewedCustomerId}` : "/admin/kunder");
}
