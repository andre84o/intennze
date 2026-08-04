/**
 * Server-authoritative idle-session timestamp: a signed, httpOnly cookie that
 * ONLY the server can write. It records the last server-approved activity time
 * so an inactive session is logged out even after the tab is closed, a new tab
 * is opened, the machine sleeps, or the browser is reopened — none of which a
 * client-side timer survives.
 *
 * EDGE-SAFE: this module uses the Web Crypto API (`crypto.subtle`), NOT Node's
 * `crypto`, so it can be imported by BOTH the Edge middleware (`src/proxy.ts`)
 * and Node route handlers. Do NOT add `server-only` or `node:crypto` here — that
 * would break the middleware bundle. (Contrast `customerView.ts`, which is
 * Node-only and must never reach the middleware.)
 *
 * The signing key is a DEDICATED secret (`IDLE_SESSION_SECRET`) with NO fallback
 * to any other key — a missing/weak secret fails loudly rather than silently
 * reusing a more sensitive credential for an unrelated purpose.
 */

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const ACTIVITY_COOKIE = "sb_admin_last_activity";

/**
 * Resolve the HMAC secret. Lazy (called inside functions, never at module load)
 * so merely importing this file can never crash an unrelated build/route. A
 * missing or too-short secret throws — no insecure default is ever used.
 */
function getSecret(): string {
  const secret = process.env.IDLE_SESSION_SECRET;
  // Validate the actual BYTE length (not `.length`, which counts UTF-16 code
  // units) so a short/empty key is rejected regardless of encoding.
  const byteLength = secret ? new TextEncoder().encode(secret).byteLength : 0;
  if (!secret || byteLength < 32) {
    throw new Error(
      `IDLE_SESSION_SECRET is missing or too short (got ${byteLength} bytes, need >= 32). ` +
        "Generate a random 32+ byte secret and set it in .env.local and in Vercel env " +
        "vars. There is intentionally NO fallback to another key."
    );
  }
  return secret;
}

let keyPromise: Promise<CryptoKey> | null = null;
function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    // getSecret() runs synchronously here; if it throws, keyPromise stays null
    // and the next call retries (e.g. after the env var is set).
    keyPromise = crypto.subtle.importKey(
      "raw",
      utf8(getSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return keyPromise;
}

/** UTF-8 encode into an ArrayBuffer-backed view (strict BufferSource). */
function utf8(str: string): Uint8Array<ArrayBuffer> {
  const s = new TextEncoder().encode(str);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  out.set(s);
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  // Back the view with a plain ArrayBuffer so it satisfies BufferSource strictly.
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Build a tamper-evident token: `<ts>.<base64url(hmac(ts))>`. */
export async function signActivity(ts: number): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, utf8(String(ts)));
  return `${ts}.${toBase64Url(new Uint8Array(sig))}`;
}

/** Verify the signature and return the timestamp, or null if missing/invalid. */
export async function verifyActivity(
  token: string | undefined | null
): Promise<number | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;

  const tsPart = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);
  const ts = Number(tsPart);
  if (!Number.isFinite(ts)) return null;

  let sigBytes: Uint8Array<ArrayBuffer>;
  try {
    sigBytes = fromBase64Url(sigPart);
  } catch {
    return null;
  }

  const key = await getKey();
  // subtle.verify is a constant-time comparison against the recomputed HMAC.
  const ok = await crypto.subtle.verify("HMAC", key, sigBytes, utf8(String(ts)));
  return ok ? ts : null;
}

export function isIdleExpired(ts: number, now: number): boolean {
  return now - ts > IDLE_TIMEOUT_MS;
}

/**
 * Cookie options shared by every writer. `httpOnly` keeps the timestamp out of
 * JS so a client can never extend its own session; `maxAge` lets the browser
 * drop the cookie on its own once the window passes.
 */
export function activityCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(IDLE_TIMEOUT_MS / 1000),
  };
}
