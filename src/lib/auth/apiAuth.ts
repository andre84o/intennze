import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  PROFILE_COLUMNS,
  isActiveProfile,
  normalizeRole,
  todayStockholm,
  type GuardProfile,
  type ProfileRole,
} from "@/lib/auth/activeProfile";

/**
 * Server-side authorization guards for API ROUTES (route handlers under
 * `src/app/api/**`).
 *
 * Unlike the page guards in `@/lib/auth/adminGuard` (which `redirect()`), these
 * return a `NextResponse` JSON error so route handlers can `return` it directly.
 *
 * They share the EXACT same "active profile" predicate as the page guards (see
 * `@/lib/auth/activeProfile`) so pages and API routes cannot drift. `profiles`
 * is the sole role source — NO CONTACT_TO, NO hardcoded admin email/UUID, NO
 * service-role usage.
 *
 * Contract — discriminated union so callers do:
 *
 *   const auth = await requireAdminApi();
 *   if (!auth.ok) return auth.response;
 *   const { user, profile, supabase } = auth;
 *
 * Status codes:
 *   401 — not authenticated (no valid session).
 *   403 — authenticated but not authorized:
 *           - inactive / suspended / ended / outside employment window, OR
 *           - active staff hitting an admin-only route.
 */

export type ApiAuthOk = {
  ok: true;
  user: User;
  profile: GuardProfile;
  role: ProfileRole;
  supabase: SupabaseClient;
};

export type ApiAuthFail = {
  ok: false;
  response: NextResponse;
};

export type ApiAuthResult = ApiAuthOk | ApiAuthFail;

function unauthorized(): ApiAuthFail {
  return {
    ok: false,
    response: NextResponse.json({ error: "Ej autentiserad" }, { status: 401 }),
  };
}

function forbidden(): ApiAuthFail {
  return {
    ok: false,
    response: NextResponse.json({ error: "Ej behörig" }, { status: 403 }),
  };
}

/**
 * Resolve the caller: verify the session, load their `profiles` row, and apply
 * the shared active-profile rule. Returns the authenticated + active caller, or
 * an {@link ApiAuthFail} (401 unauth / 403 inactive).
 *
 * Internal building block for {@link requireActiveProfileApi} and
 * {@link requireAdminApi}.
 */
async function resolveActiveCaller(): Promise<ApiAuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorized();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle<GuardProfile>();

  const today = todayStockholm();

  // Authenticated but no profile OR inactive/suspended/ended/outside window.
  if (!isActiveProfile(profile, today)) {
    return forbidden();
  }

  return {
    ok: true,
    user,
    profile,
    role: normalizeRole(profile),
    supabase,
  };
}

/**
 * Allow an ACTIVE ADMIN only.
 *
 * 401 if unauthenticated; 403 if the profile is inactive/suspended/ended, or if
 * the caller is active staff (non-admin) hitting an admin-only route.
 */
export async function requireAdminApi(): Promise<ApiAuthResult> {
  const result = await resolveActiveCaller();
  if (!result.ok) return result;

  if (result.role !== "admin") {
    // Active staff on an admin-only route.
    return forbidden();
  }

  return result;
}

/**
 * Allow an ACTIVE ADMIN or ACTIVE STAFF (any active profile).
 *
 * Use for CRM / customer flows a staff member legitimately performs from the
 * staff-reachable /admin/crm and /admin/kunder pages.
 *
 * 401 if unauthenticated; 403 if the profile is inactive/suspended/ended.
 */
export async function requireActiveProfileApi(): Promise<ApiAuthResult> {
  return resolveActiveCaller();
}
