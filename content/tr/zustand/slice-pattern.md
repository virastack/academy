---
title: "Slice pattern"
description: "Büyüyen store'u bölmek: birden fazla küçük store ya da slice'lardan oluşan tek store, TypeScript'te StateCreator ve middleware'in yeri."
lastVerified: "2026-10-21"
translationKey: "zustand/slice-pattern"
---

## Store Büyüdüğünde İki Yol

Sepet, kullanıcı tercihleri ve arayüz durumu aynı store'da biriktikçe dosya uzar. Zustand'da bunu bölmenin iki yolu var:

| Yol | Nasıl | Kim önerir |
| :-- | :-- | :-- |
| **Birden fazla küçük store** | Her özellik kendi `create` çağrısına sahip | [TkDodo](https://tkdodo.eu/)[^1] |
| **Slice'lardan oluşan tek store** | Parçalar ayrı dosyalarda, tek `create`'te birleşir | Zustand dokümanı[^2][^3] |

İkisi de geçerli. Seçimi şu soru belirler: parçalar **birbirini değiştiriyor mu?**

## Birden Fazla Küçük Store

TkDodo, Redux'ın aksine Zustand'ın küçük ve çok sayıda store'u teşvik ettiğini söyler. Her store tek bir işten sorumludur. Birleştirmeniz gerekirse custom hook kullanırsınız:[^1]

```ts
const EMPTY: number[] = [];

export const useMyFavorites = () => {
  const userId = useSessionStore((state) => state.userId);
  return useFavoritesStore((state) =>
    userId === null ? EMPTY : (state.byUser[userId] ?? EMPTY),
  );
};
```

`EMPTY` sabiti bilinçlidir; selector içinde `[]` yazmak her seferinde yeni bir dizi üretir *(bkz. [Selector ve yeniden render](/academy/zustand/selectors-and-rerenders))*.

TkDodo slice'lara hiç ihtiyaç duymadığını, özellikle TypeScript'le pek kolay görünmediğini yazar.[^1] Store'lar birbirinden bağımsızsa bu yol daha az kod demektir.

## Slice'lardan Oluşan Tek Store

Bir action birden fazla parçayı değiştiriyorsa *(sepete ekleyince sepet çekmecesini de açmak)* tek store daha uygundur. Doküman global state'i tek store'da tutmayı ve büyüyünce slice'lara bölmeyi önerir.[^3]

Her slice, store'un bir parçasını döndüren bir fonksiyondur. TypeScript'te tipi `StateCreator`'dır; ilk tip parametresi **tüm** store, sonuncusu slice'ın kendisidir:[^4]

```ts
// src/features/shop/cart-slice.ts
import type { StateCreator } from "zustand";

export type CartSlice = {
  items: CartItem[];
  addItem: (product: Product) => void;
  clearCart: () => void;
};

export const createCartSlice: StateCreator<ShopState, [], [], CartSlice> = (set) => ({
  items: [],
  addItem: (product) =>
    set((state) => ({ items: [...state.items, { ...product, quantity: 1 }] })),
  clearCart: () => set({ items: [] }),
});
```

```ts
// src/features/shop/ui-slice.ts
export type UiSlice = {
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

export const createUiSlice: StateCreator<ShopState, [], [], UiSlice> = (set) => ({
  isCartOpen: false,
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
});
```

Birden fazla slice'ı ilgilendiren action'ı ayrı bir slice'a koyun. `get` tüm store'u görür; diğer slice'ların action'larını çağırabilir:[^2][^4]

```ts
// src/features/shop/shared-slice.ts
export type SharedSlice = {
  addToCart: (product: Product) => void;
};

export const createSharedSlice: StateCreator<ShopState, [], [], SharedSlice> = (_set, get) => ({
  addToCart: (product) => {
    get().addItem(product);
    get().openCart();
  },
});
```

Hepsini tek `create`'te birleştirin. `(...a)`, `set`, `get` ve `store`'u her slice'a aynen iletir:[^2]

```ts
// src/features/shop/shop-store.ts
import { create } from "zustand";

export type ShopState = CartSlice & UiSlice & SharedSlice;

export const useShopStore = create<ShopState>()((...a) => ({
  ...createCartSlice(...a),
  ...createUiSlice(...a),
  ...createSharedSlice(...a),
}));
```

> [!WARNING]
>
> Slice'lar aynı nesneye yayıldığı için alan adları çakışmamalı. İki slice'ta da `actions` ya da `reset` varsa sonraki öncekini ezer. [Action ve güncelleme](/academy/zustand/actions-and-updates) dersindeki `actions` nesnesini slice'larla kullanacaksanız `cartActions`, `uiActions` gibi ayrı adlar verin.

## Middleware Nereye

Middleware'i yalnızca **birleşmiş** store'a uygulayın. Bir slice'ın içine `persist` ya da `devtools` koymak beklenmedik sonuçlar doğurur:[^2]

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useShopStore = create<ShopState>()(
  persist(
    (...a) => ({
      ...createCartSlice(...a),
      ...createUiSlice(...a),
      ...createSharedSlice(...a),
    }),
    { name: "shop", partialize: (state) => ({ items: state.items }) },
  ),
);
```

Middleware eklediğinizde slice'ların `set` tipini de güncelleyin. `StateCreator`'ın ikinci parametresi, dıştan içe uygulanan middleware'lerin listesidir. Örneğin `devtools(persist(...))` için:[^4]

```ts
type Mutators = [["zustand/devtools", never], ["zustand/persist", unknown]];

export const createCartSlice: StateCreator<ShopState, Mutators, [], CartSlice> = (set) => ({
  // set artık üçüncü argüman olarak devtools'ta görünecek action adını alır
  clearCart: () => set({ items: [] }, undefined, "cart/clearCart"),
  // ...
});
```

`persist` ve `devtools` ayrıntısı bir sonraki derste.

## Kendin Dene

- Sepet ve arayüz durumunu önce iki ayrı store olarak yazın. "Sepete ekleyince çekmeceyi aç" davranışını nereye koymanız gerekiyor?
- Aynısını slice'larla yazın ve `addToCart`'ı ortak bir slice'a koyun.
- İki slice'a da `reset` adlı bir action verin. Hangisi çalışıyor?

## Detaylı Öğrenmek İçin

- **Resmi doküman:** "Slices Pattern"; slice'ları birleştirmek, birden fazla slice'ı güncellemek ve middleware.[^2]
- **Resmi doküman:** "Advanced TypeScript Guide", "Slices pattern" bölümü; `StateCreator` ve mutator listesi.[^4]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "Working with Zustand"; küçük store'lar ve custom hook ile birleştirmek.[^1]

## Kaynaklar

1. [TkDodo](https://tkdodo.eu/): [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) *(article)* — 20 Kasım 2022. Store'u küçük tutmak, store'ları custom hook ile birleştirmek ve slice'lar hakkındaki görüşü.
2. [Zustand: Slices Pattern](https://zustand.docs.pmnd.rs/learn/guides/slices-pattern) *(doc)* — Slice'ları birleştirmek, birden fazla slice'ı güncellemek ve middleware'i yalnızca birleşik store'a uygulamak.
3. [Zustand: Flux inspired practice](https://zustand.docs.pmnd.rs/learn/guides/flux-inspired-practice) *(doc)* — Tek store önerisi ve büyük uygulamada slice'lara bölmek.
4. [Zustand: Advanced TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript#slices-pattern) *(doc)* — `StateCreator` ile tipli slice'lar ve middleware mutator listesi.
