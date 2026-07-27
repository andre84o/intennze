/**
 * Registrant contact captured at checkout. PURE — no server-only, no I/O — so the
 * required-field validation and the "which fields are missing" logic are unit-
 * tested and shared by the checkout server + client.
 *
 * The contact is pre-filled from the customer's EXISTING details; the customer
 * completes any missing fields at checkout. It is customer PII stored on the
 * customer's own order (RLS-protected) and is NEVER sent to Hostup in this phase.
 */

export type RegistrantContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  /** Optional company/organization name. */
  organization: string;
};

export const REGISTRANT_FIELDS = [
  { key: "firstName", label: "Förnamn", required: true },
  { key: "lastName", label: "Efternamn", required: true },
  { key: "organization", label: "Företag (valfritt)", required: false },
  { key: "email", label: "E-post", required: true },
  { key: "phone", label: "Telefon", required: true },
  { key: "address", label: "Adress", required: true },
  { key: "postalCode", label: "Postnummer", required: true },
  { key: "city", label: "Ort", required: true },
  { key: "country", label: "Land", required: true },
] as const;

export type RegistrantField = (typeof REGISTRANT_FIELDS)[number]["key"];

const REQUIRED_FIELDS: RegistrantField[] = REGISTRANT_FIELDS.filter((f) => f.required).map((f) => f.key);

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Coerce arbitrary input into a fully-populated (trimmed) RegistrantContact. */
export function normalizeRegistrant(input: unknown): RegistrantContact {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    firstName: s(o.firstName),
    lastName: s(o.lastName),
    email: s(o.email),
    phone: s(o.phone),
    address: s(o.address),
    postalCode: s(o.postalCode),
    city: s(o.city),
    country: s(o.country),
    organization: s(o.organization),
  };
}

export function isValidRegistrantEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Required fields that are still empty (organization is never required). */
export function missingRegistrantFields(c: RegistrantContact): RegistrantField[] {
  return REQUIRED_FIELDS.filter((k) => c[k] === "");
}

export type RegistrantValidation =
  | { ok: true; value: RegistrantContact }
  | { ok: false; missing: RegistrantField[]; error: string };

/**
 * Validate a registrant for checkout: every required field present + a valid
 * email. Returns the normalized value on success, or the missing fields.
 */
export function validateRegistrantContact(input: unknown): RegistrantValidation {
  const value = normalizeRegistrant(input);
  const missing = missingRegistrantFields(value);
  if (missing.length > 0) {
    return { ok: false, missing, error: "Fyll i alla obligatoriska registreringsuppgifter." };
  }
  if (!isValidRegistrantEmail(value.email)) {
    return { ok: false, missing: ["email"], error: "Ange en giltig e-postadress." };
  }
  return { ok: true, value };
}
