import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { getEffectiveActor, type EffectiveActor } from "@/lib/auth/customerView";
import {
  getDomainsForCurrentCustomer,
  getDomainForCurrentCustomer,
  getRegistrantForCurrentCustomer,
  type ServiceResult,
} from "@/lib/domains/service";
import { getHostupInfoForCustomerDomain, type CustomerHostupInfo } from "@/lib/domains/hostup";
import { loadActiveRules, customerPricingFor, type CustomerDomainPricing } from "@/lib/domains/pricing-service";
import type { DomainPricingRuleConfig } from "@/lib/domains/pricing-engine";
import { tldOf } from "@/lib/domains/normalize";
import { mapHostupStatus } from "@/lib/hostup/sync-logic";
import {
  mapDomainStatusForCustomer,
  type DomainStatusPresentation,
} from "@/lib/domains/status-presenter";
import {
  getDomainAttentionState,
  type AttentionInput,
  type AttentionSignal,
  type DomainAttention,
} from "@/lib/domains/attention";
import { toSafeRegistrant, type SafeRegistrant } from "@/lib/domains/registrant-presenter";
import { logCustomerEvent } from "@/lib/domains/customer-audit";
import { domainSearchIpLimiter, domainSearchUserLimiter, tryLimit, getClientIp } from "@/lib/ratelimit";
import type { Domain } from "@/lib/domains/types";

/**
 * Customer domain PORTAL service (SERVER-ONLY). Assembles the safe, ownership-
 * verified DTOs the /portal/domains pages render. It reuses the ownership-scoped
 * reads (service.ts / hostup.ts) and the pure presenters (status/attention/
 * registrant) — no new authorization logic lives here.
 *
 * DTOs are deliberately narrow: they NEVER carry provider_domain_id /
 * provider_order_id (server-internal), provider prices, or raw registrant PII.
 * Customer-view = exactly the customer's experience, so only customer services
 * are called (never the admin provider/margin previews).
 */

function fail(error: string, status: number): { ok: false; error: string; status: number } {
  return { ok: false, error, status };
}

// One Hostup read per (domainId) per server render — a page + its children share it.
const cachedHostupInfo = cache((localDomainId: string) =>
  getHostupInfoForCustomerDomain(localDomainId)
);

// ── shared safe shapes ────────────────────────────────────────────────────────

export type CustomerDomainListItem = {
  id: string;
  name: string;
  tld: string | null;
  status: DomainStatusPresentation;
  attentionPrimary: AttentionSignal;
  needsAttention: boolean;
  expiresAt: string | null;
  registeredAt: string | null;
  autoRenew: boolean;
  locked: boolean;
  nameserverCount: number;
  currencyCode: string;
  pricing: CustomerDomainPricing;
};

export type CustomerDomainOverview = {
  total: number;
  needsAttention: number;
  expiringSoon: number;
  autoRenewOff: number;
};

export type CustomerDomainListView = {
  overview: CustomerDomainOverview;
  items: CustomerDomainListItem[];
};

/** The effective (live-or-cache) domain facts used for presentation. */
function effectiveFrom(
  row: Domain,
  live: CustomerHostupInfo | null
): { input: AttentionInput; source: "live" | "cache"; lastSyncedAt: string | null; nameservers: string[] } {
  if (live && live.linked) {
    const mapped = mapHostupStatus(live.status) ?? row.status;
    return {
      source: "live",
      lastSyncedAt: new Date().toISOString(), // just fetched
      nameservers: live.nameservers ?? [],
      input: {
        status: mapped,
        expires_at: live.expiresAt ?? row.expires_at,
        auto_renew: live.autoRenew ?? row.auto_renew,
        last_synced_at: new Date().toISOString(),
        registrar: row.registrar,
        provider_domain_id: row.provider_domain_id,
      },
    };
  }
  return {
    source: "cache",
    lastSyncedAt: row.last_synced_at,
    nameservers: row.nameservers ?? [],
    input: {
      status: row.status,
      expires_at: row.expires_at,
      auto_renew: row.auto_renew,
      last_synced_at: row.last_synced_at,
      registrar: row.registrar,
      provider_domain_id: row.provider_domain_id,
    },
  };
}

function renewalRegistrationPricing(
  rules: DomainPricingRuleConfig[],
  tld: string | null,
  currency: string
): CustomerDomainPricing {
  // Owned-domain pricing: we have no live provider price here, so fixed-price
  // rules resolve to a price and markup rules resolve to "not configured" — never
  // a provider price. registration + renewal are computed and kept separate.
  return customerPricingFor(rules, {
    tld,
    years: 1,
    currencyCode: currency,
    premium: false,
    requiresRegistrarFeeAcceptance: false,
    providerRegistrationAmountMinor: null,
    providerRenewalAmountMinor: null,
    premiumProviderAmountMinor: null,
  });
}

// ── list + overview ────────────────────────────────────────────────────────────

/**
 * The customer's domain list plus overview counts. Ownership is enforced by
 * getDomainsForCurrentCustomer (RLS / customer-view scope). Live Hostup is NOT
 * called per row here (that would be N network calls) — the list uses the cached
 * row facts; the detail page and manual refresh fetch live data.
 */
export async function getCustomerDomainListView(): Promise<ServiceResult<CustomerDomainListView>> {
  const actor = await getEffectiveActor();
  const res = await getDomainsForCurrentCustomer();
  if (!res.ok) return res;

  const nowMs = Date.now();
  const currency = "SEK";
  const rules = await loadActiveRules(actor, currency);

  const items: CustomerDomainListItem[] = res.data.map((row) => {
    const eff = effectiveFrom(row, null);
    const attention = getDomainAttentionState(eff.input, { nowMs });
    const tld = tldOf(row.name);
    return {
      id: row.id,
      name: row.name,
      tld,
      status: mapDomainStatusForCustomer(eff.input.status),
      attentionPrimary: attention.primary,
      needsAttention: attention.needsAttention,
      expiresAt: row.expires_at,
      registeredAt: row.registered_at,
      autoRenew: row.auto_renew,
      locked: row.locked,
      nameserverCount: (row.nameservers ?? []).length,
      currencyCode: currency,
      pricing: renewalRegistrationPricing(rules, tld, currency),
    };
  });

  const overview: CustomerDomainOverview = {
    total: items.length,
    needsAttention: items.filter((i) => i.needsAttention).length,
    expiringSoon: items.filter((i) => i.attentionPrimary.key === "expiring_soon").length,
    autoRenewOff: items.filter((i) => i.attentionPrimary.key === "auto_renew_off").length,
  };

  await logCustomerEvent(actor, "CUSTOMER_DOMAIN_LIST_VIEWED", {
    metadata: { count: items.length },
  });

  return { ok: true, data: { overview, items } };
}

// ── detail ──────────────────────────────────────────────────────────────────────

export type CustomerDomainDetail = {
  id: string;
  name: string;
  tld: string | null;
  status: DomainStatusPresentation;
  attention: DomainAttention;
  registeredAt: string | null;
  expiresAt: string | null;
  autoRenew: boolean;
  locked: boolean;
  nameservers: string[];
  /** Where the shown facts came from — live Hostup, or the cached fallback. */
  source: "live" | "cache";
  /** True when live Hostup was requested but failed (cache shown as fallback). */
  liveUnavailable: boolean;
  hostupLinked: boolean;
  lastSyncedAt: string | null;
  pricing: CustomerDomainPricing;
  registrant: SafeRegistrant;
  currencyCode: string;
};

/**
 * One domain's detail for the current customer. Ownership is enforced first;
 * then live Hostup is attempted and, on any failure, the cached row is shown as a
 * clearly-marked fallback (source="cache", liveUnavailable=true). Provider ids are
 * never included in the returned DTO.
 */
export async function getCustomerDomainDetailView(
  localDomainId: string
): Promise<ServiceResult<CustomerDomainDetail>> {
  const owned = await getDomainForCurrentCustomer(localDomainId);
  if (!owned.ok) return owned;
  const row = owned.data;

  const actor = await getEffectiveActor();

  // Attempt live Hostup (read-only, ownership already proven). Any failure →
  // fall back to cache; a customer read never blocks on the provider.
  let live: CustomerHostupInfo | null = null;
  let liveUnavailable = false;
  const linked = row.registrar === "hostup" && !!row.provider_domain_id;
  if (linked) {
    const liveRes = await cachedHostupInfo(localDomainId);
    if (liveRes.ok) live = liveRes.data;
    else liveUnavailable = true;
  }

  const eff = effectiveFrom(row, live);
  const nowMs = Date.now();
  const attention = getDomainAttentionState(eff.input, { nowMs });
  const tld = tldOf(row.name);
  const currency = "SEK";
  const rules = await loadActiveRules(actor, currency);

  const registrantRes = await getRegistrantForCurrentCustomer(localDomainId);
  const registrant = registrantRes.ok ? toSafeRegistrant(registrantRes.data) : toSafeRegistrant(null);

  await logCustomerEvent(actor, "CUSTOMER_DOMAIN_DETAIL_VIEWED", {
    domainId: row.id,
    metadata: { source: eff.source, live_unavailable: liveUnavailable },
  });

  return {
    ok: true,
    data: {
      id: row.id,
      name: row.name,
      tld,
      status: mapDomainStatusForCustomer(eff.input.status),
      attention,
      registeredAt: live?.linked ? live.registeredAt ?? row.registered_at : row.registered_at,
      expiresAt: eff.input.expires_at,
      autoRenew: eff.input.auto_renew,
      locked: live?.linked ? live.locked ?? row.locked : row.locked,
      nameservers: eff.nameservers,
      source: eff.source,
      liveUnavailable,
      hostupLinked: linked,
      lastSyncedAt: eff.lastSyncedAt,
      pricing: renewalRegistrationPricing(rules, tld, currency),
      registrant,
      currencyCode: currency,
    },
  };
}

// ── manual refresh (read-only, rate-limited, audited) ──────────────────────────

async function refreshRateLimited(actor: EffectiveActor): Promise<boolean> {
  const h = await headers();
  const ip = getClientIp(new Request("https://x", { headers: h }));
  const ipL = await tryLimit(domainSearchIpLimiter, `domain-search:${ip}`);
  if (ipL && !ipL.success) return true;
  if (actor.realUserId) {
    const uL = await tryLimit(domainSearchUserLimiter, `domain-search:u:${actor.realUserId}`);
    if (uL && !uL.success) return true;
  }
  return false;
}

export type RefreshResult = {
  status: DomainStatusPresentation;
  attentionPrimary: AttentionSignal;
  needsAttention: boolean;
  expiresAt: string | null;
  autoRenew: boolean;
  nameservers: string[];
  source: "live" | "cache";
  liveUnavailable: boolean;
  refreshedAt: string;
};

/**
 * Manual "Uppdatera status" — a read-only live Hostup fetch for ONE owned domain.
 * Ownership is enforced (id resolves to an owned local row; the provider id is
 * read from that row, never the browser). Rate-limited (shares the domain-search
 * budget) and audited. It NEVER writes the local cache and never calls a Hostup
 * write endpoint.
 */
export async function refreshDomainStatusForCustomer(
  localDomainId: string
): Promise<ServiceResult<RefreshResult>> {
  const actor = await getEffectiveActor();
  if (!actor.realUserId) return fail("Not authenticated.", 401);
  if (!actor.isCustomerView && actor.realRole !== "customer") return fail("Forbidden.", 403);

  if (await refreshRateLimited(actor)) {
    await logCustomerEvent(actor, "CUSTOMER_DOMAIN_STATUS_REFRESHED", {
      domainId: null,
      outcome: "blocked",
      metadata: { reason: "rate_limited" },
    });
    return fail("För många uppdateringar. Vänta en liten stund.", 429);
  }

  // Ownership + provider-id-from-owned-row are enforced inside this read.
  const owned = await getDomainForCurrentCustomer(localDomainId);
  if (!owned.ok) return owned;
  const row = owned.data;

  let live: CustomerHostupInfo | null = null;
  let liveUnavailable = false;
  const linked = row.registrar === "hostup" && !!row.provider_domain_id;
  if (linked) {
    const liveRes = await getHostupInfoForCustomerDomain(localDomainId); // not cached — always fresh
    if (liveRes.ok) live = liveRes.data;
    else liveUnavailable = true;
  }

  const eff = effectiveFrom(row, live);
  const attention = getDomainAttentionState(eff.input, { nowMs: Date.now() });

  await logCustomerEvent(actor, "CUSTOMER_DOMAIN_STATUS_REFRESHED", {
    domainId: row.id,
    outcome: liveUnavailable ? "error" : "success",
    metadata: { source: eff.source, live_unavailable: liveUnavailable },
  });

  return {
    ok: true,
    data: {
      status: mapDomainStatusForCustomer(eff.input.status),
      attentionPrimary: attention.primary,
      needsAttention: attention.needsAttention,
      expiresAt: eff.input.expires_at,
      autoRenew: eff.input.auto_renew,
      nameservers: eff.nameservers,
      source: eff.source,
      liveUnavailable,
      refreshedAt: new Date().toISOString(),
    },
  };
}
