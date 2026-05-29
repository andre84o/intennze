import { shopifyFetch } from "./client";
import {
  GET_PRODUCTS_QUERY,
  GET_PRODUCT_BY_HANDLE_QUERY,
  GET_COLLECTION_PRODUCTS_QUERY,
} from "./queries";
import type { Product, Collection, Image } from "./types";

type ProductSortKey =
  | "TITLE"
  | "PRICE"
  | "BEST_SELLING"
  | "CREATED_AT"
  | "PRODUCT_TYPE"
  | "VENDOR";

// Reshape funktion för att normalisera Shopify-data
function reshapeProduct(product: Record<string, unknown>): Product {
  const p = product as Record<string, unknown>;
  return {
    ...p,
    images: ((p.images as { nodes: Image[] })?.nodes || []) as Image[],
    variants: ((p.variants as { nodes: unknown[] })?.nodes || []) as Product["variants"],
  } as Product;
}

export async function getProducts(options?: {
  first?: number;
  sortKey?: ProductSortKey;
  reverse?: boolean;
}): Promise<Product[]> {
  const { first = 20, sortKey = "CREATED_AT", reverse = false } = options || {};

  const data = await shopifyFetch<{
    products: { nodes: Record<string, unknown>[] };
  }>({
    query: GET_PRODUCTS_QUERY,
    variables: { first, sortKey, reverse },
  });

  return data.products.nodes.map(reshapeProduct);
}

export async function getProductByHandle(
  handle: string
): Promise<Product | null> {
  const data = await shopifyFetch<{
    product: Record<string, unknown> | null;
  }>({
    query: GET_PRODUCT_BY_HANDLE_QUERY,
    variables: { handle },
  });

  if (!data.product) return null;

  return reshapeProduct(data.product);
}

export async function getCollectionProducts(
  handle: string,
  first: number = 20
): Promise<Collection | null> {
  const data = await shopifyFetch<{
    collection: {
      id: string;
      handle: string;
      title: string;
      description: string;
      image: Image | null;
      products: { nodes: Record<string, unknown>[] };
    } | null;
  }>({
    query: GET_COLLECTION_PRODUCTS_QUERY,
    variables: { handle, first },
  });

  if (!data.collection) return null;

  return {
    ...data.collection,
    products: data.collection.products.nodes.map(reshapeProduct),
  };
}
