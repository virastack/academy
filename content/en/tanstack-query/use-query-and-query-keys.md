---
title: "useQuery and query keys"
description: "status against fetchStatus, building the key like a dependency array, and cancellation."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/use-query-and-query-keys"
---

## The first query

`useQuery` asks for at least two things: a **query key** that identifies the data, and a **query function** that fetches it:[^1]

```tsx
import { useQuery } from "@tanstack/react-query";

type Product = { id: number; name: string; price: number };

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("/api/products");
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

export function ProductList() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>Error: {error.message}</p>;

  return <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

After the `isPending` and `isError` checks, TypeScript knows `data` is defined; you do not have to write `data!`.[^1][^2]

The query function has two rules:[^3]

- **It has to throw.** The library only learns about an error from a thrown error or a rejected promise. `fetch` does not throw on a 404 or a 500 response; check `response.ok` yourself.
- **It must not return `undefined`.** A query that returns `undefined` counts as failed. If you mean "there is no data", return `null`.

## status and fetchStatus

There are two separate states on the result object. `status` is about the **data**: do you have any? `fetchStatus` is about the **query function**: is it running right now?[^1]

| Field | Values | The question |
| :-- | :-- | :-- |
| `status` | `pending`, `error`, `success` | Is there data, or was there an error? |
| `fetchStatus` | `fetching`, `paused`, `idle` | Is a request in flight right now? |

The two are independent. A query in the `success` state becomes `fetching` while it refreshes in the background. A query waiting for data stays `pending` but `paused` when there is no connection.[^1] The derived flags come from these two:

| Flag | When it is `true` | What it is for |
| :-- | :-- | :-- |
| `isPending` | There is no data yet | The first skeleton |
| `isFetching` | Any request is in flight, background ones included | The small loading indicator in the corner |
| `isLoading` | `isPending && isFetching`; the first request is in flight | Queries that run conditionally *(see [Dependent and parallel queries](/academy/tanstack-query/dependent-and-parallel-queries))* |

[TkDodo](https://tkdodo.eu/) reminds people that the order of the checks matters. If a background refetch fails, the query is both in the `error` state and holding the old data. Check the error first and the list the user is looking at turns into an error screen after a few seconds of retrying. That is why he recommends looking at the data first on most screens:[^4]

```tsx
if (data) return <ProductTable products={data} />;
if (error) return <p>Error: {error.message}</p>;
return <p>Loading...</p>;
```

Which order is right depends on the screen. What matters is knowing that `error` does not mean "there is no data".

## A query key is a dependency array

The cache is kept per query key. The key is an array and can contain anything that serialises with `JSON.stringify`.[^5] Every variable the query function uses and that can change has to go into the key:[^5]

```tsx
function ProductList({ category }: { category: string }) {
  const { data } = useQuery({
    queryKey: ["products", category],
    queryFn: () => fetchProducts(category),
  });
  // ...
}
```

When `category` changes the key changes, the library sees it as a new cache entry and fetches the data. Go back to the old category and the data comes from the cache instantly.[^5] TkDodo likens this to `useEffect`'s dependency array: the key says what the query depends on.[^6] If you forget to add a variable to the key, the `exhaustive-deps` lint rule warns you.[^5]

Keys are hashed deterministically. The order inside an object does not matter; the order in the array does:[^5]

```ts
// The same query
["products", { page: 1, sort: "price" }]
["products", { sort: "price", page: 1 }]

// Different queries
["products", 1, "price"]
["products", "price", 1]
```

> [!DONT]
>
> - Trying to pass a parameter to `refetch`. `refetch` takes no arguments. What you do when a filter changes is write the filter into state or the URL and add it to the key. As TkDodo puts it, you move from "refetch when the button is pressed" to "I want the data that matches this state".[^7]

## Organising the keys

Build the keys **from general to specific**. That way a single prefix can target every related query:[^8]

```ts
["products"]                                 // everything about products
["products", "list", { category: "shoes" }]  // one list
["products", "detail", 42]                   // one product
```

`invalidateQueries({ queryKey: ["products"] })` targets all of them, and `["products", "list"]` only the lists. Writing the key out by hand everywhere is error-prone; to produce it in one place, move on to the [queryOptions and select](/academy/tanstack-query/query-options-and-select) lesson.

## Cancelling the request

The query function receives a `signal`. Pass it to `fetch` and a request that is no longer needed is cancelled when the key changes or the component is removed:[^9][^10]

```ts
useQuery({
  queryKey: ["products", category],
  queryFn: async ({ signal }) => {
    const response = await fetch(`/api/products?category=${category}`, { signal });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json() as Promise<Product[]>;
  },
});
```

Without the `signal` the request is not cancelled; it completes and its result is written to the cache. Since the data is then ready when the component opens again, that often works out well too.[^9]

Along with the `signal`, the context object passed to the query function also carries `queryKey`, `client` and `meta`.[^3]

## Try it yourself

- Set up a category list and a product list. Change the category and go back; how many cache entries do you see in the Devtools?
- Take `category` out of the key. What changes on screen, and what does the lint rule say?
- Add the `signal` to the `queryFn` and change the category quickly in the Network tab. Do you see the cancelled requests?
- Move the `if (error)` check in front of `if (data)`, then make the API fail on the second request and come back to the tab.

## Going deeper

- **Official docs:** the "Queries", "Query Keys" and "Query Functions" pages; the states, the key rules and the context object.[^1][^5][^3]
- **Article:** [TkDodo](https://tkdodo.eu/), "Effective React Query Keys"; key structure and hierarchy.[^8]
- **Article:** [TkDodo](https://tkdodo.eu/), "Status Checks in React Query"; why you should look at the data first when a background refetch fails.[^4]

## Sources

1. [TanStack Query: Queries](https://tanstack.com/query/latest/docs/framework/react/guides/queries) *(doc)* — `useQuery`, and the distinction between `status` and `fetchStatus`.
2. [TanStack Query: TypeScript](https://tanstack.com/query/latest/docs/framework/react/typescript) *(doc)* — The result type being narrowed by `status`.
3. [TanStack Query: Query Functions](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions) *(doc)* — Throwing errors, use with `fetch`, the `undefined` rule and `QueryFunctionContext`.
4. [TkDodo](https://tkdodo.eu/): [Status Checks in React Query](https://tkdodo.eu/blog/status-checks-in-react-query) *(article)* — March 27, 2021. Background errors, and checking the data first.
5. [TanStack Query: Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) *(doc)* — Array keys, the deterministic hash, and adding variables to the key.
6. [TkDodo](https://tkdodo.eu/): [Practical React Query](https://tkdodo.eu/blog/practical-react-query) *(article)* — November 16, 2020. Thinking of a query key as a dependency array.
7. [TkDodo](https://tkdodo.eu/): [React Query - The Bad Parts](https://tkdodo.eu/blog/react-query-the-bad-parts) *(video)* — React Day Berlin, December 2024. Why `refetch` takes no parameters, and declarative thinking.
8. [TkDodo](https://tkdodo.eu/): [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys) *(article)* — June 13, 2021. Key structure from general to specific, and the query key factory.
9. [TanStack Query: Query Cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation) *(doc)* — Cancelling a request with an `AbortSignal`.
10. [TkDodo](https://tkdodo.eu/): [Why You Want React Query](https://tkdodo.eu/blog/why-you-want-react-query) *(article)* — November 7, 2023. Cancellation by passing the `signal` to `fetch`.
