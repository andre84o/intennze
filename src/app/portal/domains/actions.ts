"use server";

import { searchDomainsForCustomer, type SearchInput } from "@/lib/domains/search-service";
import { refreshDomainStatusForCustomer } from "@/lib/domains/portal-service";
import { prepareDomainQuote, type PrepareQuoteInput } from "@/lib/domains/quote-service";
import { addToCart, removeFromCart, readCartView, type AddToCartInput } from "@/lib/domains/cart-service";
import { createDomainCheckout, getCustomerDomainOrderStatus } from "@/lib/domains/checkout-service";

/**
 * Customer domain-portal server actions. Each is a thin wrapper — the service
 * re-verifies the actor, enforces ownership, rate-limits, and audits. Read-only:
 * NO order, payment, transfer, or DNS change is ever created here.
 */

/** Read-only availability + sale price. Never returns a provider price. */
export async function searchDomains(input: SearchInput) {
  return searchDomainsForCustomer(input);
}

/** Manual, ownership-verified, rate-limited live status refresh (read-only). */
export async function refreshDomainStatus(localDomainId: string) {
  return refreshDomainStatusForCustomer(localDomainId);
}

/** Prepare a domain quote (signed cookie). Creates no order. */
export async function prepareQuote(input: PrepareQuoteInput) {
  return prepareDomainQuote(input);
}

/** Add a domain to the reserved cart (signed cookie). Creates no order. */
export async function addDomainToCart(input: AddToCartInput) {
  return addToCart(input);
}

/** Remove a domain from the cart. */
export async function removeDomainFromCart(domainName: string) {
  return removeFromCart(domainName);
}

/** Read the current cart (pruned of expired reservations). */
export async function getCart() {
  return readCartView();
}

/**
 * Validate the prepared quote + registrant, recheck availability, create a local
 * order and a Stripe TEST-mode Checkout Session. Returns the Stripe URL (the
 * client redirects). Only a real logged-in CUSTOMER may pay (admin-in-view is
 * blocked server-side). Creates NO Hostup order and captures NO live payment.
 */
export async function createCheckout(registrant: unknown) {
  return createDomainCheckout(registrant);
}

/** Poll one owned order's status (the paid state comes from the webhook). */
export async function readOrderStatus(orderId: string) {
  return getCustomerDomainOrderStatus(orderId);
}
