---
title: "The slice pattern"
description: "Splitting the store into small stores or into slices."
lastVerified: "2026-10-21"
translationKey: "zustand/slice-pattern"
---

## Two ways when the store grows

As the cart, the user preferences and the interface state pile up in the same store, the file gets long. There are two ways to split it in Zustand:

| Way | How | Who recommends it |
| :-- | :-- | :-- |
| **Several small stores** | Each feature has its own `create` call | [TkDodo](https://tkdodo.eu/)[^1] |
| **One store made of slices** | The pieces live in separate files and come together in one `create` | The Zustand documentation[^2][^3] |

Both are valid. One question decides it: do the pieces **change each other?**

## Several small stores

TkDodo says that, unlike Redux, Zustand encourages many small stores. Each store is responsible for one thing. When you need to combine them, you use a custom hook:[^1]

```ts
const EMPTY: number[] = [];

export const useMyFavorites = () => {
  const userId = useSessionStore((state) => state.userId);
  return useFavoritesStore((state) =>
    userId === null ? EMPTY : (state.byUser[userId] ?? EMPTY),
  );
};
```

The `EMPTY` constant is deliberate; writing `[]` inside the selector produces a new array every time *(see [Selectors and re-renders](/academy/zustand/selectors-and-rerenders))*.

TkDodo writes that he has never needed slices, and that they do not look easy, especially with TypeScript.[^1] When the stores are independent of each other, this route means less code.

## One store made of slices

When one action changes more than one piece *(opening the cart drawer when something is added to the cart)*, a single store suits better. The documentation recommends keeping global state in one store and splitting it into slices as it grows.[^3]

Each slice is a function that returns part of the store. In TypeScript its type is `StateCreator`; the first type parameter is **the whole** store and the last is the slice itself:[^4]

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

Put an action that concerns more than one slice in a slice of its own. `get` sees the whole store and can call the other slices' actions:[^2][^4]

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

Combine them all in one `create`. `(...a)` passes `set`, `get` and `store` through to every slice:[^2]

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
> Because the slices are spread into the same object, the field names must not clash. If two slices both have an `actions` or a `reset`, the later one overwrites the earlier. If you are going to use the `actions` object from the [Actions and updates](/academy/zustand/actions-and-updates) lesson with slices, give them separate names such as `cartActions` and `uiActions`.

## Where the middleware goes

Apply the middleware only to the **combined** store. Putting `persist` or `devtools` inside a slice leads to unexpected results:[^2]

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

When you add a middleware, update the slices' `set` type too. `StateCreator`'s second parameter is the list of middleware applied from the outside in. For `devtools(persist(...))`, for instance:[^4]

```ts
type Mutators = [["zustand/devtools", never], ["zustand/persist", unknown]];

export const createCartSlice: StateCreator<ShopState, Mutators, [], CartSlice> = (set) => ({
  // set now takes the action name shown in devtools as its third argument
  clearCart: () => set({ items: [] }, undefined, "cart/clearCart"),
  // ...
});
```

The detail on `persist` and `devtools` is in the next lesson.

## Try it yourself

- Write the cart and the interface state as two separate stores first. Where do you have to put the "open the drawer when something is added to the cart" behaviour?
- Write the same thing with slices and put `addToCart` in a shared slice.
- Give both slices an action called `reset`. Which one runs?

## Going deeper

- **Official docs:** "Slices Pattern"; combining slices, updating more than one slice, and the middleware.[^2]
- **Official docs:** the "Slices pattern" section of the "Advanced TypeScript Guide"; `StateCreator` and the mutator list.[^4]
- **Article:** [TkDodo](https://tkdodo.eu/), "Working with Zustand"; small stores, and combining them with a custom hook.[^1]

## Sources

1. [TkDodo](https://tkdodo.eu/): [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) *(article)* — November 20, 2022. Keeping the store small, combining stores with a custom hook, and his view on slices.
2. [Zustand: Slices Pattern](https://zustand.docs.pmnd.rs/learn/guides/slices-pattern) *(doc)* — Combining slices, updating more than one slice, and applying the middleware only to the combined store.
3. [Zustand: Flux inspired practice](https://zustand.docs.pmnd.rs/learn/guides/flux-inspired-practice) *(doc)* — The single-store recommendation, and splitting into slices in a large application.
4. [Zustand: Advanced TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript#slices-pattern) *(doc)* — Typed slices with `StateCreator`, and the middleware mutator list.
