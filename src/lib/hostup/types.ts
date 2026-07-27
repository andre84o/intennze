/**
 * Hostup API v2 — types, error class, and defensive response parsers.
 *
 * Pure module (no network, no secrets, no server-only) so it can be unit-tested
 * and imported by the server client. The exact Hostup field names are not fully
 * documented publicly, so every parser is defensive: it reads known fields with
 * type guards, tolerates absence, and keeps the untouched object in `raw`.
 */

export type HostupErrorCode =
  | "INVALID_CONFIG" // missing/blank env
  | "UNAUTHORIZED" // 401
  | "FORBIDDEN" // 403 (e.g. missing read:domains scope)
  | "NOT_FOUND" // 404
  | "CONFLICT" // 409
  | "VALIDATION" // 422 (or bad input)
  | "RATE_LIMITED" // 429 (carries retryAfter)
  | "SERVER_ERROR" // 5xx
  | "TIMEOUT" // AbortError
  | "PARSE_ERROR" // non-JSON / malformed body
  | "NETWORK" // fetch threw
  | "UNKNOWN";

/** RFC 7807 problem + Hostup extension fields. */
export type HostupProblem = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  instance?: string;
  requestId?: string;
  timestamp?: string;
};

/** Rate-limit snapshot from response headers (source of truth — never assumed). */
export type HostupRateLimit = {
  limit: number | null; // X-RateLimit-Limit
  remaining: number | null; // X-RateLimit-Remaining
  reset: string | null; // X-RateLimit-Reset (raw; epoch or seconds-to-reset per Hostup)
};

/**
 * A Hostup API error. The message NEVER contains the API key. `problem` holds the
 * parsed RFC 7807 body when present; `retryAfter` is seconds (429); `rateLimit`
 * carries the response's X-RateLimit-* headers when present.
 */
export class HostupError extends Error {
  readonly code: HostupErrorCode;
  readonly status?: number;
  readonly problem?: HostupProblem;
  readonly retryAfter?: number;
  readonly rateLimit?: HostupRateLimit;

  constructor(
    message: string,
    code: HostupErrorCode,
    status?: number,
    problem?: HostupProblem,
    retryAfter?: number,
    rateLimit?: HostupRateLimit
  ) {
    super(message);
    this.name = "HostupError";
    this.code = code;
    this.status = status;
    this.problem = problem;
    this.retryAfter = retryAfter;
    this.rateLimit = rateLimit;
  }
}

/** Parse X-RateLimit-* headers into a snapshot (all fields tolerate absence). */
export function parseRateLimit(headers: Headers): HostupRateLimit {
  const num = (v: string | null): number | null => {
    if (v == null || v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    limit: num(headers.get("x-ratelimit-limit")),
    remaining: num(headers.get("x-ratelimit-remaining")),
    reset: headers.get("x-ratelimit-reset"),
  };
}

/** A Hostup domain (defensive projection; `raw` keeps the untouched object). */
export type HostupDomain = {
  id: string; // "dom_..."
  name: string;
  status: string | null; // free-form registrar status; mapped to our enum elsewhere
  registeredAt: string | null;
  expiresAt: string | null;
  autoRenew: boolean | null;
  locked: boolean | null;
  nameservers: string[];
  orderId: string | null; // "ord_..." if present
  raw: Record<string, unknown>;
};

export type HostupPage<T> = { items: T[]; nextCursor: string | null };
export type HostupNameservers = { nameservers: string[]; raw: Record<string, unknown> };

// ── parsing helpers (manual guards, no zod) ──────────────────────────────────
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function bool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}
function firstString(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const s = str(o[k]);
    if (s !== null) return s;
  }
  return null;
}
function firstBool(o: Record<string, unknown>, keys: string[]): boolean | null {
  for (const k of keys) {
    const b = bool(o[k]);
    if (b !== null) return b;
  }
  return null;
}

/** Extract a nameservers array from a variety of plausible shapes. */
export function parseNameservers(v: unknown): string[] {
  const src = isObject(v) ? v.nameservers ?? v.ns ?? v.data ?? v : v;
  if (!Array.isArray(src)) return [];
  const out: string[] = [];
  for (const item of src) {
    if (typeof item === "string" && item.trim() !== "") out.push(item.trim().toLowerCase());
    else if (isObject(item)) {
      const h = firstString(item, ["hostname", "host", "name", "nameserver"]);
      if (h) out.push(h.trim().toLowerCase());
    }
  }
  return out;
}

/** Parse a nameservers endpoint response into {nameservers, raw}. */
export function parseHostupNameserversResponse(v: unknown): HostupNameservers {
  // Unwrap a `{ data: {...} }` envelope before extracting the list.
  const inner = isObject(v) && isObject(v.data) ? v.data : v;
  return {
    nameservers: parseNameservers(inner),
    raw: isObject(v) ? v : {},
  };
}

/** True iff `v` looks like a Hostup domain id (`dom_...`). */
export function isHostupDomainId(v: unknown): v is string {
  return typeof v === "string" && /^dom_[A-Za-z0-9]+$/.test(v);
}

/** Defensive parse of a single Hostup domain object. Returns null if no id/name. */
export function parseHostupDomain(v: unknown): HostupDomain | null {
  if (!isObject(v)) return null;
  const id = firstString(v, ["id", "domainId", "domain_id"]);
  const name = firstString(v, ["name", "domain", "domainName", "domain_name"]);
  if (!id || !name) return null;
  return {
    id,
    name,
    status: firstString(v, ["status", "state"]),
    registeredAt: firstString(v, ["registeredAt", "registered_at", "createdAt", "created_at"]),
    expiresAt: firstString(v, ["expiresAt", "expires_at", "expiry", "expiryDate", "expires"]),
    autoRenew: firstBool(v, ["autoRenew", "auto_renew", "autorenew", "renew"]),
    locked: firstBool(v, ["locked", "lock", "registrarLock", "transferLock"]),
    nameservers: parseNameservers(v),
    orderId: firstString(v, ["orderId", "order_id", "orderid"]),
    raw: v,
  };
}

/** Extract the array of domain objects from a list envelope (data/items/domains/…). */
export function parseHostupDomainList(v: unknown): HostupDomain[] {
  const arr = Array.isArray(v)
    ? v
    : isObject(v)
      ? (v.data ?? v.items ?? v.domains ?? v.results)
      : null;
  if (!Array.isArray(arr)) return [];
  return arr.map(parseHostupDomain).filter((d): d is HostupDomain => d !== null);
}

/** Extract the opaque next-page cursor from a list envelope, if any. */
export function parseNextCursor(v: unknown): string | null {
  if (!isObject(v)) return null;
  const direct = firstString(v, ["nextCursor", "next_cursor", "cursor"]);
  if (direct) return direct;
  const meta = v.meta ?? v.pagination ?? v.page;
  if (isObject(meta)) return firstString(meta, ["nextCursor", "next_cursor", "cursor"]);
  return null;
}

/** Parse an RFC 7807 problem body (best-effort). */
export function parseHostupProblem(v: unknown): HostupProblem | undefined {
  if (!isObject(v)) return undefined;
  return {
    type: str(v.type) ?? undefined,
    title: str(v.title) ?? undefined,
    status: typeof v.status === "number" ? v.status : undefined,
    detail: str(v.detail) ?? undefined,
    code: str(v.code) ?? undefined,
    instance: str(v.instance) ?? undefined,
    requestId: str(v.requestId) ?? str(v.request_id) ?? undefined,
    timestamp: str(v.timestamp) ?? undefined,
  };
}
