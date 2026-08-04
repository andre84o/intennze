import { NextResponse } from "next/server";
import { requireActiveUserApi } from "@/lib/auth/apiAuth";
import {
  ACTIVITY_COOKIE,
  activityCookieOptions,
  signActivity,
} from "@/lib/auth/idleSession";

/**
 * Idle heartbeat. The client idle component POSTs here (throttled) on genuine
 * DOM activity to refresh the server-authoritative activity timestamp. Accepts
 * any ACTIVE user (admin, staff, or portal customer) so both /admin and /portal
 * sessions can stay alive.
 *
 * `requireActiveUserApi()` runs the idle check first, so an already-expired
 * session gets 401 here and can NOT refresh itself back to life — the client
 * turns that 401 into a logout.
 */
export async function POST() {
  const auth = await requireActiveUserApi();
  if (!auth.ok) return auth.response;

  const res = NextResponse.json({ ok: true });
  // Carries Set-Cookie (refreshed activity stamp) — never cache it.
  res.headers.set("Cache-Control", "private, no-store");
  res.cookies.set(
    ACTIVITY_COOKIE,
    await signActivity(Date.now()),
    activityCookieOptions()
  );
  return res;
}
