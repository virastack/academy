---
title: "Suspense and error handling"
description: "A global toast, throwOnError, useSuspenseQuery and retrying after an error."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/suspense-and-error-handling"
---

## Three ways to show an error

[TkDodo](https://tkdodo.eu/) lists three ways of handling an error in TanStack Query, and recommends mixing them:[^1]

| Way | Where | What for |
| :-- | :-- | :-- |
| The `error` field | The component using the query | Showing the error in that exact place |
| `QueryCache`'s `onError` | When the `QueryClient` is created | A toast, error tracking *(Sentry and the like)* |
| An Error Boundary | In the component tree | Replacing a part of the page with an error screen |

You used the `error` field in the earlier lessons. This lesson covers the other two.

## A global toast

With v5, `useQuery`'s `onSuccess`, `onError` and `onSettled` callbacks were removed. They are still there on mutations.[^2] A per-query callback ran separately in every component using that query, so it could show three toasts for one error.[^1]

The right place is the `QueryCache`. A callback there runs **once** per request and cannot be overridden the way `defaultOptions` can:[^1]

```ts
import { QueryCache, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only show a toast when a background refetch failed
      if (query.state.data !== undefined) {
        toast.error(`Data could not be updated: ${error.message}`);
      }
    },
  }),
});
```

TkDodo's preference: when there is already data on screen *(a background refetch failed)*, show a toast without disturbing the old data; show an error from the first load in the component or in an Error Boundary.[^1] This is also the best place for the error tracking code.

## An Error Boundary with throwOnError

By default the error is written to the `error` field and not thrown. Pass `throwOnError: true` and it is thrown during render, and the nearest Error Boundary catches it *(see [Suspense and error boundaries](/academy/react/suspense-and-error-boundaries))*.[^3] You can also pass a function, to send only server errors to the boundary and show 4xx responses in place:[^1]

```ts
useQuery({
  ...productQueries.detail(id),
  throwOnError: (error) => error instanceof HttpError && error.status >= 500,
});
```

The "Try again" button in the Error Boundary resets the boundary, but the query is still in the error state; it throws again as soon as it renders. To reset the query as well, use `QueryErrorResetBoundary`:[^3]

```tsx
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

<QueryErrorResetBoundary>
  {({ reset }) => (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ resetErrorBoundary }) => (
        <div>
          <p>Product could not be loaded.</p>
          <button onClick={() => resetErrorBoundary()}>Try again</button>
        </div>
      )}
    >
      <ProductDetail id={id} />
    </ErrorBoundary>
  )}
</QueryErrorResetBoundary>;
```

## useSuspenseQuery

`useSuspenseQuery` leaves the loading and error states to React: when there is no data the component **suspends** and the nearest `<Suspense>` fallback appears; on an error, an Error Boundary catches it.[^3]

```tsx
import { useSuspenseQuery } from "@tanstack/react-query";

function ProductDetail({ id }: { id: number }) {
  const { data: product } = useSuspenseQuery(productQueries.detail(id));
  //            ^? Product (not undefined)
  return <h1>{product.name}</h1>;
}

<Suspense fallback={<ProductSkeleton />}>
  <ProductDetail id={id} />
</Suspense>;
```

`data` is always defined; no `isPending` or `isError` check is needed.[^3] In return, you give some things up:[^3]

| In `useQuery` | In `useSuspenseQuery` |
| :-- | :-- |
| `enabled`, `skipToken` | Not there; the query always runs |
| `placeholderData` | Not there; the fallback appears when the key changes |
| The `throwOnError` setting | Fixed: it only throws when there is no data to show |

If you do not want the screen to fall back to the fallback when the key changes *(a page number, say)*, wrap the state update in `startTransition`. React keeps the old content on screen until the new data arrives.[^3][^4]

> [!WARNING]
>
> Two `useSuspenseQuery` calls written side by side in the same component run **in sequence**: the first suspends and the second only starts once the first one's data has arrived. For them to run in parallel, use `useSuspenseQueries`, or split the queries into separate components.[^5]

To start a query **above** the Suspense boundary there is `usePrefetchQuery`. The request then sets off without the component below the boundary having rendered:[^6]

```tsx
function ProductPage({ id }: { id: number }) {
  usePrefetchQuery(reviewQueries.list(id));

  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetail id={id} />
      <ReviewList productId={id} />
    </Suspense>
  );
}
```

## Which one when

| Situation | Recommendation |
| :-- | :-- |
| A single component with its own loading and error interface | `useQuery` + the `error` field |
| A part of the page should load together, with the skeleton at the boundary | `useSuspenseQuery` + `<Suspense>` + an Error Boundary |
| A conditional query, `placeholderData` needed | `useQuery` |
| Background errors and tracking | `QueryCache`'s `onError` |

To change the error type for the whole application, extend the `Register` interface. Say `defaultError: unknown` and you have to narrow the error at every use site:[^7]

```ts
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: HttpError;
  }
}
```

## Try it yourself

- Make the product API fail on every second request. Show a toast with `QueryCache`'s `onError`, and confirm that no toast appears for an error on the first load.
- Turn `ProductDetail` into a `useSuspenseQuery`. Press "Try again" without `QueryErrorResetBoundary`; what happens?
- Put two `useSuspenseQuery` calls in the same component and see in the Network tab that they run in sequence. Fix it with `useSuspenseQueries`.

## Going deeper

- **Article:** [TkDodo](https://tkdodo.eu/), "React Query Error Handling"; using the `error` field, the global callbacks and an Error Boundary together.[^1]
- **Official docs:** "Suspense"; `useSuspenseQuery`, the `throwOnError` default and resetting the error boundaries.[^3]
- **Article:** [TkDodo](https://tkdodo.eu/), "Breaking React Query's API on purpose"; why the query callbacks were removed.[^2]

## Sources

1. [TkDodo](https://tkdodo.eu/): [React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling) *(article)* — September 10, 2021. The three ways, the `QueryCache` callbacks, and a toast for background errors.
2. [TkDodo](https://tkdodo.eu/): [Breaking React Query's API on purpose](https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose) *(article)* — April 16, 2023. The reasoning behind removing the query callbacks in v5.
3. [TanStack Query: Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense) *(doc)* — The Suspense hooks, the `throwOnError` default, `QueryErrorResetBoundary` and `startTransition`.
4. [React: Suspense](https://react.dev/reference/react/Suspense#preventing-unwanted-fallbacks) *(doc)* — Preventing an unwanted fallback with a transition.
5. [TanStack Query: Parallel Queries](https://tanstack.com/query/latest/docs/framework/react/guides/parallel-queries) *(doc)* — Parallelism breaking in Suspense mode, and `useSuspenseQueries`.
6. [TanStack Query: Prefetching & Router Integration](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching) *(doc)* — `usePrefetchQuery` above the Suspense boundary.
7. [TanStack Query: TypeScript](https://tanstack.com/query/latest/docs/framework/react/typescript#registering-a-global-error) *(doc)* — A global error type with `Register`.
