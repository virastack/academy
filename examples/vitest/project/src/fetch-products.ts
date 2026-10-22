import type { Product } from "./types";

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("https://api.magaza.test/products");

  if (!response.ok) {
    throw new Error("Ürünler yüklenemedi.");
  }

  return response.json();
}
