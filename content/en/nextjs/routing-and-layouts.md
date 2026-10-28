---
title: "Routing and layouts"
description: "Pages, layouts, dynamic segments, route groups and navigating with Link."
lastVerified: "2026-10-21"
translationKey: "nextjs/routing-and-layouts"
---

## A folder is an address

The App Router is file-based. Every folder is a **segment** in the URL, and the `page.tsx` in that folder is the page at that address.[^1]

```text
app/
├── layout.tsx              # wraps every page
├── page.tsx                # /
└── products/
    ├── layout.tsx          # wraps /products and everything below it
    ├── page.tsx            # /products
    └── [slug]/
        └── page.tsx        # /products/canvas-sneaker
```

## Layout: the interface that survives navigation

A layout wraps the pages below it as `children`. When the user moves from `/products/a` to `/products/b`, the shared layout is **not re-rendered**; its state and scroll position are kept and only the page changes.[^1]

```tsx
// app/products/layout.tsx
export default function ProductsLayout({ children }: LayoutProps<"/products">) {
  return (
    <section>
      <aside>Categories</aside>
      {children}
    </section>
  );
}
```

`LayoutProps` and `PageProps` are global types you use without importing. Next.js generates them from your folders during `next dev`, `next build` or `next typegen`, so you never write the `params` type by hand.[^1]

Because a layout is not re-rendered, it has two limits:[^2]

- It cannot take `searchParams`; the value would go stale. Read the URL parameter on the page, or with `useSearchParams` in a Client Component.
- It cannot take `pathname` for an active menu item. Move the links into a small Client Component that uses `usePathname`.

> [!WARNING]
>
> Do not put the session check in a layout. Because a layout does not run again on navigation, it does not protect every page below it. Do the check close to the data; the [Auth in Next.js](/academy/auth-security/auth-in-nextjs) lesson covers this in detail.

## Dynamic segments

A folder in square brackets is for pages generated from data:[^3]

| Folder | Matching address |
| :-- | :-- |
| `[slug]` | `/products/canvas-sneaker` |
| `[...slug]` | `/shop/shoes`, `/shop/shoes/sneakers` |
| `[[...slug]]` | `/docs`, `/docs/setup`, `/docs/setup/node` |

```tsx
// app/products/[slug]/page.tsx
export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);

  return <h1>{product?.name}</h1>;
}
```

`params` and `searchParams` are a **promise**; you cannot use them without an `await`. Older tutorials read `params.slug` directly; that changed in Next.js 15.[^4]

> [!NOTE]
>
> To keep them short, the examples in this and the next few lessons read `params` at the top of the page. With Partial Prefetching on, Next.js flags that with a warning in development, because every link to a route shares a single shell. In a real project, read `params` in a child inside a `<Suspense>`. The reason is in the [Navigation and prefetching](/academy/nextjs/navigation-and-prefetching) lesson.[^5]

## searchParams: on the page or on the client

| What you need | Use |
| :-- | :-- |
| Fetching data from the server with a filter and pagination | The page's `searchParams` prop |
| Filtering a list that is already loaded, on the client | The `useSearchParams` hook |

Reading `searchParams` ties that part of the page to request time. With Cache Components you have to do it inside a `<Suspense>`; you will see why in the [Cache and the rendering model](/academy/nextjs/caching-and-rendering) lesson.[^1]

## Route groups and more than one layout

A folder in parentheses is not added to the URL but can have a layout of its own. To give the shop and the marketing pages different top menus:[^6]

```text
app/
├── (marketing)/
│   ├── layout.tsx          # the marketing menu
│   └── about/page.tsx      # /about
└── (shop)/
    ├── layout.tsx          # the shop menu and the cart
    └── cart/page.tsx       # /cart
```

Delete the root `app/layout.tsx` and give each group its own layout with an `<html>` in it, and you have set up more than one root layout. Moving between the groups reloads the page completely.[^6]

## Navigating with Link

`<Link>` extends `<a>`. It **prefetches** the destination of visible links in the background and moves to the page on a click without a reload; the shared layouts stay in place.[^7]

```tsx
import Link from "next/link";

<Link href={`/products/${product.slug}`}>{product.name}</Link>;
```

For navigating from code there is `useRouter`. The right place to import it from is `next/navigation`. `next/router` belongs to the old Pages Router and does not work in the App Router.[^8] AI tools confuse the two often.

For forms that write a parameter into the URL, such as a search, there is `next/form`. It behaves like a `<form>` but turns the submit into a client-side navigation, and works before JavaScript has loaded:[^9]

```tsx
import Form from "next/form";

<Form action="/products">
  <input name="q" aria-label="Search products" />
  <button>Search</button>
</Form>;
```

> [!TIP]
>
> Turn on `typedRoutes: true` in `next.config.ts` and a typo such as `<Link href="/prodcts">` becomes a type error.[^10]

## Advanced patterns

Two patterns are for particular interfaces and are not needed in every project:[^11][^12]

| Pattern | Folder | Example |
| :-- | :-- | :-- |
| Parallel route | `@cart/` | Two sections in one layout that load independently |
| Intercepting route | `(.)photo/[id]` | Showing a photo opened from a list as a modal, and full-page when the link is shared |

## Try it yourself

- In `app/products/[slug]/page.tsx`, read `params.slug` directly without an `await`. What does TypeScript say?
- Add a counter button *(a Client Component)* to `products/layout.tsx`. Navigate between two products; does the counter reset?
- Write a `NavLink` that marks the active menu item with `usePathname`.
- Turn on `typedRoutes` and link to an address that does not exist.

## Going deeper

- **Official docs:** the "Layouts and Pages" and "Linking and Navigating" pages; they set out how prefetching, streaming and client-side transitions work together.[^1][^7]
- **Official docs:** the "Caveats" section of the `layout.js` reference; it shows with examples why a layout does not take `searchParams` or `pathname`.[^2]
- **Official docs:** the layout and navigation chapters of the Next.js Learn course.[^13]

## Sources

1. [Next.js: Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages) *(doc)* — Pages, nested layouts, dynamic segments, `searchParams` and the `PageProps`/`LayoutProps` helpers.
2. [Next.js: layout.js](https://nextjs.org/docs/app/api-reference/file-conventions/layout) *(doc)* — A layout not being re-rendered, the `searchParams` and `pathname` limits, and an active link example.
3. [Next.js: Dynamic Route Segments](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) *(doc)* — `[slug]`, catch-all and optional catch-all segments.
4. [Next.js: Upgrading to Version 15](https://nextjs.org/docs/app/guides/upgrading/version-15) *(doc)* — `params`, `searchParams`, `cookies` and `headers` becoming async.
5. [Next.js: Adopting Partial Prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching) *(doc)* — URL data not belonging in the shared App Shell, and moving `params` inside a `<Suspense>`.
6. [Next.js: Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) *(doc)* — Grouping without affecting the URL, a group-specific layout, and more than one root layout.
7. [Next.js: Linking and Navigating](https://nextjs.org/docs/app/getting-started/linking-and-navigating) *(doc)* — Prefetching, streaming, client-side transitions, and the causes of a slow transition.
8. [Next.js: useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router) *(doc)* — Importing from `next/navigation`, `push`, `replace`, `refresh`, and the difference from the Pages Router.
9. [Next.js: Form Component](https://nextjs.org/docs/app/api-reference/components/form) *(doc)* — Forms that write URL parameters, client-side navigation and progressive enhancement.
10. [Next.js: TypeScript](https://nextjs.org/docs/app/api-reference/config/typescript) *(doc)* — Type-safe links with `typedRoutes`.
11. [Next.js: Parallel Routes](https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes) *(doc)* — `@slot` folders and `default.tsx`.
12. [Next.js: Intercepting Routes](https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes) *(doc)* — The `(.)` and `(..)` patterns, and a modal example.
13. [Next.js: Learn, Creating Layouts and Pages](https://nextjs.org/learn/dashboard-app/creating-layouts-and-pages) *(doc)* — The layout and pages chapter of the course.
