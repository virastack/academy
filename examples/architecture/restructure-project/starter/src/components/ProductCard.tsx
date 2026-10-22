import Link from "next/link";

import { Product } from "../types/types";
import { formatPrice } from "../utils/utils";
import { AddToCartButton } from "./AddToCartButton";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="card">
      <h2>
        <Link href={`/products/${product.slug}`}>{product.name}</Link>
      </h2>
      <p>{formatPrice(product.price)}</p>
      <AddToCartButton product={product} />
    </article>
  );
}
