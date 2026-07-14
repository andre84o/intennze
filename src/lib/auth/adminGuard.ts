import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { User } from "@supabase/supabase-js";
import {
  PROFILE_COLUMNS,
  isActiveProfile,
  normalizeRole,
  todayStockholm,
  type GuardProfile,
  type ProfileRole,
} from "@/lib/auth/activeProfile";

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
 * The "active profile" rule lives in `@/lib/auth/activeProfile` and is shared
 * with the API-route guards (`@/lib/auth/apiAuth`) so pages and API routes can
 * never drift. NO service-role usage here, and NO hardcoded user IDs.
 */

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
 * "Active" mirrors the admin layout / DB `is_active_profile` rule EXACTLY (see
 * `@/lib/auth/activeProfile`).
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
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle<GuardProfile>();

  const today = todayStockholm();

  // No profile OR suspended/ended/deactivated/outside employment window.
  if (!isActiveProfile(profile, today)) {
    redirect("/login");
  }

  return { user, profile, role: normalizeRole(profile) };
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
