import type { Metadata } from "next";
import { Suspense } from "react";

import { removeFromCart } from "@/app/actions";
import { getCart } from "@/lib/cart";
import { getProduct } from "@/lib/products";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <h1>Cart</h1>
      <Suspense fallback={<p>Loading cart...</p>}>
        <CartItems />
      </Suspense>
    </>
  );
}

async function CartItems() {
  const cart = await getCart();
  const lines = (
    await Promise.all(
      Object.entries(cart).map(async ([slug, quantity]) => {
        const product = await getProduct(slug);
        return product ? [{ product, quantity }] : [];
      }),
    )
  ).flat();

  if (lines.length === 0) return <p>Your cart is empty.</p>;

  return (
    <ul>
      {lines.map(({ product, quantity }) => (
        <li key={product.slug}>
          {product.name} x {quantity}
          <form action={removeFromCart.bind(null, product.slug)}>
            <button>Remove</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
