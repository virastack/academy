"use client";

import { useCart } from "../hooks/useCart";
import { formatPrice, getCartTotal } from "../utils/utils";

export function CartSummary() {
  const { items } = useCart();
  const count = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <p data-testid="cart-summary">
      Cart: {count} items, {formatPrice(getCartTotal(items))}
    </p>
  );
}
