"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { createClient as createServerSupabaseClient } from "@/utils/supabase/server";
import { tryLimit, loginLimiter } from "@/lib/ratelimit";

// Private, server-only helper. Maps a username -> the account's login email
// using the service-role key. NEVER exported / NEVER returned to the client —
// exposing it would be an unauthenticated user-enumeration + email-harvesting
// oracle. Only used internally by signIn() below.
async function lookupEmailByUsername(username: string): Promise<string | null> {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await adminClient
    .from("user_preferences")
    .select("user_id")
    .eq("username", username.toLowerCase().trim())
    .single();

  if (error || !data) return null;

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(data.user_id);
  if (userError || !userData.user) return null;

  return userData.user.email ?? null;
}

// Extract the client IP from the incoming request headers. On Vercel the
// platform sets `x-forwarded-for` to the real client; the first entry is
// canonical. Falls back to `x-real-ip` and finally a fixed sentinel so a
// missing header doesn't bypass the limiter.
function getClientIpFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xRealIp = h.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  return "anonymous";
}

export type SignInResult = { ok: boolean; rateLimited?: boolean };

// Server-side sign-in. Resolves username -> email internally and signs in via
// the @supabase/ssr server client so the auth session cookie is set on the
// response. Returns ONLY { ok } (plus an optional rateLimited flag) — it never
// leaks the email and uses a single generic failure for unknown-username,
// wrong-password, AND inactive/suspended/ended accounts so there is no
// account-enumeration oracle.
export async function signIn(identifier: string, password: string): Promise<SignInResult> {
  const id = (identifier ?? "").trim();

  if (!id || !password) {
    return { ok: false };
  }

  // IP-based rate limiting. Fail-open if Upstash env is not configured, matching
  // the existing pattern in src/lib/ratelimit.ts (tryLimit returns null when the
  // limiter is null or Redis errors).
  const h = await headers();
  const ip = getClientIpFromHeaders(h);
  const limit = await tryLimit(loginLimiter, `login:${ip}`);
  if (limit && !limit.success) {
    return { ok: false, rateLimited: true };
  }

  // Resolve username -> email internally; the email is never returned.
  let email = id;
  if (!email.includes("@")) {
    const resolved = await lookupEmailByUsername(email);
    if (!resolved) {
      // Generic failure — do not distinguish "no such username" from
      // "wrong password".
      return { ok: false };
    }
    email = resolved;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { ok: false };
  }

  // Credentials were valid — but inactive/suspended/ended accounts (and users
  // outside their employment window) must NOT receive a session. This mirrors
  // the DB `is_active_profile` rule enforced by the admin layout / adminGuard.
  // Revoke the session we just established and return the SAME generic failure,
  // so a valid password on a disabled account is indistinguishable from a wrong
  // password — no "this account exists but is disabled" oracle.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, account_status, employment_start, employment_end")
    .eq("user_id", data.user.id)
    .maybeSingle<{
      is_active: boolean | null;
      account_status: string | null;
      employment_start: string | null;
      employment_end: string | null;
    }>();

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

  if (!active) {
    await supabase.auth.signOut();
    return { ok: false };
  }

  return { ok: true };
}
