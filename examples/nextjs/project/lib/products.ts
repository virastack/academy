import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";

export type Product = {
  slug: string;
  name: string;
  price: number;
  description: string;
};

const products: Product[] = [
  { slug: "canvas-sneaker", name: "Kanvas Ayakkabı", price: 1499, description: "Günlük kullanım için hafif kanvas ayakkabı." },
  { slug: "leather-backpack", name: "Deri Sırt Çantası", price: 2899, description: "Laptop bölmeli, el yapımı deri çanta." },
  { slug: "wool-beanie", name: "Yün Bere", price: 449, description: "Yumuşak merinos yünden bere." },
];

const stock: Record<string, number> = {
  "canvas-sneaker": 12,
  "leather-backpack": 0,
  "wool-beanie": 4,
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getProducts(query = "") {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  await wait(300);
  const q = query.toLocaleLowerCase("tr");
  return products.filter((product) => product.name.toLocaleLowerCase("tr").includes(q));
}

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `product-${slug}`);

  await wait(300);
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getStock(slug: string) {
  await connection();
  await wait(800);
  return stock[slug] ?? 0;
}
