import { domainToASCII } from "node:url";

/**
 * Domain-name normalization + validation (pure, zero-dependency, server-safe).
 *
 * Normalization is the single source of truth for "is this the same domain":
 * `Example.SE`, `https://example.se`, `example.se/`, and `example.se.` all
 * collapse to `example.se`. The normalized form is what gets stored and what the
 * DB unique constraint keys on, so callers MUST normalize before persisting.
 *
 * Documented decision — a URL-shaped input is NORMALIZED, not rejected: scheme
 * (`http(s)://`), `user:pass@`, `:port`, and any `/path?query#fragment` are
 * stripped, and only the host is kept. Validation then runs on the stripped host,
 * so a path can never smuggle characters past the label rules. A `https://…/path`
 * therefore yields the bare domain (e.g. `example.se`); it is rejected only if the
 * remaining host is not itself a valid domain.
 *
 * International domains are converted to punycode via Node's `node:url`
 * `domainToASCII` (UTS-46 IDNA) — no external dependency. Already-encoded
 * `xn--…` input round-trips unchanged.
 */

export type NormalizeResult =
  | { ok: true; name: string }
  | { ok: false; reason: string };

// A single DNS label: 1–63 chars, a–z/0–9/hyphen, not starting or ending with a
// hyphen. Applied to the punycode (ASCII) form, so it also rejects `*`, `_`,
// spaces, and other stray characters.
const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

// The TLD (last label) must be alphabetic (≥2) or a punycode label, never
// all-numeric (blocks bare IPv4-looking input).
const TLD = /^(?:[a-z]{2,}|xn--[a-z0-9-]+)$/;

/**
 * True iff `v` is a syntactically valid, already-normalized domain name
 * (lowercase ASCII/punycode, ≥2 labels, ≤253 chars, valid labels + TLD).
 */
export function isValidDomain(v: unknown): v is string {
  if (typeof v !== "string" || v.length === 0 || v.length > 253) return false;
  const labels = v.split(".");
  if (labels.length < 2) return false;
  if (!TLD.test(labels[labels.length - 1])) return false;
  return labels.every((label) => LABEL.test(label));
}

/**
 * Normalize arbitrary user input to a canonical domain name, or explain why it
 * cannot be one. Never throws.
 */
export function normalizeDomainName(input: string | null | undefined): NormalizeResult {
  if (typeof input !== "string") return { ok: false, reason: "Domain name is required." };

  let s = input.trim().toLowerCase();
  if (s === "") return { ok: false, reason: "Domain name is required." };

  // 1) strip a scheme (`http://`, `https://`, any `scheme://`) and a leading `//`.
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/^\/\//, "");
  // 2) cut off path / query / fragment — keep only the authority.
  s = s.split(/[/?#]/)[0];
  // 3) strip userinfo (`user:pass@`) then a `:port`.
  s = s.replace(/^[^@]*@/, "").split(":")[0];
  // 4) strip trailing dot(s) (`example.se.` → `example.se`).
  s = s.replace(/\.+$/, "");

  if (s === "") return { ok: false, reason: "Domain name is required." };

  // 5) IDN → punycode (returns "" on an unprocessable input).
  const ascii = domainToASCII(s);
  if (ascii === "") return { ok: false, reason: "Invalid domain name." };

  // 6) validate the ASCII/punycode form.
  if (!isValidDomain(ascii)) return { ok: false, reason: "Invalid domain name." };

  return { ok: true, name: ascii };
}

/**
 * Validate arbitrary input as a domain name (normalizes first). Returns the
 * canonical name on success. Thin wrapper for callers that only need a boolean-ish
 * gate but still want the normalized value.
 */
export function validateDomainName(input: string | null | undefined): NormalizeResult {
  return normalizeDomainName(input);
}

/**
 * The registrable suffix (everything after the first label): `foo.se` → `se`,
 * `foo.co.uk` → `co.uk`. Pure; returns null when there is no dot. Used for
 * pricing-rule lookup on an already-normalized name.
 */
export function tldOf(name: string | null | undefined): string | null {
  if (typeof name !== "string") return null;
  const dot = name.indexOf(".");
  if (dot < 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}
