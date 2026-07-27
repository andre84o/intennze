import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTld,
  parseTldSelection,
  windowsOverlap,
  hasConflictingAllRule,
  conflictingSpecificTlds,
  type ExistingRuleLite,
  type RuleKey,
} from "./pricing-rules-selection.ts";
import { resolveDomainPricingRule, type DomainPricingRuleConfig } from "./pricing-engine.ts";

// ── normalizeTld ────────────────────────────────────────────────────────────
test("normalizeTld strips dots/case, rejects junk", () => {
  assert.equal(normalizeTld(".SE"), "se");
  assert.equal(normalizeTld("com"), "com");
  assert.equal(normalizeTld("co.uk"), "co.uk");
  assert.equal(normalizeTld("  .Nu. "), "nu");
  assert.equal(normalizeTld("s"), null); // too short
  assert.equal(normalizeTld("a b"), null);
  assert.equal(normalizeTld(""), null);
  assert.equal(normalizeTld(null), null);
});

// ── parseTldSelection: multi-select + Alla + dedupe ───────────────────────────
test("specific multi-select normalizes and de-duplicates", () => {
  const r = parseTldSelection({ all: false, tlds: [".se", "SE", "nu", ".com", "com"] });
  assert.ok(r.ok && r.selection.scope === "specific");
  assert.deepEqual((r.ok && r.selection.scope === "specific" && r.selection.tlds) || [], ["se", "nu", "com"]);
});

test('"Alla" alone → scope all', () => {
  const r = parseTldSelection({ all: true, tlds: [] });
  assert.ok(r.ok && r.selection.scope === "all");
});

test('"Alla" cannot combine with specific TLDs', () => {
  const r = parseTldSelection({ all: true, tlds: ["se"] });
  assert.equal(r.ok, false);
  assert.match((!r.ok && r.error) || "", /Alla/);
});

test("empty selection is rejected", () => {
  const r = parseTldSelection({ all: false, tlds: [] });
  assert.equal(r.ok, false);
});

// ── windowsOverlap (half-open, null = unbounded) ──────────────────────────────
test("windowsOverlap treats null bounds as infinite and is half-open", () => {
  assert.equal(windowsOverlap(null, null, null, null), true);
  assert.equal(windowsOverlap("2026-01-01", "2026-06-01", "2026-05-01", "2026-12-01"), true);
  // touching at the boundary does NOT overlap ([a,b) is half-open)
  assert.equal(windowsOverlap("2026-01-01", "2026-06-01", "2026-06-01", "2026-12-01"), false);
  assert.equal(windowsOverlap("2026-01-01", "2026-02-01", "2026-03-01", null), false);
});

// ── conflict detection ────────────────────────────────────────────────────────
const KEY: RuleKey = {
  operation: "register",
  currencyCode: "SEK",
  premium: false,
  startsAt: null,
  endsAt: null,
};

function rule(over: Partial<ExistingRuleLite>): ExistingRuleLite {
  return {
    tld: null,
    operation: "register",
    currency_code: "SEK",
    applies_to_premium: false,
    is_active: true,
    starts_at: null,
    ends_at: null,
    ...over,
  };
}

test("hasConflictingAllRule detects an existing active Alla rule (same op/cur/premium)", () => {
  assert.equal(hasConflictingAllRule([rule({ tld: null })], KEY), true);
  // A specific-TLD rule is NOT an Alla conflict
  assert.equal(hasConflictingAllRule([rule({ tld: "se" })], KEY), false);
  // Different operation → no conflict
  assert.equal(hasConflictingAllRule([rule({ tld: null, operation: "renew" })], KEY), false);
  // Different premium flag → no conflict
  assert.equal(hasConflictingAllRule([rule({ tld: null, applies_to_premium: true })], KEY), false);
  // Inactive → no conflict
  assert.equal(hasConflictingAllRule([rule({ tld: null, is_active: false })], KEY), false);
});

test("hasConflictingAllRule respects non-overlapping windows", () => {
  const existing = rule({ tld: null, starts_at: "2026-01-01", ends_at: "2026-06-01" });
  assert.equal(
    hasConflictingAllRule([existing], { ...KEY, startsAt: "2026-06-01", endsAt: null }),
    false
  );
  assert.equal(
    hasConflictingAllRule([existing], { ...KEY, startsAt: "2026-05-01", endsAt: null }),
    true
  );
});

test("conflictingSpecificTlds returns the already-taken TLDs (normalized)", () => {
  const rules = [rule({ tld: "se" }), rule({ tld: "nu", is_active: false })];
  assert.deepEqual(conflictingSpecificTlds(rules, [".SE", "nu", "com"], KEY), ["se"]);
});

// ── priority: exact TLD beats the Alla/null default (engine) ──────────────────
function cfg(over: Partial<DomainPricingRuleConfig>): DomainPricingRuleConfig {
  return {
    id: "r",
    tld: null,
    operation: "register",
    currencyCode: "SEK",
    calculationType: "fixed",
    appliesToPremium: false,
    fixedCustomerPriceMinor: 10000,
    ...over,
  };
}

test("a specific .se rule wins over the Alla (null) default", () => {
  const all = cfg({ id: "a", tld: null });
  const se = cfg({ id: "b", tld: "se" });
  const picked = resolveDomainPricingRule([all, se], "se", "register");
  assert.equal(picked?.id, "b");
  assert.equal(picked?.tld, "se");
});

test("Alla (null) applies when no specific rule matches the TLD", () => {
  const all = cfg({ id: "a", tld: null });
  const se = cfg({ id: "b", tld: "se" });
  const picked = resolveDomainPricingRule([all, se], "nu", "register");
  assert.equal(picked?.id, "a");
  assert.equal(picked?.tld, null);
});
