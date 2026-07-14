import "server-only";

/**
 * Shared "active profile" logic used by BOTH the page guards
 * (`src/lib/auth/adminGuard.ts`) and the API-route guards
 * (`src/lib/auth/apiAuth.ts`).
 *
 * The rule is defined ONCE here so pages and API routes can never drift apart.
 * It mirrors the admin layout / DB `is_active_profile` rule EXACTLY:
 *
 *   is_active === true
 *   && account_status === 'active'
 *   && (employment_start == null || employment_start <= todayStockholm)
 *   && (employment_end   == null || employment_end   >= todayStockholm)
 *
 * where todayStockholm is the current date in Europe/Stockholm (YYYY-MM-DD).
 *
 * `profiles` is the SOLE role source. No hardcoded admin email/UUID, no
 * CONTACT_TO, no service-role usage here.
 */

export type ProfileRole = "admin" | "staff";

/** Fields required to evaluate the "active profile" rule. */
export type GuardProfile = {
  role: string | null;
  is_active: boolean | null;
  account_status: string | null;
  employment_start: string | null;
  employment_end: string | null;
};

/** Columns to select from `profiles` when evaluating the active rule. */
export const PROFILE_COLUMNS =
  "role, is_active, account_status, employment_start, employment_end" as const;

/** Current date in Europe/Stockholm (matches the DB function's timezone). */
export function todayStockholm(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Stockholm",
  }); // YYYY-MM-DD
}

/**
 * True iff the profile exists AND satisfies the active-profile rule for the
 * given Stockholm date. Pass `today` explicitly so callers evaluate a single,
 * consistent date.
 */
export function isActiveProfile(
  profile: GuardProfile | null | undefined,
  today: string
): profile is GuardProfile {
  return (
    !!profile &&
    profile.is_active === true &&
    profile.account_status === "active" &&
    (profile.employment_start == null || profile.employment_start <= today) &&
    (profile.employment_end == null || profile.employment_end >= today)
  );
}

/** Normalise the free-text `role` column to the two roles the app recognises. */
export function normalizeRole(profile: GuardProfile): ProfileRole {
  return profile.role === "admin" ? "admin" : "staff";
}
