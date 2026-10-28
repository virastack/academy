---
title: "Prefetching with Next.js"
description: "Starting on the server and streaming, HydrationBoundary and who owns the data."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/prefetch-with-nextjs"
---

## First: do you really need it?

In the [!nextjs] App Router the data is mostly read in a Server Component, and you may not need TanStack Query at all *(see [Data fetching and streaming](/academy/nextjs/data-fetching-and-streaming))*. The documentation recommends starting with the framework's own tools in a new Server Component application, and adding TanStack Query when the need arises.[^1]

The cases where using them together makes sense:[^1][^2]

- Moving an application that uses TanStack Query to the App Router without rewriting the data layer.
- Infinite lists whose first page loads on the server and whose later pages load on the client.
- Client-side behaviour such as polling, optimistic updates and refetching on focus.

In this lesson the Server Component is where the query **starts**; the Client Component is what uses the data and keeps it current.

## Setup

Put the function that creates the `QueryClient` in a file of its own; you will use it on both the server and the client:[^1]

```ts
// app/get-query-client.ts
import {
  defaultShouldDehydrateQuery,
  environmentManager,
  QueryClient,
} from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stop the client refetching the server's data straight away
        staleTime: 60 * 1000,
      },
      dehydrate: {
        // Send queries that have not finished to the client too
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
        // Next.js recognises its own errors this way; do not redact them
        shouldRedactErrors: () => false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (environmentManager.isServer()) {
    // The server: a new client per request, so no data leaks between users
    return makeQueryClient();
  }
  // The browser: a single client
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
```

```tsx
// app/providers.tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "./get-query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

Wrap the inside of `<body>` in `app/layout.tsx` with `<Providers>`. Because `QueryClientProvider` uses Context, `providers.tsx` is a Client Component.[^1]

A module-level variable is used here rather than `useState(() => new QueryClient())`. The reason: if there is no `<Suspense>` between the provider and a component below it that suspends, React throws the first render away and the client created with `useState` is lost.[^1] `environmentManager.isServer()` has taken the place of the `isServer` constant you see in older examples; the constant is marked deprecated in the code.[^3]

## Start on the server, use on the client

The Server Component starts the query, serialises the cache with `dehydrate` and hands it to the client with `HydrationBoundary`:[^1]

```tsx
// app/products/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { dehydrate, HydrationBoundary, noop } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";
import { productQueries } from "@/features/products/queries";
import { ProductList } from "./product-list";

export default function ProductsPage() {
  return (
    <main>
      <h1>Products</h1>
      <Suspense fallback={<p>Loading products...</p>}>
        <PrefetchedProductList />
      </Suspense>
    </main>
  );
}

async function PrefetchedProductList() {
  await connection(); // run at request time, not at build time
  const queryClient = getQueryClient();

  // no await: the request starts and the component does not wait
  void queryClient.query(productQueries.list("all")).catch(noop);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductList />
    </HydrationBoundary>
  );
}
```

```tsx
// app/products/product-list.tsx
"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { productQueries } from "@/features/products/queries";

export function ProductList() {
  const { data: products } = useSuspenseQuery(productQueries.list("all"));
  return <ul>{products.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

Because the query has not finished, `dehydrate` sends it in its `pending` state together with the promise inside it. Since React can pass promises to Client Components, the `useSuspenseQuery` on the client awaits that same promise, and once the data is ready Next.js streams that `<Suspense>` boundary.[^1] This behaviour has been there since v5.40; before that, every prefetch had to be awaited.[^1]

> [!NOTE]
>
> `useQuery` also receives the promise instead of `useSuspenseQuery`, but Next.js does not suspend in that case; the component is rendered `pending` and the content is not rendered on the server.[^1]

The `connection()` line is needed in projects with Cache Components on *(the `create-next-app` default)*. The `QueryClient` writes a `Date.now()` timestamp onto every query; if Next.js sees that value in a component being prerendered at build time, it stops the build. `connection()` says the component will run at request time; the heading and the fallback stay in the static shell and the list streams in on request *(see [Cache and the rendering model](/academy/nextjs/caching-and-rendering))*.[^4]

## The queryFn runs in two places

The same `queryOptions` runs on both the server and the browser. When the query goes stale, the client calls the `queryFn` itself. So the `queryFn`:

- **cannot** be a `server-only` function that goes straight to the database; it does not run in the browser. Call a Route Handler or an external API *(see [Route Handlers and the proxy](/academy/nextjs/route-handlers-and-proxy))*.
- **should not** be a Server Action. The documentation does not recommend it: Server Actions called from the client run in sequence, not in parallel. That clashes with TanStack Query's model of parallel requests and refetching, and queries can get stuck `pending`.[^1]

Server Actions are a good fit for mutations. You can pass one as `useMutation`'s `mutationFn`.[^1]

```ts
"use client";

import { updateStock } from "@/app/actions";

useMutation({
  mutationFn: updateStock, // a Server Action
  onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueries.all() }),
});
```

## Who owns the data

It is tempting to take the result with `await queryClient.query(...)` on the server and show it in the Server Component. The documentation explains why that is a trap: when the client refetches the query the Client Component updates, but TanStack Query has no way of refreshing the Server Component. Two different versions of the same data are left on screen.[^1]

```tsx
// ❌ The count on the server does not stay in sync with the list on the client
const products = await queryClient.query(productQueries.list("all"));
return <p>{products.length} products</p>;
```

The rule: as far as TanStack Query is concerned, a Server Component is only a place to **prefetch**. Do not render its result on the server or pass it to another component as a prop.[^1] When you need a critical decision such as returning a 404 if the product does not exist, `await` it and handle the error without `noop`; but still do not put the result on screen.[^5]

## More than one boundary

A `HydrationBoundary` can appear in more than one place on a page; each Server Component can create its own `QueryClient` and provide its own boundary. If nested Server Components `await` one after another, you get a waterfall on the server. Prefetches made in `layout.tsx` and in parallel routes are run in parallel by Next.js.[^1]

If you want a single client per request, you can use `React.cache(() => new QueryClient())`. The price: every `dehydrate` call re-serialises **all** the queries on that client.[^1]

## Try it yourself

- Set the products page up as above. On the first load, does a product request go out from the browser in the Network tab?
- Set `staleTime` to `0` and look again. Why does the client ask for the data again straight away?
- Delete the `await connection()` line and run `npm run build`. What does the error message say?
- Delete the `void` line. Where does `ProductList` get its data from now, and what does the page render on the server?
- Pass a `server-only` function as the `queryFn`, then leave the tab and come back. Where does the error appear?

## Going deeper

- **Official docs:** "Advanced Server Rendering"; Server Components, streaming, data ownership and serialisation.[^1]
- **Official docs:** "Server Rendering & Hydration"; the basis of the hydration APIs and the difference between `await` and `void`.[^5]
- **Article:** [TkDodo](https://tkdodo.eu/), "You Might Not Need React Query"; hybrid use with Server Components.[^2]

## Sources

1. [TanStack Query: Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr) *(doc)* — The Next.js setup, streaming `pending` queries, the Server Action warning and data ownership.
2. [TkDodo](https://tkdodo.eu/): [You Might Not Need React Query](https://tkdodo.eu/blog/you-might-not-need-react-query) *(article)* — May 20, 2023. Server Components and where hybrid use fits.
3. [TanStack Query: Advanced Server Rendering, Initial setup](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr#initial-setup) *(doc)* — Creating the client on the server and in the browser with `environmentManager.isServer()`.
4. [Next.js: connection](https://nextjs.org/docs/app/api-reference/functions/connection) *(doc)* — Leaving the render to request time, and values such as `Date.now()` during prerendering.
5. [TanStack Query: Server Rendering & Hydration](https://tanstack.com/query/latest/docs/framework/react/guides/ssr) *(doc)* — `dehydrate`, `HydrationBoundary`, `await` for critical data, and the error codes.
