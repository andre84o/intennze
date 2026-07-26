import "server-only";
import { getEffectiveActor } from "@/lib/auth/customerView";
import { normalizeDomainName } from "@/lib/domains/normalize";
import {
  DOMAIN_COLUMNS,
  DOMAIN_REGISTRANT_COLUMNS,
  buildDomainUpdate,
  isDomainStatus,
  isUuid,
  sanitizeRegistrant,
  type CreateManualDomainInput,
  type Domain,
  type DomainRegistrant,
  type UpdateDomainInput,
  type RegistrantInput,
} from "@/lib/domains/types";

/**
 * Domain service layer — the ONLY place domain data access + authorization live.
 * Route handlers / server actions / components call these; they never touch
 * Supabase for domains directly.
 *
 * Authorization is always server-side:
 *   • Customer reads resolve the effective actor (getEffectiveActor). A REAL
 *     customer is scoped by RLS; an ADMIN in customer-view is scoped in-code to
 *     the previewed customer (admin RLS would otherwise return every domain).
 *   • All writes require the REAL user to be an active admin — customer-view is
 *     read-only for domains, so realUserId always stays the admin and the audit
 *     actor is never the customer.
 */

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

function fail(error: string, status: number): { ok: false; error: string; status: number } {
  return { ok: false, error, status };
}

// ── Customer-facing reads ─────────────────────────────────────────────────────

/**
 * Domains for the current portal customer. A real customer sees only their own
 * (RLS); an admin in customer-view sees the previewed customer's domains only.
 * Registrant data is intentionally excluded (sensitive; separate fetch).
 */
export async function getDomainsForCurrentCustomer(): Promise<ServiceResult<Domain[]>> {
  const actor = await getEffectiveActor();
  if (!actor.realUserId) return fail("Not authenticated.", 401);

  if (!actor.isCustomerView && actor.realRole !== "customer") {
    return fail("Forbidden.", 403);
  }

  let query = actor.supabase
    .from("domains")
    .select(DOMAIN_COLUMNS)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  // Admin RLS returns ALL domains — scope to the previewed customer in-code.
  if (actor.isCustomerView && actor.viewedCustomerId) {
    query = query.eq("customer_id", actor.viewedCustomerId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[domains.getForCurrentCustomer]", error.message);
    return fail("Could not load domains.", 500);
  }
  return { ok: true, data: (data ?? []) as Domain[] };
}

/** A single domain for the current portal customer (ownership enforced). */
export async function getDomainForCurrentCustomer(
  domainId: string
): Promise<ServiceResult<Domain>> {
  if (!isUuid(domainId)) return fail("Invalid domain id.", 400);

  const actor = await getEffectiveActor();
  if (!actor.realUserId) return fail("Not authenticated.", 401);
  if (!actor.isCustomerView && actor.realRole !== "customer") return fail("Forbidden.", 403);

  let query = actor.supabase.from("domains").select(DOMAIN_COLUMNS).eq("id", domainId);
  if (actor.isCustomerView && actor.viewedCustomerId) {
    query = query.eq("customer_id", actor.viewedCustomerId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("[domains.getForCurrentCustomer:one]", error.message);
    return fail("Could not load domain.", 500);
  }
  if (!data) return fail("Domain not found.", 404);
  return { ok: true, data: data as Domain };
}

/** The current customer's registrant for one of their domains (explicit fetch). */
export async function getRegistrantForCurrentCustomer(
  domainId: string
): Promise<ServiceResult<DomainRegistrant | null>> {
  if (!isUuid(domainId)) return fail("Invalid domain id.", 400);

  // Ownership is enforced first via the domain read (RLS / customer-view scope).
  const owned = await getDomainForCurrentCustomer(domainId);
  if (!owned.ok) return owned;

  const actor = await getEffectiveActor();
  const { data, error } = await actor.supabase
    .from("domain_registrants")
    .select(DOMAIN_REGISTRANT_COLUMNS)
    .eq("domain_id", domainId)
    .maybeSingle();
  if (error) {
    console.error("[domains.getRegistrantForCurrentCustomer]", error.message);
    return fail("Could not load registrant.", 500);
  }
  return { ok: true, data: (data as DomainRegistrant) ?? null };
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function requireAdminActor() {
  const actor = await getEffectiveActor();
  if (!actor.realUserId) return { ok: false as const, error: "Not authenticated.", status: 401 };
  if (actor.realRole !== "admin") return { ok: false as const, error: "Forbidden.", status: 403 };
  return { ok: true as const, actor };
}

/** All domains (admin). Excludes archived unless includeArchived is set. */
export async function getDomainsForAdmin(
  includeArchived = false
): Promise<ServiceResult<Domain[]>> {
  const guard = await requireAdminActor();
  if (!guard.ok) return fail(guard.error, guard.status);

  let query = guard.actor.supabase
    .from("domains")
    .select(DOMAIN_COLUMNS)
    .order("created_at", { ascending: false });
  if (!includeArchived) query = query.is("archived_at", null);

  const { data, error } = await query;
  if (error) {
    console.error("[domains.getForAdmin]", error.message);
    return fail("Could not load domains.", 500);
  }
  return { ok: true, data: (data ?? []) as Domain[] };
}

/** A single domain (admin), with its registrant. */
export async function getDomainForAdmin(
  domainId: string
): Promise<ServiceResult<{ domain: Domain; registrant: DomainRegistrant | null }>> {
  if (!isUuid(domainId)) return fail("Invalid domain id.", 400);
  const guard = await requireAdminActor();
  if (!guard.ok) return fail(guard.error, guard.status);

  const { data: domain, error } = await guard.actor.supabase
    .from("domains")
    .select(DOMAIN_COLUMNS)
    .eq("id", domainId)
    .maybeSingle();
  if (error) {
    console.error("[domains.getForAdmin:one]", error.message);
    return fail("Could not load domain.", 500);
  }
  if (!domain) return fail("Domain not found.", 404);

  const { data: registrant, error: rErr } = await guard.actor.supabase
    .from("domain_registrants")
    .select(DOMAIN_REGISTRANT_COLUMNS)
    .eq("domain_id", domainId)
    .maybeSingle();
  if (rErr) {
    console.error("[domains.getForAdmin:registrant]", rErr.message);
    return fail("Could not load registrant.", 500);
  }

  return {
    ok: true,
    data: { domain: domain as Domain, registrant: (registrant as DomainRegistrant) ?? null },
  };
}

/**
 * Create a manual domain (admin). Normalizes the name in-code (IDN/punycode),
 * validates status + registrant, and delegates the atomic insert (domain +
 * registrant in one transaction) to the create_manual_domain RPC.
 */
export async function createManualDomain(
  input: CreateManualDomainInput
): Promise<ServiceResult<{ id: string }>> {
  const guard = await requireAdminActor();
  if (!guard.ok) return fail(guard.error, guard.status);

  if (!isUuid(input?.customerId)) return fail("A valid customer is required.", 400);

  const normalized = normalizeDomainName(input?.name);
  if (!normalized.ok) return fail(normalized.reason, 400);

  const status = input?.status ?? "pending";
  if (!isDomainStatus(status)) return fail("Invalid status.", 400);

  const registrant = sanitizeRegistrant(input?.registrant);
  if (!registrant.ok) return fail(registrant.error, 400);
  const hasRegistrant = Object.values(registrant.value).some((v) => v != null);

  const nameservers = Array.isArray(input?.nameservers)
    ? input.nameservers
        .filter((ns): ns is string => typeof ns === "string" && ns.trim() !== "")
        .map((ns) => ns.trim().toLowerCase())
    : [];

  const { data, error } = await guard.actor.supabase.rpc("create_manual_domain", {
    p_customer_id: input.customerId,
    p_name: normalized.name,
    p_status: status,
    p_registered_at: input?.registeredAt ?? null,
    p_expires_at: input?.expiresAt ?? null,
    p_auto_renew: input?.autoRenew ?? false,
    p_locked: input?.locked ?? false,
    p_nameservers: nameservers,
    p_registrant: hasRegistrant ? registrant.value : null,
  });

  if (error) {
    if (error.code === "23505") {
      return fail("A domain with this name already exists.", 409);
    }
    // Our RPC raises user-safe messages (P0001) for admin/customer/normalization
    // checks; surface those, genericize anything else.
    if (error.code === "P0001") return fail(error.message, 400);
    console.error("[domains.createManual]", error.message);
    return fail("Could not create the domain.", 500);
  }

  return { ok: true, data: { id: data as string } };
}

/** Update allowed domain fields (admin). No mass-assignment; RLS blocks non-admin. */
export async function updateDomain(
  domainId: string,
  input: UpdateDomainInput
): Promise<ServiceResult<Domain>> {
  if (!isUuid(domainId)) return fail("Invalid domain id.", 400);
  const guard = await requireAdminActor();
  if (!guard.ok) return fail(guard.error, guard.status);

  const patch = buildDomainUpdate(input);
  if (!patch.ok) return fail(patch.error, 400);

  const { data, error } = await guard.actor.supabase
    .from("domains")
    .update(patch.value)
    .eq("id", domainId)
    .select(DOMAIN_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[domains.update]", error.message);
    return fail("Could not update the domain.", 500);
  }
  if (!data) return fail("Domain not found.", 404);
  return { ok: true, data: data as Domain };
}

/** Create or update a domain's registrant (admin), whitelisted fields only. */
export async function updateDomainRegistrant(
  domainId: string,
  input: RegistrantInput
): Promise<ServiceResult<{ domain_id: string }>> {
  if (!isUuid(domainId)) return fail("Invalid domain id.", 400);
  const guard = await requireAdminActor();
  if (!guard.ok) return fail(guard.error, guard.status);

  const clean = sanitizeRegistrant(input);
  if (!clean.ok) return fail(clean.error, 400);

  // Confirm the domain exists (admin RLS) before writing a registrant.
  const { data: domain, error: dErr } = await guard.actor.supabase
    .from("domains")
    .select("id")
    .eq("id", domainId)
    .maybeSingle();
  if (dErr) {
    console.error("[domains.updateRegistrant:domain]", dErr.message);
    return fail("Could not load domain.", 500);
  }
  if (!domain) return fail("Domain not found.", 404);

  const { error } = await guard.actor.supabase
    .from("domain_registrants")
    .upsert({ domain_id: domainId, ...clean.value }, { onConflict: "domain_id" });

  if (error) {
    console.error("[domains.updateRegistrant]", error.message);
    return fail("Could not update the registrant.", 500);
  }
  return { ok: true, data: { domain_id: domainId } };
}
