"use server";

import {
  searchDomainsForAdmin,
  previewOrderForAdmin,
  type SearchInput,
} from "@/lib/domains/search-service";
import type { OrderPreviewInput } from "@/lib/hostup/client";

/** Admin diagnostic availability lookup (provider prices + raw state visible). */
export async function adminDomainDiagnostics(input: SearchInput) {
  return searchDomainsForAdmin(input);
}

/** Admin dry-run order preview (creates nothing). */
export async function adminPreviewOrder(input: OrderPreviewInput) {
  return previewOrderForAdmin(input);
}
