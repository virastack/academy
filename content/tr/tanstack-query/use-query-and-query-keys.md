---
title: "useQuery ve query key"
description: "Sorgu yazma, status ile fetchStatus farkı, query key'i bağımlılık dizisi gibi kurma ve isteği iptal etme."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/use-query-and-query-keys"
---

## İlk Sorgu

`useQuery` en az iki şey ister: veriyi tanımlayan bir **query key** ve veriyi getiren bir **query function**:[^1]

```tsx
import { useQuery } from "@tanstack/react-query";

type Product = { id: number; name: string; price: number };

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("/api/products");
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

export function ProductList() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  if (isPending) return <p>Yükleniyor...</p>;
  if (isError) return <p>Hata: {error.message}</p>;

  return <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

`isPending` ve `isError` kontrolünden sonra TypeScript `data`'nın tanımlı olduğunu bilir; `data!` yazmanız gerekmez.[^1][^2]

Query function'ın iki kuralı var:[^3]

- **Hata fırlatmalı.** Kütüphane hatayı yalnızca fırlatılan ya da reddedilen bir Promise'ten anlar. `fetch` 404 ya da 500 cevabında hata fırlatmaz; `response.ok`'u kendiniz kontrol edin.
- **`undefined` döndürmemeli.** `undefined` dönen sorgu başarısız sayılır. "Veri yok" demek istiyorsanız `null` döndürün.

## status ve fetchStatus

Sonuç nesnesinde iki ayrı durum var. `status` **veriyle** ilgilidir: elinizde veri var mı? `fetchStatus` **query function'la** ilgilidir: şu an çalışıyor mu?[^1]

| Alan | Değerler | Soru |
| :-- | :-- | :-- |
| `status` | `pending`, `error`, `success` | Veri var mı, hata mı oldu? |
| `fetchStatus` | `fetching`, `paused`, `idle` | İstek şu an sürüyor mu? |

İkisi bağımsızdır. `success` durumundaki bir sorgu arka planda yenilenirken `fetching` olur. Veri bekleyen bir sorgu internet yoksa `pending` ama `paused` kalır.[^1] Türetilmiş bayraklar bu ikisinden gelir:

| Bayrak | Ne zaman `true` | Ne için |
| :-- | :-- | :-- |
| `isPending` | Henüz veri yok | İlk iskelet |
| `isFetching` | Herhangi bir istek sürüyor, arka plan dahil | Köşedeki küçük yükleniyor göstergesi |
| `isLoading` | `isPending && isFetching`; ilk istek sürüyor | Koşullu çalışan sorgular *(bkz. [Bağımlı ve paralel sorgular](/academy/tanstack-query/dependent-and-parallel-queries))* |

[TkDodo](https://tkdodo.eu/), kontrol sırasının önemli olduğunu hatırlatır. Arka plandaki bir yenileme başarısız olursa sorgu hem `error` durumundadır hem de eski veriyi taşır. Önce hatayı kontrol ederseniz kullanıcının baktığı liste, birkaç saniyelik tekrar denemeden sonra bir hata ekranına dönüşür. Bu yüzden çoğu ekranda önce veriye bakmayı önerir:[^4]

```tsx
if (data) return <ProductTable products={data} />;
if (error) return <p>Hata: {error.message}</p>;
return <p>Yükleniyor...</p>;
```

Hangi sıranın doğru olduğu ekrana bağlıdır. Önemli olan, `error`'un "veri yok" demek olmadığını bilmektir.

## Query Key Bir Bağımlılık Dizisidir

Cache, query key'e göre tutulur. Anahtar bir dizidir ve `JSON.stringify` ile serileştirilebilen her şeyi içerebilir.[^5] Query function'ın kullandığı ve değişebilen her değişken anahtara girmelidir:[^5]

```tsx
function ProductList({ category }: { category: string }) {
  const { data } = useQuery({
    queryKey: ["products", category],
    queryFn: () => fetchProducts(category),
  });
  // ...
}
```

`category` değişince anahtar değişir, kütüphane bunu yeni bir cache girdisi olarak görür ve veriyi getirir. Eski kategoriye dönerseniz veri cache'ten anında gelir.[^5] TkDodo bunu `useEffect`'in bağımlılık dizisine benzetir: anahtar, sorgunun neye bağlı olduğunu söyler.[^6] Bir değişkeni anahtara eklemeyi unutursanız `exhaustive-deps` lint kuralı uyarır.[^5]

Anahtarlar deterministik olarak hash'lenir. Nesnelerin içindeki sıra önemsizdir, dizideki sıra önemlidir:[^5]

```ts
// Aynı sorgu
["products", { page: 1, sort: "price" }]
["products", { sort: "price", page: 1 }]

// Farklı sorgular
["products", 1, "price"]
["products", "price", 1]
```

> [!DONT]
>
> - `refetch`'e parametre vermeye çalışmak. `refetch` argüman almaz. Filtre değiştiğinde yapılacak şey, filtreyi bir state'e ya da URL'ye yazıp anahtara eklemektir. TkDodo'nun deyişiyle "butona basınca yeniden çek" düşüncesinden "bu state'e uyan veriyi istiyorum" düşüncesine geçersiniz.[^7]

## Anahtarları Düzenlemek

Anahtarları **genelden özele** kurun. Böylece tek bir ön ekle ilgili tüm sorguları hedefleyebilirsiniz:[^8]

```ts
["products"]                                 // ürünlerle ilgili her şey
["products", "list", { category: "shoes" }]  // bir liste
["products", "detail", 42]                   // bir ürün
```

`invalidateQueries({ queryKey: ["products"] })` hepsini, `["products", "list"]` yalnızca listeleri hedefler. Anahtarı her yerde elle yazmak hataya açıktır; tek bir yerde üretmek için [queryOptions ve select](/academy/tanstack-query/query-options-and-select) dersine geçin.

## İsteği İptal Etmek

Query function bir `signal` alır. Bunu `fetch`'e verirseniz anahtar değiştiğinde ya da component kaldırıldığında artık gerekmeyen istek iptal edilir:[^9][^10]

```ts
useQuery({
  queryKey: ["products", category],
  queryFn: async ({ signal }) => {
    const response = await fetch(`/api/products?category=${category}`, { signal });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json() as Promise<Product[]>;
  },
});
```

`signal`'ı kullanmazsanız istek iptal edilmez; tamamlanır ve sonucu cache'e yazılır. Component tekrar açılınca veri hazır olduğu için bu da çoğu zaman işe yarar.[^9]

Query function'a gelen bağlam nesnesi `signal`'ın yanında `queryKey`, `client` ve `meta`'yı da taşır.[^3]

## Kendin Dene

- Bir kategori listesi ve ürün listesi kurun. Kategori değiştirip geri dönün; Devtools'ta kaç cache girdisi görüyorsunuz?
- Anahtardan `category`'yi çıkarın. Ekranda ne değişiyor, lint kuralı ne diyor?
- `queryFn`'e `signal` ekleyin ve Network sekmesinde kategoriyi hızlı değiştirin. İptal edilen istekleri görüyor musunuz?
- `if (error)` kontrolünü `if (data)`'nın önüne alın, sonra API'yi ikinci istekte hata verecek şekilde değiştirip sekmeye geri dönün.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** "Queries", "Query Keys" ve "Query Functions" sayfaları; durumlar, anahtar kuralları ve bağlam nesnesi.[^1][^5][^3]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "Effective React Query Keys"; anahtar yapısı ve hiyerarşi.[^8]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "Status Checks in React Query"; arka plan hatalarında neden önce veriye bakmak gerekir.[^4]

## Kaynaklar

1. [TanStack Query: Queries](https://tanstack.com/query/latest/docs/framework/react/guides/queries) *(doc)* — `useQuery`, `status` ve `fetchStatus` ayrımı.
2. [TanStack Query: TypeScript](https://tanstack.com/query/latest/docs/framework/react/typescript) *(doc)* — Sonuç tipinin `status` ile daraltılması.
3. [TanStack Query: Query Functions](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions) *(doc)* — Hata fırlatma, `fetch` ile kullanım, `undefined` kuralı ve `QueryFunctionContext`.
4. [TkDodo](https://tkdodo.eu/): [Status Checks in React Query](https://tkdodo.eu/blog/status-checks-in-react-query) *(article)* — 27 Mart 2021. Arka plan hataları ve önce veriyi kontrol etmek.
5. [TanStack Query: Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) *(doc)* — Dizi anahtarlar, deterministik hash ve değişkenleri anahtara eklemek.
6. [TkDodo](https://tkdodo.eu/): [Practical React Query](https://tkdodo.eu/blog/practical-react-query) *(article)* — 16 Kasım 2020. Query key'i bağımlılık dizisi gibi düşünmek.
7. [TkDodo](https://tkdodo.eu/): [React Query - The Bad Parts](https://tkdodo.eu/blog/react-query-the-bad-parts) *(video)* — React Day Berlin, Aralık 2024. `refetch`'in neden parametre almadığı ve bildirimsel düşünce.
8. [TkDodo](https://tkdodo.eu/): [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys) *(article)* — 13 Haziran 2021. Genelden özele anahtar yapısı ve query key factory.
9. [TanStack Query: Query Cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation) *(doc)* — `AbortSignal` ile istek iptali.
10. [TkDodo](https://tkdodo.eu/): [Why You Want React Query](https://tkdodo.eu/blog/why-you-want-react-query) *(article)* — 7 Kasım 2023. `signal`'ı `fetch`'e vererek iptal.
