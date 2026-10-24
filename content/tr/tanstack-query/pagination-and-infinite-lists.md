---
title: "Sayfalama ve sonsuz liste"
description: "keepPreviousData, sonraki sayfayı hazırlamak ve useInfiniteQuery."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/pagination-and-infinite-lists"
---

## Sayfa sayfa listelemek

Sayfalama ek bir API gerektirmez: sayfa numarasını query key'e koyarsınız.[^1]

```ts
export const productQueries = {
  // ...
  page: (page: number) =>
    queryOptions({
      queryKey: ["products", "list", { page }],
      queryFn: () => fetchProductPage(page), // { items, hasMore }
    }),
};
```

Bu haliyle çalışır ama her sayfa yeni bir sorgudur. "Sonraki"ye bastığınızda liste kaybolur, yükleme ekranı gelir, sonra yeni sayfa görünür. Ekran her sayfada zıplar.[^1]

## keepPreviousData

`placeholderData: keepPreviousData` verirseniz yeni sayfa gelene kadar önceki sayfa ekranda kalır:[^1]

```tsx
import { keepPreviousData, useQuery } from "@tanstack/react-query";

function ProductTable() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, isFetching, isPlaceholderData } = useQuery({
    ...productQueries.page(page),
    placeholderData: keepPreviousData,
  });

  if (isPending) return <p>Yükleniyor...</p>;
  if (isError) return <p>Hata: {error.message}</p>;

  return (
    <>
      <ul style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
        {data.items.map((product) => <li key={product.id}>{product.name}</li>)}
      </ul>
      <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
        Önceki
      </button>
      <span>Sayfa {page}</span>
      <button
        onClick={() => setPage((p) => p + 1)}
        disabled={isPlaceholderData || !data.hasMore}
      >
        Sonraki
      </button>
      {isFetching && <span> Güncelleniyor...</span>}
    </>
  );
}
```

`isPlaceholderData`, ekrandaki verinin önceki sayfadan kaldığını söyler. Yeni sayfa gelene kadar "Sonraki"yi kapatmak ve listeyi soluklaştırmak için kullanın.[^1] `keepPreviousData` aslında `(previousData) => previousData` fonksiyonudur; `placeholderData` kendisi cache'e yazılmaz *(bkz. [Cache ve stale time](/academy/tanstack-query/cache-and-stale-time))*.

Kullanıcı büyük ihtimalle sonraki sayfaya geçecek. Bir sonraki sayfayı arka planda yükleyin ki tıkladığında hazır olsun:[^2]

```tsx
const queryClient = useQueryClient();

useEffect(() => {
  if (!isPlaceholderData && data?.hasMore) {
    void queryClient.query(productQueries.page(page + 1)).catch(noop);
  }
}, [data, isPlaceholderData, page, queryClient]);
```

Sayfa numarasını `useState` yerine URL'de *(`?page=2`)* tutarsanız sayfa paylaşılabilir olur ve tarayıcının geri butonu çalışır. Anahtar aynı kalır; değişen yalnızca değerin nereden okunduğudur.[^3] Next.js, React Router ya da TanStack Router'da bunu `useState`'e benzer, tipli bir API ile yapmak için [nuqs](https://nuqs.dev) var.[^4]

## Sonsuz liste

"Daha fazla yükle" butonu ya da kaydırınca yüklenen listeler için `useInfiniteQuery` var. Tek farkı, verinin sayfalardan oluşan bir yapı olmasıdır:[^5]

```ts
import { infiniteQueryOptions } from "@tanstack/react-query";

export const reviewQueries = {
  infinite: (productId: number) =>
    infiniteQueryOptions({
      queryKey: ["reviews", productId, "infinite"],
      queryFn: ({ pageParam }) => fetchReviews(productId, pageParam), // { items, nextCursor }
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
};
```

| Alan | Ne işe yarar |
| :-- | :-- |
| `initialPageParam` | İlk sayfanın parametresi; v5'te zorunlu |
| `getNextPageParam` | Son sayfadan bir sonrakinin parametresini çıkarır; `undefined` ya da `null` dönerse liste biter |
| `data.pages` | Gelen sayfaların dizisi |
| `fetchNextPage` | Sonraki sayfayı getirir |
| `hasNextPage` | `getNextPageParam` bir değer döndürüyorsa `true` |
| `isFetchingNextPage` | Yalnızca sonraki sayfa yüklenirken `true`; arka plan yenilemesinden ayırmak için |

```tsx
function Reviews({ productId }: { productId: number }) {
  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, status } =
    useInfiniteQuery(reviewQueries.infinite(productId));

  if (status === "pending") return <p>Yükleniyor...</p>;
  if (status === "error") return <p>Yorumlar yüklenemedi.</p>;

  return (
    <>
      {data.pages.flatMap((page) => page.items).map((review) => (
        <p key={review.id}>{review.text}</p>
      ))}
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetching}
      >
        {isFetchingNextPage ? "Yükleniyor..." : hasNextPage ? "Daha fazla" : "Hepsi bu kadar"}
      </button>
    </>
  );
}
```

Butonu `isFetching` sürerken kapatmak önemlidir. Bir sonsuz listede aynı anda tek bir istek olabilir; tüm sayfalar tek cache girdisini paylaşır. Arka plan yenilemesi sürerken `fetchNextPage` çağırmak veriyi ezebilir.[^5] Kaydırınca yüklemek için butonu bir `IntersectionObserver` ile tetiklerken de aynı kontrolü yapın: `hasNextPage && !isFetching && fetchNextPage()`.[^5]

## Sonsuz liste nasıl yenilenir

Sonsuz liste cache'te **tek bir sorgudur**; sayfalar birbirine bağlı bir liste gibi durur. Her sayfa bir öncekinden aldığı parametreyle getirilir.[^6] Bu yüzden liste eskiyip yenilendiğinde sayfalar **ilk sayfadan başlayarak sırayla** yeniden çekilir. Böylece arada eklenen ya da silinen kayıtlar yüzünden eski cursor'larla tekrar eden ya da atlanan kayıt oluşmaz.[^5][^6]

Bunun bedeli var: kullanıcı yirmi sayfa yüklediyse yenileme yirmi istek demektir. `maxPages` cache'te tutulan sayfa sayısını sınırlar. Bunu kullanırsanız iki yönde de gezinebilmek için `getPreviousPageParam` da vermeniz gerekir:[^5]

```ts
infiniteQueryOptions({
  // ...
  getPreviousPageParam: (firstPage) => firstPage.prevCursor,
  maxPages: 3,
});
```

API cursor döndürmüyorsa `getNextPageParam` üçüncü argüman olarak son sayfanın parametresini alır; `lastPageParam + 1` ile sayfa numarasını kendiniz hesaplarsınız.[^5]

## Hangisi

| Durum | Öneri |
| :-- | :-- |
| Tablo, admin paneli, kullanıcı belirli bir sayfaya gidecek | Sayfalı sorgu + `keepPreviousData` |
| Akış, yorumlar, arama sonuçları | `useInfiniteQuery` |
| Çok uzun liste, binlerce satır | `useInfiniteQuery` + `maxPages` + sanallaştırma |

Binlerce satırı DOM'da tutmak sorgudan bağımsız bir sorundur; sanallaştırma için [Render performansı](/academy/performance-accessibility/render-performance) dersine bakın.

## Kendin dene

- Ürün tablosunu `keepPreviousData` olmadan yazın, sayfalar arasında geçin. Sonra ekleyin; farkı not edin.
- Sonraki sayfayı önceden yükleyin ve Network sekmesinde ne zaman istek gittiğini izleyin.
- Yorumlara sonsuz liste ekleyin. Üç sayfa yükleyin, sekmeden çıkıp dönün; kaç istek gidiyor ve hangi sırayla?
- `maxPages: 2` verip tekrar deneyin.

## Detaylı öğrenmek için

- **Resmi doküman:** "Infinite Queries"; iki yönlü liste, sayfaları elle güncelleme ve `maxPages`.[^5]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "How Infinite Queries work"; sonsuz sorgunun cache'teki yapısı ve yenileme davranışı.[^6]
- **Resmi doküman:** "Paginated / Lagged Queries"; `placeholderData` ve `isPlaceholderData`.[^1]

## Kaynaklar

1. [TanStack Query: Paginated / Lagged Queries](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries) *(doc)* — Sayfayı anahtara koymak, `keepPreviousData` ve `isPlaceholderData`.
2. [TanStack Query: Prefetching & Router Integration](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching) *(doc)* — `queryClient.query` ile önceden yükleme.
3. [TkDodo](https://tkdodo.eu/): [React Query - The Bad Parts](https://tkdodo.eu/blog/react-query-the-bad-parts) *(video)* — React Day Berlin, Aralık 2024. Filtreyi URL'de tutup anahtara bağlamak.
4. [nuqs: Type-safe search params state manager for React](https://nuqs.dev/) *(doc)* — `useState` benzeri API ile URL senkronu, tipli parser'lar, geçmiş yönetimi ve desteklenen framework'ler.
5. [TanStack Query: Infinite Queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries) *(doc)* — `useInfiniteQuery`, sıralı yenileme, eşzamanlı istek uyarısı ve `maxPages`.
6. [TkDodo](https://tkdodo.eu/): [How Infinite Queries work](https://tkdodo.eu/blog/how-infinite-queries-work) *(article)* — 14 Eylül 2024. Sonsuz sorgunun tek cache girdisi olarak yapısı ve `QueryBehavior`.
