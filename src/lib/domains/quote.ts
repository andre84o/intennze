/**
 * Domain quote-preparation model. PURE — no server-only, no crypto, no I/O — so
 * the snapshot builder and expiry logic are unit-tested.
 *
 * A "quote" is a customer's PREPARED intent to order a domain later. It is NOT an
 * order, payment, transfer, or DNS change — nothing is created. The snapshot
 * captures the customer sale price (net/vat/gross) that the server recomputed at
 * preparation time, plus a short expiry so a stale quote is rejected on redeem.
 *
 * Security invariant: a snapshot carries ONLY the customer-facing sale price. It
 * has NO provider (purchase) price and NO margin field — those never reach the
 * customer. The builder cannot introduce one because it has no such parameter.
 */
import type { VatSplit } from "./money.ts";

export type QuoteOperation = "register" | "transfer";

const QUOTE_OPERATIONS = new Set<string>(["register", "transfer"]);
export function isQuoteOperation(v: unknown): v is QuoteOperation {
  return typeof v === "string" && QUOTE_OPERATIONS.has(v);
}

/** How long a prepared quote stays valid. Deliberately short. */
export const QUOTE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export type DomainQuoteSnapshot = {
  domainName: string;
  tld: string | null;
  operation: QuoteOperation;
  years: number;
  currencyCode: string;
  premium: boolean;
  /** Whether a customer price was configured. When false the amounts are null. */
  priceConfigured: boolean;
  /** Customer sale price — net/vat/gross. NEVER a provider price. Null if unconfigured. */
  netAmountMinor: number | null;
  vatAmountMinor: number | null;
  grossAmountMinor: number | null;
  vatRateBasisPoints: number | null;
  /** Preparation instant and expiry instant (ms since epoch). */
  issuedAtMs: number;
  expiresAtMs: number;
};

export type BuildQuoteArgs = {
  domainName: string;
  tld: string | null;
  operation: QuoteOperation;
  years: number;
  currencyCode: string;
  premium: boolean;
  priceConfigured: boolean;
  /** The server-recomputed customer price split, or null when not configured. */
  net: VatSplit | null;
};

/**
 * Build a quote snapshot, stamping issued/expiry from the injected clock. Pure
 * and deterministic. The price is taken from the already-recomputed `net` split;
 * this function never accepts a provider price.
 */
export function buildDomainQuoteSnapshot(
  args: BuildQuoteArgs,
  nowMs: number,
  ttlMs: number = QUOTE_TTL_MS
): DomainQuoteSnapshot {
  return {
    domainName: args.domainName,
    tld: args.tld,
    operation: args.operation,
    years: args.years,
    currencyCode: args.currencyCode,
    premium: args.premium,
    priceConfigured: args.priceConfigured,
    netAmountMinor: args.net?.netAmountMinor ?? null,
    vatAmountMinor: args.net?.vatAmountMinor ?? null,
    grossAmountMinor: args.net?.grossAmountMinor ?? null,
    vatRateBasisPoints: args.net?.vatRateBasisPoints ?? null,
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + ttlMs,
  };
}

/** A quote is expired once `now` reaches its expiry instant. */
export function isQuoteExpired(snapshot: DomainQuoteSnapshot, nowMs: number): boolean {
  return nowMs >= snapshot.expiresAtMs;
}
