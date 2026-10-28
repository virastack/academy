import type { Product } from "./api";
import { useFilteredProducts } from "./filter-store";
import { formatPrice } from "./format";
import { useCartQuantity, useShopActions } from "./shop-store";

function ProductCard({ product }: { product: Product }) {
  const inCart = useCartQuantity(product.id);
  const { addToCart } = useShopActions();
  const soldOut = product.stock === 0;
  const limitReached = inCart >= product.stock;

  return (
    <li style={{ border: "1px solid #ccc", padding: 12 }}>
      <h3>{product.name}</h3>
      <p>{formatPrice(product.price)}</p>
      <p>{soldOut ? "Sold out" : `Stock: ${product.stock}`}</p>
      <button
        onClick={() => addToCart(product)}
        disabled={limitReached}
        aria-label={`add ${product.name} to cart`}
      >Add to cart</button>
    </li>
  );
}

export function ProductGrid() {
  const { data: products, isPending, isError, isPlaceholderData } = useFilteredProducts();

  if (isPending) return <p>Loading products...</p>;
  if (isError) return <p>Products could not be loaded.</p>;
  if (products.length === 0) return <p>No products found.</p>;

  return (
    <ul
      aria-label="Products"
      style={{
        listStyle: "none",
        padding: 0,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
        opacity: isPlaceholderData ? 0.5 : 1,
      }}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ul>
  );
}
