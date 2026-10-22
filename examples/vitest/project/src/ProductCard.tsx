import { formatPrice } from "./format-price";
import type { Product } from "./types";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const titleId = `product-${product.id}-title`;

  return (
    <article aria-labelledby={titleId}>
      <h2 id={titleId}>{product.name}</h2>
      {product.oldPrice ? <s>{formatPrice(product.oldPrice)}</s> : null}
      <p>{formatPrice(product.price)}</p>
      {product.inStock ? null : <p>Stokta yok</p>}
      <button
        type="button"
        disabled={!product.inStock}
        onClick={() => onAddToCart(product)}
      >
        Sepete ekle
      </button>
    </article>
  );
}
