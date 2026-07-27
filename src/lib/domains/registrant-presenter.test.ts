import { test } from "node:test";
import assert from "node:assert/strict";
import { maskEmail, toSafeRegistrant } from "./registrant-presenter.ts";
import type { DomainRegistrant } from "./types.ts";

test("maskEmail keeps first char + domain, hides the rest", () => {
  assert.equal(maskEmail("john.doe@example.com"), "j***@example.com");
  const masked = maskEmail("john.doe@example.com")!;
  assert.ok(!masked.includes("john.doe")); // original local part not recoverable
  assert.ok(!masked.includes("ohn"));
});

test("maskEmail handles a 1-char local part", () => {
  assert.equal(maskEmail("a@b.co"), "a***@b.co");
});

test("maskEmail rejects non-emails safely (null, never throws)", () => {
  assert.equal(maskEmail(""), null);
  assert.equal(maskEmail("not-an-email"), null);
  assert.equal(maskEmail("@example.com"), null);
  assert.equal(maskEmail("user@"), null);
  assert.equal(maskEmail("user@localhost"), null); // no dot in domain
  assert.equal(maskEmail(null), null);
  assert.equal(maskEmail(undefined), null);
});

function registrant(over: Partial<DomainRegistrant> = {}): DomainRegistrant {
  return {
    id: "r1",
    created_at: "",
    updated_at: "",
    domain_id: "d1",
    first_name: "John",
    last_name: "Doe",
    organization: "Acme AB",
    email: "john.doe@example.com",
    phone: "+46701234567",
    address_line1: "Storgatan 1",
    address_line2: "lgh 1101",
    city: "Stockholm",
    postal_code: "11122",
    state: null,
    country_code: "se",
    ...over,
  };
}

test("toSafeRegistrant drops name / phone / address; masks email", () => {
  const safe = toSafeRegistrant(registrant());
  assert.equal(safe.present, true);
  assert.equal(safe.organization, "Acme AB");
  assert.equal(safe.countryCode, "SE");
  assert.equal(safe.maskedEmail, "j***@example.com");

  // No PII leaks anywhere in the serialized safe object.
  const blob = JSON.stringify(safe);
  assert.ok(!blob.includes("John"));
  assert.ok(!blob.includes("Doe"));
  assert.ok(!blob.includes("+46701234567"));
  assert.ok(!blob.includes("Storgatan"));
  assert.ok(!blob.includes("11122"));
  assert.ok(!blob.includes("john.doe@example.com"));
});

test("toSafeRegistrant on null → absent summary", () => {
  const safe = toSafeRegistrant(null);
  assert.equal(safe.present, false);
  assert.equal(safe.organization, null);
  assert.equal(safe.maskedEmail, null);
  assert.equal(safe.countryCode, null);
});

test("toSafeRegistrant tolerates missing fields", () => {
  const safe = toSafeRegistrant(
    registrant({ organization: null, email: null, country_code: null })
  );
  assert.equal(safe.present, true);
  assert.equal(safe.organization, null);
  assert.equal(safe.maskedEmail, null);
  assert.equal(safe.countryCode, null);
});
