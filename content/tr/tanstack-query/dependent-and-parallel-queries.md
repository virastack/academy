---
title: "Bağımlı ve paralel sorgular"
description: "useQueries, enabled ve skipToken, istek şelalesi ve hover'da prefetch."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/dependent-and-parallel-queries"
---

## Paralel sorgular

Aynı component'te yan yana yazılan `useQuery`'ler kendiliğinden paralel çalışır; ek bir şey yapmanız gerekmez:[^1]

```tsx
function ProductPage({ id }: { id: number }) {
  const product = useQuery(productQueries.detail(id));
  const reviews = useQuery(reviewQueries.list(id));
  // iki istek aynı anda başlar
}
```

Sorgu sayısı render'dan render'a değişiyorsa döngüde `useQuery` çağıramazsınız; hook kuralları buna izin vermez. Bunun için `useQueries` var:[^1]

```tsx
function CartSummary({ productIds }: { productIds: number[] }) {
  const total = useQueries({
    queries: productIds.map((id) => productQueries.detail(id)),
    combine: (results) => ({
      price: results.reduce((sum, result) => sum + (result.data?.price ?? 0), 0),
      isPending: results.some((result) => result.isPending),
    }),
  });

  if (total.isPending) return <p>Hesaplanıyor...</p>;
  return <p>Toplam: {total.price} TL</p>;
}
```

`combine` sonuç dizisini tek bir değere çevirir. Sonuç structural sharing ile korunur; değer değişmedikçe referansı da değişmez.[^2] `queryOptions` kullanırsanız `useQueries` içindeki tip çıkarımı da korunur.[^1]

## Bağımlı sorgular

İkinci sorgu birincinin sonucuna ihtiyaç duyuyorsa `enabled` ile bekletin:[^3]

```tsx
const { data: user } = useQuery(userQueries.me());

const { data: orders, isLoading } = useQuery({
  ...orderQueries.list(user?.id ?? 0),
  enabled: !!user?.id,
});
```

`enabled: false` olan bir sorgu `status: 'pending'` ve `fetchStatus: 'idle'` durumunda bekler. Bu yüzden `isPending` burada yükleme göstermek için uygun değildir; istek başlamadan da `true`'dur. İlk istek gerçekten sürerken `true` olan `isLoading`'i kullanın.[^3][^4]

TypeScript kullanıyorsanız `skipToken` aynı işi tip güvenli yapar. `enabled` ile `user?.id ?? 0` gibi sahte bir değer yazmak zorunda kalmazsınız:[^4]

```tsx
import { skipToken, useQuery } from "@tanstack/react-query";

const { data: orders } = useQuery({
  queryKey: ["orders", user?.id],
  queryFn: user ? () => fetchOrders(user.id) : skipToken,
});
```

> [!WARNING]
>
> `skipToken` ile kurulan sorguda `refetch()` çalışmaz; `Missing queryFn` hatası verir. Sorguyu elle tetiklemeniz gerekiyorsa `enabled: false` kullanın.[^4]

`enabled`'ı bir filtre formunda da kullanabilirsiniz: kullanıcı filtreyi uygulayana kadar sorgu çalışmaz, uyguladığı anda anahtar ve `enabled` birlikte değişir.[^4] TkDodo `enabled`'ı kütüphanenin en güçlü seçeneklerinden biri sayar.[^5]

## İstek şelalesi

Bir isteğin başlaması için başka bir isteğin bitmesini beklemek **şelale** *(request waterfall)* oluşturur. Doküman bunu, bileşen içinde veri çeken kütüphanelerdeki en büyük performans tuzağı olarak tanımlar.[^6] Üç tipik kaynak:[^6]

| Şelale | Örnek | Çözüm |
| :-- | :-- | :-- |
| Tek component'te sıralı sorgu | Önce kullanıcı, sonra siparişleri | API'de tek uç nokta *(`/me/orders`)* ya da sunucuya taşımak |
| İç içe component | `Article` verisini bekler, `Comments` sonra render olur | Sorguyu üste taşımak ya da prefetch |
| Code splitting | Lazy component yüklenir, içindeki sorgu ancak sonra başlar | Sorguyu lazy component'ten önce başlatmak |

İç içe şelale sinsidir: alt component'in kendi sorgusu, üst component kendi verisini bekleyip alt component'i render ettiğinde başlar. `Comments` için gereken `id` zaten `Article`'da varsa iki sorgu aynı anda başlatılabilir.[^6] Hepsini düzeltmek zorunda değilsiniz; ara sıra Network sekmesine bakıp fark etmek yeter.[^6]

## Event handler'da prefetch

Kullanıcı bir ürünün üzerine geldiğinde detayını önceden yükleyebilirsiniz. Tıkladığında veri cache'te hazırdır. v5.102 ile `prefetchQuery` ve `ensureQueryData` kullanımdan kaldırıldı; yerine `queryClient.query` var:[^7][^8]

```tsx
import { noop, useQueryClient } from "@tanstack/react-query";

function ProductLink({ id, children }: { id: number; children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    void queryClient.query(productQueries.detail(id)).catch(noop);
  };

  return (
    <a href={`/products/${id}`} onMouseEnter={prefetch} onFocus={prefetch}>
      {children}
    </a>
  );
}
```

`query` veriyi getirir, cache'e yazar ve sonucu döndürür; hata olursa fırlatır. Prefetch'te sonuca ihtiyaç olmadığı için Promise `void` ile bırakılır ve hata `noop` ile yutulur; asıl `useQuery` hatayı zaten yeniden dener.[^7] Veri `staleTime`'dan tazeyse istek atılmaz. Bu yüzden prefetch edilen sorguya bir `staleTime` vermek önemlidir; yoksa her fare hareketinde istek gider.[^7]

> [!NOTE]
>
> Eski yazılarda ve kodlarda `queryClient.prefetchQuery(...)` görürsünüz. Hâlâ çalışır ama bir sonraki ana sürümde kaldırılacak. Yeni kodda `void queryClient.query(...).catch(noop)` yazın.[^7][^8]

## Kendin dene

- Ürün ve yorum sorgularını aynı component'te yazın, Network sekmesinde aynı anda başladıklarını görün. Yorumları bir alt component'e taşıyıp ürün yüklenince render edin; şelaleyi görüyor musunuz?
- Sepetteki ürün id'lerinden `useQueries` ve `combine` ile toplam fiyat hesaplayın.
- Bağımlı sorguyu önce `enabled` ile, sonra `skipToken` ile yazın. Tiplerdeki farka bakın.
- Ürün linklerine hover prefetch ekleyin, `staleTime`'ı kaldırıp fareyi linklerde gezdirin.

## Detaylı öğrenmek için

- **Resmi doküman:** "Performance & Request Waterfalls"; şelale türleri, code splitting ve Server Component'lerin rolü.[^6]
- **Resmi doküman:** "Prefetching & Router Integration"; event handler, component ve router düzeyinde prefetch.[^7]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "Seeding the Query Cache"; Suspense şelaleleri ve cache'i önceden doldurmak.[^9]

## Kaynaklar

1. [TanStack Query: Parallel Queries](https://tanstack.com/query/latest/docs/framework/react/guides/parallel-queries) *(doc)* — Yan yana sorgular, `useQueries` ve Suspense'te paralellik.
2. [TanStack Query: useQueries](https://tanstack.com/query/latest/docs/framework/react/reference/functions/useQueries) *(doc)* — `combine` seçeneği ve structural sharing.
3. [TanStack Query: Dependent Queries](https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries) *(doc)* — `enabled` ile bağımlı sorgu ve durum geçişleri.
4. [TanStack Query: Disabling/Pausing Queries](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries) *(doc)* — `enabled: false`, lazy sorgu, `isLoading` ve `skipToken`.
5. [TkDodo](https://tkdodo.eu/): [Practical React Query](https://tkdodo.eu/blog/practical-react-query) *(article)* — 16 Kasım 2020. `enabled` seçeneğinin kullanım alanları.
6. [TanStack Query: Performance & Request Waterfalls](https://tanstack.com/query/latest/docs/framework/react/guides/request-waterfalls) *(doc)* — Sıralı sorgu, iç içe component ve code splitting şelaleleri.
7. [TanStack Query: Prefetching & Router Integration](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching) *(doc)* — `queryClient.query` ile prefetch, `noop` ve `staleTime`.
8. [TanStack Query: QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient) *(doc)* — `query` metodu ve kullanımdan kalkan `fetchQuery`, `prefetchQuery`, `ensureQueryData`.
9. [TkDodo](https://tkdodo.eu/): [Seeding the Query Cache](https://tkdodo.eu/blog/seeding-the-query-cache) *(article)* — 22 Ekim 2022. Şelaleler, Suspense ve prefetch.
