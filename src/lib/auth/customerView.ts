import "server-only";
import crypto from "crypto";
import { cache } from "react";
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

/**
 * Central authority for the admin "customer-view" (portal impersonation) mode.
 *
 * Design invariants (server-side, never trust the client):
 *   • The admin's real Supabase auth session is NEVER replaced. Customer-view is
 *     an ADDITIVE signed cookie, orthogonal to the auth cookies.
 *   • `realUserId` (the admin's own id) is always known server-side.
 *   • Customer-view is honoured ONLY when the real user is an ACTIVE ADMIN and
 *     the signed cookie was minted for THAT admin — re-verified on every read.
 *   • This module uses Node `crypto` and MUST NOT be imported by the Edge
 *     middleware (`src/proxy.ts`). It is for server actions / server components.
 */

export const CUSTOMER_VIEW_COOKIE = "cv";

/** Short-lived impersonation token — an admin re-enters view after it expires. */
const TTL_MS = 30 * 60 * 1000; // 30 minutes
export const CUSTOMER_VIEW_MAX_AGE_S = TTL_MS / 1000;

/**
 * HMAC key for the customer-view cookie. Prefers a dedicated secret; falls back
 * to the server-only service-role key so the feature works on Vercel with no
 * extra config. The cookie is a 30-min ephemeral view token (NOT an auth
 * session), so rotating the key only forces admins to re-open customer-view — it
 * never affects real logins. Server-only: never referenced from client code.
 */
function signingSecret(): string {
  const secret =
    process.env.CUSTOMER_VIEW_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "Customer-view cookie signing secret is not configured (set CUSTOMER_VIEW_COOKIE_SECRET)."
    );
  }
  return secret;
}

type CookiePayload = { customerId: string; adminUserId: string; issuedAt: number };

function hmac(body: string): Buffer {
  return crypto.createHmac("sha256", signingSecret()).update(body).digest();
}

/** Build a signed, tamper-evident token: base64url(payload).base64url(hmac). */
export function signCustomerViewToken(payload: CookiePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = hmac(body).toString("base64url");
  return `${body}.${sig}`;
}

/** Verify signature + expiry and return the payload, or null if invalid. */
function verifyCustomerViewToken(token: string | undefined): CookiePayload | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(hmac(body).toString("base64url"));
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as CookiePayload;
    if (
      !payload ||
      typeof payload.customerId !== "string" ||
      typeof payload.adminUserId !== "string" ||
      typeof payload.issuedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - payload.issuedAt > TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

export type EffectiveActor = {
  supabase: SupabaseClient;
  user: User | null;
  /** The real authenticated auth.users id (the admin's own id while in view). */
  realUserId: string | null;
  /** Normalised role of the real user, or null if unauthenticated / inactive. */
  realRole: ProfileRole | null;
  /** True iff a valid view cookie is present AND the real user is an active admin. */
  isCustomerView: boolean;
  /**
   * Whose portal to render. In customer-view this is the previewed CRM
   * customers.id; otherwise it equals realUserId. NEVER key auth/sensitive
   * actions on this — those must use realUserId.
   */
  effectiveUserId: string | null;
  /** The previewed CRM customers.id — only set while isCustomerView is true. */
  viewedCustomerId: string | null;
};

/**
 * Resolve the effective actor for the current request. Wrapped in React `cache`
 * so a layout + its page share ONE resolution (one getUser + one profiles query)
 * per render — honouring "avoid extra DB queries where the same auth info can be
 * reused".
 */
export const getEffectiveActor = cache(async (): Promise<EffectiveActor> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      realUserId: null,
      realRole: null,
      isCustomerView: false,
      effectiveUserId: null,
      viewedCustomerId: null,
    };
  }

  // Single profile query, reused for the role gate AND the admin re-check below.
  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle<GuardProfile>();

  const active = isActiveProfile(profile, todayStockholm());
  const realRole = active ? normalizeRole(profile) : null;

  const base: EffectiveActor = {
    supabase,
    user,
    realUserId: user.id,
    realRole,
    isCustomerView: false,
    effectiveUserId: user.id,
    viewedCustomerId: null,
  };

  // Customer-view is available ONLY to an active admin.
  if (realRole !== "admin") return base;

  const cookieStore = await cookies();
  const payload = verifyCustomerViewToken(cookieStore.get(CUSTOMER_VIEW_COOKIE)?.value);

  // Bind the cookie to THIS admin — a copied cookie can't be replayed elsewhere.
  if (!payload || payload.adminUserId !== user.id) return base;

  return {
    ...base,
    isCustomerView: true,
    effectiveUserId: payload.customerId,
    viewedCustomerId: payload.customerId,
  };
});
