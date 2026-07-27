import "server-only";
import { cookies } from "next/headers";
import { getEffectiveActor, type EffectiveActor } from "@/lib/auth/customerView";
import type { ServiceResult } from "@/lib/domains/service";
import { normalizeDomainName, tldOf } from "@/lib/domains/normalize";
import { loadActiveRules, customerPricingFor } from "@/lib/domains/pricing-service";
import { logCustomerEvent } from "@/lib/domains/customer-audit";
import {
  buildDomainQuoteSnapshot,
  isQuoteOperation,
  QUOTE_TTL_MS,
  type DomainQuoteSnapshot,
  type QuoteOperation,
} from "@/lib/domains/quote";
import { DOMAIN_CART_COOKIE, signCartToken, verifyCartToken } from "@/lib/domains/cart-token";
import {
  cartTotals,
  pruneCart,
  removeCartItem,
  upsertCartItem,
  EMPTY_CART,
  type CartTotals,
  type DomainCart,
} from "@/lib/domains/cart";

/**
 * Domain CART service (SERVER-ONLY). A customer reserves domains in a signed
 * httpOnly cookie; NOTHING is ordered or held at the registry. The server
 * recomputes the customer sale price (never a provider price) for each item and
 * stamps a short expiry (the reservation). Availability is re-checked and the
 * price recomputed at checkout — the cookie amount is never trusted.
 */

function fail(error: string, status: number): { ok: false; error: string; status: number } {
  return { ok: false, error, status };
}

async function gate(): Promise<
  { ok: true; actor: EffectiveActor } | { ok: false; error: string; status: number }
> {
  const actor = await getEffectiveActor();
  if (!actor.realUserId) return fail("Not authenticated.", 401);
  if (!actor.isCustomerView && actor.realRole !== "customer") return fail("Forbidden.", 403);
  return { ok: true, actor };
}

const MAX_YEARS = 10;

/** Customer-safe cart item DTO. Never a provider price/margin (the snapshot has none). */
export type CartItemView = {
  domainName: string;
  tld: string | null;
  operation: QuoteOperation;
  years: number;
  currencyCode: string;
  premium: boolean;
  priceConfigured: boolean;
  netAmountMinor: number | null;
  vatAmountMinor: number | null;
  grossAmountMinor: number | null;
  expiresAtMs: number;
};

export type CartView = {
  items: CartItemView[];
  totals: CartTotals;
  currencyCode: string;
};

function toItemView(s: DomainQuoteSnapshot): CartItemView {
  return {
    domainName: s.domainName,
    tld: s.tld,
    operation: s.operation,
    years: s.years,
    currencyCode: s.currencyCode,
    premium: s.premium,
    priceConfigured: s.priceConfigured,
    netAmountMinor: s.netAmountMinor,
    vatAmountMinor: s.vatAmountMinor,
    grossAmountMinor: s.grossAmountMinor,
    expiresAtMs: s.expiresAtMs,
  };
}

function toView(cart: DomainCart): CartView {
  return {
    items: cart.items.map(toItemView),
    totals: cartTotals(cart),
    currencyCode: cart.items[0]?.currencyCode ?? "SEK",
  };
}

/** Recompute the customer price server-side and stamp a fresh reservation. */
async function priceSnapshot(
  actor: EffectiveActor,
  domainName: string,
  operation: QuoteOperation,
  years: number,
  premium: boolean
): Promise<DomainQuoteSnapshot> {
  const currency = "SEK";
  const tld = tldOf(domainName);
  const rules = await loadActiveRules(actor, currency);
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
  const view = pricing.registration; // register|transfer both use the registration sale price
  return buildDomainQuoteSnapshot(
    {
      domainName,
      tld,
      operation,
      years,
      currencyCode: currency,
      premium,
      priceConfigured: view.priceConfigured,
      net: view.net,
    },
    Date.now()
  );
}

async function writeCart(cart: DomainCart): Promise<void> {
  const store = await cookies();
  store.set(DOMAIN_CART_COOKIE, signCartToken(cart), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/portal",
    maxAge: Math.floor(QUOTE_TTL_MS / 1000),
  });
}

async function readCookieCart(): Promise<DomainCart> {
  const store = await cookies();
  const cart = verifyCartToken(store.get(DOMAIN_CART_COOKIE)?.value) ?? EMPTY_CART;
  return pruneCart(cart, Date.now());
}

export type AddToCartInput = {
  domainName: string;
  operation: QuoteOperation;
  years: number;
  premium?: boolean;
};

/** Add (or refresh) a domain in the cart. Recomputes the price server-side. */
export async function addToCart(input: AddToCartInput): Promise<ServiceResult<CartView>> {
  const g = await gate();
  if (!g.ok) return g;

  const normalized = normalizeDomainName(input?.domainName);
  if (!normalized.ok) return fail("Ogiltigt domännamn.", 400);
  if (!isQuoteOperation(input?.operation)) return fail("Ogiltig åtgärd.", 400);
  const years =
    Number.isInteger(input?.years) && input.years >= 1 && input.years <= MAX_YEARS ? input.years : 1;
  const premium = !!input?.premium;

  const snap = await priceSnapshot(g.actor, normalized.name, input.operation, years, premium);
  const next = upsertCartItem(await readCookieCart(), snap);
  await writeCart(next);

  // Reuses the QUOTE_PREPARED audit action (a cart item is a prepared reservation)
  // to avoid widening the DB log_customer_event allowlist.
  await logCustomerEvent(g.actor, "CUSTOMER_DOMAIN_QUOTE_PREPARED", {
    metadata: { tld: snap.tld, operation: input.operation, years, price_configured: snap.priceConfigured, cart: true },
  });

  return { ok: true, data: toView(next) };
}

/** Remove one domain from the cart. */
export async function removeFromCart(domainName: unknown): Promise<ServiceResult<CartView>> {
  const g = await gate();
  if (!g.ok) return g;
  const normalized = normalizeDomainName(typeof domainName === "string" ? domainName : "");
  if (!normalized.ok) return fail("Ogiltigt domännamn.", 400);

  const next = removeCartItem(await readCookieCart(), normalized.name);
  await writeCart(next);
  return { ok: true, data: toView(next) };
}

/** Read the current cart (pruned of expired reservations). */
export async function readCartView(): Promise<CartView> {
  return toView(await readCookieCart());
}

/** Raw pruned cart for the checkout service (server-only consumer). */
export async function readCartForCheckout(): Promise<DomainCart> {
  return readCookieCart();
}

/** Empty the cart (called after a checkout session is created). */
export async function clearCart(): Promise<void> {
  const store = await cookies();
  store.set(DOMAIN_CART_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/portal",
    maxAge: 0,
  });
}
