import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session (rotating cookies) so long-lived
// sessions — e.g. the Mobile Call Companion left open on a phone — don't
// silently expire mid-shift. This does NOT change auth gating; route
// protection still lives in src/app/admin/layout.tsx. Scoped to /admin and
// /api/call so the public site is untouched.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touch the session so @supabase/ssr can refresh it if near expiry.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/call/:path*"],
};
