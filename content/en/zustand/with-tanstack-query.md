---
title: "Using it with TanStack Query"
description: "Driving a query from a filter, and deriving state."
lastVerified: "2026-10-21"
translationKey: "zustand/with-tanstack-query"
---

## The division of labour

The two libraries do different jobs and do not replace each other:[^1][^2]

| Data | Example | Where |
| :-- | :-- | :-- |
| Data the server owns | Products, stock, orders | [!tanstack-query] |
| Data that only lives in the browser | The selected filters, the cart drawer, the selected row | [!zustand] |

The rule is simple: do **not copy** data that came from the server into the store. The copy goes stale when the data on the server changes, and you end up writing the loading, error and refetch states by hand.[^2] This lesson has two patterns for joining the two.

## The store drives the query

The filters are client state; the product list is server state. Keep the filter in the store and put it in the **query key**, and the query runs again by itself the moment the filter changes. [TkDodo](https://tkdodo.eu/) combines the two hooks in one custom hook:[^3]

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

The filter panel calls `setCategory`; the product list uses `useFilteredProducts`. Neither knows about the other. TkDodo finds this declarative and free of magic: `addFilter` can be called from anywhere in the interface and the query is triggered automatically.[^3] `keepPreviousData` keeps the old list on screen while the filter changes *(see [Pagination and infinite lists](/academy/tanstack-query/pagination-and-infinite-lists))*.

> [!TIP]
>
> When the filter has to survive a shareable link or the back button, keep it in the URL rather than the store. The pattern stays the same: the value read from the URL goes into the query key.[^4]

## Deriving, not syncing

A common problem: the selected user's `id` sits in the store, but the user has been deleted on the server. The first thing that comes to mind is to correct the store with a `useEffect` when the query result changes:[^5]

```ts
// ❌ Syncing by hand
const { data: users } = useQuery(userQueries.list());
const selectedUserId = useSelectedUserId();
const { selectUser } = useUserActions();

useEffect(() => {
  if (!users?.some((u) => u.id === selectedUserId)) {
    selectUser(null);
  }
}, [users, selectedUserId, selectUser]);
```

TkDodo asks a different question here: "these are the users and this is the selection; which is the real selection?" Leave the store alone and **derive** the selection on every render:[^5]

```ts
// ✅ Deriving
export function useSelectedUser() {
  const { data: users } = useQuery(userQueries.list());
  const selectedUserId = useSelectedUserId();

  return users?.find((u) => u.id === selectedUserId) ?? null;
}
```

That brings extra benefits:[^5]

- No extra render and no `useEffect`.
- If the user is added back to the list, the selection returns by itself; the value in the store was never removed.
- If the interface decision changes *(showing "invalid" rather than clearing the selection)*, only this hook changes.

The price: you can no longer trust `selectedUserId` in the store directly and have to use the custom hook everywhere. TkDodo does not count that as a problem: the store is a record of **what was selected** in the interface, not of the last validated value.[^5]

The same idea holds for default values that come from the server. Rather than selecting the first record with a `useEffect` once the query arrives, show the first record while the user has not chosen anything:[^5]

```ts
const selection = useSelectedProductId();
const { data: products } = useQuery(productQueries.list(filters));

const activeId = selection ?? products?.[0]?.id;
```

This approach is not specific to Zustand; it works the same way for `useState` or URL state.[^5] The general principle is in the React documentation too: do not write an Effect for a value that can be calculated.[^6]

## A cart example

Keeping the cart in the store makes sense; it is the user's choice and does not exist on the server yet. But the stock is the server's data. When the stock of a product in the cart has dropped, show the warning not by updating the store but by joining the two sources:

```tsx
function CartLine({ id }: { id: number }) {
  const item = useCartItem(id); // Zustand: the quantity the user chose
  const { data: product } = useQuery(productQueries.detail(id)); // TanStack Query: the current stock

  if (!item) return null;
  const overStock = product !== undefined && item.quantity > product.stock;

  return (
    <li>
      {item.name} × {item.quantity}
      {overStock && <p role="alert">Only {product.stock} left in stock.</p>}
    </li>
  );
}
```

When the user lowers the quantity, or the stock goes up on the server, the warning disappears by itself.

## Try it yourself

- Write the product list first with the category in `useState` and then in a Zustand store. When the filter panel and the list are in different components, which one passes fewer props?
- Sync the selected user with a `useEffect`, then write it by deriving. Delete the user from the fake API and add it back; what happens to the selection in each version?
- Lower the stock of a product in the cart in the fake API and call `invalidateQueries`. Does the warning appear?

## Going deeper

- **Article:** [TkDodo](https://tkdodo.eu/), "Deriving Client State from Server State"; deriving rather than syncing, and default values.[^5]
- **Article:** [TkDodo](https://tkdodo.eu/), "Working with Zustand"; combining the store with `useQuery` in a custom hook.[^3]
- **Official docs:** TanStack Query, "Does TanStack Query replace Redux, MobX or other global state managers?".[^2]

## Sources

1. [Kent C. Dodds](https://kentcdodds.com/): [Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react) *(article)* — From 2020. Separating the server cache from UI state.
2. [TanStack Query: Does TanStack Query replace Redux, MobX or other global state managers?](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) *(doc)* — The client state left in the global store once server state has moved out.
3. [TkDodo](https://tkdodo.eu/): [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) *(article)* — November 20, 2022. Driving a query from a filter in the store, and combining them in a custom hook.
4. [TkDodo](https://tkdodo.eu/): [React Query - The Bad Parts](https://tkdodo.eu/blog/react-query-the-bad-parts) *(video)* — React Day Berlin, December 2024. Keeping the filter in the URL and tying it to the key.
5. [TkDodo](https://tkdodo.eu/): [Deriving Client State from Server State](https://tkdodo.eu/blog/deriving-client-state-from-server-state) *(article)* — September 1, 2025. Deriving rather than syncing with a `useEffect`, the trade-off, and the default value example.
6. [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) *(doc)* — Not writing an Effect for a value that can be calculated.
