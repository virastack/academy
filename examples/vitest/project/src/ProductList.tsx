import { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";
import type { Product } from "./types";

type ProductListProps = {
  loadProducts: () => Promise<Product[]>;
  onAddToCart: (product: Product) => void;
};

type Status = "loading" | "error" | "ready";

export function ProductList({ loadProducts, onAddToCart }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let ignore = false;

    loadProducts()
      .then((loaded) => {
        if (ignore) return;
        setProducts(loaded);
        setStatus("ready");
      })
      .catch(() => {
        if (ignore) return;
        setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [loadProducts]);

  if (status === "loading") {
    return <p role="status">Loading products...</p>;
  }

  if (status === "error") {
    return <p role="alert">Products could not be loaded.</p>;
  }

  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
  const visibleProducts = products.filter((product) =>
    product.name.toLocaleLowerCase("tr-TR").includes(normalizedQuery),
  );

  return (
    <section aria-label="Products">
      <label htmlFor="product-search">Search products</label>
      <input
        id="product-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {visibleProducts.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <ul>
          {visibleProducts.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} onAddToCart={onAddToCart} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
