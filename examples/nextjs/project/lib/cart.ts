import "server-only";

import { cookies } from "next/headers";

export type Cart = Record<string, number>;

const CART_COOKIE = "cart";

export async function getCart(): Promise<Cart> {
  const value = (await cookies()).get(CART_COOKIE)?.value;
  if (!value) return {};

  try {
    return JSON.parse(value) as Cart;
  } catch {
    return {};
  }
}

export async function saveCart(cart: Cart) {
  (await cookies()).set(CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
