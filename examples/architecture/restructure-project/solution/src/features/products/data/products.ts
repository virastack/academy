import type { Product } from "@/features/products/types/product";

const products: Product[] = [
  { slug: "mechanical-keyboard", name: "Mekanik Klavye", price: 2499 },
  { slug: "wireless-mouse", name: "Kablosuz Mouse", price: 899 },
  { slug: "usb-c-hub", name: "USB-C Hub", price: 1299 },
];

export function getProducts() {
  return products;
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}
