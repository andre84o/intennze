/**
 * Domain shopping-cart model. PURE — no server-only, no crypto, no I/O — so the
 * merge/prune/total logic is unit-testable.
 *
 * A cart item IS a prepared quote snapshot (see quote.ts): it carries the
 * customer sale price the SERVER computed plus a short expiry (the "reservation").
 * Nothing is ordered or held at the registry — availability is re-checked at
 * checkout and the price is recomputed there. The snapshot never carries a
 * provider price or margin, so neither can leak through the cart.
 */
import { isQuoteExpired, type DomainQuoteSnapshot } from "@/lib/domains/quote";

export const CART_MAX_ITEMS = 20;

export type DomainCart = { items: DomainQuoteSnapshot[] };
export const EMPTY_CART: DomainCart = { items: [] };

/** Drop reserved-then-expired items (each item self-expires 15 min after add). */
export function pruneCart(cart: DomainCart, nowMs: number): DomainCart {
  return { items: cart.items.filter((i) => !isQuoteExpired(i, nowMs)) };
}

/** Add or replace an item by domain name (re-adding refreshes its reservation). */
export function upsertCartItem(cart: DomainCart, item: DomainQuoteSnapshot): DomainCart {
  const rest = cart.items.filter((i) => i.domainName !== item.domainName);
  return { items: [...rest, item].slice(-CART_MAX_ITEMS) };
}

export function removeCartItem(cart: DomainCart, domainName: string): DomainCart {
  return { items: cart.items.filter((i) => i.domainName !== domainName) };
}

export function hasCartItem(cart: DomainCart, domainName: string): boolean {
  return cart.items.some((i) => i.domainName === domainName);
}

export type CartTotals = {
  /** Number of items in the cart. */
  count: number;
  /** Number of items with a configured price (the only ones that are payable). */
  priceable: number;
  netAmountMinor: number;
  vatAmountMinor: number;
  grossAmountMinor: number;
};

/** Sum the customer sale price across items that have a configured price. */
export function cartTotals(cart: DomainCart): CartTotals {
  let net = 0;
  let vat = 0;
  let gross = 0;
  let priceable = 0;
  for (const i of cart.items) {
    if (i.priceConfigured && i.grossAmountMinor != null) {
      net += i.netAmountMinor ?? 0;
      vat += i.vatAmountMinor ?? 0;
      gross += i.grossAmountMinor;
      priceable++;
    }
  }
  return { count: cart.items.length, priceable, netAmountMinor: net, vatAmountMinor: vat, grossAmountMinor: gross };
}
