import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapDomainStatusForCustomer,
  UNKNOWN_STATUS_PRESENTATION,
} from "./status-presenter.ts";
import { DOMAIN_STATUSES } from "./types.ts";

test("every known DomainStatus maps to a non-unknown presentation", () => {
  for (const s of DOMAIN_STATUSES) {
    const p = mapDomainStatusForCustomer(s);
    assert.equal(p.key, s);
    assert.notEqual(p.key, "unknown");
    assert.ok(p.label.length > 0);
    assert.ok(p.icon.length > 0); // text + icon, never colour only
  }
});

test("active is positive, expired is critical", () => {
  assert.equal(mapDomainStatusForCustomer("active").tone, "positive");
  assert.equal(mapDomainStatusForCustomer("expired").tone, "critical");
  assert.equal(mapDomainStatusForCustomer("expired").label, "Utgången");
});

test("transfer_pending is distinct from active", () => {
  const t = mapDomainStatusForCustomer("transfer_pending");
  assert.equal(t.key, "transfer_pending");
  assert.notEqual(t.key, "active");
});

test("unknown / unrecognized status is 'Okänt', NEVER 'expired'", () => {
  for (const bad of ["", "  ", "weird_provider_state", "definitely-not-a-status"]) {
    const p = mapDomainStatusForCustomer(bad);
    assert.equal(p.key, "unknown");
    assert.equal(p.tone, "unknown");
    assert.notEqual(p.key, "expired");
    assert.notEqual(p.label, "Utgången");
  }
});

test("null / undefined status is unknown, not a crash", () => {
  assert.deepEqual(mapDomainStatusForCustomer(null), UNKNOWN_STATUS_PRESENTATION);
  assert.deepEqual(mapDomainStatusForCustomer(undefined), UNKNOWN_STATUS_PRESENTATION);
});
