---
title: "A store with Context"
description: "Initialising from props, reuse, testing and Next.js."
lastVerified: "2026-10-21"
translationKey: "zustand/store-with-context"
---

## The limits of a global store

A store set up with `create` is a module variable; it is reachable from everywhere in the application and needs no provider. [TkDodo](https://tkdodo.eu/) describes three situations where that convenience causes trouble:[^1]

| Situation | The problem |
| :-- | :-- |
| **Initialising from props** | The store is created before the component. You write the value in later with a `useEffect`, so the first render happens with the wrong value. |
| **Testing** | Every test shares the same store. You have to reset it by hand after each one. |
| **Reuse** | If the same component is used twice on a page, the two instances share the state and overwrite each other. |

In a framework that renders on the server, such as [!nextjs], there is a fourth problem: the server answers many requests at once. A store at module level is **shared between requests**, and one user's data can leak to another.[^2]

## Share the store, not the value

The answer is React Context, but not for state management. You put the **store instance** into the Context rather than a value. Because the store instance never changes, Context causes no needless renders, and Zustand's selectors still do the picking.[^1]

For that you use `createStore`, which only creates a store, rather than `create`, which returns a hook:[^3]

```ts
// src/features/filters/selection-store.ts
import { createStore } from "zustand";

export type SelectionState = {
  selected: string[];
  actions: {
    toggle: (id: string) => void;
    clear: () => void;
  };
};

export const createSelectionStore = (initialSelected: string[]) =>
  createStore<SelectionState>()((set) => ({
    selected: initialSelected,
    actions: {
      toggle: (id) =>
        set((state) => ({
          selected: state.selected.includes(id)
            ? state.selected.filter((s) => s !== id)
            : [...state.selected, id],
        })),
      clear: () => set({ selected: [] }),
    },
  }));
```

The provider creates the store **once**. `useState`'s initialiser function only runs on the first render; TkDodo prefers it to `useRef` for one-time initialisation:[^1][^4]

```tsx
// src/features/filters/selection-provider.tsx
import { createContext, use, useState, type ReactNode } from "react";
import { useStore, type StoreApi } from "zustand";

const SelectionStoreContext = createContext<StoreApi<SelectionState> | null>(null);

export function SelectionProvider({
  initialSelected = [],
  children,
}: {
  initialSelected?: string[];
  children: ReactNode;
}) {
  const [store] = useState(() => createSelectionStore(initialSelected));
  return <SelectionStoreContext value={store}>{children}</SelectionStoreContext>;
}

function useSelectionStore<T>(selector: (state: SelectionState) => T): T {
  const store = use(SelectionStoreContext);
  if (!store) {
    throw new Error("useSelectionStore must be used within SelectionProvider.");
  }
  return useStore(store, selector);
}

export const useIsSelected = (id: string) =>
  useSelectionStore((state) => state.selected.includes(id));
export const useSelectedCount = () => useSelectionStore((state) => state.selected.length);
export const useSelectionActions = () => useSelectionStore((state) => state.actions);
```

`useStore(store, selector)` does what the hook returned by `create` does: it subscribes to the store with a selector.[^5] The pattern of a hook that throws outside the provider, and `use`, are familiar from the [Context](/academy/react/context) lesson.

## How the three problems are solved

- **Props.** `initialSelected` is given while the store is created, so the first render happens with the right value. If the prop changes later it is not reflected in the store; it is an **initial** value. When you do want the store reset as the prop changes, give the provider a `key`.[^1]
- **Reuse.** Every provider creates its own store. You can use the same filter group twice on a page:

```tsx
<SelectionProvider initialSelected={["shoes"]}>
  <CategoryFilter />
</SelectionProvider>
<SelectionProvider>
  <ColorFilter />
</SelectionProvider>
```

- **Testing.** Every test renders its own provider; the store belongs to that test and needs no resetting.[^1] The helper that renders with a provider is in the [Provider and hook testing](/academy/vitest/provider-and-hook) lesson.

If you are carrying on with global stores, the Zustand documentation describes a `__mocks__/zustand.ts` file that returns every store to `getInitialState()` after each test.[^6] TkDodo writes that he finds that route complicated.[^1]

## The store in Next.js

The Zustand documentation sets two rules for the App Router:[^2]

- **No global store.** The store has to be created per request, which the provider pattern above gives you. The provider is a Client Component.
- **A Server Component neither reads nor writes the store.** A Server Component cannot use hooks or Context; reaching the store from one goes against the architecture.

```tsx
// app/providers.tsx
"use client";

import { useState, type ReactNode } from "react";
import { CartStoreContext, createCartStore } from "@/features/cart/cart-store";

export function CartStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createCartStore());
  return <CartStoreContext value={store}>{children}</CartStoreContext>;
}
```

Put the provider inside `<body>` in `app/layout.tsx` and the store lives for the whole application. When it is only needed on one route, put it in that route's `page.tsx`; the store goes when you leave the route.[^2] You can pass a value read in a Server Component to the provider as a prop to serve as the initial value.

## Which one when

| Situation | Recommendation |
| :-- | :-- |
| A single state across the application *(the theme, the cart)*, browser only | A global store with `create` |
| State belonging to a route or a component tree | `createStore` + Context |
| State that has to start from props | `createStore` + Context |
| A component used more than once on a page | `createStore` + Context |
| A Next.js application rendered on the server | `createStore` + Context |

TkDodo sums his own experience up like this: he has used stores set up with Context more often than genuinely global ones.[^1]

## Try it yourself

- Write a filter group with a global store and render it twice on a page. What happens to one when you make a selection in the other?
- Write the same thing with `SelectionProvider`.
- Change the `initialSelected` prop with a button. Does the store update? Give the provider a `key` and try again.
- Call `useSelectedCount` outside the provider and read the error message.

## Going deeper

- **Article:** [TkDodo](https://tkdodo.eu/), "Zustand and React Context"; the three problems with a global store, and the Context answer.[^1]
- **Official docs:** "Setup with Next.js"; a store per request, the provider, and a store at route level.[^2]
- **Official docs:** "Initialize state with props"; `createStore`, Context and the custom hook pattern.[^3]

## Sources

1. [TkDodo](https://tkdodo.eu/): [Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context) *(article)* — April 14, 2024. The initialising, testing and reuse problems, and sharing the store instance with Context.
2. [Zustand: Setup with Next.js](https://zustand.docs.pmnd.rs/learn/guides/nextjs) *(doc)* — A store per request, the Server Component rule, and a provider at route level.
3. [Zustand: Initialize state with props](https://zustand.docs.pmnd.rs/learn/guides/initialize-state-with-props) *(doc)* — A store-creating function with `createStore`, Context and a custom hook.
4. [TkDodo](https://tkdodo.eu/): [useState for one-time initializations](https://tkdodo.eu/blog/use-state-for-one-time-initializations) *(article)* — March 12, 2021. `useState`'s initialiser for one-time initialisation.
5. [Zustand: useStore](https://zustand.docs.pmnd.rs/reference/hooks/use-store) *(doc)* — Subscribing to a vanilla store with a selector.
6. [Zustand: Testing](https://zustand.docs.pmnd.rs/learn/guides/testing) *(doc)* — A mock that resets the global stores between tests.
