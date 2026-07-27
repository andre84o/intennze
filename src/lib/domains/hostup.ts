import "server-only";
import { getEffectiveActor, type EffectiveActor } from "@/lib/auth/customerView";
import { getDomainForCurrentCustomer, type ServiceResult } from "@/lib/domains/service";
import { DOMAIN_COLUMNS, isUuid, type Domain } from "@/lib/domains/types";
import { normalizeDomainName } from "@/lib/domains/normalize";
import {
  getHostupDomain,
  getHostupDomainNameservers,
  isHostupConfigured,
  listAllHostupDomains,
} from "@/lib/hostup/client";
import { HostupError } from "@/lib/hostup/types";
import { computeDomainCachePatch, mapHostupStatus, type DomainCacheSnapshot } from "@/lib/hostup/sync-logic";

/**
 * Hostup integration service — SERVER-ONLY.
 *
 * The browser NEVER supplies a provider id for a read: the customer sends only a
 * LOCAL domain UUID; the server verifies ownership, reads the STORED
 * provider_domain_id, and only then calls Hostup. All writes require a REAL admin
 * (customer-view is never the write identity). Sync only refreshes cache fields —
 * it never changes customer_id, never deletes on transient errors, and is
 * idempotent. Audit goes through the log_hostup_event RPC with safe metadata only.
 */

function fail(error: string, status: number): { ok: false; error: string; status: number } {
  return { ok: false, error, status };
}

/** Transient Hostup failures must never cause local data loss. */
function isTransient(err: unknown): boolean {
  return (
    err instanceof HostupError &&
    (err.code === "TIMEOUT" || err.code === "NETWORK" || err.code === "SERVER_ERROR")
  );
}

async function requireAdmin(): Promise<
  { ok: true; actor: EffectiveActor } | { ok: false; error: string; status: number }
> {
  const actor = await getEffectiveActor();
  if (!actor.realUserId) return { ok: false, error: "Not authenticated.", status: 401 };
  if (actor.realRole !== "admin") return { ok: false, error: "Forbidden.", status: 403 };
  return { ok: true, actor };
}

/** Fire-and-safe audit write (never throws into the operation). */
async function audit(
  actor: EffectiveActor,
  action: "HOSTUP_DOMAIN_SYNCED" | "HOSTUP_DOMAIN_LINKED_TO_CUSTOMER" | "HOSTUP_SYNC_FAILED",
  opts: {
    domainId?: string | null;
    providerDomainId?: string | null;
    outcome?: "success" | "error";
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await actor.supabase.rpc("log_hostup_event", {
      p_action: action,
      p_domain_id: opts.domainId ?? null,
      p_provider_domain_id: opts.providerDomainId ?? null,
      p_effective_user_id: actor.effectiveUserId,
      p_outcome: opts.outcome ?? "success",
      p_metadata: opts.metadata ?? {},
    });
  } catch (err) {
    console.error("[hostup.audit]", action, err instanceof Error ? err.message : "unknown");
  }
}

function snapshotOf(row: Domain): DomainCacheSnapshot {
  return {
    status: row.status,
    expires_at: row.expires_at,
    auto_renew: row.auto_renew,
    locked: row.locked,
    nameservers: row.nameservers ?? [],
  };
}

async function safeNameservers(providerDomainId: string): Promise<string[]> {
  try {
    return (await getHostupDomainNameservers(providerDomainId)).nameservers;
  } catch {
    return [];
  }
}

// ── Sync ──────────────────────────────────────────────────────────────────────

export type SyncOutcome =
  | "updated"
  | "unchanged"
  | "unlinked"
  | "not_found_remote";

/** Read one Hostup domain and refresh the matching local row's cache (if linked). */
export async function syncHostupDomain(
  providerDomainId: string
): Promise<ServiceResult<{ outcome: SyncOutcome; domainId?: string; changedFields?: string[] }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error, guard.status);
  if (!isHostupConfigured()) return fail("The provider is not configured.", 503);

  let remote;
  try {
    remote = await getHostupDomain(providerDomainId);
  } catch (err) {
    if (err instanceof HostupError && err.code === "NOT_FOUND") {
      return { ok: true, data: { outcome: "not_found_remote" } };
    }
    if (isTransient(err)) {
      await audit(guard.actor, "HOSTUP_SYNC_FAILED", {
        providerDomainId,
        outcome: "error",
        metadata: { reason: "transient" },
      });
      return fail("The provider is temporarily unavailable.", 502);
    }
    return fail("Could not read the domain from the provider.", 502);
  }

  const { data: row } = await guard.actor.supabase
    .from("domains")
    .select(DOMAIN_COLUMNS)
    .eq("registrar", "hostup")
    .eq("provider_domain_id", providerDomainId)
    .maybeSingle();

  if (!row) return { ok: true, data: { outcome: "unlinked" } };

  const local = row as Domain;
  const ns = await safeNameservers(providerDomainId);
  const { changed, patch } = computeDomainCachePatch(
    snapshotOf(local),
    remote,
    ns,
    new Date().toISOString()
  );

  if (!changed) return { ok: true, data: { outcome: "unchanged", domainId: local.id } };

  const { error } = await guard.actor.supabase.from("domains").update(patch).eq("id", local.id);
  if (error) {
    console.error("[hostup.sync:update]", error.message);
    return fail("Could not update the domain cache.", 500);
  }

  const changedFields = Object.keys(patch).filter((k) => k !== "last_synced_at");
  await audit(guard.actor, "HOSTUP_DOMAIN_SYNCED", {
    domainId: local.id,
    providerDomainId,
    metadata: { outcome: "updated", changed_fields: changedFields },
  });
  return { ok: true, data: { outcome: "updated", domainId: local.id, changedFields } };
}

export type SyncBatchResult = {
  counts: { total: number; updated: number; unchanged: number; unlinked: number; failed: number };
  unlinkedPreview: { providerDomainId: string; name: string }[];
};

/** Refresh cache for all locally-linked Hostup domains; list unlinked as preview. */
export async function syncHostupDomains(): Promise<ServiceResult<SyncBatchResult>> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error, guard.status);
  if (!isHostupConfigured()) return fail("The provider is not configured.", 503);

  let remotes;
  try {
    remotes = await listAllHostupDomains();
  } catch (err) {
    if (isTransient(err)) return fail("The provider is temporarily unavailable.", 502);
    return fail("Could not list domains from the provider.", 502);
  }

  const { data: localRows } = await guard.actor.supabase
    .from("domains")
    .select(DOMAIN_COLUMNS)
    .eq("registrar", "hostup");

  const byProviderId = new Map<string, Domain>();
  for (const r of (localRows ?? []) as Domain[]) {
    if (r.provider_domain_id) byProviderId.set(r.provider_domain_id, r);
  }

  const counts = { total: remotes.length, updated: 0, unchanged: 0, unlinked: 0, failed: 0 };
  const unlinkedPreview: { providerDomainId: string; name: string }[] = [];
  const now = new Date().toISOString();

  for (const remote of remotes) {
    try {
      const local = byProviderId.get(remote.id);
      if (!local) {
        counts.unlinked++;
        unlinkedPreview.push({ providerDomainId: remote.id, name: remote.name });
        continue;
      }
      const ns = await safeNameservers(remote.id);
      const { changed, patch } = computeDomainCachePatch(snapshotOf(local), remote, ns, now);
      if (!changed) {
        counts.unchanged++;
        continue;
      }
      const { error } = await guard.actor.supabase.from("domains").update(patch).eq("id", local.id);
      if (error) {
        counts.failed++;
        continue;
      }
      counts.updated++;
    } catch {
      // Per-domain transient failure: skip, never delete, keep going.
      counts.failed++;
    }
  }

  await audit(guard.actor, "HOSTUP_DOMAIN_SYNCED", { metadata: { counts } });
  if (counts.failed > 0) {
    await audit(guard.actor, "HOSTUP_SYNC_FAILED", {
      outcome: "error",
      metadata: { failed: counts.failed, total: counts.total },
    });
  }

  return { ok: true, data: { counts, unlinkedPreview } };
}

// ── Link ──────────────────────────────────────────────────────────────────────

/** Admin links a verified Hostup domain to a portal customer. */
export async function linkHostupDomainToCustomer(input: {
  providerDomainId: string;
  customerId: string;
}): Promise<ServiceResult<{ domain_id: string; status: string }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return fail(guard.error, guard.status);
  // Customer-view must never create/change the ownership link.
  if (guard.actor.isCustomerView) return fail("Customer-view cannot link domains.", 403);
  if (!isHostupConfigured()) return fail("The provider is not configured.", 503);

  if (!isUuid(input?.customerId)) return fail("A valid customer is required.", 400);
  const providerDomainId = input?.providerDomainId;
  if (typeof providerDomainId !== "string" || !/^dom_[A-Za-z0-9]+$/.test(providerDomainId)) {
    return fail("Invalid provider domain id.", 400);
  }

  // Server-verify the domain against Hostup — never trust the id from the client.
  let remote;
  try {
    remote = await getHostupDomain(providerDomainId);
  } catch (err) {
    if (err instanceof HostupError && err.code === "NOT_FOUND") {
      return fail("Domain not found at provider.", 404);
    }
    if (isTransient(err)) return fail("The provider is temporarily unavailable.", 502);
    return fail("Could not verify the domain with the provider.", 502);
  }

  const normalized = normalizeDomainName(remote.name);
  if (!normalized.ok) return fail("Provider returned an invalid domain name.", 502);
  const ns = await safeNameservers(providerDomainId);
  const status = mapHostupStatus(remote.status) ?? "pending";

  const { data, error } = await guard.actor.supabase.rpc("link_hostup_domain", {
    p_provider_domain_id: providerDomainId,
    p_customer_id: input.customerId,
    p_name: normalized.name,
    p_order_id: remote.orderId,
    p_status: status,
    p_expires_at: remote.expiresAt,
    p_auto_renew: remote.autoRenew ?? false,
    p_locked: remote.locked ?? false,
    p_nameservers: ns,
  });

  if (error) {
    if (error.code === "23505") return fail("This domain is already linked.", 409);
    if (error.code === "P0001") return fail(error.message, 400);
    console.error("[hostup.link]", error.message);
    return fail("Could not link the domain.", 500);
  }

  const result = data as { domain_id: string; status: string };
  await audit(guard.actor, "HOSTUP_DOMAIN_LINKED_TO_CUSTOMER", {
    domainId: result.domain_id,
    providerDomainId,
    metadata: {
      customer_id: input.customerId,
      link_status: result.status,
      provider_order_id: remote.orderId ?? null,
    },
  });
  return { ok: true, data: result };
}

// ── Ownership-verified customer read ───────────────────────────────────────────

export type CustomerHostupInfo =
  | { linked: false }
  | {
      linked: true;
      providerDomainId: string;
      status: string | null;
      registeredAt: string | null;
      expiresAt: string | null;
      autoRenew: boolean | null;
      locked: boolean | null;
      nameservers: string[];
    };

/**
 * Live Hostup info for ONE of the current customer's own domains. Ownership is
 * enforced first (via getDomainForCurrentCustomer → RLS / customer-view scope);
 * the provider id is read from the owned local row, NEVER from the caller.
 */
export async function getHostupInfoForCustomerDomain(
  localDomainId: string
): Promise<ServiceResult<CustomerHostupInfo>> {
  const owned = await getDomainForCurrentCustomer(localDomainId);
  if (!owned.ok) return owned;

  const providerDomainId = owned.data.provider_domain_id;
  if (owned.data.registrar !== "hostup" || !providerDomainId) {
    return { ok: true, data: { linked: false } };
  }
  if (!isHostupConfigured()) return fail("The provider is not configured.", 503);

  try {
    const remote = await getHostupDomain(providerDomainId);
    const ns = await safeNameservers(providerDomainId);
    return {
      ok: true,
      data: {
        linked: true,
        providerDomainId,
        status: remote.status,
        registeredAt: remote.registeredAt,
        expiresAt: remote.expiresAt,
        autoRenew: remote.autoRenew,
        locked: remote.locked,
        nameservers: ns.length > 0 ? ns : remote.nameservers,
      },
    };
  } catch (err) {
    if (err instanceof HostupError && err.code === "NOT_FOUND") {
      return fail("Domain not found at provider.", 404);
    }
    if (isTransient(err)) return fail("The provider is temporarily unavailable.", 502);
    return fail("Could not read the domain from the provider.", 502);
  }
}
