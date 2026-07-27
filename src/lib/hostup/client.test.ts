import { test, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
// RELATIVE + .ts extension (the @/* alias is compiler-only, unresolvable by Node).
// Run with: node --conditions=react-server --test --experimental-strip-types
import {
  listHostupDomains,
  listAllHostupDomains,
  findHostupDomainByName,
  getHostupDomain,
  getHostupDomainNameservers,
  getHostupRateLimit,
} from "./client.ts";
import { HostupError } from "./types.ts";

const API_KEY = "test-secret-key-abc123";
const realFetch = globalThis.fetch;
let calls: { url: string; init: RequestInit }[] = [];

function stubFetch(responder: (url: string, init: RequestInit) => Response | Promise<Response>) {
  calls = [];
  globalThis.fetch = (async (input: unknown, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    return responder(String(input), init);
  }) as typeof fetch;
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function authHeader(i = 0): string | null {
  return new Headers(calls[i].init.headers as HeadersInit).get("authorization");
}

beforeEach(() => {
  process.env.HOSTUP_API_BASE_URL = "https://api.hostup.test/v2";
  process.env.HOSTUP_API_KEY = API_KEY;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  calls = [];
});

test("sends correct Bearer header", async () => {
  stubFetch(() => json({ data: [] }));
  await listHostupDomains();
  assert.equal(authHeader(), `Bearer ${API_KEY}`);
});

test("API key never appears in a thrown error", async () => {
  stubFetch(() => json({ error: "boom" }, 500));
  await assert.rejects(
    () => listHostupDomains(),
    (e: unknown) => {
      assert.ok(e instanceof HostupError);
      assert.equal(e.status, 500);
      assert.ok(!String(e.message).includes(API_KEY), "message leaked key");
      assert.ok(!String(e.stack ?? "").includes(API_KEY), "stack leaked key");
      return true;
    }
  );
});

test("successful domain listing", async () => {
  stubFetch(() => json({ data: [{ id: "dom_1", name: "example.se" }] }));
  const page = await listHostupDomains();
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].id, "dom_1");
  assert.equal(page.items[0].name, "example.se");
  assert.ok(calls[0].url.includes("/domains"));
});

test("cursor pagination follows nextCursor across pages", async () => {
  stubFetch((url) => {
    if (url.includes("cursor=c2")) {
      return json({ data: [{ id: "dom_2", name: "b.se" }], nextCursor: null });
    }
    return json({ data: [{ id: "dom_1", name: "a.se" }], meta: { next_cursor: "c2" } });
  });
  const all = await listAllHostupDomains();
  assert.equal(all.length, 2);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].url.includes("cursor=c2"));
});

test("search by name sends normalized name query", async () => {
  stubFetch(() => json({ data: [{ id: "dom_9", name: "foo.se" }] }));
  const found = await findHostupDomainByName("https://FOO.se/");
  assert.equal(found?.id, "dom_9");
  assert.ok(calls[0].url.includes("name=foo.se"));
});

test("search by name returns null when no match", async () => {
  stubFetch(() => json({ data: [] }));
  assert.equal(await findHostupDomainByName("nope.se"), null);
});

test("get by dom_ id hits /domains/{id} and unwraps data", async () => {
  stubFetch(() => json({ data: { id: "dom_42", name: "x.se", status: "active" } }));
  const d = await getHostupDomain("dom_42");
  assert.equal(d.id, "dom_42");
  assert.ok(calls[0].url.endsWith("/domains/dom_42"));
});

test("get by invalid id throws VALIDATION before any fetch", async () => {
  stubFetch(() => json({}));
  await assert.rejects(
    () => getHostupDomain("not-a-dom-id"),
    (e: unknown) => e instanceof HostupError && e.code === "VALIDATION"
  );
  assert.equal(calls.length, 0);
});

test("timeout / abort surfaces a TIMEOUT error", async () => {
  stubFetch(() => {
    const e = new Error("The operation was aborted");
    e.name = "AbortError";
    throw e;
  });
  await assert.rejects(
    () => listHostupDomains(),
    (e: unknown) => e instanceof HostupError && e.code === "TIMEOUT"
  );
});

test("invalid JSON body throws a controlled PARSE_ERROR (no key leak)", async () => {
  stubFetch(() => new Response("not json", { status: 200 }));
  await assert.rejects(
    () => listHostupDomains(),
    (e: unknown) => {
      assert.ok(e instanceof HostupError && e.code === "PARSE_ERROR");
      assert.ok(!String((e as Error).message).includes(API_KEY));
      return true;
    }
  );
});

test("401 -> UNAUTHORIZED", async () => {
  stubFetch(() => json({ title: "Unauthorized" }, 401));
  await assert.rejects(
    () => listHostupDomains(),
    (e: unknown) => e instanceof HostupError && e.code === "UNAUTHORIZED" && e.status === 401
  );
});

test("403 -> FORBIDDEN", async () => {
  stubFetch(() => json({ title: "Forbidden" }, 403));
  await assert.rejects(
    () => listHostupDomains(),
    (e: unknown) => e instanceof HostupError && e.code === "FORBIDDEN" && e.status === 403
  );
});

test("404 -> NOT_FOUND with parsed problem", async () => {
  stubFetch(() => json({ title: "Not found", code: "not_found" }, 404));
  await assert.rejects(
    () => getHostupDomain("dom_missing"),
    (e: unknown) => {
      assert.ok(e instanceof HostupError && e.code === "NOT_FOUND" && e.status === 404);
      assert.equal((e as HostupError).problem?.code, "not_found");
      return true;
    }
  );
});

test("429 -> RATE_LIMITED with parsed Retry-After seconds", async () => {
  stubFetch(() => new Response("{}", { status: 429, headers: { "retry-after": "12" } }));
  await assert.rejects(
    () => listHostupDomains(),
    (e: unknown) => e instanceof HostupError && e.code === "RATE_LIMITED" && e.retryAfter === 12
  );
});

test("500 -> SERVER_ERROR", async () => {
  stubFetch(() => json({ title: "Server error" }, 500));
  await assert.rejects(
    () => listHostupDomains(),
    (e: unknown) => e instanceof HostupError && e.code === "SERVER_ERROR" && e.status === 500
  );
});

test("nameservers endpoint returns the array", async () => {
  stubFetch(() => json({ data: { nameservers: ["ns1.hostup.se", "ns2.hostup.se"] } }));
  const ns = await getHostupDomainNameservers("dom_1");
  assert.deepEqual(ns.nameservers, ["ns1.hostup.se", "ns2.hostup.se"]);
  assert.ok(calls[0].url.endsWith("/domains/dom_1/nameservers"));
});

test("captures X-RateLimit-* headers on success (source of truth, not assumed)", async () => {
  stubFetch(() =>
    json({ data: [] }, 200, {
      "x-ratelimit-limit": "250",
      "x-ratelimit-remaining": "249",
      "x-ratelimit-reset": "1730000000",
    })
  );
  await listHostupDomains();
  const rl = getHostupRateLimit();
  assert.equal(rl?.limit, 250);
  assert.equal(rl?.remaining, 249);
  assert.equal(rl?.reset, "1730000000");
});

test("429 error also carries the rate-limit snapshot", async () => {
  stubFetch(
    () =>
      new Response("{}", {
        status: 429,
        headers: {
          "retry-after": "7",
          "x-ratelimit-limit": "250",
          "x-ratelimit-remaining": "0",
        },
      })
  );
  await assert.rejects(
    () => listHostupDomains(),
    (e: unknown) =>
      e instanceof HostupError &&
      e.code === "RATE_LIMITED" &&
      e.retryAfter === 7 &&
      e.rateLimit?.remaining === 0 &&
      e.rateLimit?.limit === 250
  );
});

test("missing HOSTUP_API_KEY -> INVALID_CONFIG (no network)", async () => {
  delete process.env.HOSTUP_API_KEY;
  stubFetch(() => json({}));
  await assert.rejects(
    () => listHostupDomains(),
    (e: unknown) => e instanceof HostupError && e.code === "INVALID_CONFIG"
  );
  assert.equal(calls.length, 0);
});
