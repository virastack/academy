# A product catalogue

The working version of the project lesson in the [Next.js guide](https://virastack.com/academy/nextjs/project). Compare against it when you get stuck.

A small store set up with `create-next-app`: the product list and search, a cached product page with streaming stock information, a cart in a cookie, a CMS webhook, the SEO files and an `instant()` test.

## Running it

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` carries the `REVALIDATE_SECRET` the webhook uses.

## The checks

```bash
npm run lint
npm run build
npx playwright install chromium
npx playwright test
```

`next build` checks the types too. The Playwright test starts its own server with `npm run dev`.

| File | What it teaches |
| :-- | :-- |
| `lib/products.ts` | `"use cache"`, `cacheLife`, `cacheTag`, `connection()` |
| `lib/cart.ts` | A cart in a cookie, `server-only` |
| `app/layout.tsx`, `components/cart-link.tsx` | The root layout, and the cart link inside a `<Suspense>` |
| `app/products/page.tsx`, `components/product-list.tsx` | Search with `next/form`, `searchParams` |
| `app/products/[slug]/page.tsx` | Reading `params` inside a `<Suspense>`, `prefetch` |
| `app/actions.ts`, `components/add-to-cart-form.tsx`, `app/cart/page.tsx` | A Server Action, `useActionState`, `bind` |
| `app/products/[slug]/not-found.tsx`, `app/products/error.tsx` | `notFound`, `error.tsx` and `retry` |
| `app/api/revalidate/route.ts` | `revalidateTag` from a webhook |
| `app/products/[slug]/opengraph-image.tsx`, `app/sitemap.ts`, `app/robots.ts` | The share image, the sitemap, `robots.txt` |
| `e2e/product.spec.ts` | Testing instant navigation with `instant()` |
