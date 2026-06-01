import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Centralised rate limiters. Each is null if Upstash env vars are missing —
// callers must treat null as "no limit configured" (fail-open). This matches
// the existing pattern in /api/contact and keeps dev environments without
// Redis fully functional.

const upstashConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

function makeLimiter(prefix: string, requests: number, window: `${number} ${"s" | "m"}`) {
  if (!upstashConfigured) return null;
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    // Unique prefix per limiter — otherwise instances with the same window
    // share the same Redis key for a given identifier and one endpoint's
    // burst would exhaust another endpoint's budget.
    prefix: `ratelimit:${prefix}`,
  });
}

export const analyticsLimiter = makeLimiter("analytics", 120, "1 m");
export const questionnaireRespondLimiter = makeLimiter("q-respond", 5, "1 m");
export const quoteRespondLimiter = makeLimiter("quote-respond", 5, "1 m");
export const formOpenLimiter = makeLimiter("form-open", 20, "1 m");
export const webhookGetLimiter = makeLimiter("webhook-get", 60, "1 m");
export const crmEmailSendLimiter = makeLimiter("crm-email-send", 10, "1 m");
// 3/min: each generation calls 2 providers in parallel, so cost per request is doubled
export const crmEmailSuggestionsLimiter = makeLimiter("crm-email-suggestions", 3, "1 m");
// Mobile Call Companion. Outcome is fail-closed in production when missing
// (see /api/call/outcome); the session endpoints fail open like the rest.
export const callOutcomeLimiter = makeLimiter("call-outcome", 30, "1 m");
export const callSessionLimiter = makeLimiter("call-session", 60, "1 m");

// Extract the originating client IP from the request. On Vercel the platform
// sets `x-forwarded-for` to the real client; the first entry is canonical.
// Falls back to `x-real-ip` and finally a fixed sentinel so a missing header
// doesn't bypass the limiter (all sentinel-keyed requests share the same
// bucket — strict by design).
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  return "anonymous";
}

export type LimiterResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

// Convenience: run a limiter and fail open on Redis errors. Returns null if
// the limiter is not configured at all.
export async function tryLimit(
  limiter: Ratelimit | null,
  key: string
): Promise<LimiterResult | null> {
  if (!limiter) return null;
  try {
    const r = await limiter.limit(key);
    return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
  } catch {
    return null;
  }
}

export function rateLimitHeaders(r: LimiterResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": r.limit.toString(),
    "X-RateLimit-Remaining": r.remaining.toString(),
    "X-RateLimit-Reset": r.reset.toString(),
  };
}
