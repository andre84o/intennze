"use server";

import { searchDomainsForCustomer, type SearchInput } from "@/lib/domains/search-service";
import { refreshDomainStatusForCustomer } from "@/lib/domains/portal-service";
import { prepareDomainQuote, type PrepareQuoteInput } from "@/lib/domains/quote-service";

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
