---
title: "Data fetching and streaming"
description: "Reading data on the server, streaming with Suspense, avoiding waterfalls and data on the client."
lastVerified: "2026-10-21"
translationKey: "nextjs/data-fetching-and-streaming"
---

## Reading data in the component

A Server Component can be `async`. You read the data with `fetch`, with an ORM, or straight from the database. No API layer is needed in between, and the credentials never reach the client.[^1]

```tsx
// app/products/page.tsx
import { getProducts } from "@/lib/products";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <ul>
      {products.map((product) => (
        <li key={product.slug}>{product.name}</li>
      ))}
    </ul>
  );
}
```

> [!DONT]
>
> - Sending a `fetch` from a Server Component to your own `app/api/...` route. Both run on the server; all you gain is an extra HTTP request. It is the first item on [Lee Robinson](https://leerob.com/)'s list of the mistakes he sees most often in the App Router: call the function directly.[^2]

Read the data in the component that uses it rather than carrying it down as a prop. `fetch` requests to the same address are deduplicated automatically within a single render. For access that does not go through `fetch` *(an ORM, an SDK)*, wrap the function in React's `cache`; repeat calls within the same request then share one result.[^1][^3]

```ts
// lib/user.ts
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
```

`React.cache` only applies within **a single request**; it does not keep data between requests.[^1] Caching between requests is the subject of [the next lesson](/academy/nextjs/caching-and-rendering).

## Streaming: send what is ready first

A slow query holds up the whole page. **Streaming** splits the page into pieces, sends what is ready immediately and streams the slow part afterwards. There are two ways to do it:[^1]

| Way | What it wraps | When |
| :-- | :-- | :-- |
| `loading.tsx` | The whole page in the segment | When one skeleton for the page is enough |
| `<Suspense>` | Only the slow component | When you want the rest of the page visible at once |

```tsx
import { Suspense } from "react";

export default function ProductPage() {
  return (
    <>
      <ProductInfo />
      <Suspense fallback={<p>Loading reviews...</p>}>
        <Reviews />
      </Suspense>
    </>
  );
}
```

In a project with Cache Components on, this choice is not optional. Read uncached data outside a `<Suspense>` and Next.js gives a **blocking route** warning in development, with two suggested fixes: wrap it in a `<Suspense>`, or cache the data with `"use cache"`.[^4]

The documentation's advice is to put the `<Suspense>` close to the data. `loading.tsx` only wraps the page; data read in the layout of the same segment does not wait for it but blocks the navigation.[^1] Design the fallback to mean something too: a title, a cover image or the skeleton of the next screen is better than a spinning icon.[^1]

> [!NOTE]
>
> Pages are not streamed to search engine bots. Next.js waits for the data and sends completed HTML.[^5]

## Avoiding waterfalls

`await`s written one after another inside a component run in sequence. If they do not depend on each other, start the requests first and wait afterwards:[^1]

```tsx
// Sequential: total time = the sum of both
const product = await getProduct(slug);
const reviews = await getReviews(slug);

// Parallel: total time = the slowest one
const [product, reviews] = await Promise.all([getProduct(slug), getReviews(slug)]);
```

A better route is usually to **split the data across components**. `<ProductInfo>` and `<Reviews>` read their own data, and each streams independently with its own `<Suspense>`. Sibling Suspense boundaries work in parallel.[^5]

When the second request depends on the result of the first *(the artist first, then their albums)*, the waterfall is unavoidable. Make sure the first request is fast, or cache its result.[^1]

## Streaming a promise to the client

When a Client Component needs server data, pass the promise as a prop without `await`ing it, and read it on the client with React's `use`:[^1][^6]

```tsx
// app/products/[slug]/page.tsx
export default function Page() {
  const reviews = getReviews("canvas-sneaker"); // no await

  return (
    <Suspense fallback={<p>Loading reviews...</p>}>
      <ReviewList reviews={reviews} />
    </Suspense>
  );
}
```

```tsx
// components/review-list.tsx
"use client";

import { use } from "react";

export function ReviewList({ reviews }: { reviews: Promise<Review[]> }) {
  const items = use(reviews);
  return <ul>{items.map((review) => <li key={review.id}>{review.text}</li>)}</ul>;
}
```

## Data on the client: when you need a library

Server Components are enough for most pages. Per the documentation, if a Client Component will read server data once, a promise plus `use` is enough; when you need a shared cache in the browser *(refetch on focus, polling, an infinite list, optimistic updates)*, you reach for SWR or [!tanstack-query].[^7]

TanStack Query's maintainer [Dominik Dorfmeister](https://tkdodo.eu/) comes to the same conclusion about Server Components: when the data is mostly read on the server and there is little interaction, you may not need the library; but it is still valuable on screens with data that changes often on the client.[^8] Prefilling a query on the server is in the [TanStack Query](/academy/tanstack-query) guide.

## Try it yourself

- Add a one-second delay to `getProduct` and `getReviews`. Compare consecutive `await`s with `Promise.all`.
- Take `Reviews` out of the `<Suspense>`. How much later does the page appear?
- Add `app/products/loading.tsx` and watch the skeleton as you navigate between products.
- Pass an awaited array to `ReviewList` instead of a promise. Where do you see the difference?

## Going deeper

- **Official docs:** the "Streaming" guide; how the HTML stream works, its effect on Core Web Vitals, and the layers such as proxies and CDNs that break streaming.[^5]
- **Article:** [Lee Robinson](https://leerob.com/), "Common mistakes with the Next.js App Router"; ten mistakes, from calling a Route Handler needlessly to putting Suspense in the wrong place.[^2]
- **Article:** [Dominik Dorfmeister](https://tkdodo.eu/), "You Might Not Need React Query"; what Server Components mean for client data libraries.[^8]
- **Official docs:** the "Client-side data fetching" guide; giving the first data from the server and carrying on with a client cache.[^7]

## Sources

1. [Next.js: Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data) *(doc)* — Data in a Server Component, `loading.js` and Suspense, sequential and parallel requests, `React.cache`, preloading and `use`.
2. [Lee Robinson](https://leerob.com/): [Common mistakes with the Next.js App Router and how to fix them](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) *(article)* — The Vercel blog. Calling a Route Handler from a Server Component, and other common mistakes.
3. [React: cache](https://react.dev/reference/react/cache) *(doc)* — Request-scoped memoisation and its limits.
4. [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching) *(doc)* — Uncached data streaming inside Suspense, and the fixes in the blocking route warning.
5. [Next.js: Streaming](https://nextjs.org/docs/app/guides/streaming) *(doc)* — Sibling and nested Suspense boundaries, bots, HTTP status codes and Web Vitals.
6. [React: use](https://react.dev/reference/react/use) *(doc)* — Reading a promise on the client, and whether it resolves on the server or the client.
7. [Next.js: Client-side data fetching](https://nextjs.org/docs/app/guides/client-side-data-fetching) *(doc)* — When a library is needed, the first data from the server, and coordinating the cache layers.
8. [Dominik Dorfmeister](https://tkdodo.eu/): [You Might Not Need React Query](https://tkdodo.eu/blog/you-might-not-need-react-query) *(article)* — From 2023. Server Components and where React Query fits.
