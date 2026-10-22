import { startTransition, useOptimistic, useState } from "react";
import { setFavorite } from "./api.ts";

type FavoriteButtonProps = { productId: string; initialFavorite: boolean };

export function FavoriteButton({ productId, initialFavorite }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(isFavorite);

  function toggle() {
    const next = !optimisticFavorite;
    startTransition(async () => {
      setOptimisticFavorite(next);
      await setFavorite(productId, next);
      startTransition(() => setIsFavorite(next));
    });
  }

  return (
    <button type="button" aria-pressed={optimisticFavorite} onClick={toggle}>
      {optimisticFavorite ? "♥ Favorilerde" : "♡ Favorilere ekle"}
    </button>
  );
}
