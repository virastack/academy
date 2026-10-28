---
title: "Your first store"
description: "create, set, get, and reaching the store from outside React."
lastVerified: "2026-10-21"
translationKey: "zustand/first-store"
---

## Setup

Create a [!vite] project as in the [React](/academy/react/setup-and-tooling) guide and add the package:[^1]

```command
npm install zustand
```

The package works with React 18 and later. No extra provider or configuration file is needed.[^2]

## A store with create

You create the store with `create`. The function returns a **hook**. Inside it you put the state and the functions that change it *(the actions)* together:[^1][^3]

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

In TypeScript you write `create<CartState>()(...)` rather than `create(...)`. The extra `()` is deliberate: because `set` and `get` both take and return the same type, TypeScript cannot infer the state type itself. The curried form lets you give the type by hand while the middleware types are still inferred.[^4]

The general rule for the file's name and place: put the store in the folder of the feature that uses it *(see [Components and code organisation](/academy/architecture/component-organization))*.

## Using it in a component

You pass the hook a **selector**. The component renders only when the value the selector returns changes:[^1]

```tsx
function CartBadge() {
  const count = useCartStore((state) => state.items.length);
  return <span>{count}</span>;
}

function AddButton() {
  const addItem = useCartStore((state) => state.addItem);
  return (
    <button onClick={() => addItem({ id: 1, name: "Canvas Sneaker", price: 1200 })}>
      Add to cart
    </button>
  );
}
```

`AddButton` only reads `addItem`. Because the actions never change, this button does not render when a product is added to the cart. The detail on selectors is in the [Selectors and re-renders](/academy/zustand/selectors-and-rerenders) lesson.

## set: it merges

The object you give `set` is **merged** with the current state; only the fields you pass change. When updating based on the previous state, pass a function.[^3][^5]

```ts
set({ items: [] }); // isOpen and the actions stay as they are
set((state) => ({ isOpen: !state.isOpen })); // based on the previous value
```

The merge is only **one level** deep. When updating a nested object, you have to copy it yourself:[^5]

```ts
type ProfileState = {
  user: { name: string; theme: "light" | "dark" };
  setTheme: (theme: "light" | "dark") => void;
};

const useProfileStore = create<ProfileState>()((set) => ({
  user: { name: "Ada", theme: "light" },
  // ❌ set({ user: { theme } }) deletes the name field
  setTheme: (theme) => set((state) => ({ user: { ...state.user, theme } })),
}));
```

Do **not change** the state; return a new value. Writing `state.items.push(item)` changes the store but the subscribers are not told, so the screen does not update.[^5] The rule is the same as in React *(see [State](/academy/react/state))*.

When `set`'s second argument is `true`, the state is not merged but **replaced**. In v5, TypeScript then demands a complete state; leave a field out and it does not compile.[^2] Because it also removes the actions, it is rarely needed.

## get and async actions

The second parameter of the function you pass to `create` is `get`, which reads the current state inside an action. Actions can be `async`; it makes no difference to Zustand, and you call `set` when the work is done:[^4]

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
> Fetching data from the server and writing it to the store is easy once. The moment you need loading states, errors, retries and caching, leave that job to [TanStack Query](/academy/tanstack-query). Using them together is in the [Using it with TanStack Query](/academy/zustand/with-tanstack-query) lesson.

## Reaching it from outside React

The hook is also the store itself. The functions on it let you read and change the state from outside React:[^6]

| Function | What it does |
| :-- | :-- |
| `getState()` | Returns the current state; does not subscribe |
| `setState(partial)` | The same as `set`; merges the update |
| `subscribe(listener)` | Called with `(state, prevState)` on every change; returns a function that ends the subscription |
| `getInitialState()` | The first state given when the store was created |

```ts
// In a WebSocket message
socket.on("cart-cleared", () => useCartStore.setState({ items: [] }));

const unsubscribe = useCartStore.subscribe((state, prevState) => {
  if (state.items.length !== prevState.items.length) {
    analytics.track("cart_changed", { count: state.items.length });
  }
});
```

Do not read a value with `useCartStore.getState()` inside a component; because you are not subscribed, the component does not update when the value changes. You can use it inside an event handler to read the current value.

## Without writing the type: combine

If you would rather not write the state type separately, the `combine` middleware infers it from the first state. The curried form is then not needed:[^4]

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

The price is a small gap in the types: the `get` and `set` inside the actions only know the first state and cannot see the actions. The documentation's note: it usually causes no trouble, but take care when replacing with `set(..., true)`.[^4] `ExtractState` is provided so that you can use the store's full type in tests and helper functions.[^7]

## Try it yourself

- Set up the cart store. Put a `console.log("render")` in `CartBadge` and `AddButton`; which one is logged as you add a product?
- Write `addItem` with `state.items.push(...)`. Does the screen update? What does `getState().items` say?
- Attach the store to `window` in the browser console and call `setState({ isOpen: true })`; does the screen update?
- Write `set({ isOpen: true }, true)`. What does TypeScript say?

## Going deeper

- **Official docs:** the "Beginner TypeScript Guide"; a typed store, `ExtractState`, resetting and multiple stores.[^7]
- **Official docs:** the "Advanced TypeScript Guide"; why the curried form and the type inference are as they are.[^4]
- **Official docs:** "Updating state"; flat and nested updates.[^5]

## Sources

1. [Zustand: Introduction](https://zustand.docs.pmnd.rs/learn/getting-started/introduction) *(doc)* — Installation, the store as a hook, and subscribing with a selector.
2. [Zustand: How to Migrate to v5 from v4](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) *(doc)* — The React 18 requirement, and the stricter types for the `replace` flag.
3. [Zustand: create](https://zustand.docs.pmnd.rs/reference/apis/create) *(doc)* — The `create` signature, and defining state and actions with `set` and `get`.
4. [Zustand: Advanced TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript) *(doc)* — The curried `create<T>()`, type inference with `combine`, and its limits.
5. [Zustand: Updating state](https://zustand.docs.pmnd.rs/learn/guides/updating-state) *(doc)* — `set` merging, and copying nested objects.
6. [Zustand: createStore](https://zustand.docs.pmnd.rs/reference/apis/create-store) *(doc)* — `getState`, `setState`, `subscribe` and `getInitialState`.
7. [Zustand: Beginner TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/beginner-typescript) *(doc)* — A typed store, `ExtractState`, async actions and multiple stores.
