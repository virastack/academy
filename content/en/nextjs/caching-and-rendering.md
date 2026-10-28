---
title: "Cache and the rendering model"
description: "Cache Components, use cache, cacheLife, cacheTag and the static shell."
lastVerified: "2026-10-21"
translationKey: "nextjs/caching-and-rendering"
---

## The default: everything is dynamic

Next.js's cache model has changed over the last three releases. In Next.js 14, `fetch` was cached by default; in 15 that default was removed.[^1] **Cache Components**, which arrived with 16, turned the rule around: data is read fresh on every request, and you say what to cache with `"use cache"`.[^2] Since 16.4 this model comes on in new projects.[^3]

> [!WARNING]
>
> AI tools and older tutorials still suggest `export const dynamic = "force-static"`, `export const revalidate = 60` or `fetch(url, { next: { revalidate: 60 } })`. Those belong to the previous model. In Cache Components their counterparts are `"use cache"` and `cacheLife`.[^4]

## The static shell

During the build, Next.js tries to render every page. Everything it can finish goes into the **static shell** and is served instantly from the CDN. For the parts it cannot finish, the `<Suspense>` fallback goes into the shell and the content streams in at request time. The name of this model is **Partial Prerendering** *(PPR)*.[^2]

| In the code | Result |
| :-- | :-- |
| Static JSX, imports, pure calculation | Goes into the shell |
| Data cached with `"use cache"` | Goes into the shell |
| Uncached data inside a `<Suspense>`, `cookies()`, `headers()` | The fallback goes into the shell and the content streams at request time |
| Uncached data outside a `<Suspense>` | A warning in development, with the suggested fixes |

In the `next build` output, pages like this appear with a `◐` *(Partial Prerender)* mark. In this guide's [project](/academy/nextjs/project) application, the product page was marked this way, with cached product information and streaming stock information.

The pattern the Next.js team recommends is pushing the async work **as far down** the tree as possible. The deeper it is, the fuller the shell.[^2]

## use cache

`"use cache"` caches the result of an async function or component. The arguments go into the cache key automatically; `getProduct("a")` and `getProduct("b")` are separate entries.[^5]

```ts
// lib/products.ts
import { cacheLife, cacheTag } from "next/cache";

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `product-${slug}`);

  return db.product.findUnique({ where: { slug } });
}
```

The documentation recommends writing a `cacheLife` next to every `"use cache"`; without one, the `default` profile applies.[^2] The profiles in common use:[^6]

| Profile | Fresh in the browser *(stale)* | Refreshed in the background *(revalidate)* | Expires *(expire)* |
| :-- | :-- | :-- | :-- |
| `minutes` | 5 min | 1 min | 1 hour |
| `hours` | 5 min | 1 hour | 1 day |
| `days` | 5 min | 1 day | 1 week |
| `max` | 5 min | 30 days | 1 year |

Very short-lived caches such as `seconds` are not taken into the shell and stay a dynamic hole.[^6]

You can also write `"use cache"` on a component. Dynamic content you pass to a cached component as `children` does not go into the cache entry; it passes through as it is.[^5]

## Data specific to the user

`cookies()`, `headers()` and `searchParams` are only known at request time. A component that reads them has to be inside a `<Suspense>`.[^2]

```tsx
import { cookies } from "next/headers";
import { Suspense } from "react";

export default function Page() {
  return (
    <>
      <h1>Store</h1>
      <Suspense fallback={<span>Cart</span>}>
        <CartCount />
      </Suspense>
    </>
  );
}

async function CartCount() {
  const cart = (await cookies()).get("cart")?.value;
  return <span>Cart ({cart ? Object.keys(JSON.parse(cart)).length : 0})</span>;
}
```

You cannot call `cookies()` inside `"use cache"`. Read the value outside and pass it in **as an argument**; the argument goes into the cache key.[^5]

```tsx
async function Recommendations() {
  const segment = (await cookies()).get("segment")?.value ?? "default";
  return <ProductRow products={await getRecommendations(segment)} />;
}

async function getRecommendations(segment: string) {
  "use cache";
  cacheLife("hours");
  return db.product.findMany({ where: { segment } });
}
```

`Math.random()`, `Date.now()` and `crypto.randomUUID()` also produce a different value on every run. When you want a new value on every request, call `await connection()` first and wrap it in a `<Suspense>`; when the same value for everyone is enough, cache it with `"use cache"`.[^2]

## Updating the cache

There are two ways: by time *(`cacheLife`)* or by hand after an event.[^7]

| API | What it does | Where |
| :-- | :-- | :-- |
| `updateTag("products")` | Removes the entry at once; the user sees their own change immediately | Server Actions only |
| `revalidateTag("products", "max")` | Serves the old entry while refreshing in the background | Server Actions and Route Handlers |
| `revalidatePath("/products")` | Invalidates all the data of one address | Server Actions and Route Handlers |

The documentation recommends preferring tag-based revalidation; it is more precise.[^7] For content that changes rarely, such as a CMS, giving it a long `cacheLife("max")` and a tag, then calling `revalidateTag` from the CMS's webhook when the content changes, avoids needless refreshing.[^7] You will write that webhook in the [Route Handlers and the proxy](/academy/nextjs/route-handlers-and-proxy) lesson.

## Where the cache lives

| Layer | Default |
| :-- | :-- |
| The static shell *(HTML)* | Produced at build time and served from the CDN |
| A `"use cache"` runtime entry | In the server instance's memory. On serverless it may not survive between requests |
| The browser | A result received during navigation is not requested again for the `stale` period |

When you need a persistent cache shared between servers, there is `"use cache: remote"`. Every request means a network round trip, so it only pays off when the hit rate is high.[^2] No cache survives a new deploy; the key includes the build id.[^5]

## Try it yourself

- Delete `"use cache"` from `getProduct` and read the warning in `next dev`. Try both of the suggested fixes in turn.
- Compare the `○`, `◐` and `ƒ` marks next to the pages in the `next build` output.
- Call `cookies()` inside `"use cache"`. What does the error message say?
- Give it `cacheLife("seconds")` and look at the change in the build output.

## Going deeper

- **Article:** [Aurora Scharff](https://aurorascharff.no/), "Cache Components in Next.js"; it walks through the model step by step on a single shop page, from the first cache to revalidating by tag.[^8]
- **Video:** Aurora Scharff's Next.js Conf 2025 talk "Composition, Caching, and Architecture in Modern Next.js".[^9]
- **Video:** the Next.js team's "Why Partial Prerendering and how it works" *(10 min)*.[^10]
- **Official docs:** the "Migrating to Cache Components" guide; the counterparts of old settings such as `dynamic`, `revalidate` and `unstable_cache`.[^4]

## Sources

1. [Next.js: Upgrading to Version 15](https://nextjs.org/docs/app/guides/upgrading/version-15) *(doc)* — `fetch` and `GET` Route Handlers no longer being cached by default.
2. [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching) *(doc)* — Cache Components, the static shell, the runtime APIs, `connection()`, growing the shell, and where the cache is kept.
3. [Next.js Blog: Next.js 16.4](https://nextjs.org/blog/next-16-4) *(doc)* — October 6, 2026. Cache Components becoming the default in new projects.
4. [Next.js: Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components) *(doc)* — The counterparts of the old route segment settings and `fetch` options.
5. [Next.js: use cache](https://nextjs.org/docs/app/api-reference/directives/use-cache) *(doc)* — The cache key, serialisation, the runtime API restriction, composition with `children`, and the behaviour across deploys.
6. [Next.js: cacheLife](https://nextjs.org/docs/app/api-reference/functions/cacheLife) *(doc)* — The profiles, `stale`/`revalidate`/`expire`, and how a short-lived cache behaves during prerendering.
7. [Next.js: Revalidating](https://nextjs.org/docs/app/getting-started/revalidating) *(doc)* — `cacheTag`, `updateTag`, `revalidateTag`, `revalidatePath` and what to cache.
8. [Aurora Scharff](https://aurorascharff.no/): [Cache Components in Next.js](https://certificates.dev/blog/cache-components-in-nextjs) *(article)* — July 9, 2026, certificates.dev. `use cache`, `cacheLife`, `cacheTag` and on-demand revalidation.
9. [Aurora Scharff](https://aurorascharff.no/): [Composition, Caching, and Architecture in Modern Next.js](https://nextjs.org/conf/session/modern-nextjs-development-composition-caching-and-architecture) *(video)* — A Next.js Conf 2025 session.
10. [Next.js: Why Partial Prerendering and how it works](https://www.youtube.com/watch?v=MTcPrTIBkpA) *(video)* — The 10-minute explanation of PPR recommended in the Next.js documentation.
