---
title: "Mutation ve invalidation"
description: "useMutation, invalidation, cevapla güncelleme ve callback'lerin yeri."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/mutations-and-invalidation"
---

## useMutation

Sorgular veriyi okur; sunucudaki veriyi değiştiren işlemler *(ekleme, güncelleme, silme)* için `useMutation` kullanılır.[^1] [TkDodo](https://tkdodo.eu/) farkı tek cümleyle anlatır: *`useQuery` bildirimseldir, `useMutation` emirseldir.* Sorgu kendiliğinden çalışır; mutation siz `mutate` çağırana kadar bekler.[^2]

```tsx
import { useMutation } from "@tanstack/react-query";

type StockUpdate = { productId: number; stock: number };

async function updateStock({ productId, stock }: StockUpdate): Promise<Product> {
  const response = await fetch(`/api/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stock }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

export function StockForm({ productId }: { productId: number }) {
  const mutation = useMutation({ mutationFn: updateStock });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const stock = Number(new FormData(event.currentTarget).get("stock"));
        mutation.mutate({ productId, stock });
      }}
    >
      <input name="stock" type="number" min={0} />
      <button disabled={mutation.isPending}>Kaydet</button>
      {mutation.isError && <p>Hata: {mutation.error.message}</p>}
    </form>
  );
}
```

Bir mutation `idle`, `pending`, `error` ya da `success` durumundadır. `mutate` yalnızca **tek** değişken alır; birden fazla değer için bir nesne verin. Varsayılan olarak hata alan mutation tekrar denenmez.[^1][^2]

## Mutation'dan sonra cache

Stok güncellendi ama ürün listesi hâlâ eski stoğu gösteriyor. Cache'i güncel hale getirmenin iki yolu var:[^2]

| Yol | Nasıl | Ne zaman |
| :-- | :-- | :-- |
| **Invalidation** | İlgili sorguları eski işaretle, sunucudan yeniden çek | Varsayılan tercih; sunucunun hesapladığı her şey *(sıralama, toplam)* doğru gelir |
| **Doğrudan güncelleme** | Mutation cevabını `setQueryData` ile cache'e yaz | Sunucu güncel nesneyi zaten döndürüyorsa, ek istekten kaçınmak için |

## Invalidation

`invalidateQueries`, verilen anahtarla **başlayan** tüm sorguları eski sayar:[^3][^4]

```ts
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: updateStock,
  onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: productQueries.all() }),
});
```

Invalidation her eşleşen sorguyu yeniden çekmez. Yalnızca **ekranda olan** *(active)* sorgular hemen yenilenir; diğerleri eski işaretlenir ve bir dahaki kullanımda yenilenir. Filtreli on farklı liste cache'te dursa bile yalnızca görüneni için istek gider.[^5]

Callback'ten Promise'i **döndürmek** önemlidir. Döndürürseniz mutation, yenileme bitene kadar `pending` kalır ve buton yeni veri gelene kadar devre dışı durur:[^3][^2]

```ts
// ❌ Promise kaybolur; buton yeni veri gelmeden açılır
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: productQueries.all() });
},

// ✅ Promise döner; mutation yenileme bitince biter
onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueries.all() }),
```

Daha dar hedefleme için `exact: true` ya da `predicate` kullanın.[^4] Anahtarları genelden özele kurduysanız *(bkz. [useQuery ve query key](/academy/tanstack-query/use-query-and-query-keys))* çoğu zaman ön ek yeter.

## Cevapla güncellemek

Sunucu güncellenmiş ürünü döndürüyorsa onu doğrudan detay sorgusuna yazın:[^6]

```ts
useMutation({
  mutationFn: updateStock,
  onSuccess: (updatedProduct) => {
    queryClient.setQueryData(
      productQueries.detail(updatedProduct.id).queryKey,
      updatedProduct,
    );
  },
});
```

`setQueryData`'ya verdiğiniz updater fonksiyonu eski veriyi **değiştirmemeli**, yeni bir nesne döndürmelidir. Cache'teki nesneyi yerinde değiştirmek ilk başta çalışıyor gibi görünür, sonra fark edilmesi zor hatalar çıkarır.[^6]

```ts
queryClient.setQueryData(productQueries.detail(id).queryKey, (old) =>
  old ? { ...old, stock: newStock } : old,
);
```

## Callback'ler nerede durmalı

Callback'leri hem `useMutation`'a hem `mutate`'e verebilirsiniz. Önce `useMutation`'dakiler çalışır. `mutate`'e verilenler ise component mutation bitmeden kaldırılırsa **hiç çalışmaz**.[^1][^2] TkDodo bu farkı bir kural olarak kullanır:[^2]

- **Mantık** *(invalidation, cache güncelleme)* `useMutation` callback'lerine.
- **Arayüz** *(yönlendirme, toast, formu sıfırlama)* `mutate` callback'lerine. Kullanıcı sayfadan ayrıldıysa toast göstermek zaten gereksizdir.

```ts
mutation.mutate(
  { productId, stock },
  { onSuccess: () => toast.success("Stok güncellendi") },
);
```

v5'te callback'ler son argüman olarak bir `context` nesnesi alır; içinde `client` *(QueryClient)*, `meta` ve `mutationKey` vardır. `onMutate`'in döndürdüğü değer diğer callback'lere `onMutateResult` olarak gelir.[^1]

## mutate mı, mutateAsync mı

`mutate` hiçbir şey döndürmez ve hatayı kendisi yakalar. `mutateAsync` bir Promise döndürür; hatayı siz yakalamazsanız *unhandled promise rejection* alırsınız. TkDodo'nun önerisi neredeyse her zaman `mutate`; `mutateAsync`'i yalnızca birden fazla mutation'ı aynı anda bekleyecekseniz kullanın.[^2]

## Her mutation'dan sonra invalidation

Her `useMutation`'a ayrı invalidation yazmak yerine `MutationCache`'e tek bir global callback verebilirsiniz. `MutationCache` callback'leri `useMutation`'dakilerden önce çalışır:[^5]

```ts
import { MutationCache, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  }),
});
```

Burada Promise döndürülmüyor; mutation, yenilemeleri beklemeden biter. Belirli bir yenilemeyi beklemek istediğiniz mutation'da `useMutation`'ın kendi `onSuccess`'inden o invalidation'ı döndürün.[^5]

Abartı gibi görünür ama invalidation yalnızca ekrandaki sorguları yeniden çektiği için çoğu uygulamada iyi bir dengedir. Kapsamı daraltmak için mutation'ın `mutationKey`'ini ya da `meta` alanını kullanabilirsiniz.[^5]

Mutation ayarlarını `queryOptions` gibi paylaşmak için `mutationOptions` var:[^7]

```ts
export const updateStockOptions = () =>
  mutationOptions({ mutationKey: ["products", "update-stock"], mutationFn: updateStock });
```

## Kendin dene

- Stok formunu kurun ve kaydettikten sonra listenin güncellenmediğini görün. `invalidateQueries` ekleyin.
- `onSuccess`'te Promise'i döndürmeyin ve butonun ne zaman tekrar aktif olduğuna bakın. Sonra döndürün.
- Invalidation yerine `setQueryData` kullanın. Network sekmesinde kaç istek görüyorsunuz?
- `mutate`'e bir `onSuccess` verin, mutation sürerken component'i kaldırın. Callback çalışıyor mu?

## Detaylı öğrenmek için

- **Yazı:** [TkDodo](https://tkdodo.eu/), "Mastering Mutations in React Query"; invalidation ve doğrudan güncelleme, callback'lerin yeri ve sık hatalar.[^2]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "Automatic Query Invalidation after Mutations"; global callback, `mutationKey` ve `meta` ile hedefleme.[^5]
- **Resmi doküman:** "Mutations"; durumlar, callback sırası, `scope` ile sıralı mutation ve offline mutation.[^1]

## Kaynaklar

1. [TanStack Query: Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) *(doc)* — `useMutation`, durumlar, callback'lerin imzası ve sırası, `mutateAsync` ve retry.
2. [TkDodo](https://tkdodo.eu/): [Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query) *(article)* — 9 Ekim 2021. Bildirimsel ve emirsel fark, Promise döndürmek, `mutate` ile `mutateAsync`.
3. [TanStack Query: Invalidations from Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations) *(doc)* — `onSuccess`'te invalidation ve Promise döndürmenin etkisi.
4. [TanStack Query: Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation) *(doc)* — Ön ek eşleşmesi, `exact` ve `predicate`.
5. [TkDodo](https://tkdodo.eu/): [Automatic Query Invalidation after Mutations](https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations) *(article)* — 25 Mayıs 2024. `MutationCache` callback'leri ve invalidation'ın yalnızca aktif sorguları yenilemesi.
6. [TanStack Query: Updates from Mutation Responses](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses) *(doc)* — `setQueryData` ile cevabı cache'e yazmak ve immutability.
7. [TanStack Query: TypeScript](https://tanstack.com/query/latest/docs/framework/react/typescript#typing-mutation-options) *(doc)* — `mutationOptions` ile mutation ayarlarını paylaşmak.
