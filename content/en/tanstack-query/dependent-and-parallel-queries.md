---
title: "Dependent and parallel queries"
description: "useQueries, enabled and skipToken, request waterfalls and prefetching on hover."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/dependent-and-parallel-queries"
---

## Parallel queries

`useQuery` calls written side by side in the same component run in parallel by themselves; you need do nothing extra:[^1]

```tsx
function ProductPage({ id }: { id: number }) {
  const product = useQuery(productQueries.detail(id));
  const reviews = useQuery(reviewQueries.list(id));
  // both requests start at the same time
}
```

When the number of queries changes from render to render, you cannot call `useQuery` in a loop; the rules of hooks do not allow it. `useQueries` is there for that:[^1]

```tsx
function CartSummary({ productIds }: { productIds: number[] }) {
  const total = useQueries({
    queries: productIds.map((id) => productQueries.detail(id)),
    combine: (results) => ({
      price: results.reduce((sum, result) => sum + (result.data?.price ?? 0), 0),
      isPending: results.some((result) => result.isPending),
    }),
  });

  if (total.isPending) return <p>Calculating...</p>;
  return <p>Total: €{total.price}</p>;
}
```

`combine` turns the array of results into a single value. The result is kept by structural sharing; as long as the value does not change, neither does its reference.[^2] Use `queryOptions` and the type inference inside `useQueries` is kept too.[^1]

## Dependent queries

When the second query needs the first one's result, hold it back with `enabled`:[^3]

```tsx
const { data: user } = useQuery(userQueries.me());

const { data: orders, isLoading } = useQuery({
  ...orderQueries.list(user?.id ?? 0),
  enabled: !!user?.id,
});
```

A query with `enabled: false` waits in the `status: 'pending'` and `fetchStatus: 'idle'` state. That is why `isPending` is not the right flag for a loading state here; it is `true` before the request has even started. Use `isLoading`, which is `true` only while the first request really is in flight.[^3][^4]

If you use TypeScript, `skipToken` does the same job type-safely. You do not have to write a fake value such as `user?.id ?? 0`:[^4]

```tsx
import { skipToken, useQuery } from "@tanstack/react-query";

const { data: orders } = useQuery({
  queryKey: ["orders", user?.id],
  queryFn: user ? () => fetchOrders(user.id) : skipToken,
});
```

> [!WARNING]
>
> `refetch()` does not work on a query set up with `skipToken`; it gives a `Missing queryFn` error. When you need to trigger the query by hand, use `enabled: false`.[^4]

You can also use `enabled` in a filter form: the query does not run until the user applies the filter, and the moment they do, the key and `enabled` change together.[^4] TkDodo counts `enabled` among the library's most powerful options.[^5]

## Request waterfalls

One request waiting for another to finish before it starts makes a **waterfall**. The documentation describes it as the biggest performance trap in libraries that fetch data inside components.[^6] Three typical sources:[^6]

| Waterfall | Example | The fix |
| :-- | :-- | :-- |
| Sequential queries in one component | The user first, then their orders | A single endpoint in the API *(`/me/orders`)*, or moving it to the server |
| Nested components | `Article` waits for its data and `Comments` renders afterwards | Moving the query up, or prefetching |
| Code splitting | A lazy component loads and the query inside it only starts afterwards | Starting the query before the lazy component |

The nested waterfall is the sneaky one: the child component's own query only starts once the parent has waited for its data and rendered the child. If the `id` `Comments` needs is already in `Article`, both queries can start at once.[^6] You do not have to fix all of them; glancing at the Network tab now and then to notice them is enough.[^6]

## Prefetching in an event handler

You can load a product's detail in advance when the user moves the pointer over it. By the time they click, the data is ready in the cache. With v5.102, `prefetchQuery` and `ensureQueryData` were deprecated in favour of `queryClient.query`:[^7][^8]

```tsx
import { noop, useQueryClient } from "@tanstack/react-query";

function ProductLink({ id, children }: { id: number; children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    void queryClient.query(productQueries.detail(id)).catch(noop);
  };

  return (
    <a href={`/products/${id}`} onMouseEnter={prefetch} onFocus={prefetch}>
      {children}
    </a>
  );
}
```

`query` fetches the data, writes it to the cache and returns the result; it throws on an error. Since the result is not needed when prefetching, the promise is left with `void` and the error is swallowed with `noop`; the real `useQuery` retries the error anyway.[^7] If the data is fresher than the `staleTime`, no request goes out. That is why giving a prefetched query a `staleTime` matters; without one, a request goes out on every movement of the pointer.[^7]

> [!NOTE]
>
> In older writing and code you will see `queryClient.prefetchQuery(...)`. It still works but will be removed in the next major version. In new code, write `void queryClient.query(...).catch(noop)`.[^7][^8]

## Try it yourself

- Write the product and review queries in the same component and see in the Network tab that they start at the same time. Move the reviews into a child component that renders once the product has loaded; do you see the waterfall?
- Work out the total price from the product ids in the cart with `useQueries` and `combine`.
- Write the dependent query first with `enabled` and then with `skipToken`. Look at the difference in the types.
- Add hover prefetching to the product links, remove the `staleTime` and move the pointer across the links.

## Going deeper

- **Official docs:** "Performance & Request Waterfalls"; the kinds of waterfall, code splitting and the role of Server Components.[^6]
- **Official docs:** "Prefetching & Router Integration"; prefetching at the event handler, component and router level.[^7]
- **Article:** [TkDodo](https://tkdodo.eu/), "Seeding the Query Cache"; Suspense waterfalls and filling the cache in advance.[^9]

## Sources

1. [TanStack Query: Parallel Queries](https://tanstack.com/query/latest/docs/framework/react/guides/parallel-queries) *(doc)* — Queries side by side, `useQueries`, and parallelism with Suspense.
2. [TanStack Query: useQueries](https://tanstack.com/query/latest/docs/framework/react/reference/functions/useQueries) *(doc)* — The `combine` option and structural sharing.
3. [TanStack Query: Dependent Queries](https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries) *(doc)* — A dependent query with `enabled`, and the state transitions.
4. [TanStack Query: Disabling/Pausing Queries](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries) *(doc)* — `enabled: false`, lazy queries, `isLoading` and `skipToken`.
5. [TkDodo](https://tkdodo.eu/): [Practical React Query](https://tkdodo.eu/blog/practical-react-query) *(article)* — November 16, 2020. Where the `enabled` option is used.
6. [TanStack Query: Performance & Request Waterfalls](https://tanstack.com/query/latest/docs/framework/react/guides/request-waterfalls) *(doc)* — Sequential query, nested component and code splitting waterfalls.
7. [TanStack Query: Prefetching & Router Integration](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching) *(doc)* — Prefetching with `queryClient.query`, `noop` and `staleTime`.
8. [TanStack Query: QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient) *(doc)* — The `query` method, and the deprecated `fetchQuery`, `prefetchQuery` and `ensureQueryData`.
9. [TkDodo](https://tkdodo.eu/): [Seeding the Query Cache](https://tkdodo.eu/blog/seeding-the-query-cache) *(article)* — October 22, 2022. Waterfalls, Suspense and prefetching.
