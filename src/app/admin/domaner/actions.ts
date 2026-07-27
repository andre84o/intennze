"use server";

import { revalidatePath } from "next/cache";
import {
  searchDomainsForAdmin,
  previewOrderForAdmin,
  type SearchInput,
} from "@/lib/domains/search-service";
import type { OrderPreviewInput } from "@/lib/hostup/client";
import {
  createPricingRule,
  createPricingRulesForTlds,
  listPricingRules,
  previewPricingForAdmin,
  previewPricingWithHostupForAdmin,
  setPricingRuleActive,
  updatePricingRule,
  type PricingRuleInput,
  type PricingRuleUpdate,
} from "@/lib/domains/pricing-service";

/** Admin diagnostic availability lookup (provider prices + raw state visible). */
export async function adminDomainDiagnostics(input: SearchInput) {
  return searchDomainsForAdmin(input);
}

/** Admin dry-run order preview (creates nothing). */
export async function adminPreviewOrder(input: OrderPreviewInput) {
  return previewOrderForAdmin(input);
}

// ── Phase 3B: domain pricing rules (admin-only; re-verified server-side) ──────
export async function adminListPricingRules() {
  return listPricingRules();
}

export async function adminCreatePricingRule(input: PricingRuleInput) {
  const res = await createPricingRule(input);
  if (res.ok) revalidatePath("/admin/domaner/priser");
  return res;
}

/** Create the same rule for many TLDs (or the Alla/null default) in one go. */
export async function adminCreatePricingRulesForTlds(
  input: Parameters<typeof createPricingRulesForTlds>[0]
) {
  const res = await createPricingRulesForTlds(input);
  if (res.ok) revalidatePath("/admin/domaner/priser");
  return res;
}

export async function adminUpdatePricingRule(id: string, input: PricingRuleUpdate) {
  const res = await updatePricingRule(id, input);
  if (res.ok) revalidatePath("/admin/domaner/priser");
  return res;
}

export async function adminSetPricingRuleActive(id: string, active: boolean) {
  const res = await setPricingRuleActive(id, active);
  if (res.ok) revalidatePath("/admin/domaner/priser");
  return res;
}

/** Manual test preview — hypothetical provider price (advanced section). */
export async function adminPreviewPricing(
  input: Parameters<typeof previewPricingForAdmin>[0]
) {
  return previewPricingForAdmin(input);
}

/** DEFAULT preview — fetches Hostup's real TLD price, then computes the customer
 *  price + margin. Provider + margin visible to admin (this page only). */
export async function adminPreviewPricingWithHostup(
  input: Parameters<typeof previewPricingWithHostupForAdmin>[0]
) {
  return previewPricingWithHostupForAdmin(input);
}
