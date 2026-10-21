import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStock, type Product } from "./api";
import { productQueries } from "./queries";
import { showToast } from "./toast";

export function StockForm({ product }: { product: Product }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateStock,
    onSuccess: (updated) => {
      // Detay: cevabı doğrudan cache'e yaz
      queryClient.setQueryData(productQueries.detail(updated.id).queryKey, updated);
      // Listeler: yeniden çek; Promise'i döndür ki buton beklesin
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
          { onSuccess: () => showToast("Stok güncellendi") },
        );
      }}
    >
      <label>
        Stok <input name="stock" type="number" defaultValue={product.stock} />
      </label>
      <button disabled={mutation.isPending}>
        {mutation.isPending ? "Kaydediliyor..." : "Kaydet"}
      </button>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
    </form>
  );
}
