import "server-only";
import { cookies } from "next/headers";
import { getEffectiveActor } from "@/lib/auth/customerView";
import type { ServiceResult } from "@/lib/domains/service";
import { normalizeDomainName, tldOf } from "@/lib/domains/normalize";
import { loadActiveRules, customerPricingFor } from "@/lib/domains/pricing-service";
import { logCustomerEvent } from "@/lib/domains/customer-audit";
import {
  buildDomainQuoteSnapshot,
  isQuoteExpired,
  isQuoteOperation,
  QUOTE_TTL_MS,
  type DomainQuoteSnapshot,
  type QuoteOperation,
} from "@/lib/domains/quote";
import { DOMAIN_QUOTE_COOKIE, signQuoteToken, verifyQuoteToken } from "@/lib/domains/quote-token";

/**
 * Domain quote PREPARATION service (SERVER-ONLY). A customer prepares an intent to
 * order a domain later; NOTHING is created — no order, payment, transfer, or DNS
 * change. The server recomputes the customer sale price (never a provider price),
 * snapshots it with a short expiry, and stores it in a signed httpOnly cookie.
 */

function fail(error: string, status: number): { ok: false; error: string; status: number } {
  return { ok: false, error, status };
}

export type PrepareQuoteInput = {
  domainName: string;
  operation: QuoteOperation;
  years: number;
  premium?: boolean;
};

const MAX_YEARS = 10;

/**
 * Prepare (and persist to a signed cookie) a domain quote for the current
 * customer. Read-only w.r.t. the provider; recomputes the price server-side.
 */
export async function prepareDomainQuote(
  input: PrepareQuoteInput
): Promise<ServiceResult<DomainQuoteSnapshot>> {
  const actor = await getEffectiveActor();
  if (!actor.realUserId) return fail("Not authenticated.", 401);
  if (!actor.isCustomerView && actor.realRole !== "customer") return fail("Forbidden.", 403);

  const normalized = normalizeDomainName(input?.domainName);
  if (!normalized.ok) return fail("Ogiltigt domännamn.", 400);
  if (!isQuoteOperation(input?.operation)) return fail("Ogiltig åtgärd.", 400);
  const years =
    Number.isInteger(input?.years) && input.years >= 1 && input.years <= MAX_YEARS ? input.years : 1;
  const premium = !!input?.premium;

  const currency = "SEK";
  const tld = tldOf(normalized.name);
  const rules = await loadActiveRules(actor, currency);

  // Recompute the customer price server-side. No provider price is supplied, so
  // fixed rules resolve and markup rules resolve to "not configured" — never a
  // provider/purchase price. registration & renewal stay separate.
  const pricing = customerPricingFor(rules, {
    tld,
    years,
    currencyCode: currency,
    premium,
    requiresRegistrarFeeAcceptance: false,
    providerRegistrationAmountMinor: null,
    providerRenewalAmountMinor: null,
    premiumProviderAmountMinor: null,
  });
  // register|transfer both quote the registration price view here (renewal is a
  // separate future operation); transfer reuses the registration sale price.
  const view = pricing.registration;

  const snapshot = buildDomainQuoteSnapshot(
    {
      domainName: normalized.name,
      tld,
      operation: input.operation,
      years,
      currencyCode: currency,
      premium,
      priceConfigured: view.priceConfigured,
      net: view.net,
    },
    Date.now()
  );

  const store = await cookies();
  store.set(DOMAIN_QUOTE_COOKIE, signQuoteToken(snapshot), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/portal",
    maxAge: Math.floor(QUOTE_TTL_MS / 1000),
  });

  await logCustomerEvent(actor, "CUSTOMER_DOMAIN_QUOTE_PREPARED", {
    metadata: {
      tld,
      operation: input.operation,
      years,
      price_configured: view.priceConfigured,
    },
  });

  return { ok: true, data: snapshot };
}

/** Read the current prepared quote from its cookie, if valid and not expired. */
export async function readDomainQuote(): Promise<DomainQuoteSnapshot | null> {
  const store = await cookies();
  const snapshot = verifyQuoteToken(store.get(DOMAIN_QUOTE_COOKIE)?.value);
  if (!snapshot) return null;
  if (isQuoteExpired(snapshot, Date.now())) return null;
  return snapshot;
}
