import { useState } from "react";
import { fetchProducts } from "./api";
import { useCart } from "./cart-context";
import {
  CategoryFilter,
  type CategoryFilterValue,
} from "./components/CategoryFilter";
import { ProductCard } from "./components/ProductCard";
import { useFetch } from "./use-fetch";

export default function App() {
  const state = useFetch(fetchProducts);
  const [category, setCategory] = useState<CategoryFilterValue>("all");
  const { items, totalPrice, addToCart } = useCart();

  switch (state.status) {
    case "loading":
      return <p>Loading...</p>;
    case "error":
      return <p role="alert">Error: {state.message}</p>;
    case "success": {
      const products =
        category === "all"
          ? state.data
          : state.data.filter((product) => product.category === category);

      return (
        <main>
          <p>
            Cart: {items.length} item types,{" "}
            €{totalPrice.toLocaleString("en-US")}
          </p>
          <CategoryFilter value={category} onChange={setCategory} />
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
            />
          ))}
        </main>
      );
    }
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
