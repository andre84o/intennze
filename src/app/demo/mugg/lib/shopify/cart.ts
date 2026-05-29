import { shopifyFetch } from "./client";
import {
  CREATE_CART_MUTATION,
  GET_CART_QUERY,
  ADD_TO_CART_MUTATION,
  UPDATE_CART_MUTATION,
  REMOVE_FROM_CART_MUTATION,
} from "./queries";
import type { Cart, CartItem } from "./types";

// Reshape funktion för att normalisera cart-data
function reshapeCart(cart: Record<string, unknown>): Cart {
  const c = cart as Record<string, unknown>;
  return {
    ...c,
    lines: ((c.lines as { nodes: CartItem[] })?.nodes || []) as CartItem[],
  } as Cart;
}

export async function createCart(): Promise<Cart> {
  const data = await shopifyFetch<{
    cartCreate: {
      cart: Record<string, unknown>;
      userErrors: { field: string; message: string }[];
    };
  }>({
    query: CREATE_CART_MUTATION,
    variables: { input: {} },
  });

  if (data.cartCreate.userErrors.length > 0) {
    throw new Error(data.cartCreate.userErrors[0].message);
  }

  return reshapeCart(data.cartCreate.cart);
}

export async function getCart(cartId: string): Promise<Cart | null> {
  const data = await shopifyFetch<{
    cart: Record<string, unknown> | null;
  }>({
    query: GET_CART_QUERY,
    variables: { cartId },
  });

  if (!data.cart) return null;

  return reshapeCart(data.cart);
}

export async function addToCart(
  cartId: string,
  lines: { merchandiseId: string; quantity: number }[]
): Promise<Cart> {
  const data = await shopifyFetch<{
    cartLinesAdd: {
      cart: Record<string, unknown>;
      userErrors: { field: string; message: string }[];
    };
  }>({
    query: ADD_TO_CART_MUTATION,
    variables: { cartId, lines },
  });

  if (data.cartLinesAdd.userErrors.length > 0) {
    throw new Error(data.cartLinesAdd.userErrors[0].message);
  }

  return reshapeCart(data.cartLinesAdd.cart);
}

export async function updateCart(
  cartId: string,
  lines: { id: string; quantity: number }[]
): Promise<Cart> {
  const data = await shopifyFetch<{
    cartLinesUpdate: {
      cart: Record<string, unknown>;
      userErrors: { field: string; message: string }[];
    };
  }>({
    query: UPDATE_CART_MUTATION,
    variables: { cartId, lines },
  });

  if (data.cartLinesUpdate.userErrors.length > 0) {
    throw new Error(data.cartLinesUpdate.userErrors[0].message);
  }

  return reshapeCart(data.cartLinesUpdate.cart);
}

export async function removeFromCart(
  cartId: string,
  lineIds: string[]
): Promise<Cart> {
  const data = await shopifyFetch<{
    cartLinesRemove: {
      cart: Record<string, unknown>;
      userErrors: { field: string; message: string }[];
    };
  }>({
    query: REMOVE_FROM_CART_MUTATION,
    variables: { cartId, lineIds },
  });

  if (data.cartLinesRemove.userErrors.length > 0) {
    throw new Error(data.cartLinesRemove.userErrors[0].message);
  }

  return reshapeCart(data.cartLinesRemove.cart);
}
