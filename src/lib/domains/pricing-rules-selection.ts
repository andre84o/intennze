/**
 * TLD-selection + rule-conflict logic for the admin pricing UI. PURE — no
 * server-only, no I/O — so the "Alla vs specific" validation, the duplicate
 * guard, and the "does a conflicting Alla/TLD rule already exist" checks are
 * unit-tested and shared by BOTH the client (to disable options / warn) and the
 * server (authoritative validation before the create RPCs).
 *
 * Rule priority (exact TLD beats the `Alla`/null default) lives in the pricing
 * ENGINE (resolveDomainPricingRule); this module only decides what an admin is
 * allowed to create.
 *
 * "Alla" is the standard/fallback rule, persisted as tld = null.
 */

/** Normalize a raw TLD token to bare lowercase (no dots at the ends), or null. */
export function normalizeTld(tld: string | null | undefined): string | null {
  if (typeof tld !== "string") return null;
  const t = tld.trim().toLowerCase().replace(/^\.+/, "").replace(/\.+$/, "");
  if (t.length < 2) return null;
  return /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(t) ? t : null;
}

export type TldSelection =
  | { scope: "all" }
  | { scope: "specific"; tlds: string[] };

export type ParsedSelection = { ok: true; selection: TldSelection } | { ok: false; error: string };

/**
 * Validate + normalize a raw multi-select into a canonical selection.
 *   • "Alla" may NOT be combined with specific TLDs.
 *   • specific TLDs are normalized + de-duplicated (same TLD never twice).
 *   • at least one choice is required.
 */
export function parseTldSelection(raw: { all: boolean; tlds: string[] }): ParsedSelection {
  const cleaned = Array.from(
    new Set((raw.tlds ?? []).map(normalizeTld).filter((t): t is string => t !== null))
  );
  if (raw.all && cleaned.length > 0) {
    return { ok: false, error: '"Alla" kan inte kombineras med specifika TLD:er.' };
  }
  if (raw.all) return { ok: true, selection: { scope: "all" } };
  if (cleaned.length === 0) return { ok: false, error: 'Välj minst en TLD eller "Alla".' };
  return { ok: true, selection: { scope: "specific", tlds: cleaned } };
}

/** Half-open [start, end) overlap; a null bound is unbounded (−∞ / +∞). */
export function windowsOverlap(
  aStart: string | null,
  aEnd: string | null,
  bStart: string | null,
  bEnd: string | null
): boolean {
  const as = aStart ? Date.parse(aStart) : -Infinity;
  const ae = aEnd ? Date.parse(aEnd) : Infinity;
  const bs = bStart ? Date.parse(bStart) : -Infinity;
  const be = bEnd ? Date.parse(bEnd) : Infinity;
  return as < be && bs < ae;
}

/** The minimal shape of an existing rule the conflict checks read. */
export type ExistingRuleLite = {
  tld: string | null;
  operation: string;
  currency_code: string;
  applies_to_premium: boolean;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export type RuleKey = {
  operation: string;
  currencyCode: string;
  premium: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

function matchesKey(r: ExistingRuleLite, key: RuleKey): boolean {
  return (
    r.is_active &&
    r.operation === key.operation &&
    r.currency_code.toUpperCase() === key.currencyCode.toUpperCase() &&
    r.applies_to_premium === key.premium &&
    windowsOverlap(r.starts_at, r.ends_at, key.startsAt, key.endsAt)
  );
}

/**
 * True iff an active "Alla" (tld = null) rule already exists for the same
 * operation / currency / premium and an overlapping window. Used to DISABLE the
 * "Alla" option in the UI and to explain the server rejection.
 */
export function hasConflictingAllRule(rules: ExistingRuleLite[], key: RuleKey): boolean {
  return rules.some((r) => r.tld == null && matchesKey(r, key));
}

/**
 * The subset of `tlds` that already have an active specific rule for the same
 * operation / currency / premium and an overlapping window (would be a duplicate).
 * Returned normalized. Used to warn/skip in the UI before the DB rejects them.
 */
export function conflictingSpecificTlds(
  rules: ExistingRuleLite[],
  tlds: string[],
  key: RuleKey
): string[] {
  const wanted = new Set(tlds.map(normalizeTld).filter((t): t is string => t !== null));
  const hit = new Set<string>();
  for (const r of rules) {
    if (r.tld == null) continue;
    const t = normalizeTld(r.tld);
    if (t && wanted.has(t) && matchesKey(r, key)) hit.add(t);
  }
  return [...hit];
}
