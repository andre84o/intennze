"use server";

import { searchDomainsForCustomer, type SearchInput } from "@/lib/domains/search-service";

/**
 * Customer domain-search action. Read-only availability + sale price. The server
 * service re-verifies the actor, rate-limits, and NEVER returns a provider price.
 * No order is created.
 */
export async function searchDomains(input: SearchInput) {
  return searchDomainsForCustomer(input);
}
