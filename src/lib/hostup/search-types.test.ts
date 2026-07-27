import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapAvailabilityState,
  isDcheckJobId,
  parseDomainAvailability,
  parseBulkAvailabilityResponse,
  parseAvailabilityJob,
  parseDomainProduct,
  parseOrderPreview,
  parseTldList,
} from "./search-types.ts";

// Real .com availability shape (probed live).
const availCom = {
  name: "example.com",
  state: "available",
  unknownReason: null,
  available: true,
  reason: null,
  actions: { canRegister: { allowed: true, reason: null }, canTransfer: { allowed: false, reason: "reg only" } },
  billing: { amount: 120, currencyCode: "SEK", billingCycle: "annually" },
  currencyCode: "SEK",
  premium: false,
  requiresRegistrarFeeAcceptance: false,
  eppRequired: true,
  renewalAmount: 119,
  supportedRegisterYears: [1, 2, 3, 5],
  supportedTransferYears: [1],
  existingDomainId: null,
  registryRequirements: { registration: [], transfer: [{ key: "eppCode", label: "Authorization code", required: true, appliesTo: "transfer" }], countryEligibility: { required: false, allowedCountryCodes: null, reason: null } },
};

test("mapAvailabilityState maps all 6 states + aliases (never boolean)", () => {
  assert.equal(mapAvailabilityState("available"), "available");
  assert.equal(mapAvailabilityState("unavailable"), "unavailable");
  assert.equal(mapAvailabilityState("taken"), "unavailable");
  assert.equal(mapAvailabilityState("already_owned"), "already_owned");
  assert.equal(mapAvailabilityState("checking"), "checking");
  assert.equal(mapAvailabilityState("invalid"), "invalid");
  assert.equal(mapAvailabilityState("weird_thing"), "unknown");
  assert.equal(mapAvailabilityState(undefined, true), "available");
});

test("parseDomainAvailability: register-allowed / transfer-blocked, provider price + years", () => {
  const a = parseDomainAvailability(availCom)!;
  assert.equal(a.name, "example.com");
  assert.equal(a.state, "available");
  assert.equal(a.actions.canRegister.allowed, true);
  assert.equal(a.actions.canTransfer.allowed, false);
  assert.equal(a.premium, false);
  assert.equal(a.requiresRegistrarFeeAcceptance, false);
  assert.equal(a.providerBilling?.amount, 120);
  assert.equal(a.providerRenewalAmount, 119);
  assert.deepEqual(a.supportedRegisterYears, [1, 2, 3, 5]);
  assert.equal(a.registryRequirements?.transfer[0].key, "eppCode");
});

test("parseDomainAvailability: transfer-allowed / register-blocked (inverse)", () => {
  const a = parseDomainAvailability({
    name: "taken.com",
    state: "unavailable",
    actions: { canRegister: { allowed: false, reason: "taken" }, canTransfer: { allowed: true, reason: null } },
  })!;
  assert.equal(a.state, "unavailable");
  assert.equal(a.actions.canRegister.allowed, false);
  assert.equal(a.actions.canTransfer.allowed, true);
});

test("parseDomainAvailability: missing billing → provider price null, premium flag surfaced", () => {
  const a = parseDomainAvailability({ name: "prem.com", state: "available", premium: true })!;
  assert.equal(a.providerBilling, null);
  assert.equal(a.providerRenewalAmount, null);
  assert.equal(a.premium, true);
});

test("parseDomainAvailability: unknown state + reason, and already_owned", () => {
  const u = parseDomainAvailability({ name: "x.com", state: "unknown", unknownReason: "upstream_timeout" })!;
  assert.equal(u.state, "unknown");
  assert.equal(u.unknownReason, "upstream_timeout");
  const o = parseDomainAvailability({ name: "mine.com", state: "already_owned", existingDomainId: "dom_1" })!;
  assert.equal(o.state, "already_owned");
  assert.equal(o.existingDomainId, "dom_1");
});

test("parseBulkAvailabilityResponse: 200 inline vs 202 queued job", () => {
  const inline = parseBulkAvailabilityResponse({ data: [availCom] }, 200);
  assert.equal(inline.kind, "inline");
  if (inline.kind === "inline") assert.equal(inline.results.length, 1);

  const job = parseBulkAvailabilityResponse(
    { operation: { status: "queued", jobId: "dcheck_abc123", pollUrl: "/api/v2/domains/availability/dcheck_abc123" } },
    202
  );
  assert.equal(job.kind, "job");
  if (job.kind === "job") assert.equal(job.jobId, "dcheck_abc123");
});

test("isDcheckJobId only accepts dcheck_ ids", () => {
  assert.equal(isDcheckJobId("dcheck_06ft286q"), true);
  assert.equal(isDcheckJobId("job_123"), false);
  assert.equal(isDcheckJobId("dbj_123"), false);
  assert.equal(isDcheckJobId(""), false);
});

test("parseAvailabilityJob: processing (partial) and completed", () => {
  const p = parseAvailabilityJob({ status: "processing", progress: 80, data: [availCom] });
  assert.equal(p.status, "processing");
  assert.equal(p.results.length, 1);
  const c = parseAvailabilityJob({ status: "completed", data: [availCom, { name: "b.se", state: "available" }] });
  assert.equal(c.status, "completed");
  assert.equal(c.results.length, 2);
});

test("parseDomainProduct: real .se shape (pricing + periods + requirements)", () => {
  const p = parseDomainProduct({
    tld: ".se",
    register: { amount: 99, currencyCode: "SEK" },
    renew: { amount: 169, currencyCode: "SEK" },
    billing: { amount: 99, currencyCode: "SEK", billingCycle: "annually" },
    domainPricing: [{ years: 1, register: { amount: 99, currencyCode: "SEK" }, renew: { amount: 169, currencyCode: "SEK" } }, { years: 2, register: { amount: 268, currencyCode: "SEK" } }],
    registryRequirements: { registration: [{ key: "phoneNumber", required: true }], transfer: [] },
  })!;
  assert.equal(p.tld, ".se");
  assert.equal(p.providerRegister?.amount, 99);
  assert.equal(p.providerBillingCycle, "annually");
  assert.equal(p.domainPricing.length, 2);
  assert.equal(p.registryRequirements?.registration[0].key, "phoneNumber");
});

test("parseOrderPreview: real shape, amounts, and createsNothing marker", () => {
  const r = parseOrderPreview({
    items: [{ productSlug: null, domainName: "x.com", type: "domain", billingCycle: "annually", periodYears: 1, quantity: 1, unitAmount: 120, renewalAnnualAmount: 119, setupAmount: 0, subtotal: 120, currencyCode: "SEK" }],
    subtotal: 120,
    taxRateDecimal: 0.25,
    taxAmount: 30,
    total: 150,
    currencyCode: "SEK",
  });
  assert.equal(r.createsNothing, true);
  assert.equal(r.providerSubtotal, 120);
  assert.equal(r.taxRateDecimal, 0.25);
  assert.equal(r.providerTaxAmount, 30);
  assert.equal(r.providerTotal, 150);
  assert.equal(r.items[0].domainName, "x.com");
  assert.equal(r.items[0].providerRenewalAnnualAmount, 119);
});

test("parseTldList reads {tlds:[{tld}]}", () => {
  assert.deepEqual(parseTldList({ tlds: [{ tld: ".se" }, { tld: ".com" }] }), [".se", ".com"]);
  assert.deepEqual(parseTldList(["a", "b"]), ["a", "b"]);
});
