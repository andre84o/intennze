import { test } from "node:test";
import assert from "node:assert/strict";
import { getDomainAttentionState, type AttentionInput } from "./attention.ts";

const NOW = Date.parse("2026-07-27T00:00:00.000Z");
const DAY = 86_400_000;

function domain(over: Partial<AttentionInput> = {}): AttentionInput {
  return {
    status: "active",
    expires_at: new Date(NOW + 365 * DAY).toISOString(), // far future
    auto_renew: true,
    last_synced_at: new Date(NOW - 60 * 60 * 1000).toISOString(), // 1h ago, fresh
    registrar: "hostup",
    provider_domain_id: "dom_abc123",
    ...over,
  };
}

test("healthy domain needs no attention", () => {
  const a = getDomainAttentionState(domain(), { nowMs: NOW });
  assert.equal(a.needsAttention, false);
  assert.equal(a.primary.key, "ok");
});

test("expiring within 30 days outranks auto-renew-off", () => {
  const a = getDomainAttentionState(
    domain({ expires_at: new Date(NOW + 10 * DAY).toISOString(), auto_renew: false }),
    { nowMs: NOW }
  );
  assert.equal(a.primary.key, "expiring_soon");
  assert.equal(a.primary.level, "warning");
  // auto_renew_off is still reported, just lower priority
  assert.ok(a.signals.some((s) => s.key === "auto_renew_off"));
});

test("exactly 30 days out still counts as expiring soon (boundary)", () => {
  const a = getDomainAttentionState(
    domain({ expires_at: new Date(NOW + 30 * DAY).toISOString() }),
    { nowMs: NOW }
  );
  assert.equal(a.primary.key, "expiring_soon");
});

test("31 days out is NOT expiring soon", () => {
  const a = getDomainAttentionState(
    domain({ expires_at: new Date(NOW + 31 * DAY).toISOString() }),
    { nowMs: NOW }
  );
  assert.ok(!a.signals.some((s) => s.key === "expiring_soon"));
});

test("expired (status) is critical and outranks expiring", () => {
  const a = getDomainAttentionState(domain({ status: "expired" }), { nowMs: NOW });
  assert.equal(a.primary.key, "expired");
  assert.equal(a.primary.level, "critical");
});

test("past expiry date is treated as expired even if status stale", () => {
  const a = getDomainAttentionState(
    domain({ status: "active", expires_at: new Date(NOW - DAY).toISOString() }),
    { nowMs: NOW }
  );
  assert.equal(a.primary.key, "expired");
});

test("expiry at exactly now is expired (boundary)", () => {
  const a = getDomainAttentionState(
    domain({ expires_at: new Date(NOW).toISOString() }),
    { nowMs: NOW }
  );
  assert.equal(a.primary.key, "expired");
});

test("suspended outranks everything", () => {
  const a = getDomainAttentionState(
    domain({ status: "suspended", expires_at: new Date(NOW - DAY).toISOString() }),
    { nowMs: NOW }
  );
  assert.equal(a.primary.key, "suspended");
});

test("auto-renew off (only) is a warning", () => {
  const a = getDomainAttentionState(domain({ auto_renew: false }), { nowMs: NOW });
  assert.equal(a.primary.key, "auto_renew_off");
  assert.equal(a.needsAttention, true);
});

test("null expiry produces no expiry signals", () => {
  const a = getDomainAttentionState(domain({ expires_at: null }), { nowMs: NOW });
  assert.ok(!a.signals.some((s) => s.key === "expiring_soon" || s.key === "expired"));
});

test("stale linked cache flags sync_stale", () => {
  const a = getDomainAttentionState(
    domain({ last_synced_at: new Date(NOW - 100 * 60 * 60 * 1000).toISOString() }),
    { nowMs: NOW }
  );
  assert.ok(a.signals.some((s) => s.key === "sync_stale"));
});

test("unlinked domain flags no_provider_link, not sync_stale", () => {
  const a = getDomainAttentionState(
    domain({ registrar: "manual", provider_domain_id: null, last_synced_at: null }),
    { nowMs: NOW }
  );
  assert.ok(a.signals.some((s) => s.key === "no_provider_link"));
  assert.ok(!a.signals.some((s) => s.key === "sync_stale"));
});

test("deterministic: same now → same result", () => {
  const d = domain({ expires_at: new Date(NOW + 5 * DAY).toISOString() });
  assert.deepEqual(
    getDomainAttentionState(d, { nowMs: NOW }),
    getDomainAttentionState(d, { nowMs: NOW })
  );
});
