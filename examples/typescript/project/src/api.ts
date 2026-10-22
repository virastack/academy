import { CATEGORIES, type Product } from "./types";

export function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "price" in value &&
    typeof value.price === "number" &&
    "category" in value &&
    CATEGORIES.some((category) => category === value.category) &&
    "inStock" in value &&
    typeof value.inStock === "boolean"
  );
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("/products.json");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isProduct)) {
    throw new Error("Ürün verisi beklenen biçimde değil.");
  }
  return data;
}
