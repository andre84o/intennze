import { test } from "node:test";
import assert from "node:assert/strict";
import { mapHostupStatus, computeDomainCachePatch, type DomainCacheSnapshot } from "./sync-logic.ts";
import type { HostupDomain } from "./types.ts";

function remote(overrides: Partial<HostupDomain> = {}): HostupDomain {
  return {
    id: "dom_1",
    name: "example.se",
    status: "active",
    registeredAt: null,
    expiresAt: "2027-01-01T00:00:00.000Z",
    autoRenew: true,
    locked: false,
    nameservers: [],
    orderId: "ord_1",
    raw: {},
    ...overrides,
  };
}

function snapshot(overrides: Partial<DomainCacheSnapshot> = {}): DomainCacheSnapshot {
  return {
    status: "pending",
    expires_at: null,
    auto_renew: false,
    locked: false,
    nameservers: [],
    ...overrides,
  };
}

const NOW = "2026-07-28T00:00:00.000Z";

test("mapHostupStatus maps exact + common aliases", () => {
  assert.equal(mapHostupStatus("active"), "active");
  assert.equal(mapHostupStatus("ACTIVE"), "active");
  assert.equal(mapHostupStatus("registered"), "active");
  assert.equal(mapHostupStatus("pending"), "pending");
  assert.equal(mapHostupStatus("pending_transfer"), "transfer_pending");
  assert.equal(mapHostupStatus("transfer_pending"), "transfer_pending");
  assert.equal(mapHostupStatus("transferred_out"), "transferred_out");
  assert.equal(mapHostupStatus("expired"), "expired");
  assert.equal(mapHostupStatus("suspended"), "suspended");
  assert.equal(mapHostupStatus("cancelled"), "cancelled");
  assert.equal(mapHostupStatus("failed"), "failed");
});

test("mapHostupStatus returns null for unknown/empty", () => {
  assert.equal(mapHostupStatus("wat"), null);
  assert.equal(mapHostupStatus(""), null);
  assert.equal(mapHostupStatus(null), null);
  assert.equal(mapHostupStatus(undefined), null);
});

test("new remote values produce a change patch (status/expiry/autorenew)", () => {
  const { changed, patch } = computeDomainCachePatch(snapshot(), remote(), [], NOW);
  assert.equal(changed, true);
  assert.equal(patch.status, "active");
  assert.equal(patch.expires_at, "2027-01-01T00:00:00.000Z");
  assert.equal(patch.auto_renew, true);
  assert.equal(patch.last_synced_at, NOW);
});

test("idempotent: identical state -> no change, empty patch", () => {
  const existing = snapshot({
    status: "active",
    expires_at: "2027-01-01T00:00:00.000Z",
    auto_renew: true,
    locked: false,
    nameservers: ["ns1.hostup.se"],
  });
  const { changed, patch } = computeDomainCachePatch(existing, remote(), ["ns1.hostup.se"], NOW);
  assert.equal(changed, false);
  assert.deepEqual(patch, {});
});

test("expiry compared by instant, not string form", () => {
  const existing = snapshot({
    status: "active",
    expires_at: "2027-01-01T00:00:00+00:00", // same instant, different formatting
    auto_renew: true,
  });
  const { changed } = computeDomainCachePatch(existing, remote(), [], NOW);
  assert.equal(changed, false);
});

test("patch NEVER contains customer_id, name, or provider ids", () => {
  const { patch } = computeDomainCachePatch(snapshot(), remote({ status: "active" }), ["ns.a.se"], NOW);
  assert.ok(!("customer_id" in patch));
  assert.ok(!("name" in patch));
  assert.ok(!("provider_domain_id" in patch));
  assert.ok(!("provider_order_id" in patch));
});

test("unmappable remote status leaves cached status unchanged", () => {
  const existing = snapshot({ status: "active", expires_at: "2027-01-01T00:00:00.000Z", auto_renew: true });
  const { changed, patch } = computeDomainCachePatch(existing, remote({ status: "some_weird_state" }), [], NOW);
  assert.equal(changed, false);
  assert.equal("status" in patch, false);
});

test("empty nameservers from provider does not wipe cached nameservers", () => {
  const existing = snapshot({
    status: "active",
    expires_at: "2027-01-01T00:00:00.000Z",
    auto_renew: true,
    nameservers: ["ns1.hostup.se", "ns2.hostup.se"],
  });
  const { changed, patch } = computeDomainCachePatch(existing, remote(), [], NOW);
  assert.equal(changed, false);
  assert.ok(!("nameservers" in patch));
});
