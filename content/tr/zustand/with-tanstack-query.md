---
title: "TanStack Query ile birlikte kullanım"
description: "Sunucu verisini TanStack Query'de, client state'i Zustand'da tutmak, store'daki filtreyle sorguyu sürmek ve state'i senkronlamak yerine türetmek."
lastVerified: "2026-10-21"
translationKey: "zustand/with-tanstack-query"
---

## Görev Paylaşımı

İki kütüphane farklı işler yapar ve birbirinin yerine geçmez:[^1][^2]

| Veri | Örnek | Nerede |
| :-- | :-- | :-- |
| Sunucunun sahibi olduğu veri | Ürünler, stok, sipariş | [!tanstack-query] |
| Yalnızca tarayıcıda yaşayan veri | Seçili filtreler, sepet çekmecesi, seçili satır | [!zustand] |

Kural basit: sunucudan gelen veriyi store'a **kopyalamayın**. Kopya, sunucudaki veri değiştiğinde eskir; yükleme, hata ve yenileme durumlarını elle yazmak zorunda kalırsınız.[^2] Bu derste ikisini birleştirmenin iki kalıbı var.

## Store Sorguyu Sürer

Filtreler client state'tir; ürün listesi server state. Filtreyi store'da tutup **query key'e** koyduğunuzda, filtre değiştiği anda sorgu kendiliğinden yeniden çalışır. [TkDodo](https://tkdodo.eu/) iki hook'u bir custom hook'ta birleştirir:[^3]

```ts
// src/features/products/filter-store.ts
import { create } from "zustand";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { productQueries } from "./queries";

type FilterState = {
  category: string;
  search: string;
  actions: {
    setCategory: (category: string) => void;
    setSearch: (search: string) => void;
  };
};

const useFilterStore = create<FilterState>()((set) => ({
  category: "all",
  search: "",
  actions: {
    setCategory: (category) => set({ category }),
    setSearch: (search) => set({ search }),
  },
}));

export const useCategory = () => useFilterStore((state) => state.category);
export const useSearch = () => useFilterStore((state) => state.search);
export const useFilterActions = () => useFilterStore((state) => state.actions);

export function useFilteredProducts() {
  const category = useCategory();
  const search = useSearch();
  return useQuery({
    ...productQueries.list({ category, search }),
    placeholderData: keepPreviousData,
  });
}
```

Filtre paneli `setCategory`'yi çağırır; ürün listesi `useFilteredProducts`'ı kullanır. İkisi birbirini tanımaz. TkDodo bunu bildirimsel ve sihirsiz bulur: `addFilter` arayüzün herhangi bir yerinden çağrılabilir ve sorgu otomatik tetiklenir.[^3] `keepPreviousData` filtre değişirken eski listeyi ekranda tutar *(bkz. [Sayfalama ve sonsuz liste](/academy/tanstack-query/pagination-and-infinite-lists))*.

> [!TIP]
>
> Filtrenin paylaşılabilir bir linkte ya da geri butonunda korunması gerekiyorsa store yerine URL'de tutun. Kalıp aynı kalır: URL'den okunan değer query key'e girer.[^4]

## Senkronlama Değil, Türetme

Sık görülen bir sorun: store'da seçili kullanıcının `id`'si duruyor, ama kullanıcı sunucudan silinmiş. İlk akla gelen, sorgu sonucu değişince store'u bir `useEffect` ile düzeltmektir:[^5]

```ts
// ❌ Elle senkronlama
const { data: users } = useQuery(userQueries.list());
const selectedUserId = useSelectedUserId();
const { selectUser } = useUserActions();

useEffect(() => {
  if (!users?.some((u) => u.id === selectedUserId)) {
    selectUser(null);
  }
}, [users, selectedUserId, selectUser]);
```

TkDodo burada farklı bir soru sorar: "Kullanıcılar ve seçim şu; gerçek seçim hangisi?" Store'a dokunmadan, seçimi her render'da **türetin**:[^5]

```ts
// ✅ Türetme
export function useSelectedUser() {
  const { data: users } = useQuery(userQueries.list());
  const selectedUserId = useSelectedUserId();

  return users?.find((u) => u.id === selectedUserId) ?? null;
}
```

Bunun ek faydaları var:[^5]

- Ekstra render ve `useEffect` yok.
- Kullanıcı listeye geri eklenirse seçim kendiliğinden geri gelir; store'daki değer hiç silinmedi.
- Arayüz kararı değişirse *(seçimi silmek yerine "geçersiz" göstermek)* yalnızca bu hook değişir.

Bedeli: store'daki `selectedUserId`'ye artık doğrudan güvenemezsiniz; her yerde custom hook'u kullanmalısınız. TkDodo bunu sorun saymaz: store, arayüzde **ne seçildiğinin** kaydıdır; doğrulanmış son değer değil.[^5]

Aynı fikir sunucudan gelen varsayılan değerler için de geçerlidir. Sorgu gelince `useEffect` ile ilk kaydı seçmek yerine, kullanıcı henüz bir şey seçmediyse ilk kaydı gösterin:[^5]

```ts
const selection = useSelectedProductId();
const { data: products } = useQuery(productQueries.list(filters));

const activeId = selection ?? products?.[0]?.id;
```

Bu yaklaşım Zustand'a özel değildir; `useState` ya da URL state'i için de aynı şekilde çalışır.[^5] Genel ilke React dokümanında da var: hesaplanabilen bir değer için Effect yazmayın.[^6]

## Sepet Örneği

Sepeti store'da saklamak mantıklıdır; kullanıcının seçimidir ve sunucuda henüz yoktur. Ama stok sunucunun verisidir. Sepetteki ürünün stoğu azaldıysa uyarıyı store'u güncelleyerek değil, iki kaynağı birleştirerek gösterin:

```tsx
function CartLine({ id }: { id: number }) {
  const item = useCartItem(id); // Zustand: kullanıcının seçtiği adet
  const { data: product } = useQuery(productQueries.detail(id)); // TanStack Query: güncel stok

  if (!item) return null;
  const overStock = product !== undefined && item.quantity > product.stock;

  return (
    <li>
      {item.name} × {item.quantity}
      {overStock && <p role="alert">Stokta yalnızca {product.stock} adet var.</p>}
    </li>
  );
}
```

Kullanıcı adedi azaltınca ya da stok sunucuda artınca uyarı kendiliğinden kaybolur.

## Kendin Dene

- Ürün listesini önce kategori `useState`'te, sonra Zustand store'unda olacak şekilde yazın. Filtre paneli ile liste farklı component'lerdeyse hangisi daha az prop geçirir?
- Seçili kullanıcıyı `useEffect` ile senkronlayın, sonra türeterek yazın. Kullanıcıyı sahte API'den silip geri ekleyin; iki versiyonda seçime ne oluyor?
- Sepetteki bir ürünün stoğunu sahte API'de düşürün ve `invalidateQueries` çağırın. Uyarı görünüyor mu?

## Detaylı Öğrenmek İçin

- **Yazı:** [TkDodo](https://tkdodo.eu/), "Deriving Client State from Server State"; senkronlama yerine türetme ve varsayılan değerler.[^5]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "Working with Zustand"; store'u `useQuery` ile custom hook'ta birleştirmek.[^3]
- **Resmi doküman:** TanStack Query, "Does TanStack Query replace Redux, MobX or other global state managers?".[^2]

## Kaynaklar

1. [Kent C. Dodds](https://kentcdodds.com/): [Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react) *(article)* — 2020. Server cache ile UI state'i ayırmak.
2. [TanStack Query: Does TanStack Query replace Redux, MobX or other global state managers?](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) *(doc)* — Server state taşındıktan sonra global store'da kalan client state.
3. [TkDodo](https://tkdodo.eu/): [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) *(article)* — 20 Kasım 2022. Store'daki filtreyle sorguyu sürmek ve custom hook ile birleştirmek.
4. [TkDodo](https://tkdodo.eu/): [React Query - The Bad Parts](https://tkdodo.eu/blog/react-query-the-bad-parts) *(video)* — React Day Berlin, Aralık 2024. Filtreyi URL'de tutup anahtara bağlamak.
5. [TkDodo](https://tkdodo.eu/): [Deriving Client State from Server State](https://tkdodo.eu/blog/deriving-client-state-from-server-state) *(article)* — 1 Eylül 2025. `useEffect` ile senkronlamak yerine türetmek, ödünleşimi ve varsayılan değer örneği.
6. [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) *(doc)* — Hesaplanabilen değer için Effect yazmamak.
