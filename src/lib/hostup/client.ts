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
import {
  isDcheckJobId,
  parseAvailabilityJob,
  parseBulkAvailabilityResponse,
  parseDomainAvailability,
  parseDomainProduct,
  parseOrderPreview,
  parseTldList,
  type AvailabilityJob,
  type BulkAvailabilityResponse,
  type DomainAvailability,
  type DomainProduct,
  type OrderPreviewResult,
} from "./search-types.ts";

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
  // GET (default) plus a NARROW POST used only for read-style endpoints that
  // require a POST body (bulk availability, order preview). No mutating endpoint
  // (register/transfer/renew/order/dns) is ever called — see the exported fns.
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  timeoutMs?: number;
  parse: (json: unknown, status: number) => T;
};

/**
 * Low-level request. Handles auth, timeout, RFC 7807 errors, Retry-After, and
 * X-RateLimit-* capture. Never logs or embeds the API key. GET by default; POST
 * is used only for the read-style availability/preview endpoints.
 */
async function request<T>(path: string, opts: RequestOpts<T>): Promise<T> {
  const { apiKey, baseUrl } = getConfig();

  const url = new URL(baseUrl + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const method = opts.method ?? "GET";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
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
  return opts.parse(json, response.status);
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

// ── Phase 3A: read-only domain search / products / order preview ──────────────

function syntheticInvalid(name: string): DomainAvailability {
  return {
    name,
    tld: null,
    state: "invalid",
    unknownReason: null,
    actions: { canRegister: { allowed: false, reason: null }, canTransfer: { allowed: false, reason: null } },
    premium: null,
    requiresRegistrarFeeAcceptance: null,
    eppRequired: null,
    supportedRegisterYears: [],
    supportedTransferYears: [],
    existingDomainId: null,
    providerBilling: null,
    providerRenewalAmount: null,
    currencyCode: null,
    registryRequirements: null,
    raw: {},
  };
}

/** Single availability check (GET). Normalizes the name; invalid input → `invalid`. */
export function checkDomainAvailability(name: string, locale?: string): Promise<DomainAvailability> {
  const normalized = normalizeDomainName(name);
  if (!normalized.ok) return Promise.resolve(syntheticInvalid(name));
  return request(`/domains/availability`, {
    query: { name: normalized.name, locale },
    parse: (json) => parseDomainAvailability(json) ?? syntheticInvalid(normalized.name),
  });
}

/** Bulk availability (POST). Returns inline results (200) or a queued job (202). */
export function checkBulkDomainAvailability(
  names: string[],
  locale?: string
): Promise<BulkAvailabilityResponse> {
  const normalized = names
    .map((n) => normalizeDomainName(n))
    .filter((r): r is { ok: true; name: string } => r.ok)
    .map((r) => r.name);
  return request(`/domains/availability`, {
    method: "POST",
    body: { names: normalized, locale },
    parse: (json, status) => parseBulkAvailabilityResponse(json, status),
  });
}

/** Poll a bulk-availability job by its `dcheck_...` id (GET). */
export async function getDomainAvailabilityJob(jobId: string, locale?: string): Promise<AvailabilityJob> {
  if (!isDcheckJobId(jobId)) throw new HostupError("Invalid availability job id", "VALIDATION");
  return request(`/domains/availability/${encodeURIComponent(jobId)}`, {
    query: { locale },
    parse: (json) => parseAvailabilityJob(json),
  });
}

/** TLD product details incl. pricing, periods, registry requirements (GET). */
export async function getDomainProduct(tld: string, locale?: string): Promise<DomainProduct> {
  const clean = tld.trim().toLowerCase().replace(/^\.+/, "");
  if (!/^[a-z0-9.-]{2,}$/.test(clean)) throw new HostupError("Invalid TLD", "VALIDATION");
  return request(`/products/domains/${encodeURIComponent(clean)}`, {
    query: { locale },
    parse: (json) => {
      const p = parseDomainProduct(json);
      if (!p) throw new HostupError("Malformed Hostup product response", "PARSE_ERROR");
      return p;
    },
  });
}

/** List available domain TLDs (GET). */
export function listDomainProducts(locale?: string): Promise<string[]> {
  return request(`/products/domains`, { query: { locale }, parse: (json) => parseTldList(json) });
}

export type OrderPreviewItemInput = {
  action: "register" | "transfer";
  domainName: string;
  years: number;
};
export type OrderPreviewInput = { items: OrderPreviewItemInput[]; locale?: string };

/**
 * Dry-run order preview (POST /orders/preview). Prices an order draft; creates NO
 * order/invoice/registration. This is the ONLY POST beyond bulk availability and
 * is semantically read-only — no `write:orders` scope, no mutating endpoint.
 */
export function previewDomainOrder(input: OrderPreviewInput): Promise<OrderPreviewResult> {
  const items = input.items.map((it) => ({
    type: "domain" as const,
    action: it.action,
    domainName: it.domainName,
    years: it.years,
  }));
  return request(`/orders/preview`, {
    method: "POST",
    body: { items, locale: input.locale },
    parse: (json) => parseOrderPreview(json),
  });
}
