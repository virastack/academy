---
title: "Selectors and re-renders"
description: "Atomic selectors, useShallow and custom hooks."
lastVerified: "2026-10-21"
translationKey: "zustand/selectors-and-rerenders"
---

## How a selector is compared

Every time the store changes, Zustand runs the component's selector again and compares the result with the previous one using `Object.is`. If the result differs the component renders; if it is the same it does not.[^1][^2]

```ts
const count = useCartStore((state) => state.items.length);
```

Here the result is a number. The cart can open and close, and as long as the number stays the same the component does not render. The smaller the value the selector returns, the less the component renders.

## Subscribing to the whole store

Pass no selector and the hook returns the entire state. That means a render on **every** change in the store:[^3]

```ts
// ❌ It only uses items, but renders when isOpen changes too
const { items } = useCartStore();
```

That is why [TkDodo](https://tkdodo.eu/) treats selectors as mandatory: write a selector even when there is only one value in the store.[^3]

## Atomic selectors

Writing a separate selector for each value is the simplest and safest route:[^3]

```ts
const items = useCartStore((state) => state.items);
const isOpen = useCartStore((state) => state.isOpen);
```

Each line subscribes to its own value. That is TkDodo's preference: when a component needs two values, he uses two selectors.[^3]

## A selector that returns an object

It is tempting to return an object in order to take several values at once. But the selector produces a **new** object every time it runs, and `Object.is` never treats two objects as equal.[^1]

```ts
// ❌ A new object every time
const { items, isOpen } = useCartStore((state) => ({
  items: state.items,
  isOpen: state.isOpen,
}));
```

In v4 this code only caused needless renders. Because v5 follows React's behaviour, the consequence is heavier: React sees the value changing on every read and the page stops with a **"Maximum update depth exceeded"** error.[^4] Before that, the console shows a "The result of getSnapshot should be cached" warning.

The answer is `useShallow`. It wraps the selector and compares the result **shallowly**: if every element of the object or array is the same by `Object.is`, it returns the previous reference.[^2][^4]

```ts
import { useShallow } from "zustand/react/shallow";

const { items, isOpen } = useCartStore(
  useShallow((state) => ({ items: state.items, isOpen: state.isOpen })),
);

// Returning an array is the same
const [items, isOpen] = useCartStore(useShallow((state) => [state.items, state.isOpen]));
```

`useShallow` can be imported from either `zustand/react/shallow` or `zustand/shallow`.[^4]

> [!WARNING]
>
> Producing a default value inside the selector causes the same error. `state.action ?? (() => {})` returns a new function every time. Put the default in a constant outside the selector.[^4]

## Derived values

Do not write a value that can be calculated into the store separately; calculate it in the selector.[^5] When the result is a number or a string, nothing extra is needed:

```ts
const total = useCartStore((state) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
);
```

When the result is a new array *(`filter`, `map`, `Object.keys`)*, it produces a new reference every time. Wrap it in `useShallow`; as long as the array's elements stay the same, the component does not render:[^1]

```ts
const ids = useCartStore(useShallow((state) => state.items.map((item) => item.id)));
```

This pattern is useful for lists. The list component only reads the `id`s, and each row selects its own record by `id`. When one product's quantity changes, only that row renders.

## Export only custom hooks

TkDodo's number one piece of advice: do not expose the store hook; export a custom hook per value.[^3]

```ts
// Not exported: nobody can subscribe to the whole store
const useCartStore = create<CartState>()((set) => ({
  /* ... */
}));

export const useCartItems = () => useCartStore((state) => state.items);
export const useCartCount = () =>
  useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
export const useIsCartOpen = () => useCartStore((state) => state.isOpen);
```

The component using it does not have to write a selector, cannot subscribe to the whole store by accident, and when the store's internals change only this file changes. How to expose the actions is in the [Actions and updates](/academy/zustand/actions-and-updates) lesson.

## Try it yourself

- Write three components: one reading the whole store, one an atomic selector, one an object with `useShallow`. Put a `console.log("render")` in each and change an unrelated field in the store.
- Remove the `useShallow` and run the selector that returns an object. Which warning and which error appear in the console?
- Render the cart list first by reading `items`, then after splitting it into rows that read only the `id`s. How many rows render when one product's quantity changes?

## Going deeper

- **Article:** [TkDodo](https://tkdodo.eu/), "Working with Zustand"; exporting custom hooks, atomic selectors and separating the actions.[^3]
- **Official docs:** "Prevent rerenders with useShallow"; a `useShallow` example on a derived array.[^1]
- **Official docs:** "How to Migrate to v5 from v4"; the requirement for a stable selector result, and the infinite loop examples.[^4]

## Sources

1. [Zustand: Prevent rerenders with useShallow](https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow) *(doc)* — The `Object.is` comparison, and needless renders on a derived array.
2. [Zustand: useShallow](https://zustand.docs.pmnd.rs/reference/hooks/use-shallow) *(doc)* — Memoising a selector with a shallow comparison.
3. [TkDodo](https://tkdodo.eu/): [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) *(article)* — November 20, 2022. Exporting only custom hooks, atomic selectors, and the cost of subscribing to the whole store.
4. [Zustand: How to Migrate to v5 from v4](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) *(doc)* — The requirement for a stable selector result, "Maximum update depth exceeded", and the fix with `useShallow`.
5. [Zustand: Beginner TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/beginner-typescript) *(doc)* — Several selectors, and derived state in a selector.
