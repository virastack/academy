import { useEffect, useState } from "react";
import { keepPreviousData, noop, useQuery, useQueryClient } from "@tanstack/react-query";
import { productQueries } from "./queries";

type ProductTableProps = {
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function ProductTable({ selectedId, onSelect }: ProductTableProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isPending, isError, error, isFetching, isPlaceholderData } = useQuery({
    ...productQueries.list(page, search),
    placeholderData: keepPreviousData,
  });

  // Prepare the next page in the background
  useEffect(() => {
    if (!isPlaceholderData && data?.hasMore) {
      void queryClient.query(productQueries.list(page + 1, search)).catch(noop);
    }
  }, [data, isPlaceholderData, page, search, queryClient]);

  const prefetchDetail = (id: number) => {
    void queryClient.query(productQueries.detail(id)).catch(noop);
  };

  return (
    <section>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(String(new FormData(event.currentTarget).get("search")));
          setPage(1);
        }}
      >
        <input name="search" placeholder="Search products" defaultValue={search} />
        <button>Search</button>
      </form>

      {isPending ? (
        <p>Loading...</p>
      ) : isError ? (
        <p>Hata: {error.message}</p>
      ) : (
        <table style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
          <tbody>
            {data.items.map((product) => (
              <tr key={product.id} aria-selected={product.id === selectedId}>
                <td>
                  <button
                    onClick={() => onSelect(product.id)}
                    onMouseEnter={() => prefetchDetail(product.id)}
                    onFocus={() => prefetchDetail(product.id)}
                  >
                    {product.name}
                  </button>
                </td>
                <td>€{product.price}</td>
                <td>{product.stock} in stock</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
        Önceki
      </button>
      <span> Sayfa {page} </span>
      <button
        onClick={() => setPage((p) => p + 1)}
        disabled={isPlaceholderData || !data?.hasMore}
      >
        Sonraki
      </button>
      {isFetching && <span>Updating...</span>}
    </section>
  );
}
