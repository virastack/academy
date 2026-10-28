"use server";

import { getCart, saveCart } from "@/lib/cart";
import { getProduct, getStock } from "@/lib/products";

export type AddToCartState = { message: string | null };

export async function addToCart(
  _prev: AddToCartState,
  formData: FormData,
): Promise<AddToCartState> {
  const slug = String(formData.get("slug"));
  const product = await getProduct(slug);
  if (!product) return { message: "Product not found." };

  const cart = await getCart();
  const quantity = (cart[slug] ?? 0) + 1;
  if (quantity > (await getStock(slug))) return { message: "Not enough stock." };

  await saveCart({ ...cart, [slug]: quantity });
  return { message: `${product.name} added to cart.` };
}

export async function removeFromCart(slug: string) {
  const cart = await getCart();
  delete cart[slug];
  await saveCart(cart);
}
