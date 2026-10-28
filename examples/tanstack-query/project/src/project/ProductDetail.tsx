import { useSuspenseQuery } from "@tanstack/react-query";
import { productQueries } from "./queries";
import { FavoriteButton } from "./FavoriteButton";
import { StockForm } from "./StockForm";
import { Reviews } from "./Reviews";

export function ProductDetail({ id }: { id: number }) {
  const { data: product } = useSuspenseQuery(productQueries.detail(id));

  return (
    <article>
      <h2>{product.name}</h2>
      <p>€{product.price}</p>
      <FavoriteButton product={product} />
      <StockForm key={product.id} product={product} />
      <Reviews productId={product.id} />
    </article>
  );
}
