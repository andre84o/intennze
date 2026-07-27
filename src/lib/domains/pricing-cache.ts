import "server-only";
import { cached, searchCacheKey } from "@/lib/hostup/search-cache";

/**
 * Pricing-rules cache — logically SEPARATE from the availability cache (though it
 * reuses the same in-process store utility). Short TTL for browsing; a version
 * counter is bumped on any admin rule change so every prior key is instantly
 * orphaned. The authoritative rule must still be re-resolved UNCACHED at
 * checkout/quote time — a cached browse price must never be committed to an order.
 */

const PRICING_TTL_MS = 60_000;

let rulesVersion = 0;

/** Bump after any admin create/update/activate/deactivate so caches drop. */
export function bumpPricingRulesVersion(): void {
  rulesVersion++;
}

/** Cache the active-rules load for a currency (short TTL, version-scoped). */
export function cachedPricingRules<T>(currency: string, fn: () => Promise<T>): Promise<T> {
  const key = searchCacheKey([
    "pricing-rules",
    rulesVersion,
    currency,
    Math.floor(Date.now() / PRICING_TTL_MS),
  ]);
  return cached(key, PRICING_TTL_MS, fn);
}
