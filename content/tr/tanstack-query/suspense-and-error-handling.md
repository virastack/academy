---
title: "Suspense ve hata yönetimi"
description: "Global toast, throwOnError, useSuspenseQuery ve hata sonrası yeniden deneme."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/suspense-and-error-handling"
---

## Hatayı göstermenin üç yolu

[TkDodo](https://tkdodo.eu/) TanStack Query'de hatayı ele almanın üç yolunu sayar ve bunları karıştırarak kullanmayı önerir:[^1]

| Yol | Nerede | Ne için |
| :-- | :-- | :-- |
| `error` alanı | Sorguyu kullanan component | Hatayı tam o yerde göstermek |
| `QueryCache`'in `onError`'ı | `QueryClient` oluşturulurken | Toast, hata izleme *(Sentry vb.)* |
| Error Boundary | Component ağacında | Sayfanın bir bölümünü hata ekranıyla değiştirmek |

`error` alanını önceki derslerde kullandınız. Bu derste diğer ikisi var.

## Global toast

v5 ile `useQuery`'nin `onSuccess`, `onError` ve `onSettled` callback'leri kaldırıldı. Mutation'larda duruyorlar.[^2] Sorgu başına callback, aynı sorguyu kullanan her component'te ayrı ayrı çalıştığı için aynı hata için üç toast gösterebiliyordu.[^1]

Doğru yer `QueryCache`'tir. Buradaki callback her istek için **bir kez** çalışır ve `defaultOptions` gibi ezilemez:[^1]

```ts
import { QueryCache, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Yalnızca arka plan yenilemesi başarısız olduysa toast göster
      if (query.state.data !== undefined) {
        toast.error(`Veri güncellenemedi: ${error.message}`);
      }
    },
  }),
});
```

TkDodo'nun tercihi: ekranda zaten veri varsa *(arka plan yenilemesi başarısız olmuşsa)* eski veriyi bozmadan bir toast göster; ilk yüklemedeki hatayı ise component'te ya da Error Boundary'de göster.[^1] Hata izleme kodu için de en iyi yer burasıdır.

## throwOnError ile Error Boundary

Varsayılan olarak hata `error` alanına yazılır, fırlatılmaz. `throwOnError: true` verirseniz hata render sırasında fırlatılır ve en yakın Error Boundary yakalar *(bkz. [Suspense ve hata sınırları](/academy/react/suspense-and-error-boundaries))*.[^3] Fonksiyon da verebilirsiniz; örneğin yalnızca sunucu hatalarını sınıra taşıyıp 4xx'leri yerinde göstermek için:[^1]

```ts
useQuery({
  ...productQueries.detail(id),
  throwOnError: (error) => error instanceof HttpError && error.status >= 500,
});
```

Error Boundary'deki "Tekrar dene" butonu sınırı sıfırlar ama sorgu hâlâ hata durumundadır; tekrar render olduğunda hemen yine fırlatır. Sorgunun da sıfırlanması için `QueryErrorResetBoundary` kullanın:[^3]

```tsx
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

<QueryErrorResetBoundary>
  {({ reset }) => (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ resetErrorBoundary }) => (
        <div>
          <p>Ürün yüklenemedi.</p>
          <button onClick={() => resetErrorBoundary()}>Tekrar dene</button>
        </div>
      )}
    >
      <ProductDetail id={id} />
    </ErrorBoundary>
  )}
</QueryErrorResetBoundary>;
```

## useSuspenseQuery

`useSuspenseQuery`, yükleme ve hata durumunu React'e bırakır: veri yokken component **askıya alınır** ve en yakın `<Suspense>`'in fallback'i görünür; hata olursa Error Boundary yakalar.[^3]

```tsx
import { useSuspenseQuery } from "@tanstack/react-query";

function ProductDetail({ id }: { id: number }) {
  const { data: product } = useSuspenseQuery(productQueries.detail(id));
  //            ^? Product (undefined değil)
  return <h1>{product.name}</h1>;
}

<Suspense fallback={<ProductSkeleton />}>
  <ProductDetail id={id} />
</Suspense>;
```

`data` her zaman tanımlıdır; `isPending` ve `isError` kontrolü gerekmez.[^3] Karşılığında bazı şeylerden vazgeçersiniz:[^3]

| `useQuery`'de var | `useSuspenseQuery`'de |
| :-- | :-- |
| `enabled`, `skipToken` | Yok; sorgu her zaman çalışır |
| `placeholderData` | Yok; anahtar değişince fallback görünür |
| `throwOnError` ayarı | Sabit: yalnızca gösterilecek veri yoksa fırlatır |

Anahtar değişince *(ör. sayfa numarası)* ekranın fallback'e dönmesini istemiyorsanız state güncellemesini `startTransition` ile sarın. React eski içeriği yeni veri gelene kadar ekranda tutar.[^3][^4]

> [!WARNING]
>
> Aynı component'te iki `useSuspenseQuery` yan yana yazılırsa **sırayla** çalışır: ilki askıya alır, ikincisi ancak ilk veri gelince başlar. Paralel olmaları için `useSuspenseQueries` kullanın ya da sorguları ayrı component'lere bölün.[^5]

Bir sorguyu Suspense sınırının **üstünde** başlatmak için `usePrefetchQuery` var. Böylece sınırın altındaki component render olmadan istek yola çıkar:[^6]

```tsx
function ProductPage({ id }: { id: number }) {
  usePrefetchQuery(reviewQueries.list(id));

  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetail id={id} />
      <ReviewList productId={id} />
    </Suspense>
  );
}
```

## Hangisi ne zaman

| Durum | Öneri |
| :-- | :-- |
| Tek bir component, kendi yükleme ve hata arayüzü var | `useQuery` + `error` alanı |
| Sayfanın bir bölümü birlikte yüklensin, iskelet sınırda dursun | `useSuspenseQuery` + `<Suspense>` + Error Boundary |
| Koşullu sorgu, `placeholderData` gerekli | `useQuery` |
| Arka plan hataları ve izleme | `QueryCache` `onError` |

Hata tipini tüm uygulama için değiştirmek isterseniz `Register` arayüzünü genişletin. `defaultError: unknown` derseniz her kullanım yerinde hatayı daraltmak zorunda kalırsınız:[^7]

```ts
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: HttpError;
  }
}
```

## Kendin dene

- Ürün API'sini her ikinci istekte hata verecek şekilde değiştirin. `QueryCache` `onError` ile toast gösterin; ilk yüklemedeki hatada toast çıkmadığını doğrulayın.
- `ProductDetail`'i `useSuspenseQuery`'ye çevirin. `QueryErrorResetBoundary` olmadan "Tekrar dene"ye basın; ne oluyor?
- Aynı component'e iki `useSuspenseQuery` koyun ve Network sekmesinde sırayla çalıştıklarını görün. `useSuspenseQueries` ile düzeltin.

## Detaylı öğrenmek için

- **Yazı:** [TkDodo](https://tkdodo.eu/), "React Query Error Handling"; `error` alanı, global callback'ler ve Error Boundary'yi birlikte kullanmak.[^1]
- **Resmi doküman:** "Suspense"; `useSuspenseQuery`, `throwOnError` varsayılanı ve hata sınırlarını sıfırlamak.[^3]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "Breaking React Query's API on purpose"; sorgu callback'lerinin neden kaldırıldığı.[^2]

## Kaynaklar

1. [TkDodo](https://tkdodo.eu/): [React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling) *(article)* — 10 Eylül 2021. Üç yol, `QueryCache` callback'leri ve arka plan hataları için toast.
2. [TkDodo](https://tkdodo.eu/): [Breaking React Query's API on purpose](https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose) *(article)* — 16 Nisan 2023. v5'te sorgu callback'lerinin kaldırılma gerekçesi.
3. [TanStack Query: Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense) *(doc)* — Suspense hook'ları, `throwOnError` varsayılanı, `QueryErrorResetBoundary` ve `startTransition`.
4. [React: Suspense](https://react.dev/reference/react/Suspense#preventing-unwanted-fallbacks) *(doc)* — Transition ile istenmeyen fallback'i önlemek.
5. [TanStack Query: Parallel Queries](https://tanstack.com/query/latest/docs/framework/react/guides/parallel-queries) *(doc)* — Suspense modunda paralelliğin bozulması ve `useSuspenseQueries`.
6. [TanStack Query: Prefetching & Router Integration](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching) *(doc)* — Suspense sınırının üstünde `usePrefetchQuery`.
7. [TanStack Query: TypeScript](https://tanstack.com/query/latest/docs/framework/react/typescript#registering-a-global-error) *(doc)* — `Register` ile global hata tipi.
