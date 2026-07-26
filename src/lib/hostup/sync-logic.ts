/**
 * Pure decision logic for Hostup sync — no network, no DB, no server-only.
 * Extracted so the interesting behavior (status mapping, cache-diff, idempotency,
 * "never touch customer_id") is unit-testable without a database.
 */
import { DOMAIN_STATUSES, isDomainStatus, type DomainStatus } from "../domains/types.ts";
import type { HostupDomain } from "./types.ts";

/**
 * Map a free-form Hostup status string to our DomainStatus enum, or null when it
 * cannot be mapped (caller then keeps the existing cached status — never writes
 * an invalid value that the DB CHECK would reject).
 */
export function mapHostupStatus(status: string | null | undefined): DomainStatus | null {
  if (!status || typeof status !== "string") return null;
  const s = status.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (isDomainStatus(s)) return s;

  // Lenient aliases for common registrar states.
  if (/(^|_)(active|registered|ok|live)($|_)/.test(s)) return "active";
  if (/transfer.*pending|pending.*transfer|transfer_in/.test(s)) return "transfer_pending";
  if (/transferred(_out)?|transfer_out/.test(s)) return "transferred_out";
  if (/(^|_)(pending|processing|new|creating)($|_)/.test(s)) return "pending";
  if (/(^|_)expired($|_)/.test(s)) return "expired";
  if (/suspend|hold|locked_out/.test(s)) return "suspended";
  if (/cancel/.test(s)) return "cancelled";
  if (/fail|error/.test(s)) return "failed";
  return null;
}

/** The subset of a local domain row that sync may refresh from Hostup (the cache). */
export type DomainCacheSnapshot = {
  status: DomainStatus;
  expires_at: string | null;
  auto_renew: boolean;
  locked: boolean;
  nameservers: string[];
};

export type CachePatchResult = {
  changed: boolean;
  /** DB patch — cache fields only; NEVER contains customer_id, name, or provider ids. */
  patch: Record<string, unknown>;
};

function sameInstant(a: string | null, b: string | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a === b;
  return ta === tb;
}

function sameNameservers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Compute the cache-only update patch for an existing local domain from a Hostup
 * record. Idempotent: returns `changed:false` and an empty patch when nothing
 * substantive differs (so the caller issues NO write and no audit/updated_at
 * churn). `now` is injected for determinism/testability. `last_synced_at` is
 * bumped ONLY when a real change is written.
 */
export function computeDomainCachePatch(
  existing: DomainCacheSnapshot,
  remote: HostupDomain,
  nameservers: string[],
  now: string
): CachePatchResult {
  const patch: Record<string, unknown> = {};

  const mapped = mapHostupStatus(remote.status);
  if (mapped !== null && mapped !== existing.status) patch.status = mapped;

  if (!sameInstant(existing.expires_at, remote.expiresAt)) patch.expires_at = remote.expiresAt;

  if (remote.autoRenew !== null && remote.autoRenew !== existing.auto_renew) {
    patch.auto_renew = remote.autoRenew;
  }
  if (remote.locked !== null && remote.locked !== existing.locked) {
    patch.locked = remote.locked;
  }

  // Nameservers come from the dedicated endpoint; only apply when we actually got some.
  if (nameservers.length > 0 && !sameNameservers(existing.nameservers, nameservers)) {
    patch.nameservers = nameservers;
  }

  const changed = Object.keys(patch).length > 0;
  if (changed) patch.last_synced_at = now;

  // Invariant: sync never reassigns ownership or renames.
  // (customer_id / name / provider_domain_id are intentionally absent above.)
  return { changed, patch };
}

/** All domain-status values (re-exported for callers/tests). */
export const ALL_DOMAIN_STATUSES: readonly DomainStatus[] = DOMAIN_STATUSES;
