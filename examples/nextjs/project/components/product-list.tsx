import Link from "next/link";

import { getProducts } from "@/lib/products";

export async function ProductList({
  searchParams,
}: Pick<PageProps<"/products">, "searchParams">) {
  const { q } = await searchParams;
  const products = await getProducts(typeof q === "string" ? q : "");

  if (products.length === 0) return <p>No results.</p>;

  return (
    <ul>
      {products.map((product) => (
        <li key={product.slug}>
          <Link href={`/products/${product.slug}`} prefetch>
            {product.name}
          </Link>{" "}
          €{product.price}
        </li>
      ))}
    </ul>
  );
}
