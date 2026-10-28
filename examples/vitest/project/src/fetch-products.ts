import type { Product } from "./types";

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("https://api.shop.test/products");

  if (!response.ok) {
    throw new Error("Products could not be loaded.");
  }

  return response.json();
}
