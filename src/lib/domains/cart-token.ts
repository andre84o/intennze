import "server-only";
import crypto from "crypto";
import { isQuoteOperation, type DomainQuoteSnapshot } from "@/lib/domains/quote";
import type { DomainCart } from "@/lib/domains/cart";

/**
 * Signed, tamper-evident cookie for the domain CART (an array of prepared quote
 * snapshots). Same HMAC-SHA256 design as the single-quote cookie but a DISTINCT
 * name so it never collides with the quote (`dq`), customer-view (`cv`), or auth
 * cookies.
 *
 * The cookie only remembers the customer's reserved intent + the sale price the
 * SERVER computed. It is never trusted for authorization, and prices are always
 * recomputed server-side before display and before checkout; the signature merely
 * detects tampering. Server-only: never imported by client code or middleware.
 */

export const DOMAIN_CART_COOKIE = "dc";

function signingSecret(): string {
  const secret = process.env.CUSTOMER_VIEW_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Cart cookie signing secret is not configured.");
  return secret;
}

function hmac(body: string): Buffer {
  return crypto.createHmac("sha256", signingSecret()).update(body).digest();
}

/** base64url(payload).base64url(hmac) */
export function signCartToken(cart: DomainCart): string {
  const body = Buffer.from(JSON.stringify(cart)).toString("base64url");
  return `${body}.${hmac(body).toString("base64url")}`;
}

function isSnapshot(v: unknown): v is DomainQuoteSnapshot {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.domainName === "string" &&
    isQuoteOperation(s.operation) &&
    typeof s.years === "number" &&
    typeof s.currencyCode === "string" &&
    typeof s.priceConfigured === "boolean" &&
    typeof s.issuedAtMs === "number" &&
    typeof s.expiresAtMs === "number"
  );
}

function isCart(v: unknown): v is DomainCart {
  if (!v || typeof v !== "object") return false;
  const items = (v as Record<string, unknown>).items;
  return Array.isArray(items) && items.every(isSnapshot);
}

/** Verify signature + shape; returns the cart or null. Per-item expiry is the
 *  caller's responsibility (pruneCart). */
export function verifyCartToken(token: string | undefined | null): DomainCart | null {
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
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return isCart(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
