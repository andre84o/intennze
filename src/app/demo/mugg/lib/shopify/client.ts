import { createStorefrontApiClient } from "@shopify/storefront-api-client";

const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!;
const storefrontAccessToken =
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN!;

export const shopifyClient = createStorefrontApiClient({
  storeDomain: domain,
  apiVersion: "2025-04",
  publicAccessToken: storefrontAccessToken,
});

export async function shopifyFetch<T>({
  query,
  variables,
}: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<T> {
  const { data, errors } = await shopifyClient.request(query, {
    variables,
  });

  if (errors) {
    throw new Error(errors.message || "Shopify API error");
  }

  return data as T;
}
