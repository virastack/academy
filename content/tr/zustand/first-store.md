---
title: "İlk store"
description: "create, set, get ve store'a React dışından erişmek."
lastVerified: "2026-10-21"
translationKey: "zustand/first-store"
---

## Kurulum

[React](/academy/react/setup-and-tooling) rehberindeki gibi bir [!vite] projesi açın ve paketi ekleyin:[^1]

```command
npm install zustand
```

Paket React 18 ve sonrasıyla çalışır. Ek bir Provider ya da kurulum dosyası gerekmez.[^2]

## create ile store

Store'u `create` ile oluşturursunuz. Fonksiyon bir **hook** döndürür. İçine state'i ve onu değiştiren fonksiyonları *(action)* birlikte koyarsınız:[^1][^3]

```ts
// src/features/cart/cart-store.ts
import { create } from "zustand";

type CartItem = { id: number; name: string; price: number; quantity: number };

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  toggle: () => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()((set) => ({
  items: [],
  isOpen: false,
  addItem: (item) =>
    set((state) => ({ items: [...state.items, { ...item, quantity: 1 }] })),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  clear: () => set({ items: [] }),
}));
```

TypeScript'te `create(...)` yerine `create<CartState>()(...)` yazılır. Fazladan `()` bilinçlidir: TypeScript, `set` ve `get` aynı tipi hem alıp hem verdiği için state tipini kendisi çıkaramaz. Curried yazım tipi elle vermenizi sağlarken middleware'lerin tiplerini çıkarmaya devam eder.[^4]

Dosya adı ve yeri için genel kural: store'u kullanan özelliğin klasörüne koyun *(bkz. [Component ve Kod Organizasyonu](/academy/architecture/component-organization))*.

## Component'te kullanmak

Hook'a bir **selector** verirsiniz. Component yalnızca selector'ın döndürdüğü değer değiştiğinde render olur:[^1]

```tsx
function CartBadge() {
  const count = useCartStore((state) => state.items.length);
  return <span>{count}</span>;
}

function AddButton() {
  const addItem = useCartStore((state) => state.addItem);
  return (
    <button onClick={() => addItem({ id: 1, name: "Canvas Sneaker", price: 1200 })}>
      Sepete ekle
    </button>
  );
}
```

`AddButton` yalnızca `addItem`'ı okur. Action'lar hiç değişmediği için sepete ürün eklendiğinde bu buton render olmaz. Selector'ların ayrıntısı [Selector ve yeniden render](/academy/zustand/selectors-and-rerenders) dersinde.

## set: Birleştirerek günceller

`set`'e verdiğiniz nesne mevcut state ile **birleştirilir**; yalnızca verdiğiniz alanlar değişir. Önceki state'e göre güncellerken fonksiyon verin.[^3][^5]

```ts
set({ items: [] }); // isOpen ve action'lar olduğu gibi kalır
set((state) => ({ isOpen: !state.isOpen })); // önceki değere göre
```

Birleştirme yalnızca **bir seviye** derindir. İç içe bir nesneyi güncellerken onu kendiniz kopyalamalısınız:[^5]

```ts
type ProfileState = {
  user: { name: string; theme: "light" | "dark" };
  setTheme: (theme: "light" | "dark") => void;
};

const useProfileStore = create<ProfileState>()((set) => ({
  user: { name: "Ada", theme: "light" },
  // ❌ set({ user: { theme } }) name alanını siler
  setTheme: (theme) => set((state) => ({ user: { ...state.user, theme } })),
}));
```

State'i **değiştirmeyin**, yeni değer döndürün. `state.items.push(item)` yazmak store'u değiştirir ama aboneler haberdar olmaz; ekran güncellenmez.[^5] React'teki kural aynıdır *(bkz. [State](/academy/react/state))*.

`set`'in ikinci argümanı `true` olursa state birleştirilmez, **değiştirilir**. v5'te bu durumda TypeScript tam bir state ister; eksik alan verirseniz derlenmez.[^2] Action'ları da sileceği için nadiren gerekir.

## get ve async action

`create`'e verdiğiniz fonksiyonun ikinci parametresi `get`'tir; action içinde güncel state'i okur. Action'lar `async` olabilir; Zustand için fark etmez, iş bitince `set` çağırırsınız:[^4]

```ts
type CouponState = {
  code: string | null;
  discount: number;
  applyCoupon: (code: string) => Promise<void>;
};

const useCouponStore = create<CouponState>()((set, get) => ({
  code: null,
  discount: 0,
  applyCoupon: async (code) => {
    if (get().code === code) return;
    const { discount } = await validateCoupon(code);
    set({ code, discount });
  },
}));
```

> [!WARNING]
>
> Sunucudan veri çekip store'a yazmak bir kez için kolaydır. Yükleme durumu, hata, yeniden deneme ve cache gerektiğinde bu işi [TanStack Query](/academy/tanstack-query)'ye bırakın. Birlikte kullanım [TanStack Query ile birlikte kullanım](/academy/zustand/with-tanstack-query) dersinde.

## React dışından erişmek

Hook aynı zamanda store'un kendisidir. Üzerindeki fonksiyonlarla state'i React dışından okuyup değiştirebilirsiniz:[^6]

| Fonksiyon | Ne yapar |
| :-- | :-- |
| `getState()` | Güncel state'i döndürür; abone olmaz |
| `setState(partial)` | `set` ile aynı; birleştirerek günceller |
| `subscribe(listener)` | Her değişiklikte `(state, prevState)` ile çağrılır; aboneliği bitiren fonksiyon döndürür |
| `getInitialState()` | Store oluşturulurken verilen ilk state |

```ts
// Bir WebSocket mesajında
socket.on("cart-cleared", () => useCartStore.setState({ items: [] }));

const unsubscribe = useCartStore.subscribe((state, prevState) => {
  if (state.items.length !== prevState.items.length) {
    analytics.track("cart_changed", { count: state.items.length });
  }
});
```

Component içinde `useCartStore.getState()` ile değer okumayın; abone olmadığınız için değer değişince component güncellenmez. Event handler içinde güncel değeri okumak için kullanabilirsiniz.

## Tip yazmadan: combine

State tipini ayrıca yazmak istemiyorsanız `combine` middleware'i ilk state'ten tipi çıkarır. Bu durumda curried yazım gerekmez:[^4]

```ts
import { create, type ExtractState } from "zustand";
import { combine } from "zustand/middleware";

export const useCounterStore = create(
  combine({ count: 0 }, (set) => ({
    increase: () => set((state) => ({ count: state.count + 1 })),
  })),
);

export type CounterState = ExtractState<typeof useCounterStore>;
```

Bedeli küçük bir tip açığıdır: action'ların içindeki `get` ve `set` yalnızca ilk state'i bilir, action'ları görmez. Dokümanın notu: çoğu durumda sorun çıkarmaz, `set(..., true)` ile değiştirirken dikkat edin.[^4] `ExtractState`, store'un tam tipini testlerde ve yardımcı fonksiyonlarda kullanmak için verilir.[^7]

## Kendin dene

- Sepet store'unu kurun. `CartBadge` ve `AddButton`'a `console.log("render")` koyun; ürün eklerken hangisi loglanıyor?
- `addItem`'ı `state.items.push(...)` ile yazın. Ekran güncelleniyor mu? `getState().items` ne diyor?
- Tarayıcı konsolunda store'u `window`'a bağlayıp `setState({ isOpen: true })` çağırın; ekran güncelleniyor mu?
- `set({ isOpen: true }, true)` yazın. TypeScript ne diyor?

## Detaylı öğrenmek için

- **Resmi doküman:** "Beginner TypeScript Guide"; tipli store, `ExtractState`, sıfırlama ve birden fazla store.[^7]
- **Resmi doküman:** "Advanced TypeScript Guide"; curried yazımın ve tip çıkarımının nedeni.[^4]
- **Resmi doküman:** "Updating state"; düz ve iç içe güncellemeler.[^5]

## Kaynaklar

1. [Zustand: Introduction](https://zustand.docs.pmnd.rs/learn/getting-started/introduction) *(doc)* — Kurulum, hook olarak store ve selector ile abonelik.
2. [Zustand: How to Migrate to v5 from v4](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) *(doc)* — React 18 şartı ve `replace` bayrağı için sıkılaşan tipler.
3. [Zustand: create](https://zustand.docs.pmnd.rs/reference/apis/create) *(doc)* — `create` imzası, `set` ve `get` ile state ve action tanımlamak.
4. [Zustand: Advanced TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript) *(doc)* — Curried `create<T>()`, `combine` ile tip çıkarımı ve sınırları.
5. [Zustand: Updating state](https://zustand.docs.pmnd.rs/learn/guides/updating-state) *(doc)* — `set`'in birleştirmesi ve iç içe nesneleri kopyalamak.
6. [Zustand: createStore](https://zustand.docs.pmnd.rs/reference/apis/create-store) *(doc)* — `getState`, `setState`, `subscribe` ve `getInitialState`.
7. [Zustand: Beginner TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/beginner-typescript) *(doc)* — Tipli store, `ExtractState`, async action ve birden fazla store.
