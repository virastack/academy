import { notFound } from "next/navigation";

import { AddToCartButton } from "../../../components";
import { products } from "../../../data/products";
import { formatPrice, getProductBySlug } from "../../../utils/utils";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <main>
      <h1>{product.name}</h1>
      <p>{formatPrice(product.price)}</p>
      <AddToCartButton product={product} />
    </main>
  );
}
