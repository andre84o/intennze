import "server-only";

/**
 * Tiny server-side cache + single-flight for identical domain-search calls.
 * Short TTL (availability changes fast). In-process (per instance) — cheap, no
 * new deps; single-flight coalesces concurrent identical calls (two tabs / rapid
 * re-search) so we don't fan out duplicate Hostup requests. Fail-safe: any issue
 * just falls through to a live call.
 */

type Entry = { value: unknown; expires: number };
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 500;

function prune(now: number) {
  if (store.size < MAX_ENTRIES) return;
  for (const [k, e] of store) if (e.expires <= now) store.delete(k);
}

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const p = (async () => {
    const value = await fn();
    store.set(key, { value, expires: Date.now() + ttlMs });
    prune(Date.now());
    return value;
  })().finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p as Promise<T>;
}

export function searchCacheKey(parts: (string | number | undefined | null)[]): string {
  return parts.map((p) => (p == null ? "" : String(p))).join("|").toLowerCase();
}
