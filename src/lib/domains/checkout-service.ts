import "server-only";
import { getEffectiveActor, type EffectiveActor } from "@/lib/auth/customerView";
import type { ServiceResult } from "@/lib/domains/service";
import { readCartForCheckout, clearCart } from "@/lib/domains/cart-service";
import { cartTotals } from "@/lib/domains/cart";
import { loadActiveRules, customerPricingFor } from "@/lib/domains/pricing-service";
import { tldOf } from "@/lib/domains/normalize";
import { checkDomainAvailability, isHostupConfigured } from "@/lib/hostup/client";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe/client";
import { logCustomerEvent } from "@/lib/domains/customer-audit";
import { isOrderStatus, type OrderStatus } from "@/lib/domains/order-status";
import {
  normalizeRegistrant,
  missingRegistrantFields,
  validateRegistrantContact,
  type RegistrantContact,
  type RegistrantField,
} from "@/lib/domains/registrant-contact";
import { providerMajorToMinor, type VatSplit } from "@/lib/domains/money";

/**
 * Domain CHECKOUT service (SERVER-ONLY). Validates a prepared quote, rechecks
 * availability, RECOMPUTES the customer price server-side (never trusts the
 * browser or the cookie amount), creates a local order, and opens a Stripe
 * TEST-mode Checkout Session. It creates NO Hostup order/invoice/domain/transfer/
 * DNS and captures NO live payment — the paid state arrives only via the webhook.
 *
 * Provider price/margin never appear here (all provider amounts are null) and are
 * never stored on the order or sent to Stripe.
 */

function fail(error: string, status: number): { ok: false; error: string; status: number } {
  return { ok: false, error, status };
}

const ORDER_COLUMNS =
  "id, domain_name, operation, years, currency_code, net_amount_minor, vat_amount_minor, gross_amount_minor, status, created_at, paid_at";

// ── safe customer DTO (no stripe ids, no provider price) ──────────────────────
export type CustomerOrder = {
  id: string;
  domainName: string;
  operation: string;
  years: number;
  currencyCode: string;
  netAmountMinor: number;
  vatAmountMinor: number;
  grossAmountMinor: number;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
};

type OrderRow = {
  id: string;
  domain_name: string;
  operation: string;
  years: number;
  currency_code: string;
  net_amount_minor: number;
  vat_amount_minor: number;
  gross_amount_minor: number;
  status: string;
  created_at: string;
  paid_at: string | null;
};

function toCustomerOrder(row: OrderRow): CustomerOrder {
  return {
    id: row.id,
    domainName: row.domain_name,
    operation: row.operation,
    years: row.years,
    currencyCode: row.currency_code,
    netAmountMinor: row.net_amount_minor,
    vatAmountMinor: row.vat_amount_minor,
    grossAmountMinor: row.gross_amount_minor,
    // Validate against the allowlist — never render an arbitrary DB string.
    status: isOrderStatus(row.status) ? row.status : "DRAFT",
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/** Read/view gate: a real portal CUSTOMER, or an ADMIN in customer-view. */
async function gateCustomer(): Promise<
  { ok: true; actor: EffectiveActor } | { ok: false; error: string; status: number }
> {
  const actor = await getEffectiveActor();
  if (!actor.realUserId) return fail("Not authenticated.", 401);
  if (!actor.isCustomerView && actor.realRole !== "customer") return fail("Forbidden.", 403);
  return { ok: true, actor };
}

/**
 * Payment gate: ONLY a real, logged-in portal CUSTOMER may pay. An admin in
 * customer-view can SEE the checkout but must NOT pay on the customer's behalf;
 * sellers/staff are rejected. Enforced server-side, not just in the UI.
 */
async function gatePayingCustomer(): Promise<
  { ok: true; actor: EffectiveActor } | { ok: false; error: string; status: number }
> {
  const actor = await getEffectiveActor();
  if (!actor.realUserId) return fail("Not authenticated.", 401);
  if (actor.isCustomerView) {
    return fail("I kundvy kan du inte genomföra betalning åt kunden.", 403);
  }
  if (actor.realRole !== "customer") return fail("Forbidden.", 403);
  return { ok: true, actor };
}

/** The caller's existing contact details, pre-filled for the checkout form. */
async function fetchCustomerContact(actor: EffectiveActor): Promise<RegistrantContact> {
  try {
    const { data } = await actor.supabase.rpc("get_portal_customer_contact", {
      p_customer_id: actor.isCustomerView ? actor.viewedCustomerId : null,
    });
    const row = (Array.isArray(data) ? data[0] : null) as Record<string, unknown> | null;
    if (!row) return normalizeRegistrant({});
    return normalizeRegistrant({
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      postalCode: row.postal_code,
      city: row.city,
      country: row.country,
      organization: row.company_name,
    });
  } catch {
    return normalizeRegistrant({});
  }
}

/**
 * Recompute the customer sale price for a quote SERVER-SIDE (never the cookie
 * amount). No provider price is supplied — markup rules with no provider price
 * resolve to "not configured", fixed rules resolve to a price. Returns the
 * customer net/vat/gross split, or null when unpriced.
 */
async function priceForQuote(
  actor: EffectiveActor,
  quote: { domainName: string; years: number; premium: boolean },
  providerRegistrationAmountMinor: number | null
): Promise<{ priceConfigured: boolean; net: VatSplit | null; currency: string; tld: string | null }> {
  const currency = "SEK";
  const tld = tldOf(quote.domainName);
  const rules = await loadActiveRules(actor, currency);
  const pricing = customerPricingFor(rules, {
    tld,
    years: quote.years,
    currencyCode: currency,
    premium: quote.premium,
    requiresRegistrarFeeAcceptance: false,
    providerRegistrationAmountMinor,
    providerRenewalAmountMinor: null,
    // For a premium domain the registration provider amount IS the premium price.
    premiumProviderAmountMinor: quote.premium ? providerRegistrationAmountMinor : null,
  });
  const view = pricing.registration; // register|transfer both use the registration sale price
  return { priceConfigured: view.priceConfigured, net: view.net, currency, tld };
}

/** Fetch the provider (Hostup) registration price in minor units, or null. Used so
 *  percentage/fixed-markup rules resolve at checkout exactly as on the search page. */
async function providerAmountFor(domainName: string): Promise<number | null> {
  if (!isHostupConfigured()) return null;
  try {
    const avail = await checkDomainAvailability(domainName);
    return providerMajorToMinor(avail.providerBilling?.amount ?? null);
  } catch {
    return null;
  }
}

// ── checkout summary (server-recomputed price for display) ────────────────────
export type CheckoutItem = {
  domainName: string;
  operation: string;
  years: number;
  priceConfigured: boolean;
  netAmountMinor: number | null;
  vatAmountMinor: number | null;
  grossAmountMinor: number | null;
  /** Reservation expiry (ms since epoch) so the UI can count down. */
  expiresAtMs: number;
};

export type CheckoutSummary = {
  items: CheckoutItem[];
  currencyCode: string;
  totalNetMinor: number;
  totalVatMinor: number;
  totalGrossMinor: number;
  /** Items with a configured price — the only ones that are payable. */
  payableCount: number;
  /** True when an admin is viewing as the customer — the flow is visible but not payable. */
  isCustomerView: boolean;
  /** The customer's existing contact details, pre-filled for the form. */
  registrant: RegistrantContact;
  /** Required registrant fields still missing (customer completes these). */
  missingFields: RegistrantField[];
};

export async function getCheckoutSummary(): Promise<ServiceResult<CheckoutSummary>> {
  const gate = await gateCustomer();
  if (!gate.ok) return gate;
  const actor = gate.actor;

  const cart = await readCartForCheckout();
  if (cart.items.length === 0) return fail("Kundkorgen är tom.", 410);

  // Recompute every item's price SERVER-SIDE (never the cookie amount).
  const items: CheckoutItem[] = [];
  let currencyCode = "SEK";
  for (const it of cart.items) {
    const provider = await providerAmountFor(it.domainName);
    const price = await priceForQuote(actor, { domainName: it.domainName, years: it.years, premium: it.premium }, provider);
    currencyCode = price.currency;
    items.push({
      domainName: it.domainName,
      operation: it.operation,
      years: it.years,
      priceConfigured: price.priceConfigured && !!price.net,
      netAmountMinor: price.net?.netAmountMinor ?? null,
      vatAmountMinor: price.net?.vatAmountMinor ?? null,
      grossAmountMinor: price.net?.grossAmountMinor ?? null,
      expiresAtMs: it.expiresAtMs,
    });
  }
  const totals = cartTotals({
    items: cart.items.map((it, i) => ({
      ...it,
      priceConfigured: items[i].priceConfigured,
      netAmountMinor: items[i].netAmountMinor,
      vatAmountMinor: items[i].vatAmountMinor,
      grossAmountMinor: items[i].grossAmountMinor,
    })),
  });

  const registrant = await fetchCustomerContact(actor);
  return {
    ok: true,
    data: {
      items,
      currencyCode,
      totalNetMinor: totals.netAmountMinor,
      totalVatMinor: totals.vatAmountMinor,
      totalGrossMinor: totals.grossAmountMinor,
      payableCount: totals.priceable,
      isCustomerView: actor.isCustomerView,
      registrant,
      missingFields: missingRegistrantFields(registrant),
    },
  };
}

// ── create checkout (recompute price → N orders → one Stripe session) ─────────

export type CreateCheckoutResult = { url: string };

export async function createDomainCheckout(
  registrantInput: unknown
): Promise<ServiceResult<CreateCheckoutResult>> {
  // ONLY a real, logged-in customer may pay — admin-in-view is blocked here.
  const gate = await gatePayingCustomer();
  if (!gate.ok) return gate;
  const actor = gate.actor;

  if (!isStripeConfigured()) return fail("Betalning är inte konfigurerad.", 503);

  // Validate the registrant contact (existing details + fields filled at checkout).
  const registrant = validateRegistrantContact(registrantInput);
  if (!registrant.ok) return fail(registrant.error, 400);

  // 1. Read the cart (signed cookie; expired reservations already pruned).
  const cart = await readCartForCheckout();
  if (cart.items.length === 0) return fail("Kundkorgen är tom.", 410);

  const currency = "SEK";
  const orderIds: string[] = [];
  const lineItems: { domainName: string; operation: string; years: number; amountNetMinor: number }[] = [];
  let vatBasisPoints = 2500; // SE output VAT; overwritten from the computed split below

  // 2. Per item: recheck availability, recompute price, create a DRAFT order.
  for (const it of cart.items) {
    let providerAmount: number | null = null;
    if (isHostupConfigured()) {
      try {
        const avail = await checkDomainAvailability(it.domainName);
        const registerable =
          it.operation === "register"
            ? avail.state === "available" && avail.actions.canRegister.allowed
            : avail.actions.canTransfer.allowed;
        if (!registerable) return fail(`${it.domainName} är inte längre tillgänglig.`, 409);
        providerAmount = providerMajorToMinor(avail.providerBilling?.amount ?? null);
      } catch {
        return fail("Kunde inte bekräfta tillgänglighet just nu. Försök igen.", 502);
      }
    }

    const price = await priceForQuote(actor, { domainName: it.domainName, years: it.years, premium: it.premium }, providerAmount);
    const net: VatSplit | null = price.net;
    if (!price.priceConfigured || !net || net.grossAmountMinor <= 0) {
      return fail(`Priset är inte satt för ${it.domainName}.`, 409);
    }

    const snapshot = {
      domainName: it.domainName,
      tld: price.tld,
      operation: it.operation,
      years: it.years,
      currencyCode: currency,
      net: net.netAmountMinor,
      vat: net.vatAmountMinor,
      gross: net.grossAmountMinor,
    };
    const { data: orderId, error: createErr } = await actor.supabase.rpc("create_domain_order", {
      p_domain_name: it.domainName,
      p_operation: it.operation,
      p_years: it.years,
      p_net_amount_minor: net.netAmountMinor,
      p_vat_amount_minor: net.vatAmountMinor,
      p_gross_amount_minor: net.grossAmountMinor,
      p_vat_rate_basis_points: net.vatRateBasisPoints,
      p_quote_snapshot: snapshot,
      p_currency_code: currency,
      // Paying caller is always a REAL customer; customer_id is derived server-side.
      p_customer_id: null,
      p_registrant_details: registrant.value,
    });
    if (createErr || typeof orderId !== "string") {
      console.error("[checkout.createOrder]", createErr?.message ?? "no id");
      return fail("Kunde inte skapa beställningen.", 500);
    }
    orderIds.push(orderId);
    if (net.vatRateBasisPoints != null) vatBasisPoints = net.vatRateBasisPoints;
    lineItems.push({
      domainName: it.domainName,
      operation: it.operation,
      years: it.years,
      amountNetMinor: net.netAmountMinor,
    });
  }

  // 3. Create ONE Stripe TEST-mode session for the whole cart (server gross amounts).
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (!site) return fail("Sajt-URL saknas i konfigurationen.", 503);
  let session;
  try {
    session = await createCheckoutSession({
      items: lineItems,
      vatBasisPoints,
      currency: currency.toLowerCase(),
      reference: orderIds[0],
      successUrl: `${site}/portal/domains/checkout/success`,
      cancelUrl: `${site}/portal/domains/checkout/cancel`,
      customerEmail: actor.user?.email ?? null,
    });
  } catch (err) {
    console.error("[checkout.stripe]", err instanceof Error ? err.message : "unknown");
    return fail("Kunde inte starta betalningen.", 502);
  }

  // 4. Attach the shared session to every order (DRAFT → CHECKOUT_CREATED).
  for (const orderId of orderIds) {
    const { error: attachErr } = await actor.supabase.rpc("attach_domain_order_checkout", {
      p_order_id: orderId,
      p_session_id: session.sessionId,
    });
    if (attachErr) {
      console.error("[checkout.attach]", attachErr.message);
      return fail("Kunde inte förbereda betalningen.", 500);
    }
  }

  // 5. Empty the cart now that the session owns the reservations.
  await clearCart();

  await logCustomerEvent(actor, "CUSTOMER_DOMAIN_CHECKOUT_CREATED", {
    metadata: { item_count: orderIds.length },
  });

  return { ok: true, data: { url: session.url } };
}

// ── ownership-scoped reads ────────────────────────────────────────────────────

export async function getCustomerDomainOrder(orderId: string): Promise<ServiceResult<CustomerOrder>> {
  if (!isUuid(orderId)) return fail("Invalid order id.", 400);
  const gate = await gateCustomer();
  if (!gate.ok) return gate;
  const actor = gate.actor;

  let query = actor.supabase.from("domain_orders").select(ORDER_COLUMNS).eq("id", orderId);
  if (actor.isCustomerView && actor.viewedCustomerId) {
    query = query.eq("customer_id", actor.viewedCustomerId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("[checkout.getOrder]", error.message);
    return fail("Kunde inte ladda beställningen.", 500);
  }
  if (!data) return fail("Beställningen hittades inte.", 404);
  return { ok: true, data: toCustomerOrder(data as OrderRow) };
}

export async function listCustomerDomainOrders(): Promise<ServiceResult<CustomerOrder[]>> {
  const gate = await gateCustomer();
  if (!gate.ok) return gate;
  const actor = gate.actor;

  let query = actor.supabase
    .from("domain_orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false });
  if (actor.isCustomerView && actor.viewedCustomerId) {
    query = query.eq("customer_id", actor.viewedCustomerId);
  }
  const { data, error } = await query;
  if (error) {
    console.error("[checkout.listOrders]", error.message);
    return fail("Kunde inte ladda beställningar.", 500);
  }
  return { ok: true, data: (data as OrderRow[] ?? []).map(toCustomerOrder) };
}

/** Just the status of one owned order (for the client poller). */
export async function getCustomerDomainOrderStatus(
  orderId: string
): Promise<ServiceResult<{ status: OrderStatus }>> {
  const res = await getCustomerDomainOrder(orderId);
  if (!res.ok) return res;
  return { ok: true, data: { status: res.data.status } };
}
