import "server-only";
import crypto from "crypto";
import type { DomainQuoteSnapshot } from "@/lib/domains/quote";
import { isQuoteOperation } from "@/lib/domains/quote";

/**
 * Signed, tamper-evident cookie for a PREPARED domain quote. Mirrors the
 * customer-view cookie design (HMAC-SHA256 over base64url JSON, constant-time
 * compare) but with a DISTINCT cookie name so it never collides with the
 * customer-view (`cv`) or auth cookies.
 *
 * The cookie only remembers a customer's prepared intent + the sale price the
 * SERVER computed. It is never trusted for authorization and the price is always
 * recomputed server-side before display; the signature merely detects tampering.
 * Server-only: never imported by client code or the Edge middleware.
 */

export const DOMAIN_QUOTE_COOKIE = "dq";

function signingSecret(): string {
  const secret =
    process.env.CUSTOMER_VIEW_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Quote cookie signing secret is not configured.");
  }
  return secret;
}

function hmac(body: string): Buffer {
  return crypto.createHmac("sha256", signingSecret()).update(body).digest();
}

/** base64url(payload).base64url(hmac) */
export function signQuoteToken(snapshot: DomainQuoteSnapshot): string {
  const body = Buffer.from(JSON.stringify(snapshot)).toString("base64url");
  const sig = hmac(body).toString("base64url");
  return `${body}.${sig}`;
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

/** Verify the signature and shape; returns the snapshot or null. Expiry is the
 *  caller's responsibility (isQuoteExpired) so an expired quote can be reported
 *  distinctly from a tampered one. */
export function verifyQuoteToken(token: string | undefined | null): DomainQuoteSnapshot | null {
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
    return isSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
