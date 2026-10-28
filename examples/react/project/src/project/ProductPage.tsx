import { Activity, Suspense, use, useState } from "react";
import { fetchProduct } from "./cache.ts";
import { useCartDispatch } from "./cart.tsx";
import { FavoriteButton } from "./FavoriteButton.tsx";
import { Reviews } from "./Reviews.tsx";

type Tab = "details" | "reviews";

export function ProductPage({ id }: { id: string }) {
  const product = use(fetchProduct(id));
  const dispatch = useCartDispatch();
  const [tab, setTab] = useState<Tab>("details");

  return (
    <article>
      <h1>{product.name}</h1>
      <p>{product.price.toLocaleString("tr-TR")} TL</p>
      <button type="button" onClick={() => dispatch({ type: "add", product })}>Add to cart</button>
      <FavoriteButton
        key={product.id}
        productId={product.id}
        initialFavorite={product.isFavorite}
      />

      <div role="tablist">
        <button role="tab" aria-selected={tab === "details"} onClick={() => setTab("details")}>
          Açıklama
        </button>
        <button role="tab" aria-selected={tab === "reviews"} onClick={() => setTab("reviews")}>Reviews</button>
      </div>
      <Activity mode={tab === "details" ? "visible" : "hidden"}>
        <p>{product.description}</p>
      </Activity>
      <Activity mode={tab === "reviews" ? "visible" : "hidden"}>
        <Suspense fallback={<p>Loading reviews...</p>}>
          <Reviews productId={product.id} />
        </Suspense>
      </Activity>
    </article>
  );
}
