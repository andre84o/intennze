/**
 * Domain model types, allowlists, and input validators.
 *
 * Separate create/update input shapes prevent mass-assignment: callers can only
 * ever set the fields listed here, and internal fields (customer link is set at
 * create, provider_domain_id, created_by, timestamps) are never mass-assignable
 * from a single free-form object. Validation is manual + allowlist-based to match
 * the project convention (no zod).
 */

// ── Enumerated values (mirror the DB text+CHECK constraints) ─────────────────
export const DOMAIN_STATUSES = [
  "pending",
  "active",
  "expired",
  "suspended",
  "transfer_pending",
  "transferred_out",
  "cancelled",
  "failed",
] as const;
export type DomainStatus = (typeof DOMAIN_STATUSES)[number];
const DOMAIN_STATUS_SET = new Set<string>(DOMAIN_STATUSES);
export function isDomainStatus(v: unknown): v is DomainStatus {
  return typeof v === "string" && DOMAIN_STATUS_SET.has(v);
}

export const DOMAIN_REGISTRARS = ["manual", "openprovider"] as const;
export type DomainRegistrar = (typeof DOMAIN_REGISTRARS)[number];

// ── Row shapes ───────────────────────────────────────────────────────────────
export type Domain = {
  id: string;
  created_at: string;
  updated_at: string;
  customer_id: string;
  name: string;
  status: DomainStatus;
  registrar: DomainRegistrar;
  provider_domain_id: string | null;
  registered_at: string | null;
  expires_at: string | null;
  auto_renew: boolean;
  locked: boolean;
  nameservers: string[];
  created_by: string | null;
  archived_at: string | null;
};

/** Columns safe to return in list/detail views — excludes nothing sensitive. */
export const DOMAIN_COLUMNS =
  "id, created_at, updated_at, customer_id, name, status, registrar, provider_domain_id, registered_at, expires_at, auto_renew, locked, nameservers, created_by, archived_at" as const;

export type DomainRegistrant = {
  id: string;
  created_at: string;
  updated_at: string;
  domain_id: string;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  state: string | null;
  country_code: string | null;
};

/** Registrant is sensitive — only selected explicitly, never in list queries. */
export const DOMAIN_REGISTRANT_COLUMNS =
  "id, created_at, updated_at, domain_id, first_name, last_name, organization, email, phone, address_line1, address_line2, city, postal_code, state, country_code" as const;

// ── Registrant input (shared by create + update) ─────────────────────────────
export type RegistrantInput = {
  first_name?: string | null;
  last_name?: string | null;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  state?: string | null;
  country_code?: string | null;
};

const REGISTRANT_FIELDS: readonly (keyof RegistrantInput)[] = [
  "first_name", "last_name", "organization", "email", "phone",
  "address_line1", "address_line2", "city", "postal_code", "state", "country_code",
] as const;

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** Whitelist + normalize registrant fields; validates ISO country code. */
export function sanitizeRegistrant(input: unknown): Validated<Record<string, string | null>> {
  if (input == null) return { ok: true, value: {} };
  if (typeof input !== "object") return { ok: false, error: "Invalid registrant." };

  const src = input as Record<string, unknown>;
  const out: Record<string, string | null> = {};
  for (const field of REGISTRANT_FIELDS) {
    out[field] = trimOrNull(src[field]);
  }
  if (out.country_code != null) {
    const cc = out.country_code.toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) return { ok: false, error: "country_code must be a 2-letter ISO code." };
    out.country_code = cc;
  }
  return { ok: true, value: out };
}

// ── Create input (admin creates a manual domain) ─────────────────────────────
export type CreateManualDomainInput = {
  customerId: string;
  name: string; // raw; the service normalizes it
  status?: DomainStatus;
  registeredAt?: string | null;
  expiresAt?: string | null;
  autoRenew?: boolean;
  locked?: boolean;
  nameservers?: string[];
  registrant?: RegistrantInput | null;
};

// ── Update input (admin patches allowed fields) ──────────────────────────────
// customer_id / provider_domain_id / created_by / name are intentionally NOT
// here — reassigning owner or provider id is out of scope for this phase and
// must not be mass-assignable. `name` is immutable post-create in 2A.
export type UpdateDomainInput = {
  status?: DomainStatus;
  registeredAt?: string | null;
  expiresAt?: string | null;
  autoRenew?: boolean;
  locked?: boolean;
  nameservers?: string[];
  archivedAt?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function validNameservers(v: unknown): v is string[] {
  return (
    Array.isArray(v) &&
    v.length <= 13 &&
    v.every((ns) => typeof ns === "string" && ns.trim().length > 0 && ns.length <= 253)
  );
}

/** Build the DB update patch from an UpdateDomainInput (allowlisted, no mass-assign). */
export function buildDomainUpdate(input: UpdateDomainInput): Validated<Record<string, unknown>> {
  const patch: Record<string, unknown> = {};

  if ("status" in input && input.status !== undefined) {
    if (!isDomainStatus(input.status)) return { ok: false, error: "Invalid status." };
    patch.status = input.status;
  }
  if ("autoRenew" in input && input.autoRenew !== undefined) {
    if (typeof input.autoRenew !== "boolean") return { ok: false, error: "auto_renew must be boolean." };
    patch.auto_renew = input.autoRenew;
  }
  if ("locked" in input && input.locked !== undefined) {
    if (typeof input.locked !== "boolean") return { ok: false, error: "locked must be boolean." };
    patch.locked = input.locked;
  }
  if ("nameservers" in input && input.nameservers !== undefined) {
    if (!validNameservers(input.nameservers)) return { ok: false, error: "Invalid nameservers." };
    patch.nameservers = input.nameservers.map((ns) => ns.trim().toLowerCase());
  }
  if ("registeredAt" in input) patch.registered_at = input.registeredAt ?? null;
  if ("expiresAt" in input) patch.expires_at = input.expiresAt ?? null;
  if ("archivedAt" in input) patch.archived_at = input.archivedAt ?? null;

  if (Object.keys(patch).length === 0) return { ok: false, error: "No valid fields to update." };
  return { ok: true, value: patch };
}
