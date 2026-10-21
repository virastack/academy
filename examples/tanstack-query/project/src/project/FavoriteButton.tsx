import { useMutation } from "@tanstack/react-query";
import { toggleFavorite, type Product } from "./api";
import { productQueries } from "./queries";
import { showToast } from "./toast";

const favoriteKey = ["toggle-favorite"];

export function FavoriteButton({ product }: { product: Product }) {
  const mutation = useMutation({
    mutationKey: favoriteKey,
    mutationFn: toggleFavorite,
    onMutate: async (id: number, context) => {
      const queryKey = productQueries.detail(id).queryKey;
      await context.client.cancelQueries({ queryKey });
      const previous = context.client.getQueryData(queryKey);
      context.client.setQueryData(queryKey, (old) =>
        old ? { ...old, isFavorite: !old.isFavorite } : old,
      );
      return { previous, queryKey };
    },
    onError: (error, _id, onMutateResult, context) => {
      if (onMutateResult) {
        context.client.setQueryData(onMutateResult.queryKey, onMutateResult.previous);
      }
      showToast(error.message);
    },
    onSettled: (_data, _error, id, _onMutateResult, context) => {
      // Yalnızca son favori isteği sunucuyla eşitlesin
      if (context.client.isMutating({ mutationKey: favoriteKey }) === 1) {
        return context.client.invalidateQueries({
          queryKey: productQueries.detail(id).queryKey,
        });
      }
    },
  });

  return (
    <button onClick={() => mutation.mutate(product.id)} aria-pressed={product.isFavorite}>
      {product.isFavorite ? "★ Favoride" : "☆ Favorilere ekle"}
    </button>
  );
}
