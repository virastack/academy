---
title: "queryOptions and select"
description: "Query factories, typed cache reads and reducing renders by selecting data."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/query-options-and-select"
---

## Why a custom hook is not enough

When you use a query in more than one place, the first thing that comes to mind is writing a custom hook:

```ts
export function useProduct(id: number) {
  return useQuery({
    queryKey: ["products", "detail", id],
    queryFn: () => fetchProduct(id),
  });
}
```

[TkDodo](https://tkdodo.eu/) recommended this pattern for years and then changed his mind. His reasons:[^1]

- A hook can only be called in a component or in another hook. But you also want the same query in an event handler for prefetching, in a route loader, or on the server.
- What is being shared here is not logic but **configuration**. A hook is a heavier tool than that needs.
- A hook ties you to `useQuery`. The moment you want the same query with `useSuspenseQuery` or `useQueries`, it is no use.

## queryOptions

`queryOptions`, which arrived with v5, does nothing at runtime; it returns the object it was given. Its value is on the type side:[^2][^3]

```ts
// src/features/products/queries.ts
import { queryOptions } from "@tanstack/react-query";

export function productOptions(id: number) {
  return queryOptions({
    queryKey: ["products", "detail", id],
    queryFn: () => fetchProduct(id),
    staleTime: 30 * 1000,
  });
}
```

The same configuration works everywhere:[^2]

```ts
useQuery(productOptions(1));
useSuspenseQuery(productOptions(2));
useQueries({ queries: [productOptions(1), productOptions(2)] });
queryClient.query(productOptions(3));
queryClient.setQueryData(productOptions(4).queryKey, updatedProduct);
```

The `queryKey` and the `queryFn` now sit next to each other. As TkDodo puts it, *"separating the query key from the query function was a mistake"*: the key defines the function's dependencies, and keeping them in separate files makes them hard to keep in sync.[^3] The `prefer-query-options` lint rule enforces this pattern.[^4]

## A query factory

Gather the key hierarchy and the `queryOptions` into one object. The entries that return only a key are for bulk invalidation, and the ones that return `queryOptions` are for the query itself:[^3]

```ts
export const productQueries = {
  all: () => ["products"] as const,
  lists: () => [...productQueries.all(), "list"] as const,
  list: (category: string) =>
    queryOptions({
      queryKey: [...productQueries.lists(), category],
      queryFn: () => fetchProducts(category),
    }),
  details: () => [...productQueries.all(), "detail"] as const,
  detail: (id: number) =>
    queryOptions({
      queryKey: [...productQueries.details(), id],
      queryFn: () => fetchProduct(id),
      staleTime: 30 * 1000,
    }),
};
```

```ts
useQuery(productQueries.detail(id));
queryClient.invalidateQueries({ queryKey: productQueries.lists() });
```

Keep the factory in the feature's folder *(`features/products/queries.ts`, for instance)*. For the folder layout, see the [Folder structure](/academy/architecture/folder-structure) lesson.

## Adding to it where it is used

Start adding parameters to the shared configuration and you are back to the problem with the custom hook. TkDodo's rule: *the best abstractions are the ones that cannot be configured*. The shared configuration stays fixed, and you override the extras where it is used:[^1]

```ts
const { data: productName } = useQuery({
  ...productQueries.detail(id),
  select: (product) => product.name,
});
//      ^? string | undefined
```

Type inference is not broken; the type of `data` follows what `select` returns.[^1]

## Typed cache reads

`queryClient.getQueryData(["products", "detail", 1])` normally returns `unknown`; the library cannot know what sits behind that key. A key that comes from `queryOptions`, on the other hand, is **tagged** with the `queryFn`'s return type:[^3][^5]

```ts
const product = queryClient.getQueryData(productQueries.detail(1).queryKey);
//    ^? Product | undefined
```

Change `fetchProduct`'s return type and this line fails in the compiler too; a hand-written `getQueryData<Product>` would not have.[^3]

> [!TIP]
>
> For the inference to work, do not pass a generic to `useQuery`. Type the `queryFn`'s return value correctly and the library works out the rest. Wrap clients that return `any`, such as `axios`, in a typed function.[^5][^6]

## Picking with select

`select` returns a piece of the data in the cache, or a transformed version of it. The full response stays in the cache; the component only subscribes to `select`'s result and is re-rendered **only when that result changes**:[^7][^8]

```ts
const selectStockCount = (products: Product[]) =>
  products.filter((product) => product.stock > 0).length;

function StockBadge({ category }: { category: string }) {
  const { data: count } = useQuery({
    ...productQueries.list(category),
    select: selectStockCount,
  });
  return <span>{count} products in stock</span>;
}
```

`select` runs again in two cases: when the data changes, or when the `select` function's reference changes. A function written inline is new on every render. If the transformation is expensive, move the function outside the component, or wrap it in `useCallback` when it depends on props.[^7][^8]

> [!WARNING]
>
> Do not throw inside `select`. `select` only works with successful data; the error state is the `queryFn`'s job.[^7]

Two more optimisations that reduce renders are on by default: **structural sharing** keeps the reference of data that has not changed, and **tracked properties** only trigger a render when the fields you actually use *(`data`, `isFetching` and so on)* change. Rest destructuring, as in `const { data, ...rest } = useQuery()`, breaks the second one.[^7]

## Try it yourself

- Turn a custom hook in your project into `queryOptions` and use the same configuration with both `useQuery` and `queryClient.getQueryData`.
- Pass the key from `queryOptions` to `getQueryData` and look at the return type. Then write the key out by hand; what does the type become?
- Write a badge on a product list that shows only the number of products in stock. With the React DevTools Profiler, check whether the badge re-renders when a product's name changes.

## Going deeper

- **Article:** [TkDodo](https://tkdodo.eu/), "Creating Query Abstractions"; the reasoning behind moving from a custom hook to `queryOptions`.[^1]
- **Article:** [TkDodo](https://tkdodo.eu/), "The Query Options API"; `DataTag`, the query factory, and keeping the key with the function.[^3]
- **Article:** [TkDodo](https://tkdodo.eu/), "React Query Selectors, Supercharged"; typing `select` and memoising expensive transformations.[^8]

## Sources

1. [TkDodo](https://tkdodo.eu/): [Creating Query Abstractions](https://tkdodo.eu/blog/creating-query-abstractions) *(article)* — February 23, 2026. The limits of custom hooks, and extending `queryOptions` where it is used.
2. [TanStack Query: Query Options](https://tanstack.com/query/latest/docs/framework/react/guides/query-options) *(doc)* — Sharing `queryOptions` across different hooks and `QueryClient` methods.
3. [TkDodo](https://tkdodo.eu/): [The Query Options API](https://tkdodo.eu/blog/the-query-options-api) *(article)* — January 17, 2024. `DataTag`, the query factory, and keeping the key with the function.
4. [TanStack Query: prefer-query-options](https://tanstack.com/query/latest/docs/eslint/prefer-query-options) *(doc)* — The rule that makes you define `queryKey` and `queryFn` together with `queryOptions`.
5. [TanStack Query: TypeScript](https://tanstack.com/query/latest/docs/framework/react/typescript) *(doc)* — Type inference, typed `getQueryData` through `queryOptions`, and the global error type.
6. [TkDodo](https://tkdodo.eu/): [React Query and TypeScript](https://tkdodo.eu/blog/react-query-and-type-script) *(article)* — May 16, 2021. Trusting inference rather than passing a generic.
7. [TanStack Query: Render Optimizations](https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations) *(doc)* — Structural sharing, tracked properties, and the memoisation rules for `select`.
8. [TkDodo](https://tkdodo.eu/): [React Query Selectors, Supercharged](https://tkdodo.eu/blog/react-query-selectors-supercharged) *(article)* — August 4, 2025. Fine-grained subscriptions, and keeping `select` stable.
