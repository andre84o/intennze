import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ACTIVITY_COOKIE,
  activityCookieOptions,
  isIdleExpired,
  signActivity,
  verifyActivity,
} from "@/lib/auth/idleSession";

// Authenticated responses (and anything carrying Set-Cookie) must never be
// stored by a shared/CDN cache — otherwise one user's session or refreshed auth
// cookies could be served to another.
function noStore<T extends NextResponse>(res: T): T {
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Skip Supabase auth if environment variables are not set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase is not configured, block admin + portal access
    if (
      request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/portal")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Skip auth entirely for routes that don't need it
  // /api/call/* is included so long-open Mobile Call Companion sessions get
  // their auth token refreshed on outcome/next calls (no redirect for APIs).
  const pathname = request.nextUrl.pathname;
  if (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/portal") &&
    pathname !== "/login" &&
    !pathname.startsWith("/api/call")
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated. Role gating for
  // /admin and /portal happens in their respective layouts (this only checks
  // that a session exists, keeping the middleware free of DB queries).
  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/portal")
  ) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", request.nextUrl.pathname);
      return noStore(NextResponse.redirect(url));
    }
  }

  // Redirect logged in users away from login page
  if (request.nextUrl.pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return noStore(NextResponse.redirect(url));
  }

  // ── Server-authoritative idle timeout — FAIL CLOSED ─────────────────────────
  // The last-activity timestamp lives in a signed, httpOnly cookie only the
  // server can write, so it survives closed tabs / new tabs / sleep and cannot be
  // forged or extended by the client. A missing OR tampered cookie
  // (verifyActivity -> null), or an expired one, is treated as "not a live
  // session": pages hand off to /logout (real signOut), APIs get 401. The cookie
  // is minted ONLY by the login flow; middleware never bootstraps it, so clearing
  // it cannot silently reset the idle window — it forces a re-login instead.
  // Refresh (sliding window) happens ONLY on genuine page navigation, never on
  // prefetch or API/background calls; the throttled client heartbeat keeps
  // SPA-style sessions alive without full navigations.
  const isProtectedPage =
    pathname.startsWith("/admin") || pathname.startsWith("/portal");

  if (user && (isProtectedPage || pathname.startsWith("/api/call"))) {
    const ts = await verifyActivity(request.cookies.get(ACTIVITY_COOKIE)?.value);
    const now = Date.now();

    if (ts === null || isIdleExpired(ts, now)) {
      if (isProtectedPage) {
        const url = request.nextUrl.clone();
        url.pathname = "/logout";
        url.search = "";
        url.searchParams.set("reason", "idle");
        return noStore(NextResponse.redirect(url));
      }
      // API caller (/api/call): reject, never redirect.
      return noStore(NextResponse.json({ error: "idle" }, { status: 401 }));
    }

    if (isProtectedPage) {
      const isPrefetch =
        request.headers.get("next-router-prefetch") === "1" ||
        request.headers.get("purpose") === "prefetch" ||
        (request.headers.get("sec-purpose") ?? "").includes("prefetch");
      // Slide the window forward on real navigation. Set on the FINAL
      // supabaseResponse — getUser() above may have recreated it via setAll(), so
      // this must run just before the return.
      if (!isPrefetch) {
        supabaseResponse.cookies.set(
          ACTIVITY_COOKIE,
          await signActivity(now),
          activityCookieOptions()
        );
      }
    }
  }

  // This response may carry refreshed Supabase auth cookies and/or the activity
  // cookie — keep it out of any shared cache.
  return noStore(supabaseResponse);
}
