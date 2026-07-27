import { test } from "node:test";
import assert from "node:assert/strict";
// NOTE: run with `node --test --experimental-strip-types`. Under strip-types the
// import MUST carry the explicit `.ts` extension and use a relative path (the
// `@/*` alias is a compiler-only concept and is not resolvable by Node).
import { normalizeDomainName, isValidDomain, tldOf } from "./normalize.ts";

test("tldOf returns the registrable suffix", () => {
  assert.equal(tldOf("foo.se"), "se");
  assert.equal(tldOf("foo.co.uk"), "co.uk");
  assert.equal(tldOf("FOO.SE"), "se");
  assert.equal(tldOf("nodot"), null);
  assert.equal(tldOf("trailing."), null);
  assert.equal(tldOf(null), null);
});

function normalized(input: string): string | null {
  const r = normalizeDomainName(input);
  return r.ok ? r.name : null;
}

test("lowercases", () => {
  assert.equal(normalized("Example.se"), "example.se");
  assert.equal(normalized("EXAMPLE.SE"), "example.se");
});

test("strips scheme", () => {
  assert.equal(normalized("https://example.se"), "example.se");
  assert.equal(normalized("http://example.se"), "example.se");
  assert.equal(normalized("//example.se"), "example.se");
});

test("strips trailing dot", () => {
  assert.equal(normalized("example.se."), "example.se");
});

test("strips path/query/fragment (documented: normalize, not reject)", () => {
  assert.equal(normalized("example.se/"), "example.se");
  assert.equal(normalized("https://example.se/path"), "example.se");
  assert.equal(normalized("https://example.se/path?q=1#frag"), "example.se");
});

test("strips userinfo and port", () => {
  assert.equal(normalized("user:pass@example.se"), "example.se");
  assert.equal(normalized("example.se:8080"), "example.se");
});

test("trims surrounding whitespace", () => {
  assert.equal(normalized("  example.se  "), "example.se");
});

test("all case/URL variants collapse to the same value", () => {
  const forms = ["Example.se", "example.se", "https://example.se", "example.se/", "EXAMPLE.SE."];
  const results = forms.map(normalized);
  for (const r of results) assert.equal(r, "example.se");
});

test("converts international domains to punycode", () => {
  assert.equal(normalized("räksmörgås.se"), "xn--rksmrgs-5wao1o.se");
  // already-encoded punycode round-trips
  assert.equal(normalized("xn--rksmrgs-5wao1o.se"), "xn--rksmrgs-5wao1o.se");
});

test("rejects empty / nullish", () => {
  assert.equal(normalizeDomainName("").ok, false);
  assert.equal(normalizeDomainName("   ").ok, false);
  assert.equal(normalizeDomainName(null).ok, false);
  assert.equal(normalizeDomainName(undefined).ok, false);
});

test("rejects single-label and invalid hosts", () => {
  assert.equal(normalizeDomainName("localhost").ok, false);
  assert.equal(normalizeDomainName("example").ok, false);
  assert.equal(normalizeDomainName("*.example.se").ok, false);
  assert.equal(normalizeDomainName("-bad.se").ok, false);
  assert.equal(normalizeDomainName("bad-.se").ok, false);
  assert.equal(normalizeDomainName("a..b.se").ok, false);
});

test("rejects a label longer than 63 chars", () => {
  const long = "a".repeat(64) + ".se";
  assert.equal(normalizeDomainName(long).ok, false);
});

test("isValidDomain guard", () => {
  assert.equal(isValidDomain("example.se"), true);
  assert.equal(isValidDomain("sub.example.co.uk"), true);
  assert.equal(isValidDomain("xn--rksmrgs-5wao1o.se"), true);
  assert.equal(isValidDomain("Example.se"), false); // must already be normalized
  assert.equal(isValidDomain("example"), false);
  assert.equal(isValidDomain("1.2.3.4"), false); // numeric TLD rejected
  assert.equal(isValidDomain(123), false);
});
