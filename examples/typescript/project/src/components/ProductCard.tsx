import type { Product } from "../types";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <article>
      <h2>{product.name}</h2>
      <p>€{product.price.toLocaleString("en-US")}</p>
      <button
        type="button"
        disabled={!product.inStock}
        onClick={() => onAddToCart(product)}
      >
        {product.inStock ? "Add to cart" : "Out of stock"}
      </button>
    </article>
  );
}
