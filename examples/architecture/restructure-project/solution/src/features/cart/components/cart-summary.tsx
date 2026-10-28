"use client";

import { cartTotal } from "@/features/cart/helpers/cart-total";
import { formatPrice } from "@/helpers/format-price";

import { useCart } from "./cart-provider";

export function CartSummary() {
  const { items } = useCart();
  const count = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <p data-testid="cart-summary">
      Cart: {count} items, {formatPrice(cartTotal(items))}
    </p>
  );
}
