/**
 * Hostup v2 domain-search / product / order-preview types + defensive parsers.
 *
 * Pure module (no network, no secrets, no server-only) — unit-testable and shared
 * by the server client. Field names are the CONFIRMED live shapes (probed against
 * the real API; developer.hostup.se blocks doc fetching). Parsers stay tolerant
 * (multiple key spellings, keep `raw`) so minor drift never crashes the client.
 *
 * IMPORTANT: every monetary field here is Hostup's PROVIDER (purchase) price and
 * is named `provider*` so it can never be mislabelled as an Intennze sale price.
 * Customer sale price is computed separately (src/lib/pricing.ts) and is the ONLY
 * amount that may reach a CUSTOMER.
 */

// ── tiny local guards (self-contained; keeps this module dependency-free) ────
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function bool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function firstString(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const s = str(o[k]);
    if (s !== null) return s;
  }
  return null;
}
function numberArray(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((n): n is number => typeof n === "number" && Number.isFinite(n)) : [];
}

// ── enums ─────────────────────────────────────────────────────────────────────
export const AVAILABILITY_STATES = [
  "available",
  "unavailable",
  "unknown",
  "already_owned",
  "checking",
  "invalid",
] as const;
export type AvailabilityState = (typeof AVAILABILITY_STATES)[number];
const STATE_SET = new Set<string>(AVAILABILITY_STATES);

/** Map a raw Hostup state string to our enum (never reduce to a boolean). */
export function mapAvailabilityState(raw: unknown, available?: unknown): AvailabilityState {
  const s = typeof raw === "string" ? raw.toLowerCase().trim().replace(/[\s-]+/g, "_") : "";
  if (STATE_SET.has(s)) return s as AvailabilityState;
  // Aliases seen / plausible from the registrar.
  if (/already.?owned|owned|in_account/.test(s)) return "already_owned";
  if (/taken|registered|unavailable/.test(s)) return "unavailable";
  if (/invalid|unsupported/.test(s)) return "invalid";
  if (/checking|processing|pending|queued/.test(s)) return "checking";
  if (s === "available" || available === true) return "available";
  return "unknown";
}

export type JobStatus = "queued" | "processing" | "completed" | "failed";

// ── shapes ──────────────────────────────────────────────────────────────────
export type ProviderMoney = { amount: number | null; currencyCode: string | null };

export type ActionGate = { allowed: boolean; reason: string | null };
export type DomainActions = { canRegister: ActionGate; canTransfer: ActionGate };

export type RegistryRequirement = {
  key: string;
  label: string | null;
  required: boolean;
  appliesTo: string | null; // "register" | "transfer"
  registrantType: string | null;
  reason: string | null;
  allowedCountryCodes: string[] | null;
  allowedRegistrantTypes: string[] | null;
  alternativeRequirementKey: string | null;
  acceptedTermsKey: string | null;
};

export type RegistryRequirements = {
  registration: RegistryRequirement[];
  transfer: RegistryRequirement[];
  countryEligibility: {
    required: boolean;
    allowedCountryCodes: string[] | null;
    reason: string | null;
  } | null;
};

export type DomainAvailability = {
  name: string;
  tld: string | null;
  state: AvailabilityState;
  unknownReason: string | null;
  actions: DomainActions;
  premium: boolean | null;
  requiresRegistrarFeeAcceptance: boolean | null;
  eppRequired: boolean | null;
  supportedRegisterYears: number[];
  supportedTransferYears: number[];
  existingDomainId: string | null;
  // Provider (purchase) prices — NEVER shown to a customer as-is.
  providerBilling: ProviderMoney | null;
  providerRenewalAmount: number | null;
  currencyCode: string | null;
  registryRequirements: RegistryRequirements | null;
  raw: Record<string, unknown>;
};

export type BulkAvailabilityResponse =
  | { kind: "inline"; results: DomainAvailability[] }
  | { kind: "job"; jobId: string; pollUrl: string | null };

export type AvailabilityJob = {
  status: JobStatus;
  progress: number | null;
  results: DomainAvailability[];
  raw: Record<string, unknown>;
};

export type DomainProduct = {
  tld: string;
  providerRegister: ProviderMoney | null;
  providerTransfer: ProviderMoney | null;
  providerRenew: ProviderMoney | null;
  providerBillingCycle: string | null;
  domainPricing: { years: number; register: ProviderMoney | null; renew: ProviderMoney | null }[];
  registryRequirements: RegistryRequirements | null;
  raw: Record<string, unknown>;
};

export type OrderPreviewResult = {
  items: {
    domainName: string | null;
    type: string | null;
    periodYears: number | null;
    providerUnitAmount: number | null;
    providerRenewalAnnualAmount: number | null;
    providerSetupAmount: number | null;
    providerSubtotal: number | null;
    currencyCode: string | null;
  }[];
  providerSubtotal: number | null;
  taxRateDecimal: number | null;
  providerTaxAmount: number | null;
  providerTotal: number | null;
  currencyCode: string | null;
  /** Always true — /orders/preview is a dry-run quote that creates no order/invoice. */
  createsNothing: true;
  raw: Record<string, unknown>;
};

// ── parsers ───────────────────────────────────────────────────────────────────
function parseMoney(v: unknown): ProviderMoney | null {
  if (!isObject(v)) return null;
  return { amount: num(v.amount), currencyCode: firstString(v, ["currencyCode", "currency"]) };
}

function parseActionGate(v: unknown): ActionGate {
  if (!isObject(v)) return { allowed: false, reason: null };
  return { allowed: bool(v.allowed) ?? false, reason: firstString(v, ["reason"]) };
}

function parseActions(v: unknown): DomainActions {
  const o = isObject(v) ? v : {};
  return {
    canRegister: parseActionGate(o.canRegister ?? (o as Record<string, unknown>).can_register),
    canTransfer: parseActionGate(o.canTransfer ?? (o as Record<string, unknown>).can_transfer),
  };
}

function stringArrayOrNull(v: unknown): string[] | null {
  if (v == null) return null;
  if (!Array.isArray(v)) return null;
  return v.filter((s): s is string => typeof s === "string");
}

function parseRequirement(v: unknown): RegistryRequirement | null {
  if (!isObject(v)) return null;
  const key = firstString(v, ["key"]);
  if (!key) return null;
  return {
    key,
    label: firstString(v, ["label"]),
    required: bool(v.required) ?? false,
    appliesTo: firstString(v, ["appliesTo", "applies_to"]),
    registrantType: firstString(v, ["registrantType", "registrant_type"]),
    reason: firstString(v, ["reason"]),
    allowedCountryCodes: stringArrayOrNull(v.allowedCountryCodes ?? (v as Record<string, unknown>).allowed_country_codes),
    allowedRegistrantTypes: stringArrayOrNull(v.allowedRegistrantTypes ?? (v as Record<string, unknown>).allowed_registrant_types),
    alternativeRequirementKey: firstString(v, ["alternativeRequirementKey", "alternative_requirement_key"]),
    acceptedTermsKey: firstString(v, ["acceptedTermsKey", "accepted_terms_key"]),
  };
}

function reqList(v: unknown): RegistryRequirement[] {
  return Array.isArray(v) ? v.map(parseRequirement).filter((r): r is RegistryRequirement => r !== null) : [];
}

export function parseRegistryRequirements(v: unknown): RegistryRequirements | null {
  if (!isObject(v)) return null;
  const ce = isObject(v.countryEligibility) ? v.countryEligibility : null;
  return {
    registration: reqList(v.registration),
    transfer: reqList(v.transfer),
    countryEligibility: ce
      ? {
          required: bool(ce.required) ?? false,
          allowedCountryCodes: stringArrayOrNull(ce.allowedCountryCodes),
          reason: firstString(ce, ["reason"]),
        }
      : null,
  };
}

function tldOf(name: string): string | null {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1) : null;
}

export function parseDomainAvailability(v: unknown): DomainAvailability | null {
  if (!isObject(v)) return null;
  const name = firstString(v, ["name", "domain", "domainName"]);
  if (!name) return null;
  return {
    name,
    tld: firstString(v, ["tld"]) ?? tldOf(name),
    state: mapAvailabilityState(v.state ?? v.availabilityStatus, v.available),
    unknownReason: firstString(v, ["unknownReason", "unknown_reason"]),
    actions: parseActions(v.actions),
    premium: bool(v.premium),
    requiresRegistrarFeeAcceptance: bool(v.requiresRegistrarFeeAcceptance),
    eppRequired: bool(v.eppRequired),
    supportedRegisterYears: numberArray(v.supportedRegisterYears),
    supportedTransferYears: numberArray(v.supportedTransferYears),
    existingDomainId: firstString(v, ["existingDomainId", "existing_domain_id"]),
    providerBilling: parseMoney(v.billing),
    providerRenewalAmount: num(v.renewalAmount),
    currencyCode: firstString(v, ["currencyCode", "currency"]),
    registryRequirements: parseRegistryRequirements(v.registryRequirements),
    raw: v,
  };
}

function availabilityList(v: unknown): DomainAvailability[] {
  const arr = Array.isArray(v) ? v : isObject(v) ? (v.data ?? v.results ?? v.items ?? v.domains) : null;
  if (!Array.isArray(arr)) return [];
  return arr.map(parseDomainAvailability).filter((d): d is DomainAvailability => d !== null);
}

/** True iff `v` is a Hostup bulk-availability job id (`dcheck_...`). */
export function isDcheckJobId(v: unknown): v is string {
  return typeof v === "string" && /^dcheck_[A-Za-z0-9]+$/.test(v);
}

/** Parse a bulk POST response: 200 inline results vs 202 queued job. */
export function parseBulkAvailabilityResponse(json: unknown, status: number): BulkAvailabilityResponse {
  if (status === 202 && isObject(json) && isObject(json.operation)) {
    const op = json.operation;
    const jobId = firstString(op, ["jobId", "job_id", "id"]) ?? "";
    return { kind: "job", jobId, pollUrl: firstString(op, ["pollUrl", "poll_url", "href"]) };
  }
  return { kind: "inline", results: availabilityList(json) };
}

export function parseAvailabilityJob(v: unknown): AvailabilityJob {
  const o = isObject(v) ? v : {};
  const rawStatus = (firstString(o, ["status"]) ?? "processing").toLowerCase();
  const status: JobStatus =
    rawStatus === "completed"
      ? "completed"
      : rawStatus === "failed"
        ? "failed"
        : rawStatus === "queued"
          ? "queued"
          : "processing";
  return { status, progress: num(o.progress), results: availabilityList(o), raw: o };
}

export function parseDomainProduct(v: unknown): DomainProduct | null {
  if (!isObject(v)) return null;
  const inner = isObject(v.data) ? v.data : isObject(v.product) ? v.product : v;
  const tld = firstString(inner, ["tld", "extension", "name"]);
  if (!tld) return null;
  const billing = isObject(inner.billing) ? inner.billing : null;
  const pricing = Array.isArray(inner.domainPricing) ? inner.domainPricing : [];
  return {
    tld,
    providerRegister: parseMoney(inner.register),
    providerTransfer: parseMoney(inner.transfer),
    providerRenew: parseMoney(inner.renew),
    providerBillingCycle: billing ? firstString(billing, ["billingCycle", "billing_cycle"]) : null,
    domainPricing: pricing
      .filter(isObject)
      .map((p) => ({
        years: num(p.years) ?? 0,
        register: parseMoney(p.register),
        renew: parseMoney(p.renew),
      }))
      .filter((p) => p.years > 0),
    registryRequirements: parseRegistryRequirements(inner.registryRequirements),
    raw: inner,
  };
}

export function parseTldList(v: unknown): string[] {
  const arr = isObject(v) ? v.tlds : Array.isArray(v) ? v : null;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((t) => (isObject(t) ? firstString(t, ["tld"]) : typeof t === "string" ? t : null))
    .filter((t): t is string => t !== null);
}

export function parseOrderPreview(v: unknown): OrderPreviewResult {
  const o = isObject(v) ? v : {};
  const items = Array.isArray(o.items) ? o.items : [];
  return {
    items: items.filter(isObject).map((it) => ({
      domainName: firstString(it, ["domainName", "domain", "name"]),
      type: firstString(it, ["type"]),
      periodYears: num(it.periodYears),
      providerUnitAmount: num(it.unitAmount),
      providerRenewalAnnualAmount: num(it.renewalAnnualAmount),
      providerSetupAmount: num(it.setupAmount),
      providerSubtotal: num(it.subtotal),
      currencyCode: firstString(it, ["currencyCode", "currency"]),
    })),
    providerSubtotal: num(o.subtotal),
    taxRateDecimal: num(o.taxRateDecimal),
    providerTaxAmount: num(o.taxAmount),
    providerTotal: num(o.total),
    currencyCode: firstString(o, ["currencyCode", "currency"]),
    createsNothing: true,
    raw: o,
  };
}
