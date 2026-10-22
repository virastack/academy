import type { CartItem } from "@/features/cart/types/cart-item";

export function cartTotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}
