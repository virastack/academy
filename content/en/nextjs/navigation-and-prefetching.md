---
title: "Navigation and prefetching"
description: "Partial Prefetching, instant navigation, preserved state and useLinkStatus."
lastVerified: "2026-10-21"
translationKey: "nextjs/navigation-and-prefetching"
---

## The three parts of fast navigation

Pages are rendered on the server, which means that clicking a link can leave the client waiting for it. Next.js hides that wait with three things:[^1]

- **Prefetching:** `<Link>` loads its destination in the background as soon as it comes on screen.
- **Streaming:** the part that is ready arrives at once, and the rest streams into the place of the `<Suspense>` fallback.
- **Client-side transitions:** the shared layouts stay in place and only the part that changes is renewed.

## Partial prefetching

**Partial Prefetching**, which arrived with Next.js 16.3, produces a single reusable **App Shell** per route: the static and cached content that does not depend on the URL, plus the fallbacks. Twenty links to the same route are not twenty separate requests but share one App Shell.[^2][^3] It comes on in projects created with `create-next-app` *(`partialPrefetching: true`)*.

Because the App Shell is shared by every link, it cannot carry data belonging to one URL. That is why `params` and `searchParams` count as **URL data**. Read them outside a `<Suspense>` and you get a *"URL data outside of Suspense"* warning in development. The warning does not break the build, but it can stop the transition to that route from being instant. The fix is to pass the `params` promise to a child without `await`ing it:[^4]

```tsx
// app/products/[slug]/page.tsx
export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<p>Loading product...</p>}>
      <ProductDetails params={params} />
    </Suspense>
  );
}

async function ProductDetails({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return <h1>{product.name}</h1>;
}
```

`cookies()` and `headers()` are not URL data. They change by session rather than by link, so they can stay in the App Shell.[^4]

The product name is now behind the fallback. If you want it visible the moment the link is clicked, give the link `prefetch={true}`. That fetches the **cached** content tied to the link's `params` and `searchParams` before the click too. The price is one server call per link, so use it only on the most likely destinations.[^2][^4]

```tsx
<Link href={`/products/${product.slug}`} prefetch>
  {product.name}
</Link>
```

In this guide's project application, moving to the product page without `prefetch` showed only *"Loading product..."*. With `prefetch` and a `"use cache"` version of `getProduct`, the product name arrived at the moment of the click. The `instant()` test that protects this is in the [Product catalogue](/academy/nextjs/project) project.

## Instant navigation

By Next.js's definition, a navigation is **instant** if the static, cached and fallback content is visible the moment the user clicks; the rest streams in.[^5]

There is a subtlety: opening a page directly is not the same as arriving through a link. On arrival through a link, only what is **below the two pages' shared layout** is re-rendered. A `<Suspense>` in the root layout covers the direct opening but not the move from `/products/a` to `/products/b`.[^5] Because that is hard to keep track of by hand, Cache Components **validates** every page for both cases in development and shows the component that blocks the transition on an error screen.[^5][^6]

To let a segment wait on purpose:

```tsx
// app/checkout/layout.tsx
export const instant = false;
```

There are two more tools:[^5]

- **The Navigation Inspector:** it freezes the page in Next.js DevTools in its first-load or prefetched state. You see how much meaningful content there is in the shell.
- **The `instant()` test:** the helper in the `@next/playwright` package holds the dynamic content back and lets you test only the interface that appears instantly. If somebody breaks the shell later, CI catches it.

> [!TIP]
>
> `ensureStatic`, which arrived with 16.4, goes a step further: it **requires** a page's shell, or the whole page, to stay static; if somebody adds code that runs at request time, the build fails.[^7]

## Activity: the state is there when you come back

With Cache Components on, Next.js does not discard the page you left; it **hides** it with React's `<Activity>` component. When you come back, a form draft, the scroll position and an open `<details>` are all as they were. Effects are cleaned up when it is hidden and set up again when it becomes visible. At most the last three routes are kept.[^8][^9]

That is not always what you want. A dropdown menu should not still be open when you come back. The documentation solves it by resetting the state in `useLayoutEffect`'s cleanup:[^8]

```tsx
"use client";

import { useLayoutEffect, useState } from "react";

export function SortMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useLayoutEffect(() => {
    return () => setIsOpen(false);
  }, []);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Sort</button>
      {isOpen && <ul>{/* the options */}</ul>}
    </div>
  );
}
```

> [!WARNING]
>
> A hidden page stays in the DOM with `display: none`. In an end-to-end test, `page.locator("h1")` can find two headings. That is exactly what happened in this guide's project application. Use the `getByRole` and `getByLabel` queries, which respect visibility.[^8] Playwright itself is in the [Playwright](/academy/playwright) guide.

## Feedback on a slow network

On a slow network the prefetch may not finish before the click. `useLinkStatus` tells you that the clicked link is pending, so you can put a small indicator inside the link:[^1][^10]

```tsx
"use client";

import { useLinkStatus } from "next/link";

export function PendingDot() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden>•</span> : null;
}
```

```tsx
<Link href="/cart">
  Cart <PendingDot />
</Link>
```

Showing the indicator after a short delay *(100 ms, say)* stops it flashing on fast transitions.[^1] In lists with thousands of links you can cut the needless requests with `prefetch={false}`; in return, those pages load when they are clicked.[^1]

To animate the transitions you can use `<ViewTransition>`, which became stable in React 19.3. The Next.js guide gives examples from a thumbnail morphing into a large image to transitions that signal direction.[^11] The React side is in the [View Transition and Activity](/academy/react/view-transitions-and-activity) lesson.

## Try it yourself

- Run the product list in production with `next build && next start`. Watch the prefetch requests arrive in the Network tab as the links come on screen. *(There is no prefetching in development.)*
- Give one product link `prefetch` and compare the request it makes with the others.
- Put an `<input>` on the product page, type something, go to another page and come back. Is what you typed still there?
- Turn on **Pause on navigations** in the Navigation Inspector and click a link. What is in the shell?

## Going deeper

- **Official docs:** "Building App-like Experiences with Next.js 16.3", written with [Aurora Scharff](https://aurorascharff.no/) among its authors, which explains instant navigation through an application.[^12]
- **Official docs:** the "Instant Navigation" guide; making a blocked navigation instant step by step, and `instant()` tests.[^5]
- **Official docs:** the "Preserving UI state" guide; what Activity keeps and what you have to reset yourself.[^8]
- **Video:** the instant navigation and Cache Components part of the Next.js Conf 2025 opening keynote.[^13]

## Sources

1. [Next.js: Linking and Navigating](https://nextjs.org/docs/app/getting-started/linking-and-navigating) *(doc)* — Prefetching, streaming, client-side transitions, slow networks, `useLinkStatus` and turning prefetching off.
2. [Next.js: partialPrefetching](https://nextjs.org/docs/app/api-reference/config/next-config-js/partialPrefetching) *(doc)* — An App Shell per route, per-link prefetching with `prefetch={true}`, and the version history.
3. [Next.js Blog: Next.js 16.3, Instant Navigations](https://nextjs.org/blog/next-16-3-instant-navigations) *(doc)* — Partial Prefetching, Instant Insights, the Navigation Inspector and the `instant()` helper.
4. [Next.js: Adopting Partial Prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching) *(doc)* — URL data not belonging in the App Shell, moving `params` inside a `<Suspense>`, and prefetching URL data with `prefetch={true}`.
5. [Next.js: Instant Navigation](https://nextjs.org/docs/app/guides/instant-navigation) *(doc)* — The definition of "instant", the difference between a direct opening and a client transition, validation, inspection and e2e tests.
6. [Next.js: instant](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/instant) *(doc)* — The `instant` export, the validation levels and the Navigation Inspector.
7. [Next.js: ensureStatic](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/ensureStatic) *(doc)* — 16.4. Requiring the App Shell, the prefetch or the whole route to stay static.
8. [Next.js: Preserving UI state](https://nextjs.org/docs/app/guides/preserving-ui-state) *(doc)* — State preserved by Activity, the reset patterns, and visibility-aware test selectors.
9. [Next.js: cacheComponents](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents) *(doc)* — The use of Activity during navigation and the cleanup of Effects.
10. [Next.js: useLinkStatus](https://nextjs.org/docs/app/api-reference/functions/use-link-status) *(doc)* — Showing a pending navigation, and delaying the indicator on a fast transition.
11. [Next.js: View Transitions](https://nextjs.org/docs/app/guides/view-transitions) *(doc)* — Image morphing, Suspense reveals and directional transitions.
12. [Next.js Blog: Building App-like Experiences with Next.js 16.3](https://nextjs.org/blog/building-app-like-experiences-with-nextjs-16-3) *(doc)* — Navigation that feels like an app, with Cache Components and Partial Prefetching.
13. [Next.js Conf 2025: Opening Keynote](https://www.youtube.com/watch?v=myjrQS_7zNk&t=856s) *(video)* — October 22, 2025. Instant navigation and Cache Components from 14:16 on.
