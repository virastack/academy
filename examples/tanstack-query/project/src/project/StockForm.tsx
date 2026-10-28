import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStock, type Product } from "./api";
import { productQueries } from "./queries";
import { showToast } from "./toast";

export function StockForm({ product }: { product: Product }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateStock,
    onSuccess: (updated) => {
      // Detail: write the response straight into the cache
      queryClient.setQueryData(productQueries.detail(updated.id).queryKey, updated);
      // Lists: refetch, and return the Promise so the button waits
      return queryClient.invalidateQueries({ queryKey: productQueries.lists() });
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const stock = Number(new FormData(event.currentTarget).get("stock"));
        mutation.mutate(
          { id: product.id, stock },
          { onSuccess: () => showToast("Stock updated") },
        );
      }}
    >
      <label>
        Stock <input name="stock" type="number" defaultValue={product.stock} />
      </label>
      <button disabled={mutation.isPending}>
        {mutation.isPending ? "Saving..." : "Save"}
      </button>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
    </form>
  );
}
