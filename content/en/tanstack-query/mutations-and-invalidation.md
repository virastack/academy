---
title: "Mutations and invalidation"
description: "useMutation, invalidation, updating from the response and where the callbacks belong."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/mutations-and-invalidation"
---

## useMutation

Queries read data; for operations that change the data on the server *(creating, updating, deleting)* you use `useMutation`.[^1] [TkDodo](https://tkdodo.eu/) puts the difference in one sentence: *`useQuery` is declarative, `useMutation` is imperative.* A query runs by itself; a mutation waits until you call `mutate`.[^2]

```tsx
import { useMutation } from "@tanstack/react-query";

type StockUpdate = { productId: number; stock: number };

async function updateStock({ productId, stock }: StockUpdate): Promise<Product> {
  const response = await fetch(`/api/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stock }),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

export function StockForm({ productId }: { productId: number }) {
  const mutation = useMutation({ mutationFn: updateStock });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const stock = Number(new FormData(event.currentTarget).get("stock"));
        mutation.mutate({ productId, stock });
      }}
    >
      <input name="stock" type="number" min={0} />
      <button disabled={mutation.isPending}>Save</button>
      {mutation.isError && <p>Error: {mutation.error.message}</p>}
    </form>
  );
}
```

A mutation is in the `idle`, `pending`, `error` or `success` state. `mutate` takes only **one** variable; pass an object when you have more than one value. By default a failed mutation is not retried.[^1][^2]

## The cache after a mutation

The stock has been updated, but the product list still shows the old number. There are two ways to bring the cache up to date:[^2]

| Way | How | When |
| :-- | :-- | :-- |
| **Invalidation** | Mark the related queries stale and refetch them from the server | The default choice; everything the server works out *(ordering, totals)* comes back right |
| **Updating directly** | Write the mutation's response into the cache with `setQueryData` | When the server already returns the current object, to avoid an extra request |

## Invalidation

`invalidateQueries` marks every query whose key **starts with** the given key as stale:[^3][^4]

```ts
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: updateStock,
  onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: productQueries.all() }),
});
```

Invalidation does not refetch every matching query. Only the queries that are **on screen** *(active)* are refreshed at once; the rest are marked stale and refreshed the next time they are used. Even with ten different filtered lists in the cache, a request goes out only for the visible one.[^5]

**Returning** the promise from the callback matters. Return it and the mutation stays `pending` until the refetch has finished, so the button stays disabled until the new data arrives:[^3][^2]

```ts
// ❌ The promise is lost; the button re-enables before the new data arrives
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: productQueries.all() });
},

// ✅ The promise is returned; the mutation finishes when the refetch does
onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueries.all() }),
```

For narrower targeting, use `exact: true` or a `predicate`.[^4] If you built the keys from general to specific *(see [useQuery and query keys](/academy/tanstack-query/use-query-and-query-keys))*, the prefix is usually enough.

## Updating from the response

If the server returns the updated product, write it straight into the detail query:[^6]

```ts
useMutation({
  mutationFn: updateStock,
  onSuccess: (updatedProduct) => {
    queryClient.setQueryData(
      productQueries.detail(updatedProduct.id).queryKey,
      updatedProduct,
    );
  },
});
```

The updater function you pass to `setQueryData` must **not change** the old data; it has to return a new object. Changing the object in the cache in place looks as though it works at first and then produces bugs that are hard to spot.[^6]

```ts
queryClient.setQueryData(productQueries.detail(id).queryKey, (old) =>
  old ? { ...old, stock: newStock } : old,
);
```

## Where the callbacks belong

You can pass callbacks to `useMutation` and to `mutate`. The ones on `useMutation` run first. The ones passed to `mutate` **never run at all** if the component is removed before the mutation finishes.[^1][^2] TkDodo turns that difference into a rule:[^2]

- **Logic** *(invalidation, cache updates)* goes in the `useMutation` callbacks.
- **Interface** *(navigation, a toast, resetting the form)* goes in the `mutate` callbacks. If the user has left the page, showing a toast is pointless anyway.

```ts
mutation.mutate(
  { productId, stock },
  { onSuccess: () => toast.success("Stock updated") },
);
```

In v5 the callbacks receive a `context` object as their last argument, holding the `client` *(the QueryClient)*, `meta` and `mutationKey`. What `onMutate` returns arrives in the other callbacks as `onMutateResult`.[^1]

## mutate or mutateAsync

`mutate` returns nothing and catches the error itself. `mutateAsync` returns a promise, and if you do not catch the error you get an unhandled promise rejection. TkDodo's advice is `mutate` almost always; reach for `mutateAsync` only when you need to await several mutations at once.[^2]

## Invalidation after every mutation

Rather than writing a separate invalidation in every `useMutation`, you can give the `MutationCache` one global callback. `MutationCache` callbacks run before the ones on `useMutation`:[^5]

```ts
import { MutationCache, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  }),
});
```

No promise is returned here, so the mutation finishes without waiting for the refetches. In a mutation where you do want to wait for a particular refetch, return that invalidation from `useMutation`'s own `onSuccess`.[^5]

It looks excessive, but since invalidation only refetches the queries on screen, it is a good balance in most applications. To narrow the scope you can use the mutation's `mutationKey` or its `meta` field.[^5]

To share mutation settings the way `queryOptions` does, there is `mutationOptions`:[^7]

```ts
export const updateStockOptions = () =>
  mutationOptions({ mutationKey: ["products", "update-stock"], mutationFn: updateStock });
```

## Try it yourself

- Set up the stock form and see that the list does not update after you save. Add `invalidateQueries`.
- Do not return the promise in `onSuccess` and look at when the button becomes active again. Then return it.
- Use `setQueryData` instead of invalidation. How many requests do you see in the Network tab?
- Pass an `onSuccess` to `mutate` and remove the component while the mutation is in flight. Does the callback run?

## Going deeper

- **Article:** [TkDodo](https://tkdodo.eu/), "Mastering Mutations in React Query"; invalidation against direct updates, where the callbacks belong, and the common mistakes.[^2]
- **Article:** [TkDodo](https://tkdodo.eu/), "Automatic Query Invalidation after Mutations"; the global callback, and targeting with `mutationKey` and `meta`.[^5]
- **Official docs:** "Mutations"; the states, the callback order, sequential mutations with `scope`, and offline mutations.[^1]

## Sources

1. [TanStack Query: Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) *(doc)* — `useMutation`, the states, the callback signatures and order, `mutateAsync` and retrying.
2. [TkDodo](https://tkdodo.eu/): [Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query) *(article)* — October 9, 2021. Declarative against imperative, returning the promise, and `mutate` against `mutateAsync`.
3. [TanStack Query: Invalidations from Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations) *(doc)* — Invalidation in `onSuccess`, and the effect of returning the promise.
4. [TanStack Query: Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation) *(doc)* — Prefix matching, `exact` and `predicate`.
5. [TkDodo](https://tkdodo.eu/): [Automatic Query Invalidation after Mutations](https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations) *(article)* — May 25, 2024. `MutationCache` callbacks, and invalidation only refetching the active queries.
6. [TanStack Query: Updates from Mutation Responses](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses) *(doc)* — Writing the response into the cache with `setQueryData`, and immutability.
7. [TanStack Query: TypeScript](https://tanstack.com/query/latest/docs/framework/react/typescript#typing-mutation-options) *(doc)* — Sharing mutation settings with `mutationOptions`.
