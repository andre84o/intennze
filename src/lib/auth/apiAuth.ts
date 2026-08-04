import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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
import {
  ACTIVITY_COOKIE,
  isIdleExpired,
  verifyActivity,
} from "@/lib/auth/idleSession";

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

// All guard responses are marked private/no-store so an auth decision (401/403)
// can never be served from a shared cache to a different or later request.
function failJson(body: Record<string, unknown>, status: number): ApiAuthFail {
  return {
    ok: false,
    response: NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    }),
  };
}

function unauthorized(): ApiAuthFail {
  return failJson({ error: "Ej autentiserad" }, 401);
}

function forbidden(): ApiAuthFail {
  return failJson({ error: "Ej behörig" }, 403);
}

function idleExpired(): ApiAuthFail {
  return failJson({ error: "Sessionen har gått ut", reason: "idle" }, 401);
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

  // Server-authoritative idle timeout — FAIL CLOSED. A protected API caller must
  // present a valid, unexpired activity cookie. `verifyActivity` returns null for
  // a missing OR tampered/invalid-signature cookie, and we also reject expired
  // ones. The ONLY place the first cookie is minted is the login flow
  // (`src/app/login/actions.ts`); we never bootstrap it here, so a session that
  // did not log in through that flow can never acquire one. We do NOT refresh
  // here — refresh happens on genuine page navigation (middleware) and the
  // throttled client heartbeat, so background polling can't keep a session alive.
  const ts = await verifyActivity((await cookies()).get(ACTIVITY_COOKIE)?.value);
  if (ts === null || isIdleExpired(ts, Date.now())) {
    return idleExpired();
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
  const result = await resolveActiveCaller();
  if (!result.ok) return result;

  // Staff/admin CRM & customer flows only. Portal customers are active profiles
  // but are NOT authorized on these internal routes — reject them explicitly so
  // adding the `customer` role never widens access to staff endpoints.
  if (result.role === "customer") {
    return forbidden();
  }

  return result;
}

/**
 * Allow ANY active profile — admin, staff, OR customer. Use only for endpoints
 * that every logged-in user legitimately hits regardless of role, e.g. the idle
 * heartbeat that keeps both /admin and /portal sessions alive. Still enforces
 * the active-profile rule and the idle-timeout via {@link resolveActiveCaller}.
 */
export async function requireActiveUserApi(): Promise<ApiAuthResult> {
  return resolveActiveCaller();
}
