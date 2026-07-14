import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Server-side page guards for the /admin area.
 *
 * These run as the logged-in user (RLS applies) and are a PRESENTATION-LAYER
 * gate only. They do NOT replace RLS policies or per-action server guards:
 * every mutating server action / API route must still verify the caller
 * server-side. The admin layout already redirects logged-out/inactive users;
 * these helpers add the per-page role gate that individual admin-only pages
 * need. Do not duplicate this role logic elsewhere — call these instead.
 *
 * NO service-role usage here, and NO hardcoded user IDs.
 */

type ProfileRole = "admin" | "staff";

/** Fields required to evaluate the "active profile" rule. */
type GuardProfile = {
  role: string | null;
  is_active: boolean | null;
  account_status: string | null;
  employment_start: string | null;
  employment_end: string | null;
};

export type ActiveProfileResult = {
  user: User;
  profile: GuardProfile;
  role: ProfileRole;
};

export type AdminResult = {
  user: User;
  profile: GuardProfile;
};

/**
 * Ensure the caller is logged in AND has an ACTIVE profile (admin OR staff).
 *
 * "Active" mirrors the admin layout / DB `is_active_profile` rule EXACTLY:
 *   is_active === true
 *   && account_status === 'active'
 *   && (employment_start == null || employment_start <= todayStockholm)
 *   && (employment_end   == null || employment_end   >= todayStockholm)
 * where todayStockholm is the current date in Europe/Stockholm (YYYY-MM-DD).
 *
 * Redirects to /login if there is no user, no profile, or the profile is
 * inactive. Returns { user, profile, role } for an active user.
 */
export async function requireActiveProfilePage(): Promise<ActiveProfileResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, account_status, employment_start, employment_end")
    .eq("user_id", user.id)
    .maybeSingle<GuardProfile>();

  // Current date in Europe/Stockholm (matches the DB function's timezone).
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Stockholm",
  }); // YYYY-MM-DD

  const active =
    !!profile &&
    profile.is_active === true &&
    profile.account_status === "active" &&
    (profile.employment_start == null || profile.employment_start <= today) &&
    (profile.employment_end == null || profile.employment_end >= today);

  // No profile OR suspended/ended/deactivated/outside employment window.
  if (!profile || !active) {
    redirect("/login");
  }

  const role: ProfileRole = profile.role === "admin" ? "admin" : "staff";

  return { user, profile, role };
}

/**
 * Ensure the caller is an ACTIVE ADMIN. Runs the same active-profile logic as
 * requireActiveProfilePage(), then additionally redirects non-admins to /admin.
 * Returns { user, profile } for an active admin.
 *
 * Usage (top of a server component page):
 *   await requireAdminPage();
 */
export async function requireAdminPage(): Promise<AdminResult> {
  const { user, profile, role } = await requireActiveProfilePage();

  if (role !== "admin") {
    redirect("/admin");
  }

  return { user, profile };
}
