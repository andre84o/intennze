import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validatePeriod,
  nextBulkPollStep,
  requirementsForDisplay,
  isSensitiveRequirementKey,
} from "./search-logic.ts";
import type { RegistryRequirements } from "./search-types.ts";

// ── periods ──────────────────────────────────────────────────────────────────
test("validatePeriod accepts only registry-returned years", () => {
  assert.deepEqual(validatePeriod(1, [1, 2, 3, 5]), { ok: true, year: 1 });
  assert.deepEqual(validatePeriod(5, [1, 2, 3, 5]), { ok: true, year: 5 });
});
test("validatePeriod rejects unsupported / invalid years server-side", () => {
  assert.equal(validatePeriod(4, [1, 2, 3, 5]).ok, false); // not returned
  assert.equal(validatePeriod(0, [1, 2]).ok, false);
  assert.equal(validatePeriod(2.5, [1, 2]).ok, false);
  assert.equal(validatePeriod("2" as unknown, [1, 2]).ok, false);
  assert.equal(validatePeriod(1, []).ok, false); // no known periods → reject
});

// ── bulk poll state machine ──────────────────────────────────────────────────
const CTX = { attempt: 0, elapsedMs: 0, maxAttempts: 8, maxElapsedMs: 15000, baseDelayMs: 500, capMs: 5000 };
test("poll: completed/failed stop immediately", () => {
  assert.deepEqual(nextBulkPollStep("completed", true, CTX, () => 0), { phase: "completed", shouldPoll: false, delayMs: 0 });
  assert.deepEqual(nextBulkPollStep("failed", false, CTX, () => 0), { phase: "failed", shouldPoll: false, delayMs: 0 });
});
test("poll: processing vs partial keeps polling", () => {
  assert.equal(nextBulkPollStep("processing", false, CTX, () => 0).phase, "processing");
  assert.equal(nextBulkPollStep("processing", true, CTX, () => 0).phase, "partial");
  assert.equal(nextBulkPollStep("queued", false, CTX, () => 0).shouldPoll, true);
});
test("poll: timeout on attempt or wall-clock budget (never infinite)", () => {
  assert.equal(nextBulkPollStep("processing", true, { ...CTX, attempt: 7 }, () => 0).phase, "timeout");
  assert.equal(nextBulkPollStep("processing", true, { ...CTX, elapsedMs: 15000 }, () => 0).phase, "timeout");
});
test("poll: backoff respects minDelay (Retry-After) and stays within budget", () => {
  const step = nextBulkPollStep("processing", false, { ...CTX, attempt: 2, minDelayMs: 3000 }, () => 0);
  assert.ok(step.delayMs >= 3000);
  const near = nextBulkPollStep("processing", false, { ...CTX, elapsedMs: 14900, minDelayMs: 9999 }, () => 0);
  assert.ok(near.delayMs <= 100); // clamped to remaining budget
});

// ── registry requirements (dynamic; nothing hardcoded) ───────────────────────
const seReqs: RegistryRequirements = {
  registration: [
    { key: "phoneNumber", label: "Phone number", required: true, appliesTo: "register", registrantType: "any", reason: "r", allowedCountryCodes: null, allowedRegistrantTypes: null, alternativeRequirementKey: null, acceptedTermsKey: null },
    { key: "registrationIdentifier", label: "Personal identity number or organization number", required: true, appliesTo: "register", registrantType: "any", reason: "r", allowedCountryCodes: null, allowedRegistrantTypes: null, alternativeRequirementKey: null, acceptedTermsKey: null },
    { key: "acceptedTerms", label: ".se terms", required: true, appliesTo: "register", registrantType: "any", reason: "r", allowedCountryCodes: null, allowedRegistrantTypes: null, alternativeRequirementKey: null, acceptedTermsKey: "se_registration_terms" },
  ],
  transfer: [
    { key: "eppCode", label: "Authorization code", required: true, appliesTo: "transfer", registrantType: "any", reason: "r", allowedCountryCodes: null, allowedRegistrantTypes: null, alternativeRequirementKey: null, acceptedTermsKey: null },
  ],
  countryEligibility: { required: false, allowedCountryCodes: null, reason: null },
};

test("requirementsForDisplay reflects the registry dynamically per operation", () => {
  const reg = requirementsForDisplay(seReqs, "register");
  assert.deepEqual(reg.map((r) => r.key), ["phoneNumber", "registrationIdentifier", "acceptedTerms"]);
  const transfer = requirementsForDisplay(seReqs, "transfer");
  assert.deepEqual(transfer.map((r) => r.key), ["eppCode"]);
  assert.equal(requirementsForDisplay(null, "register").length, 0);
});
test("sensitive requirement keys are flagged (PII/EPP), and terms carries acceptedTermsKey", () => {
  const reg = requirementsForDisplay(seReqs, "register");
  assert.equal(reg.find((r) => r.key === "registrationIdentifier")!.sensitive, true);
  assert.equal(reg.find((r) => r.key === "phoneNumber")!.sensitive, false);
  assert.equal(reg.find((r) => r.key === "acceptedTerms")!.acceptedTermsKey, "se_registration_terms");
  assert.equal(requirementsForDisplay(seReqs, "transfer")[0].sensitive, true); // eppCode
});
test("isSensitiveRequirementKey classifies PII/secret keys", () => {
  for (const k of ["registrationIdentifier", "personnummer", "orgNumber", "eppCode", "authCode", "ssn"]) {
    assert.equal(isSensitiveRequirementKey(k), true, k);
  }
  for (const k of ["phoneNumber", "country", "acceptedTerms"]) {
    assert.equal(isSensitiveRequirementKey(k), false, k);
  }
});
