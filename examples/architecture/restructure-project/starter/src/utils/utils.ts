import { products } from "../data/products";
import { CartItem } from "../types/types";

export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(value);
}

export function getCartTotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}
