---
title: "Next.js ile prefetch"
description: "Server Component'te başlatıp akıtmak, HydrationBoundary ve veri sahipliği."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/prefetch-with-nextjs"
---

## Önce: Gerçekten gerekiyor mu

[!nextjs] App Router'da veri çoğunlukla Server Component'te okunur ve TanStack Query'ye ihtiyaç kalmayabilir *(bkz. [Veri çekme ve streaming](/academy/nextjs/data-fetching-and-streaming))*. Doküman yeni bir Server Component uygulamasında önce framework'ün araçlarıyla başlamayı, TanStack Query'yi ihtiyaç doğduğunda eklemeyi önerir.[^1]

Birlikte kullanmanın anlamlı olduğu durumlar:[^1][^2]

- TanStack Query kullanan bir uygulamayı veri katmanını baştan yazmadan App Router'a taşımak.
- İlk sayfası sunucuda, sonraki sayfaları istemcide yüklenen sonsuz listeler.
- Polling, iyimser güncelleme, odaklanınca yenileme gibi istemci tarafı davranışlar.

Bu derste Server Component, sorguyu **başlatan** yerdir; veriyi kullanan ve güncel tutan Client Component'tir.

## Kurulum

`QueryClient`'ı oluşturan fonksiyonu ayrı bir dosyaya koyun; hem sunucuda hem istemcide kullanacaksınız:[^1]

```ts
// app/get-query-client.ts
import {
  defaultShouldDehydrateQuery,
  environmentManager,
  QueryClient,
} from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // İstemci, sunucudan gelen veriyi hemen yeniden çekmesin
        staleTime: 60 * 1000,
      },
      dehydrate: {
        // Henüz bitmemiş sorguları da istemciye gönder
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
        // Next.js kendi hatalarını bu yolla tanır; gizleme
        shouldRedactErrors: () => false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (environmentManager.isServer()) {
    // Sunucu: her istek için yeni client; kullanıcılar arasında veri sızmaz
    return makeQueryClient();
  }
  // Tarayıcı: tek client
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
```

```tsx
// app/providers.tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "./get-query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

`app/layout.tsx`'te `<body>`'nin içini `<Providers>` ile sarın. `QueryClientProvider` Context kullandığı için `providers.tsx` bir Client Component'tir.[^1]

Burada `useState(() => new QueryClient())` yerine modül düzeyinde bir değişken kullanılıyor. Sebep: Provider ile onun altında askıya alan bir component arasında `<Suspense>` yoksa React ilk render'ı atar ve `useState` ile oluşturulan client kaybolur.[^1] `environmentManager.isServer()`, eski örneklerde gördüğünüz `isServer` sabitinin yerini aldı; sabit kodda kullanımdan kalkmış olarak işaretli.[^3]

## Sunucuda başlat, istemcide kullan

Server Component sorguyu başlatır, cache'i `dehydrate` ile serileştirir ve `HydrationBoundary` ile istemciye verir:[^1]

```tsx
// app/products/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { dehydrate, HydrationBoundary, noop } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { productQueries } from "@/features/products/queries";
import { ProductList } from "./product-list";

export default function ProductsPage() {
  return (
    <main>
      <h1>Products</h1>
      <Suspense fallback={<p>Loading products...</p>}>
        <PrefetchedProductList />
      </Suspense>
    </main>
  );
}

async function PrefetchedProductList() {
  await connection(); // istek anında çalış, build'de değil
  const queryClient = getQueryClient();

  // await yok: istek başlar, component beklemez
  void queryClient.query(productQueries.list("all")).catch(noop);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductList />
    </HydrationBoundary>
  );
}
```

```tsx
// app/products/product-list.tsx
"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { productQueries } from "@/features/products/queries";

export function ProductList() {
  const { data: products } = useSuspenseQuery(productQueries.list("all"));
  return <ul>{products.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

Sorgu henüz bitmediği için `dehydrate` onu `pending` haliyle, içindeki Promise'le birlikte gönderir. React Promise'leri Client Component'lere aktarabildiği için istemcideki `useSuspenseQuery` aynı Promise'i bekler; veri hazır olunca Next.js o `<Suspense>` sınırını akıtır.[^1] Bu davranış v5.40'tan beri var; öncesinde her prefetch'in `await` edilmesi gerekiyordu.[^1]

> [!NOTE]
>
> `useSuspenseQuery` yerine `useQuery` de Promise'i alır, ama Next.js bu durumda askıya almaz; component `pending` render edilir ve içerik sunucuda render edilmez.[^1]

`connection()` satırı Cache Components açık projeler *(`create-next-app` varsayılanı)* için gereklidir. `QueryClient` her sorguya `Date.now()` ile zaman damgası yazar; Next.js build sırasında prerender edilen bir component'te bu değeri görürse build'i durdurur. `connection()` component'in istek anında çalışacağını söyler; başlık ve fallback statik kabukta kalır, liste istekte akar *(bkz. [Cache ve render modeli](/academy/nextjs/caching-and-rendering))*.[^4]

## queryFn iki yerde çalışır

Aynı `queryOptions` hem sunucuda hem tarayıcıda çalışır. Sorgu eskidiğinde istemci `queryFn`'i kendisi çağırır. Bu yüzden `queryFn`:

- Doğrudan veritabanına giden `server-only` bir fonksiyon **olamaz**; tarayıcıda çalışmaz. Bir Route Handler'ı ya da dış API'yi çağırın *(bkz. [Route Handler ve proxy](/academy/nextjs/route-handlers-and-proxy))*.
- Server Action **olmamalı**. Doküman bunu açıkça önermez: istemciden çağrılan Server Action'lar sırayla çalışır, paralel değil. TanStack Query'nin paralel istek ve yenileme modeliyle çakışır; sorgular `pending`'de takılı kalabilir.[^1]

Server Actions mutation için uygundur. `useMutation`'ın `mutationFn`'i olarak bir Server Action verebilirsiniz.[^1]

```ts
"use client";

import { updateStock } from "@/app/actions";

useMutation({
  mutationFn: updateStock, // Server Action
  onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueries.all() }),
});
```

## Veri kimin

Sunucuda `await queryClient.query(...)` ile sonucu alıp Server Component'te göstermek caziptir. Doküman bunun bir tuzak olduğunu anlatır: istemci sorguyu yenilediğinde Client Component güncellenir, ama TanStack Query Server Component'i yenilemeyi bilmez. Ekranda aynı verinin iki farklı hali kalır.[^1]

```tsx
// ❌ Sunucudaki sayı istemcideki listeyle senkron kalmaz
const products = await queryClient.query(productQueries.list("all"));
return <p>{products.length} ürün</p>;
```

Kural: TanStack Query açısından Server Component yalnızca **prefetch** yeridir. Sonucunu sunucuda render etmeyin ya da başka bir component'e prop olarak geçmeyin.[^1] Ürün yoksa 404 vermek gibi kritik bir karar gerekiyorsa `await` edip `noop` olmadan hatayı ele alın; ama sonucu yine ekrana basmayın.[^5]

## Birden fazla sınır

`HydrationBoundary` sayfada birden fazla yerde olabilir; her Server Component kendi `QueryClient`'ını oluşturup kendi sınırını verebilir. İç içe Server Component'ler sırayla `await` ederse sunucuda şelale oluşur. `layout.tsx` ve paralel route'larda yapılan prefetch'leri Next.js paralel çalıştırır.[^1]

Tek bir istek kapsamında tek client isterseniz `React.cache(() => new QueryClient())` kullanabilirsiniz. Bedeli: her `dehydrate` çağrısı client'taki **tüm** sorguları yeniden serileştirir.[^1]

## Kendin dene

- Ürünler sayfasını yukarıdaki gibi kurun. Network sekmesinde ilk yüklemede tarayıcıdan ürün isteği gidiyor mu?
- `staleTime`'ı `0` yapın ve tekrar bakın. İstemci veriyi neden hemen yeniden istiyor?
- `await connection()` satırını silip `npm run build` çalıştırın. Hata mesajı ne diyor?
- `void` satırını silin. `ProductList` artık nereden veri getiriyor ve sayfa sunucuda neyi render ediyor?
- `queryFn`'e `server-only` bir fonksiyon verin, sonra sekmeden çıkıp dönün. Hata nerede çıkıyor?

## Detaylı öğrenmek için

- **Resmi doküman:** "Advanced Server Rendering"; Server Component'ler, streaming, veri sahipliği ve serileştirme.[^1]
- **Resmi doküman:** "Server Rendering & Hydration"; hydration API'lerinin temeli ve `await` ile `void` farkı.[^5]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "You Might Not Need React Query"; Server Component'lerle hibrit kullanım.[^2]

## Kaynaklar

1. [TanStack Query: Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr) *(doc)* — Next.js kurulumu, `pending` sorguları akıtmak, Server Action uyarısı ve veri sahipliği.
2. [TkDodo](https://tkdodo.eu/): [You Might Not Need React Query](https://tkdodo.eu/blog/you-might-not-need-react-query) *(article)* — 20 Mayıs 2023. Server Component'ler ve hibrit kullanım alanları.
3. [TanStack Query: Advanced Server Rendering, Initial setup](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr#initial-setup) *(doc)* — `environmentManager.isServer()` ile sunucu ve tarayıcıda client oluşturmak.
4. [Next.js: connection](https://nextjs.org/docs/app/api-reference/functions/connection) *(doc)* — Render'ı istek anına bırakmak ve prerender sırasında `Date.now()` gibi değişken değerler.
5. [TanStack Query: Server Rendering & Hydration](https://tanstack.com/query/latest/docs/framework/react/guides/ssr) *(doc)* — `dehydrate`, `HydrationBoundary`, kritik veri için `await` ve hata kodları.
