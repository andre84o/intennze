/**
 * Safe registrant presentation. PURE — no server-only, no I/O — so it is
 * unit-tested and safe to import from client components.
 *
 * A domain registrant record holds PII (full name, email, phone, postal
 * address). The customer portal must NOT render that raw: per the project
 * security rules we never expose full emails/phones/addresses. This module
 * produces a minimal, masked summary — organization, country, and a masked
 * email — and deliberately drops name, phone, and address entirely.
 */
import type { DomainRegistrant } from "./types.ts";

/**
 * Mask an email so the local part is not recoverable: keep the first character,
 * replace the rest with `***`, preserve the domain. Returns null for anything
 * that is not a usable email (so the UI shows nothing rather than leaking).
 *
 *   "john.doe@example.com" -> "j***@example.com"
 *   "a@b.co"               -> "a***@b.co"
 */
export function maskEmail(email: string | null | undefined): string | null {
  if (typeof email !== "string") return null;
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  // Need a non-empty local part and a non-empty domain.
  if (at <= 0 || at === trimmed.length - 1) return null;
  const domain = trimmed.slice(at + 1);
  if (!domain.includes(".")) return null;
  const first = trimmed[0];
  return `${first}***@${domain}`;
}

/** Minimal, PII-safe view of a registrant for the customer portal. */
export type SafeRegistrant = {
  /** Whether a registrant record exists at all. */
  present: boolean;
  /** Business/organization name (not personal PII). */
  organization: string | null;
  /** 2-letter country code, uppercased. */
  countryCode: string | null;
  /** Masked contact email, or null. Never the raw address. */
  maskedEmail: string | null;
};

const EMPTY_SAFE_REGISTRANT: SafeRegistrant = {
  present: false,
  organization: null,
  countryCode: null,
  maskedEmail: null,
};

/**
 * Reduce a registrant record to the safe summary. Name, phone, and street
 * address are intentionally dropped — never included in the output. A null
 * registrant yields an "absent" summary.
 */
export function toSafeRegistrant(
  registrant: DomainRegistrant | null | undefined
): SafeRegistrant {
  if (!registrant) return EMPTY_SAFE_REGISTRANT;
  const org =
    typeof registrant.organization === "string" && registrant.organization.trim() !== ""
      ? registrant.organization.trim()
      : null;
  const cc =
    typeof registrant.country_code === "string" && /^[A-Za-z]{2}$/.test(registrant.country_code.trim())
      ? registrant.country_code.trim().toUpperCase()
      : null;
  return {
    present: true,
    organization: org,
    countryCode: cc,
    maskedEmail: maskEmail(registrant.email),
  };
}
