---
title: "Actions and updates"
description: "Actions as events, immer and resetting the store."
lastVerified: "2026-10-21"
translationKey: "zustand/actions-and-updates"
---

## Gather the actions in an object of their own

Actions are the functions that change the state, and they **never change** themselves. [TkDodo](https://tkdodo.eu/) recommends putting them in a separate `actions` object inside the store. That way you expose all of them through a single hook:[^1]

```ts
type CartState = {
  items: CartItem[];
  actions: {
    addProduct: (product: Omit<CartItem, "quantity">) => void;
    removeProduct: (id: number) => void;
  };
};

const useCartStore = create<CartState>()((set) => ({
  items: [],
  actions: {
    addProduct: (product) =>
      set((state) => ({ items: [...state.items, { ...product, quantity: 1 }] })),
    removeProduct: (id) =>
      set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  },
}));

export const useCartItems = () => useCartStore((state) => state.items);
export const useCartActions = () => useCartStore((state) => state.actions);
```

```tsx
function RemoveButton({ id }: { id: number }) {
  const { removeProduct } = useCartActions();
  return <button onClick={() => removeProduct(id)}>Remove</button>;
}
```

This does not contradict the "atomic selector" rule from the [Selectors and re-renders](/academy/zustand/selectors-and-rerenders) lesson. Because the `actions` object never changes, it behaves like a single atomic value, and you can destructure whatever you want out of it.[^1]

> [!NOTE]
>
> Because `set` merges at the top level, the `actions` object survives updates. It is only removed if you replace the state entirely with `set(..., true)`.

## An event, not a setter

It is easy to name an action something like `setItems` and write the logic in the component. TkDodo recommends the rule he takes from the Redux style guide: model actions as **events**.[^1][^2] The component says what happened and the store decides what to do.

```ts
// ❌ The logic is in the component; everyone who uses it repeats the same code
const { setItems } = useCartActions();
setItems(items.some((i) => i.id === product.id) ? items.map(/* ... */) : [...items, product]);

// ✅ The logic is in the store
const { addProduct } = useCartActions();
addProduct(product);
```

```ts
addProduct: (product) =>
  set((state) => {
    const existing = state.items.find((item) => item.id === product.id);
    if (existing) {
      return {
        items: state.items.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      };
    }
    return { items: [...state.items, { ...product, quantity: 1 }] };
  }),
```

The business rule *(raise the quantity when the same product is added)* sits in one place and is easy to test.

## Nested updates and immer

The chain of `map`s and spreads above gets harder to read as it goes deeper. With [Immer](https://immerjs.github.io/immer/) you write as though you were changing the state, and Immer produces a new object behind the scenes.[^3] Zustand provides a middleware for it, and you install the package separately:[^4]

```command
npm install immer
```

```ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type CartState = {
  items: CartItem[];
  addProduct: (product: Omit<CartItem, "quantity">) => void;
};

const useCartStore = create<CartState>()(
  immer((set) => ({
    items: [],
    addProduct: (product) =>
      set((state) => {
        const existing = state.items.find((item) => item.id === product.id);
        if (existing) existing.quantity += 1;
        else state.items.push({ ...product, quantity: 1 });
      }),
  })),
);
```

The function you give `set` no longer returns anything; it changes the draft. That only holds inside the `immer` middleware. Without the middleware, `state.items.push` breaks the store and the screen does not update.[^3]

When to use it? If the state is nested a few levels deep, immer shortens the code noticeably. For flat state a spread is enough; do not add a dependency you do not need.

## Resetting the store

When somebody signs out, or an order is completed, the store has to go back to its initial state. The third parameter of the function you pass to `create` is the store itself, and `getInitialState()` gives you the first state:[^5]

```ts
const useCartStore = create<CartState>()((set, _get, store) => ({
  items: [],
  couponCode: null,
  actions: {
    // ...
    checkoutCompleted: () => set(store.getInitialState()),
  },
}));
```

You do not have to copy the initial values into a separate constant.

## Actions outside the store

The documentation states the recommended route plainly: keep the actions in the store with the state. As an alternative, you can also write the actions at module level with `setState`:[^6][^7]

```ts
export const useFilterStore = create<FilterState>()(() => ({
  category: "all",
  search: "",
}));

export const setCategory = (category: string) => useFilterStore.setState({ category });
export const resetFilters = () => useFilterStore.setState(useFilterStore.getInitialState());
```

The advantage: calling an action needs no hook, and it can be imported from any file. The documentation says this route has no disadvantage, while keeping them together provides encapsulation.[^7] Pick one in a project and stay consistent.

## Try it yourself

- Write `addProduct` first in the component with `setItems` and then in the store as an event. If you have to add the same product from two different components, which is less code?
- Add `checkoutCompleted` to the cart and reset it with `getInitialState()`.
- Remove the `immer` middleware but leave the `state.items.push` line. Does the screen update?

## Going deeper

- **Article:** [TkDodo](https://tkdodo.eu/), "Working with Zustand"; separating the actions and modelling them as events.[^1]
- **Official docs:** "Flux inspired practice"; updating with `set`, keeping the actions together, and the reducer pattern.[^6]
- **Official docs:** "immer"; using the middleware and Immer's rules.[^4]

## Sources

1. [TkDodo](https://tkdodo.eu/): [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) *(article)* — November 20, 2022. Gathering the actions in a separate object, and modelling them as events.
2. [Redux: Model Actions as Events, Not Setters](https://redux.js.org/style-guide/#model-actions-as-events-not-setters) *(doc)* — Naming an action as an event, and keeping the logic in the store.
3. [Zustand: Updating state](https://zustand.docs.pmnd.rs/learn/guides/updating-state) *(doc)* — Copying a nested object by hand, and shortening it with Immer.
4. [Zustand: immer](https://zustand.docs.pmnd.rs/reference/middlewares/immer) *(doc)* — The `immer` middleware, the installation requirement and its use.
5. [Zustand: How to reset state](https://zustand.docs.pmnd.rs/learn/guides/how-to-reset-state) *(doc)* — Resetting with `store.getInitialState()`.
6. [Zustand: Flux inspired practice](https://zustand.docs.pmnd.rs/learn/guides/flux-inspired-practice) *(doc)* — The recommended patterns: updating with `set` and keeping the actions together.
7. [Zustand: Practice with no store actions](https://zustand.docs.pmnd.rs/learn/guides/practice-with-no-store-actions) *(doc)* — Writing the actions at module level with `setState`.
