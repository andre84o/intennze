import "server-only";
import {
  HostupError,
  isHostupDomainId,
  parseHostupDomain,
  parseHostupDomainList,
  parseHostupNameserversResponse,
  parseHostupProblem,
  parseNextCursor,
  parseRateLimit,
  type HostupDomain,
  type HostupErrorCode,
  type HostupNameservers,
  type HostupPage,
  type HostupRateLimit,
} from "./types.ts";
import { normalizeDomainName } from "../domains/normalize.ts";

/**
 * Hostup API v2 client — SERVER-ONLY, READ-ONLY.
 *
 * - Bearer auth via HOSTUP_API_KEY (server-only env, NEVER NEXT_PUBLIC_).
 * - The API key is never logged and never placed in an error message.
 * - Timeouts via AbortController; RFC 7807 problem parsing; Retry-After on 429.
 * - This phase implements ONLY reads (scope read:domains). `request()` is GET-only;
 *   future writes must add method support, require write:* scopes, and re-verify
 *   admin server-side in the calling service. No mutating functions are exported.
 *
 * Env (read at CALL time so it is configurable/testable):
 *   HOSTUP_API_BASE_URL  default https://cloud.hostup.se/api/v2
 *   HOSTUP_API_KEY       required (Bearer token)
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_BASE_URL = "https://cloud.hostup.se/api/v2";

type HostupConfig = { apiKey: string; baseUrl: string };

function getConfig(): HostupConfig {
  const apiKey = process.env.HOSTUP_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new HostupError("HOSTUP_API_KEY is not set", "INVALID_CONFIG");
  }
  const baseUrl = (process.env.HOSTUP_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return { apiKey, baseUrl };
}

/** True iff the Hostup env is configured (lets callers degrade gracefully). */
export function isHostupConfigured(): boolean {
  return !!process.env.HOSTUP_API_KEY && process.env.HOSTUP_API_KEY.trim() !== "";
}

// Last rate-limit snapshot seen from any Hostup response (headers are the source
// of truth — the client assumes NO fixed limit). Informational; read via
// getHostupRateLimit() for logging/backoff decisions.
let lastRateLimit: HostupRateLimit | null = null;

/** The X-RateLimit-* values from the most recent Hostup response, if any. */
export function getHostupRateLimit(): HostupRateLimit | null {
  return lastRateLimit;
}

function statusToCode(status: number): HostupErrorCode {
  switch (status) {
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "VALIDATION";
    case 429:
      return "RATE_LIMITED";
    default:
      return status >= 500 ? "SERVER_ERROR" : "UNKNOWN";
  }
}

/** Parse a Retry-After header (delta-seconds or HTTP-date) into seconds. */
function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const secs = Number(header);
  if (Number.isFinite(secs)) return Math.max(0, Math.floor(secs));
  const when = Date.parse(header);
  if (Number.isFinite(when)) return Math.max(0, Math.round((when - Date.now()) / 1000));
  return undefined;
}

type RequestOpts<T> = {
  query?: Record<string, string | number | undefined>;
  timeoutMs?: number;
  parse: (json: unknown) => T;
};

/**
 * Low-level GET request. Handles auth, timeout, RFC 7807 errors, Retry-After.
 * Never logs or embeds the API key.
 */
async function request<T>(path: string, opts: RequestOpts<T>): Promise<T> {
  const { apiKey, baseUrl } = getConfig();

  const url = new URL(baseUrl + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new HostupError("Hostup request timed out", "TIMEOUT");
    }
    // Do NOT include the underlying message verbatim — it can't contain the key,
    // but keep it generic and stable.
    throw new HostupError("Hostup request failed", "NETWORK");
  } finally {
    clearTimeout(timeout);
  }

  // Rate-limit headers are the source of truth — capture on EVERY response
  // (success or error). We never assume a fixed limit.
  const rateLimit = parseRateLimit(response.headers);
  lastRateLimit = rateLimit;

  const bodyText = await response.text();

  if (!response.ok) {
    let problem;
    try {
      problem = parseHostupProblem(JSON.parse(bodyText));
    } catch {
      problem = undefined;
    }
    const retryAfter =
      response.status === 429 ? parseRetryAfter(response.headers.get("retry-after")) : undefined;
    throw new HostupError(
      `Hostup API error (${response.status})`,
      statusToCode(response.status),
      response.status,
      problem,
      retryAfter,
      rateLimit
    );
  }

  let json: unknown;
  try {
    json = bodyText === "" ? {} : JSON.parse(bodyText);
  } catch {
    throw new HostupError("Hostup returned a non-JSON response", "PARSE_ERROR", response.status);
  }
  return opts.parse(json);
}

// ── read-only functions ──────────────────────────────────────────────────────

/** List domains (one page). Pass the previous page's nextCursor to advance. */
export function listHostupDomains(
  opts: { cursor?: string; limit?: number } = {}
): Promise<HostupPage<HostupDomain>> {
  return request("/domains", {
    query: { cursor: opts.cursor, limit: opts.limit },
    parse: (json) => ({
      items: parseHostupDomainList(json),
      nextCursor: parseNextCursor(json),
    }),
  });
}

/** Iterate every page of domains, following cursors. Bounded to avoid runaway loops. */
export async function listAllHostupDomains(maxPages = 50): Promise<HostupDomain[]> {
  const all: HostupDomain[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await listHostupDomains({ cursor });
    all.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return all;
}

/** Find a domain by name (normalized first). Returns the match or null. */
export async function findHostupDomainByName(name: string): Promise<HostupDomain | null> {
  const normalized = normalizeDomainName(name);
  if (!normalized.ok) throw new HostupError("Invalid domain name", "VALIDATION");
  const page = await request("/domains", {
    query: { name: normalized.name },
    parse: (json) => ({ items: parseHostupDomainList(json), nextCursor: parseNextCursor(json) }),
  });
  return page.items.find((d) => d.name.toLowerCase() === normalized.name) ?? page.items[0] ?? null;
}

/** Fetch a single domain by its Hostup id (`dom_...`). */
export async function getHostupDomain(providerDomainId: string): Promise<HostupDomain> {
  if (!isHostupDomainId(providerDomainId)) {
    throw new HostupError("Invalid Hostup domain id", "VALIDATION");
  }
  return request(`/domains/${encodeURIComponent(providerDomainId)}`, {
    parse: (json) => {
      // Endpoint may wrap the object under data/domain, or return it directly.
      const obj =
        json && typeof json === "object" && !Array.isArray(json)
          ? ((json as Record<string, unknown>).data ??
            (json as Record<string, unknown>).domain ??
            json)
          : json;
      const domain = parseHostupDomain(obj);
      if (!domain) throw new HostupError("Malformed Hostup domain response", "PARSE_ERROR");
      return domain;
    },
  });
}

/** Fetch the authoritative nameservers for a domain by its Hostup id. */
export async function getHostupDomainNameservers(
  providerDomainId: string
): Promise<HostupNameservers> {
  if (!isHostupDomainId(providerDomainId)) {
    throw new HostupError("Invalid Hostup domain id", "VALIDATION");
  }
  return request(`/domains/${encodeURIComponent(providerDomainId)}/nameservers`, {
    parse: (json) => parseHostupNameserversResponse(json),
  });
}
