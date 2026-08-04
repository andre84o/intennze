import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ACTIVITY_COOKIE, activityCookieOptions } from "@/lib/auth/idleSession";

/**
 * Server-side logout. Unlike a bare client `signOut()`, this actually tears the
 * session down on the server: it clears the Supabase auth cookies AND the idle
 * activity cookie on the redirect response, so the session cannot be resurrected
 * on the next request. Reached by the idle-timeout redirect (`/logout?reason=idle`)
 * and by the client idle component. Not in the middleware auth list → no loop.
 */
async function handle(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get("reason");

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (reason) loginUrl.searchParams.set("reason", reason);

  const response = NextResponse.redirect(loginUrl);
  // Never let a logout response (it carries session-clearing Set-Cookie) sit in
  // any shared cache.
  response.headers.set("Cache-Control", "private, no-store");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    // Bind the client's cookie writes to THIS response so signOut() removes the
    // sb-*-auth-token cookies on the redirect we return. Scope is LOCAL: idle
    // logout ends only THIS session/device, not every session for the user
    // (global sign-out is intentionally not the default — no requirement for it).
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });
    await supabase.auth.signOut({ scope: "local" });
  }

  // Drop the idle activity cookie regardless of Supabase state.
  response.cookies.set(ACTIVITY_COOKIE, "", {
    ...activityCookieOptions(),
    maxAge: 0,
  });

  return response;
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
