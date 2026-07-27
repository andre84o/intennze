import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRegistrant,
  missingRegistrantFields,
  validateRegistrantContact,
  isValidRegistrantEmail,
} from "./registrant-contact.ts";

const FULL = {
  firstName: "Anna",
  lastName: "Svensson",
  email: "anna@example.com",
  phone: "+46701234567",
  address: "Storgatan 1",
  postalCode: "11122",
  city: "Stockholm",
  country: "Sverige",
  organization: "Acme AB",
};

test("normalizeRegistrant trims and fills all fields", () => {
  const r = normalizeRegistrant({ firstName: "  Anna ", email: "a@b.se" });
  assert.equal(r.firstName, "Anna");
  assert.equal(r.email, "a@b.se");
  assert.equal(r.city, ""); // missing → empty string, never undefined
  assert.equal(r.organization, "");
});

test("missingRegistrantFields lists empty required fields; organization never required", () => {
  const r = normalizeRegistrant({ firstName: "Anna", email: FULL.email });
  const missing = missingRegistrantFields(r);
  assert.ok(missing.includes("lastName"));
  assert.ok(missing.includes("phone"));
  assert.ok(missing.includes("city"));
  assert.ok(!missing.includes("organization")); // optional
  assert.ok(!missing.includes("firstName")); // present
});

test("a fully pre-filled customer needs no extra input", () => {
  assert.deepEqual(missingRegistrantFields(normalizeRegistrant(FULL)), []);
});

test("validateRegistrantContact accepts a complete registrant", () => {
  const res = validateRegistrantContact(FULL);
  assert.ok(res.ok);
  assert.equal(res.ok && res.value.firstName, "Anna");
});

test("validateRegistrantContact rejects missing fields", () => {
  const res = validateRegistrantContact({ firstName: "Anna" });
  assert.equal(res.ok, false);
  assert.ok(!res.ok && res.missing.length > 0);
});

test("validateRegistrantContact rejects a bad email", () => {
  const res = validateRegistrantContact({ ...FULL, email: "not-an-email" });
  assert.equal(res.ok, false);
  assert.ok(!res.ok && res.missing.includes("email"));
});

test("isValidRegistrantEmail basics", () => {
  assert.ok(isValidRegistrantEmail("a@b.se"));
  assert.ok(!isValidRegistrantEmail("a@b"));
  assert.ok(!isValidRegistrantEmail("ab.se"));
  assert.ok(!isValidRegistrantEmail(""));
});
