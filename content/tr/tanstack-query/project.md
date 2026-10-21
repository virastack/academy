---
title: "Ürün yönetim paneli"
description: "Sayfalama, arama, prefetch, Suspense, mutation, optimistic update ve sonsuz yorum listesiyle bir ürün paneli."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/project"
---

## Senaryo

Bir mağazanın ürün yönetim panelini kuracaksınız. Panel:

- Ürünleri beşer beşer listeler; sayfa değişirken önceki sayfa soluk olarak ekranda kalır ve sonraki sayfa arka planda hazırlanır.
- Arama metnini query key'e koyar.
- Bir ürünün üzerine gelindiğinde detayını önceden yükler; tıklanınca detay anında açılır.
- Detayı `useSuspenseQuery` ile okur; hata olursa "Tekrar dene" gösterir.
- Stoğu günceller; detay cevapla, liste invalidation ile yenilenir.
- Favori butonu sunucuyu beklemeden değişir; hata olursa geri alınır.
- Yorumları üçer üçer "Daha fazla" ile yükler; yeni yorum gönderilirken soluk görünür.
- Arka planda başarısız olan yenilemeleri bir toast ile bildirir.

Amaç tasarım değil, derslerdeki parçaların birlikte çalışmasıdır. Her parçanın hangi dersten geldiği:

| Parça | Dosya | Ders |
| :-- | :-- | :-- |
| `QueryClient`, `staleTime`, Devtools | `query-client.ts`, `main.tsx` | Kurulum ve devtools, Cache ve stale time |
| `QueryCache` `onError` ile toast | `query-client.ts`, `toast.ts` | Suspense ve hata yönetimi |
| Query factory, `queryOptions`, `infiniteQueryOptions` | `queries.ts` | queryOptions ve select |
| Arama ve sayfa anahtarda, `keepPreviousData`, sonraki sayfa | `ProductTable.tsx` | useQuery ve query key, Sayfalama ve sonsuz liste |
| Hover'da `queryClient.query` ile prefetch | `ProductTable.tsx` | Bağımlı ve paralel sorgular |
| `useSuspenseQuery`, `QueryErrorResetBoundary`, `useTransition` | `ProductDetail.tsx`, `App.tsx` | Suspense ve hata yönetimi |
| `setQueryData` + `invalidateQueries` | `StockForm.tsx` | Mutation ve invalidation |
| Cache ile optimistic update, `isMutating` | `FavoriteButton.tsx` | Optimistic update |
| `useInfiniteQuery`, `variables` ile optimistic update | `Reviews.tsx` | Sayfalama ve sonsuz liste, Optimistic update |

Projenin çalışan hali GitHub'da: [examples/tanstack-query/project](https://github.com/virastack/academy/tree/main/examples/tanstack-query/project). Akışları tarayıcıda deneyen Playwright testleri de orada; takıldığınızda karşılaştırın.

## Adım 1: Projeyi Kurun

[Kurulum ve devtools](/academy/tanstack-query/setup-and-devtools) dersindeki gibi bir [!vite] projesi açın ve paketleri ekleyin:[^1]

```command
npm create vite@latest product-admin -- --template react-ts
```

```command
npm install @tanstack/react-query @tanstack/react-query-devtools react-error-boundary
```

```command
npm install -D @tanstack/eslint-plugin-query
```

`src/App.tsx`, `src/App.css` ve `src/index.css` dosyalarını silin. Tüm dosyaları `src/project/` altına yazacaksınız. `.oxlintrc.json`'a [Kurulum ve devtools](/academy/tanstack-query/setup-and-devtools) dersindeki `jsPlugins` ve `@tanstack/query/*` kurallarını ekleyin.

## Adım 2: Sahte API

Gerçek bir sunucu yerine gecikmeli fonksiyonlar kullanın. Veri bellekte durur; stok ve favori değişiklikleri sayfa yenilenene kadar korunur. `toggleFavorite` yaklaşık dört istekten birinde hata verir; optimistic update'in geri alındığını görmek için.

```ts
// src/project/api.ts
export type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  isFavorite: boolean;
};

export type ProductPage = { items: Product[]; hasMore: boolean };

export type Review = { id: number; productId: number; text: string };

export type ReviewPage = { items: Review[]; nextCursor: number | null };

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const PAGE_SIZE = 5;
const REVIEW_PAGE_SIZE = 3;

const names = [
  "Canvas Sneaker", "Linen Shirt", "Wool Beanie", "Leather Belt", "Denim Jacket",
  "Running Shoe", "Cotton Tee", "Rain Coat", "Silk Scarf", "Hiking Boot",
  "Chino Pants", "Knit Sweater", "Sun Hat",
];

const products: Product[] = names.map((name, index) => ({
  id: index + 1,
  name,
  price: 250 + index * 75,
  stock: (index * 7) % 12,
  isFavorite: false,
}));

const reviews: Review[] = products.flatMap((product) =>
  Array.from({ length: 7 }, (_, index) => ({
    id: product.id * 100 + index,
    productId: product.id,
    text: `${product.name} için yorum ${index + 1}`,
  })),
);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchProductPage(page: number, search: string): Promise<ProductPage> {
  await delay(500);
  const matches = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const start = (page - 1) * PAGE_SIZE;
  return {
    items: matches.slice(start, start + PAGE_SIZE).map((p) => ({ ...p })),
    hasMore: start + PAGE_SIZE < matches.length,
  };
}

export async function fetchProduct(id: number): Promise<Product> {
  await delay(400);
  const product = products.find((p) => p.id === id);
  if (!product) throw new HttpError(404, "Product not found");
  return { ...product };
}

export async function updateStock({ id, stock }: { id: number; stock: number }): Promise<Product> {
  await delay(600);
  if (stock < 0) throw new HttpError(422, "Stock cannot be negative");
  const product = products.find((p) => p.id === id);
  if (!product) throw new HttpError(404, "Product not found");
  product.stock = stock;
  return { ...product };
}

export async function toggleFavorite(id: number): Promise<Product> {
  await delay(800);
  // Yaklaşık dört istekten biri başarısız olsun; geri almayı görmek için
  if (Math.random() < 0.25) throw new HttpError(500, "Favorite could not be saved");
  const product = products.find((p) => p.id === id);
  if (!product) throw new HttpError(404, "Product not found");
  product.isFavorite = !product.isFavorite;
  return { ...product };
}

export async function fetchReviews(productId: number, cursor: number): Promise<ReviewPage> {
  await delay(500);
  const all = reviews.filter((r) => r.productId === productId);
  const items = all.slice(cursor, cursor + REVIEW_PAGE_SIZE);
  const next = cursor + REVIEW_PAGE_SIZE;
  return { items, nextCursor: next < all.length ? next : null };
}

export async function addReview({ productId, text }: { productId: number; text: string }): Promise<Review> {
  await delay(700);
  const review = { id: Date.now(), productId, text };
  reviews.unshift(review);
  return review;
}
```

`HttpError` durum kodunu taşır; [Suspense ve hata yönetimi](/academy/tanstack-query/suspense-and-error-handling) dersindeki `throwOnError` fonksiyonunda olduğu gibi hataları koda göre ayırmanızı sağlar.

## Adım 3: Query Factory

Anahtar hiyerarşisini ve sorgu ayarlarını tek dosyada toplayın. Yalnızca anahtar dönen girişler *(`all`, `lists`, `details`)* invalidation için, `queryOptions` dönenler sorgu için:[^2]

```ts
// src/project/queries.ts
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { fetchProduct, fetchProductPage, fetchReviews } from "./api";

export const productQueries = {
  all: () => ["products"] as const,
  lists: () => [...productQueries.all(), "list"] as const,
  list: (page: number, search: string) =>
    queryOptions({
      queryKey: [...productQueries.lists(), { page, search }],
      queryFn: () => fetchProductPage(page, search),
    }),
  details: () => [...productQueries.all(), "detail"] as const,
  detail: (id: number) =>
    queryOptions({
      queryKey: [...productQueries.details(), id],
      queryFn: () => fetchProduct(id),
    }),
};

export const reviewQueries = {
  all: (productId: number) => ["reviews", productId] as const,
  infinite: (productId: number) =>
    infiniteQueryOptions({
      queryKey: [...reviewQueries.all(productId), "infinite"],
      queryFn: ({ pageParam }) => fetchReviews(productId, pageParam),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
};
```

Liste anahtarı `["products", "list", { page, search }]` olur. Arama ya da sayfa değişince yeni bir cache girdisi açılır; eski aramaya dönünce veri anında gelir.

## Adım 4: QueryClient ve Toast

Toast için küçük bir dış store yeter; `useSyncExternalStore` ile okunur *(bkz. [Custom hook](/academy/react/custom-hooks))*:

```ts
// src/project/toast.ts
import { useSyncExternalStore } from "react";

let message: string | null = null;
const listeners = new Set<() => void>();

export function showToast(text: string) {
  message = text;
  listeners.forEach((listener) => listener());
  setTimeout(() => {
    message = null;
    listeners.forEach((listener) => listener());
  }, 3000);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToast() {
  return useSyncExternalStore(subscribe, () => message);
}
```

`QueryClient`, ekranda veri varken başarısız olan yenilemeleri toast ile bildirir. İlk yüklemedeki hata component'te gösterilir; aynı hata için iki mesaj çıkmaz:[^3]

```ts
// src/project/query-client.ts
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { showToast } from "./toast";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000 },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Ekranda veri varken başarısız olan arka plan yenilemesi
      if (query.state.data !== undefined) {
        showToast(`Veri güncellenemedi: ${error.message}`);
      }
    },
  }),
});
```

`staleTime: 30 * 1000` sayesinde 30 saniye içinde aynı sayfaya dönmek ya da hover'da prefetch edilen detayı açmak yeni istek atmaz.

## Adım 5: Ürün Tablosu

```tsx
// src/project/ProductTable.tsx
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

  // Sonraki sayfayı arka planda hazırla
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
        <input name="search" placeholder="Ürün ara" defaultValue={search} />
        <button>Ara</button>
      </form>

      {isPending ? (
        <p>Yükleniyor...</p>
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
                <td>{product.price} TL</td>
                <td>{product.stock} adet</td>
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
      {isFetching && <span> Güncelleniyor...</span>}
    </section>
  );
}
```

Üç ayrıntı:[^4][^5]

- `keepPreviousData` yeni sayfa gelene kadar eskisini tutar. `isPlaceholderData` true iken "Sonraki" kapalıdır; kullanıcı henüz gelmemiş bir sayfanın ötesine geçemez.
- `useEffect`, gösterilen sayfa gerçek veriyken bir sonrakini `queryClient.query` ile arka planda yükler. `void` ve `.catch(noop)` prefetch hatasını yutar; asıl sorgu hatayı zaten yeniden dener.
- Arama formu kontrolsüzdür; değer yalnızca "Ara"ya basınca state'e, oradan anahtara geçer.

## Adım 6: Stok Formu

Sunucu güncellenmiş ürünü döndürüyor. Detay sorgusuna cevabı yazın, listeleri yeniden çekin:[^6]

```tsx
// src/project/StockForm.tsx
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
```

`onSuccess` invalidation'ın Promise'ini döndürüyor; buton liste yenilenene kadar "Kaydediliyor..." kalır. Toast `mutate`'in callback'inde: kullanıcı başka ürüne geçerse gösterilmez, ama invalidation yine çalışır.

## Adım 7: Favori Butonu

Favori, ekranın birden fazla yerinde görünebilecek bir değer; iyimser güncellemeyi cache üzerinden yapın:[^7][^8]

```tsx
// src/project/FavoriteButton.tsx
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
```

`onMutate` uçuştaki detay isteğini iptal eder, eski değeri saklar ve yenisini yazar. Hata olursa `onError` geri alır. Butona art arda basıldığında yalnızca son mutation invalidation yapar; arayüz bir anlığına eski değere dönmez.

## Adım 8: Yorumlar

Yorumlar sonsuz liste; yeni yorum ise yalnızca bu component'te göründüğü için `variables` ile gösterilir, cache'e dokunulmaz:[^5][^7]

```tsx
// src/project/Reviews.tsx
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addReview } from "./api";
import { reviewQueries } from "./queries";

export function Reviews({ productId }: { productId: number }) {
  const queryClient = useQueryClient();
  const { data, status, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteQuery(reviewQueries.infinite(productId));

  const mutation = useMutation({
    mutationFn: addReview,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: reviewQueries.all(productId) }),
  });

  return (
    <section>
      <h3>Yorumlar</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const text = String(new FormData(form).get("text")).trim();
          if (!text) return;
          mutation.mutate({ productId, text }, { onSuccess: () => form.reset() });
        }}
      >
        <input name="text" placeholder="Yorumunuz" />
        <button disabled={mutation.isPending}>Gönder</button>
      </form>

      {mutation.isPending && <p style={{ opacity: 0.5 }}>{mutation.variables.text}</p>}
      {mutation.isError && (
        <p>
          {mutation.variables.text} gönderilemedi.{" "}
          <button onClick={() => mutation.mutate(mutation.variables)}>Tekrar dene</button>
        </p>
      )}

      {status === "pending" ? (
        <p>Yorumlar yükleniyor...</p>
      ) : status === "error" ? (
        <p>Yorumlar yüklenemedi.</p>
      ) : (
        <>
          {data.pages.flatMap((page) => page.items).map((review) => (
            <p key={review.id}>{review.text}</p>
          ))}
          <button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetching}>
            {isFetchingNextPage ? "Yükleniyor..." : hasNextPage ? "Daha fazla" : "Hepsi bu kadar"}
          </button>
        </>
      )}
    </section>
  );
}
```

`onSettled` `["reviews", productId]` ön ekini geçersiz kılar. Sonsuz liste ilk sayfadan başlayarak yeniden çekilir ve yeni yorum en üstte görünür; o ana kadar soluk satır yerinde durur.

## Adım 9: Ürün Detayı

```tsx
// src/project/ProductDetail.tsx
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
      <p>{product.price} TL</p>
      <FavoriteButton product={product} />
      <StockForm key={product.id} product={product} />
      <Reviews productId={product.id} />
    </article>
  );
}
```

`useSuspenseQuery` ile `product` her zaman tanımlıdır. `StockForm`'a verilen `key`, başka ürüne geçince formun varsayılan değerini sıfırlar *(bkz. [State](/academy/react/state))*.

## Adım 10: Parçaları Birleştirin

```tsx
// src/project/App.tsx
import { Suspense, useState, useTransition } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { ProductTable } from "./ProductTable";
import { ProductDetail } from "./ProductDetail";
import { useToast } from "./toast";

export function App() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isSwitching, startTransition] = useTransition();
  const toast = useToast();

  return (
    <main style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      <ProductTable
        selectedId={selectedId}
        onSelect={(id) => startTransition(() => setSelectedId(id))}
      />

      <div style={{ opacity: isSwitching ? 0.5 : 1 }}>
        {selectedId === null ? (
          <p>Bir ürün seçin.</p>
        ) : (
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary
                onReset={reset}
                resetKeys={[selectedId]}
                fallbackRender={({ resetErrorBoundary }) => (
                  <div>
                    <p>Ürün yüklenemedi.</p>
                    <button onClick={() => resetErrorBoundary()}>Tekrar dene</button>
                  </div>
                )}
              >
                <Suspense fallback={<p>Ürün yükleniyor...</p>}>
                  <ProductDetail id={selectedId} />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        )}
      </div>

      {toast && <div role="status">{toast}</div>}
    </main>
  );
}
```

Ürün seçimi `startTransition` içinde. Seçilen ürün henüz cache'te değilse React fallback'e geçmek yerine eski detayı soluk olarak tutar.[^9] `QueryErrorResetBoundary` "Tekrar dene"de sorgunun hata durumunu da sıfırlar; `resetKeys` başka ürüne geçince sınırı kendiliğinden temizler.[^3][^10]

`src/main.tsx`'i değiştirin:

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./project/query-client";
import { App } from "./project/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
);
```

`npm run dev` ile açın ve şu sırayı deneyin: ilk yükleme, "Sonraki", bir ürünün üzerine gelip tıklama *(detay anında açılmalı)*, "Daha fazla", stok güncelleme, favoriye art arda basma, yorum gönderme, "shirt" araması. Devtools panelinde her adımda hangi sorgunun `fetching`, `stale` ya da `inactive` olduğunu izleyin.

Son olarak kontrol edin:

```bash
npm run lint
npm run build
```

## Kendin Dene

- `fetchProduct`'ı ilk çağrıda hata fırlatacak şekilde değiştirin. "Tekrar dene" çalışıyor mu? `onReset={reset}`'i silip tekrar deneyin.
- `toggleFavorite`'teki olasılığı `1` yapın. Yıldız ne yapıyor, toast ne diyor?
- `productQueries.detail`'e `staleTime: Infinity` verin, stoğu güncelleyin. Detay neden yine de doğru?
- Tablodaki `select` ile yalnızca stokta olan ürünlerin sayısını gösteren bir rozet ekleyin.
- `QueryClient`'a bir `MutationCache` `onSuccess` ekleyip her mutation'dan sonra her şeyi geçersiz kılın; `StockForm` ve `Reviews`'taki invalidation'ları silin. Network sekmesinde ne değişti?
- Yorum listesine `maxPages: 2` verin ve dört sayfa yükleyip sekmeden çıkıp dönün.

## Kaynaklar

1. [TanStack Query: Installation](https://tanstack.com/query/latest/docs/framework/react/installation) *(doc)* — Paket kurulumu ve ESLint eklentisi.
2. [TkDodo](https://tkdodo.eu/): [The Query Options API](https://tkdodo.eu/blog/the-query-options-api) *(article)* — 17 Ocak 2024. Query factory ve `queryOptions`.
3. [TkDodo](https://tkdodo.eu/): [React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling) *(article)* — 10 Eylül 2021. `QueryCache` callback'i ile arka plan hataları için toast.
4. [TanStack Query: Paginated / Lagged Queries](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries) *(doc)* — `keepPreviousData` ve `isPlaceholderData`.
5. [TanStack Query: Prefetching & Router Integration](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching) *(doc)* — `queryClient.query` ile prefetch ve `noop`.
6. [TanStack Query: Updates from Mutation Responses](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses) *(doc)* — `setQueryData` ile cevabı cache'e yazmak.
7. [TanStack Query: Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) *(doc)* — Cache ve `variables` ile iyimser güncelleme.
8. [TkDodo](https://tkdodo.eu/): [Concurrent Optimistic Updates in React Query](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) *(article)* — 28 Nisan 2025. `isMutating` ile sınırlı invalidation.
9. [React: useTransition](https://react.dev/reference/react/useTransition) *(doc)* — Transition sırasında eski içeriği ekranda tutmak.
10. [react-error-boundary](https://github.com/bvaughn/react-error-boundary) *(repo)* — `fallbackRender`, `onReset` ve `resetKeys`.
