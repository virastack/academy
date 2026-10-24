---
title: "queryOptions ve select"
description: "Query factory, tipli cache okuma ve veriyi seçerek render'ı azaltmak."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/query-options-and-select"
---

## Custom hook neden yetmez

Bir sorguyu birden fazla yerde kullanınca ilk akla gelen bir custom hook yazmaktır:

```ts
export function useProduct(id: number) {
  return useQuery({
    queryKey: ["products", "detail", id],
    queryFn: () => fetchProduct(id),
  });
}
```

[TkDodo](https://tkdodo.eu/) yıllarca bu kalıbı önerdi, sonra vazgeçti. Gerekçeleri:[^1]

- Hook yalnızca component'te ya da başka bir hook'ta çağrılır. Oysa aynı sorguya event handler'da prefetch için, route loader'da ya da sunucuda da ihtiyaç duyarsınız.
- Burada paylaşılan şey mantık değil, **ayar**dır. Hook bunun için gereğinden ağır bir araç.
- Hook sizi `useQuery`'ye bağlar. Aynı sorguyu `useSuspenseQuery` ya da `useQueries` ile kullanmak istediğinizde işe yaramaz.

## queryOptions

v5 ile gelen `queryOptions` çalışma anında hiçbir şey yapmaz; aldığı nesneyi geri döndürür. Değeri tip tarafındadır:[^2][^3]

```ts
// src/features/products/queries.ts
import { queryOptions } from "@tanstack/react-query";

export function productOptions(id: number) {
  return queryOptions({
    queryKey: ["products", "detail", id],
    queryFn: () => fetchProduct(id),
    staleTime: 30 * 1000,
  });
}
```

Aynı ayar her yerde çalışır:[^2]

```ts
useQuery(productOptions(1));
useSuspenseQuery(productOptions(2));
useQueries({ queries: [productOptions(1), productOptions(2)] });
queryClient.query(productOptions(3));
queryClient.setQueryData(productOptions(4).queryKey, updatedProduct);
```

`queryKey` ile `queryFn` artık yan yana durur. TkDodo'nun deyişiyle *"query key'i query function'dan ayırmak bir hataydı"*: anahtar, fonksiyonun bağımlılıklarını tanımlar; ikisi ayrı dosyalarda durunca senkron kalmaları zorlaşır.[^3] `prefer-query-options` lint kuralı bu kalıbı zorunlu kılar.[^4]

## Query factory

Anahtar hiyerarşisini ve `queryOptions`'ı tek bir nesnede birleştirin. Yalnızca anahtar dönen girişler toplu invalidation için, `queryOptions` dönenler sorgu için:[^3]

```ts
export const productQueries = {
  all: () => ["products"] as const,
  lists: () => [...productQueries.all(), "list"] as const,
  list: (category: string) =>
    queryOptions({
      queryKey: [...productQueries.lists(), category],
      queryFn: () => fetchProducts(category),
    }),
  details: () => [...productQueries.all(), "detail"] as const,
  detail: (id: number) =>
    queryOptions({
      queryKey: [...productQueries.details(), id],
      queryFn: () => fetchProduct(id),
      staleTime: 30 * 1000,
    }),
};
```

```ts
useQuery(productQueries.detail(id));
queryClient.invalidateQueries({ queryKey: productQueries.lists() });
```

Factory'yi özelliğin klasöründe tutun *(ör. `features/products/queries.ts`)*. Klasör yapısı için [Klasör yapısı](/academy/architecture/folder-structure) dersine bakın.

## Kullanıldığı yerde eklemek

Paylaşılan ayara parametre eklemeye başlarsanız custom hook'taki soruna geri dönersiniz. TkDodo'nun kuralı: *en iyi soyutlamalar ayarlanabilir olmayanlardır*. Ortak ayar sabit kalır, ek ayarları kullanıldığı yerde üstüne yazarsınız:[^1]

```ts
const { data: productName } = useQuery({
  ...productQueries.detail(id),
  select: (product) => product.name,
});
//      ^? string | undefined
```

Tip çıkarımı bozulmaz; `data`'nın tipi `select`'in dönüşüne göre değişir.[^1]

## Tipli cache okuma

`queryClient.getQueryData(["products", "detail", 1])` normalde `unknown` döner; kütüphane o anahtarın arkasında ne olduğunu bilemez. `queryOptions`'tan gelen anahtar ise `queryFn`'in dönüş tipiyle **etiketlenir**:[^3][^5]

```ts
const product = queryClient.getQueryData(productQueries.detail(1).queryKey);
//    ^? Product | undefined
```

`fetchProduct`'ın dönüş tipini değiştirdiğinizde bu satır da derleyicide hata verir; elle yazdığınız `getQueryData<Product>` vermezdi.[^3]

> [!TIP]
>
> Tip çıkarımının çalışması için `useQuery`'ye generic vermeyin. `queryFn`'in dönüş tipini doğru yazın, gerisini kütüphane çıkarır. `axios` gibi `any` döndüren istemcileri tipli bir fonksiyona sarın.[^5][^6]

## select ile seçmek

`select`, cache'teki verinin bir parçasını ya da dönüştürülmüş halini döndürür. Cache'te tam cevap durur; component yalnızca `select`'in sonucuna abone olur ve **yalnızca o sonuç değişince** yeniden render edilir:[^7][^8]

```ts
const selectStockCount = (products: Product[]) =>
  products.filter((product) => product.stock > 0).length;

function StockBadge({ category }: { category: string }) {
  const { data: count } = useQuery({
    ...productQueries.list(category),
    select: selectStockCount,
  });
  return <span>{count} ürün stokta</span>;
}
```

`select` iki durumda yeniden çalışır: veri değişince ya da `select` fonksiyonunun referansı değişince. Satır içinde yazılan fonksiyon her render'da yenidir. Pahalı bir dönüşümse fonksiyonu component dışına çıkarın ya da props'a bağlıysa `useCallback` ile sarın.[^7][^8]

> [!WARNING]
>
> `select` içinde hata fırlatmayın. `select` yalnızca başarılı veriyle çalışır; hata durumu `queryFn`'in işidir.[^7]

Render sayısını azaltan iki optimizasyon daha kendiliğinden açıktır: **structural sharing** değişmeyen veri parçalarının referansını korur, **izlenen property'ler** ise yalnızca kullandığınız alanlar *(`data`, `isFetching` vb.)* değişince render tetikler. İkincisini `const { data, ...rest } = useQuery()` gibi rest destructuring bozar.[^7]

## Kendin dene

- Projenizdeki bir custom hook'u `queryOptions`'a çevirin ve aynı ayarı hem `useQuery` hem `queryClient.getQueryData` ile kullanın.
- `getQueryData`'ya `queryOptions`'tan gelen anahtarı verin ve dönüş tipine bakın. Sonra anahtarı elle yazın; tip ne oluyor?
- Bir ürün listesinde yalnızca stoktaki ürün sayısını gösteren bir rozet yazın. React DevTools Profiler ile bir ürünün adı değiştiğinde rozetin render edilip edilmediğine bakın.

## Detaylı öğrenmek için

- **Yazı:** [TkDodo](https://tkdodo.eu/), "Creating Query Abstractions"; custom hook'tan `queryOptions`'a geçişin gerekçesi.[^1]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "The Query Options API"; `DataTag`, query factory ve anahtar ile fonksiyonu birlikte tutmak.[^3]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "React Query Selectors, Supercharged"; `select`'i tiplemek ve pahalı dönüşümleri memoize etmek.[^8]

## Kaynaklar

1. [TkDodo](https://tkdodo.eu/): [Creating Query Abstractions](https://tkdodo.eu/blog/creating-query-abstractions) *(article)* — 23 Şubat 2026. Custom hook'ların sınırları ve `queryOptions`'ı kullanıldığı yerde genişletmek.
2. [TanStack Query: Query Options](https://tanstack.com/query/latest/docs/framework/react/guides/query-options) *(doc)* — `queryOptions`'ı farklı hook'larda ve `QueryClient` metotlarında paylaşmak.
3. [TkDodo](https://tkdodo.eu/): [The Query Options API](https://tkdodo.eu/blog/the-query-options-api) *(article)* — 17 Ocak 2024. `DataTag`, query factory ve anahtar ile fonksiyonu birlikte tutmak.
4. [TanStack Query: prefer-query-options](https://tanstack.com/query/latest/docs/eslint/prefer-query-options) *(doc)* — `queryKey` ve `queryFn`'i `queryOptions` ile birlikte tanımlamaya zorlayan kural.
5. [TanStack Query: TypeScript](https://tanstack.com/query/latest/docs/framework/react/typescript) *(doc)* — Tip çıkarımı, `queryOptions` ile tipli `getQueryData` ve global hata tipi.
6. [TkDodo](https://tkdodo.eu/): [React Query and TypeScript](https://tkdodo.eu/blog/react-query-and-type-script) *(article)* — 16 Mayıs 2021. Generic vermek yerine çıkarıma güvenmek.
7. [TanStack Query: Render Optimizations](https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations) *(doc)* — Structural sharing, izlenen property'ler ve `select`'in memoization kuralları.
8. [TkDodo](https://tkdodo.eu/): [React Query Selectors, Supercharged](https://tkdodo.eu/blog/react-query-selectors-supercharged) *(article)* — 4 Ağustos 2025. İnce taneli abonelik ve `select`'i stabil tutmak.
