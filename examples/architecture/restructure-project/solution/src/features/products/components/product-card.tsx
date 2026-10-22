import Link from "next/link";

import type { Product } from "@/features/products/types/product";
import { formatPrice } from "@/helpers/format-price";

export function ProductCard({ product, action }: { product: Product; action?: React.ReactNode }) {
  return (
    <article className="card">
      <h2>
        <Link href={`/products/${product.slug}`}>{product.name}</Link>
      </h2>
      <p>{formatPrice(product.price)}</p>
      {action}
    </article>
  );
}
