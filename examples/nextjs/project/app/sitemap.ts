import type { MetadataRoute } from "next";

import { getProducts } from "@/lib/products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();

  return [
    { url: "https://shop.example.com/products" },
    ...products.map((product) => ({
      url: `https://shop.example.com/products/${product.slug}`,
    })),
  ];
}
