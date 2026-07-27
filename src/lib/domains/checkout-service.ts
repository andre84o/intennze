import "server-only";
import { getEffectiveActor, type EffectiveActor } from "@/lib/auth/customerView";
import type { ServiceResult } from "@/lib/domains/service";
import { readDomainQuote } from "@/lib/domains/quote-service";
import { isQuoteExpired } from "@/lib/domains/quote";
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
import type { VatSplit } from "@/lib/domains/money";

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
  quote: { domainName: string; years: number; premium: boolean }
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
    providerRegistrationAmountMinor: null,
    providerRenewalAmountMinor: null,
    premiumProviderAmountMinor: null,
  });
  const view = pricing.registration; // register|transfer both use the registration sale price
  return { priceConfigured: view.priceConfigured, net: view.net, currency, tld };
}

// ── checkout summary (server-recomputed price for display) ────────────────────
export type CheckoutSummary = {
  domainName: string;
  operation: string;
  years: number;
  currencyCode: string;
  priceConfigured: boolean;
  netAmountMinor: number | null;
  vatAmountMinor: number | null;
  grossAmountMinor: number | null;
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

  const quote = await readDomainQuote();
  if (!quote || isQuoteExpired(quote, Date.now())) {
    return fail("Din förberedda beställning har gått ut. Sök domänen igen.", 410);
  }
  const price = await priceForQuote(actor, quote);
  const registrant = await fetchCustomerContact(actor);
  return {
    ok: true,
    data: {
      domainName: quote.domainName,
      operation: quote.operation,
      years: quote.years,
      currencyCode: price.currency,
      priceConfigured: price.priceConfigured && !!price.net,
      netAmountMinor: price.net?.netAmountMinor ?? null,
      vatAmountMinor: price.net?.vatAmountMinor ?? null,
      grossAmountMinor: price.net?.grossAmountMinor ?? null,
      isCustomerView: actor.isCustomerView,
      registrant,
      missingFields: missingRegistrantFields(registrant),
    },
  };
}

// ── create checkout (recompute price → order → Stripe session) ────────────────

export type CreateCheckoutResult = { url: string; orderId: string };

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

  // 1-2. Validate the prepared quote (signed cookie; not expired).
  const quote = await readDomainQuote();
  if (!quote || isQuoteExpired(quote, Date.now())) {
    return fail("Din förberedda beställning har gått ut. Sök domänen igen.", 410);
  }

  // 3. Recheck availability (when Hostup is configured).
  if (isHostupConfigured()) {
    try {
      const avail = await checkDomainAvailability(quote.domainName);
      const registerable =
        quote.operation === "register"
          ? avail.state === "available" && avail.actions.canRegister.allowed
          : avail.actions.canTransfer.allowed;
      if (!registerable) {
        return fail("Domänen är inte längre tillgänglig för denna åtgärd.", 409);
      }
    } catch {
      return fail("Kunde inte bekräfta tillgänglighet just nu. Försök igen.", 502);
    }
  }

  // 4. Recompute the customer price SERVER-SIDE (never trust the cookie amount).
  const currency = "SEK";
  const price = await priceForQuote(actor, quote);
  const tld = price.tld;
  const net: VatSplit | null = price.net;
  if (!price.priceConfigured || !net || net.grossAmountMinor <= 0) {
    return fail("Priset är inte konfigurerat för denna domän. Kontakta oss.", 409);
  }

  // 5. Create the local order (DRAFT). customer_id is derived server-side by the RPC.
  const snapshot = {
    domainName: quote.domainName,
    tld,
    operation: quote.operation,
    years: quote.years,
    currencyCode: currency,
    net: net.netAmountMinor,
    vat: net.vatAmountMinor,
    gross: net.grossAmountMinor,
  };
  const { data: orderId, error: createErr } = await actor.supabase.rpc("create_domain_order", {
    p_domain_name: quote.domainName,
    p_operation: quote.operation,
    p_years: quote.years,
    p_net_amount_minor: net.netAmountMinor,
    p_vat_amount_minor: net.vatAmountMinor,
    p_gross_amount_minor: net.grossAmountMinor,
    p_vat_rate_basis_points: net.vatRateBasisPoints,
    p_quote_snapshot: snapshot,
    p_currency_code: currency,
    // A paying caller is always a REAL customer (admin-in-view is blocked above),
    // so customer_id is derived server-side by the RPC from auth.uid().
    p_customer_id: null,
    p_registrant_details: registrant.value,
  });
  if (createErr || typeof orderId !== "string") {
    console.error("[checkout.createOrder]", createErr?.message ?? "no id");
    return fail("Kunde inte skapa beställningen.", 500);
  }

  // 6. Create the Stripe TEST-mode Checkout Session (amount = server gross).
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (!site) return fail("Sajt-URL saknas i konfigurationen.", 503);
  let session;
  try {
    session = await createCheckoutSession({
      orderId,
      domainName: quote.domainName,
      operation: quote.operation,
      years: quote.years,
      amountGrossMinor: net.grossAmountMinor,
      currency: currency.toLowerCase(),
      successUrl: `${site}/portal/domains/checkout/success?order=${orderId}`,
      cancelUrl: `${site}/portal/domains/checkout/cancel?order=${orderId}`,
      customerEmail: actor.user?.email ?? null,
    });
  } catch (err) {
    console.error("[checkout.stripe]", err instanceof Error ? err.message : "unknown");
    return fail("Kunde inte starta betalningen.", 502);
  }

  // Attach the session and move DRAFT → CHECKOUT_CREATED (ownership re-checked in the RPC).
  const { error: attachErr } = await actor.supabase.rpc("attach_domain_order_checkout", {
    p_order_id: orderId,
    p_session_id: session.sessionId,
  });
  if (attachErr) {
    console.error("[checkout.attach]", attachErr.message);
    return fail("Kunde inte förbereda betalningen.", 500);
  }

  await logCustomerEvent(actor, "CUSTOMER_DOMAIN_CHECKOUT_CREATED", {
    metadata: { tld, operation: quote.operation, years: quote.years },
  });

  return { ok: true, data: { url: session.url, orderId } };
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
