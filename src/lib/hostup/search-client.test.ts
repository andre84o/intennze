import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
// Run with: node --conditions=react-server --test --experimental-strip-types
import {
  checkDomainAvailability,
  checkBulkDomainAvailability,
  getDomainAvailabilityJob,
  getDomainProduct,
  listDomainProducts,
  previewDomainOrder,
} from "./client.ts";
import { HostupError } from "./types.ts";

const API_KEY = "search-secret-key-xyz";
const realFetch = globalThis.fetch;
let calls: { url: string; init: RequestInit }[] = [];

function stubFetch(responder: (url: string, init: RequestInit) => Response) {
  calls = [];
  globalThis.fetch = (async (input: unknown, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    return responder(String(input), init);
  }) as typeof fetch;
}
function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}
const authHeader = (i = 0) => new Headers(calls[i].init.headers as HeadersInit).get("authorization");
const body = (i = 0) => JSON.parse(String(calls[i].init.body));

beforeEach(() => {
  process.env.HOSTUP_API_BASE_URL = "https://api.hostup.test/v2";
  process.env.HOSTUP_API_KEY = API_KEY;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  calls = [];
});

test("checkDomainAvailability: GET ?name=, Bearer header, key never leaked", async () => {
  stubFetch(() => json({ name: "example.se", state: "available", actions: { canRegister: { allowed: true }, canTransfer: { allowed: false } } }));
  const a = await checkDomainAvailability("https://Example.SE/");
  assert.equal(a.state, "available");
  assert.ok(calls[0].url.includes("/domains/availability?name=example.se"));
  assert.equal(authHeader(), `Bearer ${API_KEY}`);
});

test("checkDomainAvailability: invalid input short-circuits to state=invalid (no network)", async () => {
  stubFetch(() => json({}));
  const a = await checkDomainAvailability("not a domain!!");
  assert.equal(a.state, "invalid");
  assert.equal(calls.length, 0);
});

test("checkBulkDomainAvailability: POST body uses {names}, 200 inline results", async () => {
  stubFetch(() => json({ data: [{ name: "a.se", state: "available" }, { name: "b.com", state: "unavailable" }] }, 200));
  const res = await checkBulkDomainAvailability(["A.se", "b.com"]);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(body().names, ["a.se", "b.com"]);
  assert.equal(res.kind, "inline");
  if (res.kind === "inline") assert.equal(res.results.length, 2);
});

test("checkBulkDomainAvailability: 202 returns a dcheck_ job", async () => {
  stubFetch(() => json({ operation: { status: "queued", jobId: "dcheck_zzz", pollUrl: "/api/v2/domains/availability/dcheck_zzz" } }, 202));
  const res = await checkBulkDomainAvailability(["a.se", "b.se", "c.se", "d.se", "e.se"]);
  assert.equal(res.kind, "job");
  if (res.kind === "job") {
    assert.equal(res.jobId, "dcheck_zzz");
    assert.equal(res.pollUrl, "/api/v2/domains/availability/dcheck_zzz");
  }
});

test("getDomainAvailabilityJob: rejects non-dcheck id before any fetch", async () => {
  stubFetch(() => json({}));
  await assert.rejects(
    () => getDomainAvailabilityJob("job_123"),
    (e: unknown) => e instanceof HostupError && e.code === "VALIDATION"
  );
  assert.equal(calls.length, 0);
});

test("getDomainAvailabilityJob: GETs the job and parses status + partial data", async () => {
  stubFetch(() => json({ status: "processing", progress: 50, data: [{ name: "a.se", state: "available" }] }));
  const job = await getDomainAvailabilityJob("dcheck_abc");
  assert.equal(job.status, "processing");
  assert.equal(job.results.length, 1);
  assert.ok(calls[0].url.endsWith("/domains/availability/dcheck_abc"));
});

test("getDomainProduct: strips leading dot into the path", async () => {
  stubFetch(() => json({ tld: ".se", register: { amount: 99, currencyCode: "SEK" } }));
  const p = await getDomainProduct(".SE");
  assert.equal(p.tld, ".se");
  assert.ok(calls[0].url.endsWith("/products/domains/se"));
});

test("listDomainProducts: returns the tld list", async () => {
  stubFetch(() => json({ tlds: [{ tld: ".se" }, { tld: ".com" }] }));
  assert.deepEqual(await listDomainProducts(), [".se", ".com"]);
});

test("previewDomainOrder: POST body uses domainName + type:domain; result creates nothing", async () => {
  stubFetch(() => json({ items: [{ domainName: "x.com", unitAmount: 120, subtotal: 120, currencyCode: "SEK" }], subtotal: 120, taxRateDecimal: 0.25, taxAmount: 30, total: 150, currencyCode: "SEK" }));
  const r = await previewDomainOrder({ items: [{ action: "register", domainName: "x.com", years: 1 }] });
  assert.equal(calls[0].init.method, "POST");
  const item = body().items[0];
  assert.equal(item.type, "domain");
  assert.equal(item.domainName, "x.com");
  assert.equal(item.action, "register");
  assert.equal(r.createsNothing, true);
  assert.equal(r.providerTotal, 150);
});

test("availability 429 → RATE_LIMITED with retryAfter, no key leak", async () => {
  stubFetch(() => new Response("{}", { status: 429, headers: { "retry-after": "5" } }));
  await assert.rejects(
    () => checkDomainAvailability("example.se"),
    (e: unknown) => {
      assert.ok(e instanceof HostupError && e.code === "RATE_LIMITED" && e.retryAfter === 5);
      assert.ok(!String((e as Error).message).includes(API_KEY));
      return true;
    }
  );
});
