import type { CartItem } from "../data";

export function getSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" });

export function formatPrice(value: number): string {
  return currency.format(value);
}
