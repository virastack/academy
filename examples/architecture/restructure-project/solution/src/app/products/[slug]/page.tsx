import { notFound } from "next/navigation";

import { AddToCartButton } from "@/features/cart";
import { getProduct, getProducts } from "@/features/products";
import { formatPrice } from "@/helpers/format-price";

export function generateStaticParams() {
  return getProducts().map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <main>
      <h1>{product.name}</h1>
      <p>{formatPrice(product.price)}</p>
      <AddToCartButton {...product} />
    </main>
  );
}
