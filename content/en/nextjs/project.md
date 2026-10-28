---
title: "Product catalogue"
description: "A product list, a detail page and a cart with caching, streaming, a Server Action and metadata."
lastVerified: "2026-10-21"
translationKey: "nextjs/project"
---

## Scenario

You are going to build a small shop. The application:

- Lists the products at `/products`; the search box writes the search into the URL.
- Shows the product's name and price from the cache instantly on the product page, and streams the stock at request time.
- **Add to cart** checks the stock on the server and writes the cart to a cookie; the cart count at the top updates in the same response.
- `/cart` lists the cart and removes items.
- A CMS calls the webhook when a product changes, and the matching cache is refreshed.
- Every product gets a title, a canonical address, a share image and JSON-LD; a sitemap and a `robots.txt` are generated.
- An `instant()` test keeps the transition to the product page instant.

The goal is not the design but the pieces from the lessons working together. Where each piece comes from:

| Part | File | Lesson |
| :-- | :-- | :-- |
| `"use cache"`, `cacheLife`, `cacheTag`, `connection()` | `lib/products.ts` | Cache and the rendering model |
| The cart in a cookie, `server-only` | `lib/cart.ts` | Server and Client Components |
| The root layout, the cart link inside a `<Suspense>` | `app/layout.tsx`, `components/cart-link.tsx` | Routing and layouts, Data fetching and streaming |
| `next/form`, `searchParams` | `app/products/page.tsx`, `components/product-list.tsx` | Routing and layouts |
| Reading `params` inside a `<Suspense>`, `prefetch` | `app/products/[slug]/page.tsx` | Navigation and prefetching |
| A Server Action, `useActionState`, `bind` | `app/actions.ts`, `components/add-to-cart-form.tsx`, `app/cart/page.tsx` | Server Actions |
| `notFound`, `error.tsx` and `retry` | `not-found.tsx`, `error.tsx` | Error handling |
| `revalidateTag` from a webhook | `app/api/revalidate/route.ts` | Route Handlers and the proxy |
| `generateMetadata`, the OG image, the sitemap, JSON-LD | `app/products/[slug]/`, `app/sitemap.ts`, `app/robots.ts` | Metadata and SEO |
| The `instant()` test | `e2e/product.spec.ts` | Navigation and prefetching |

The working version is on GitHub: [examples/nextjs/project](https://github.com/virastack/academy/tree/main/examples/nextjs/project). Compare against it when you get stuck.

## Step 1: Set up the project

Create a project with the defaults, as in the [Setup and project structure](/academy/nextjs/setup-and-folder-structure) lesson:[^1]

```command
npx create-next-app@latest my-shop --yes
```

`cacheComponents: true` and `partialPrefetching: true` come ready in `next.config.ts`; this project relies on both. You will change the contents of `app/page.tsx` in step 4.

## Step 2: The data layer

Use delayed functions instead of a real database. Product information does not change for hours, so it is cached. The stock has to be current on every request.

```ts
// lib/products.ts
import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";

export type Product = {
  slug: string;
  name: string;
  price: number;
  description: string;
};

const products: Product[] = [
  { slug: "canvas-sneaker", name: "Canvas Shoe", price: 1499, description: "A light canvas shoe for everyday wear." },
  { slug: "leather-backpack", name: "Leather Backpack", price: 2899, description: "A handmade leather bag with a laptop compartment." },
  { slug: "wool-beanie", name: "Wool Beanie", price: 449, description: "A beanie in soft merino wool." },
];

const stock: Record<string, number> = {
  "canvas-sneaker": 12,
  "leather-backpack": 0,
  "wool-beanie": 4,
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getProducts(query = "") {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  await wait(300);
  const q = query.toLocaleLowerCase("en");
  return products.filter((product) => product.name.toLocaleLowerCase("en").includes(q));
}

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `product-${slug}`);

  await wait(300);
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getStock(slug: string) {
  await connection();
  await wait(800);
  return stock[slug] ?? 0;
}
```

- `"use cache"` keeps the result per argument. `getProduct("canvas-sneaker")` and `getProduct("wool-beanie")` are separate entries.[^2]
- There are two tags: `products` refreshes the whole list and `product-${slug}` a single product. The webhook in step 10 will use them.[^3]
- `connection()` tells Next.js *"do not prerender this, run it at request time"*. The stock is read again on every visit.[^2]

## Step 3: The cart in a cookie

Keep the cart as JSON in a cookie. Reading a cookie is free in a Server Component; writing one only happens in a Server Action or a Route Handler, because the cookie is sent with the response headers.[^4]

```ts
// lib/cart.ts
import "server-only";

import { cookies } from "next/headers";

export type Cart = Record<string, number>;

const CART_COOKIE = "cart";

export async function getCart(): Promise<Cart> {
  const value = (await cookies()).get(CART_COOKIE)?.value;
  if (!value) return {};

  try {
    return JSON.parse(value) as Cart;
  } catch {
    return {};
  }
}

export async function saveCart(cart: Cart) {
  (await cookies()).set(CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
```

`httpOnly` hides the cookie from JavaScript in the browser. The user can still change it in DevTools, which is why you will treat every value inside it as untrusted *(steps 7 and 8)*.

## Step 4: The layout and the cart link

The cart count comes from the cookie, so it is worked out at request time. Put it inside a `<Suspense>` and the rest of the header stays in the static shell.[^2]

```tsx
// components/cart-link.tsx
import Link from "next/link";

import { getCart } from "@/lib/cart";

export async function CartLink() {
  const cart = await getCart();
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  return <Link href="/cart">Cart ({count})</Link>;
}
```

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CartLink } from "@/components/cart-link";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://shop.example.com"),
  title: { default: "Store", template: "%s | Store" },
  description: "A small product catalogue built with Next.js.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav>
            <Link href="/">Store</Link>
            <Link href="/products">Products</Link>
            <Suspense fallback={<span>Cart</span>}>
              <CartLink />
            </Suspense>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

```tsx
// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <section>
      <h1>New season</h1>
      <p>Shoes, bags and accessories.</p>
      <Link href="/products">See the products</Link>
    </section>
  );
}
```

The `layout.tsx` that `create-next-app` writes loads the Geist fonts with `next/font`. When you replace it with this file, the `--font-geist-sans` and `--font-geist-mono` variables in `globals.css` are left dangling; replace them with `system-ui, sans-serif` and `ui-monospace, monospace`.

## Step 5: The product list and search

When `action` is an address, `next/form` writes the search into the URL as `?q=` and performs a client-side transition.[^5] `searchParams` is only known at request time, so the part that reads it has to be inside a `<Suspense>`.[^2]

```tsx
// app/products/page.tsx
import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";

import { ProductList } from "@/components/product-list";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <>
      <h1>Products</h1>
      <Form action="/products">
        <input name="q" aria-label="Search products" placeholder="Search..." />
        <button>Search</button>
      </Form>
      <Suspense fallback={<p>Loading products...</p>}>
        <ProductList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
```

```tsx
// components/product-list.tsx
import Link from "next/link";

import { getProducts } from "@/lib/products";

export async function ProductList({
  searchParams,
}: Pick<PageProps<"/products">, "searchParams">) {
  const { q } = await searchParams;
  const products = await getProducts(typeof q === "string" ? q : "");

  if (products.length === 0) return <p>No results.</p>;

  return (
    <ul>
      {products.map((product) => (
        <li key={product.slug}>
          <Link href={`/products/${product.slug}`} prefetch>
            {product.name}
          </Link>{" "}
          €{product.price}
        </li>
      ))}
    </ul>
  );
}
```

`q` can also be an array *(`?q=a&q=b`)*, which is why the `typeof` check is there. `prefetch` fetches the cached content on the product page before the click; the test in step 12 will show its effect.[^6]

## Step 6: The product page

The page has three layers:

| Layer | Content | When it arrives |
| :-- | :-- | :-- |
| The App Shell | The `<article>` and *"Loading product..."* | Shared by every product link, immediately |
| The cached detail | The name, description, price and JSON-LD | Before the click, thanks to `prefetch` |
| Request time | The stock and **Add to cart** | Streaming in after the click |

```tsx
// app/products/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AddToCartForm } from "@/components/add-to-cart-form";
import { getProduct, getProducts, getStock } from "@/lib/products";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
  };
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <article>
      <Suspense fallback={<p>Loading product...</p>}>
        <ProductDetails params={params} />
      </Suspense>
    </article>
  );
}

async function ProductDetails({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    offers: { "@type": "Offer", price: product.price, priceCurrency: "EUR" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>€{product.price}</p>
      <Suspense fallback={<p>Checking stock...</p>}>
        <Stock slug={product.slug} />
      </Suspense>
    </>
  );
}

async function Stock({ slug }: { slug: string }) {
  const count = await getStock(slug);
  if (count === 0) return <p>Sold out</p>;

  return (
    <>
      <p>{count} left in stock</p>
      <AddToCartForm slug={slug} />
    </>
  );
}
```

- `ProductPage` is not `async` and does not `await` `params`. It passes the promise to the child inside the `<Suspense>`. Had `await params` been at the top of the page, development would have warned *"URL data outside of Suspense"*.[^6]
- `generateStaticParams` prerenders the three products at build time. A visitor who arrives at a product directly sees its name in the static HTML.[^7]
- `generateMetadata` and `ProductDetails` call the same `getProduct`; thanks to `"use cache"`, the data is read once.[^8]

## Step 7: Add to cart

The Server Action verifies the stock and the product on the server. It does not trust the `slug` that came from the client.[^9]

```ts
// app/actions.ts
"use server";

import { getCart, saveCart } from "@/lib/cart";
import { getProduct, getStock } from "@/lib/products";

export type AddToCartState = { message: string | null };

export async function addToCart(
  _prev: AddToCartState,
  formData: FormData,
): Promise<AddToCartState> {
  const slug = String(formData.get("slug"));
  const product = await getProduct(slug);
  if (!product) return { message: "Product not found." };

  const cart = await getCart();
  const quantity = (cart[slug] ?? 0) + 1;
  if (quantity > (await getStock(slug))) return { message: "Not enough stock." };

  await saveCart({ ...cart, [slug]: quantity });
  return { message: `${product.name} added to cart.` };
}

export async function removeFromCart(slug: string) {
  const cart = await getCart();
  delete cart[slug];
  await saveCart(cart);
}
```

```tsx
// components/add-to-cart-form.tsx
"use client";

import { useActionState } from "react";

import { addToCart } from "@/app/actions";

export function AddToCartForm({ slug }: { slug: string }) {
  const [state, formAction, isPending] = useActionState(addToCart, { message: null });

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <button disabled={isPending}>{isPending ? "Adding..." : "Add to cart"}</button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
```

You wrote nothing for the **Cart (1)** in the header. When a Server Action writes a cookie, Next.js re-renders that page on the server and sends the new interface in the same round trip as the action's response.[^4][^9] The stock check is not an error but an expected state, which is why it returns a message rather than `throw`ing.

## Step 8: The cart page

```tsx
// app/cart/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import { removeFromCart } from "@/app/actions";
import { getCart } from "@/lib/cart";
import { getProduct } from "@/lib/products";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <h1>Cart</h1>
      <Suspense fallback={<p>Loading cart...</p>}>
        <CartItems />
      </Suspense>
    </>
  );
}

async function CartItems() {
  const cart = await getCart();
  const lines = (
    await Promise.all(
      Object.entries(cart).map(async ([slug, quantity]) => {
        const product = await getProduct(slug);
        return product ? [{ product, quantity }] : [];
      }),
    )
  ).flat();

  if (lines.length === 0) return <p>Your cart is empty.</p>;

  return (
    <ul>
      {lines.map(({ product, quantity }) => (
        <li key={product.slug}>
          {product.name} x {quantity}
          <form action={removeFromCart.bind(null, product.slug)}>
            <button>Remove</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
```

- The products are read in parallel with `Promise.all`; `await`ing them one by one would have created a waterfall.
- The cookie may hold a product that no longer exists; the row that returns `[]` drops out of the list.
- `bind` attaches the `slug` to the action as its first argument. The form works before JavaScript has loaded.[^10]
- `robots: { index: false }` keeps the cart page out of the search results.

## Step 9: Not found and errors

```tsx
// app/products/[slug]/not-found.tsx
import Link from "next/link";

export default function ProductNotFound() {
  return (
    <>
      <h1>Product not found</h1>
      <Link href="/products">All products</Link>
    </>
  );
}
```

```tsx
// app/products/error.tsx
"use client";

export default function ProductsError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <h2>Products could not be loaded.</h2>
      <button onClick={() => retry()}>Try again</button>
    </>
  );
}
```

Because `error.tsx` sits under `app/products/`, it protects both the list and the product pages, and the header stays in place. The address `/products/nope` shows `not-found.tsx`. Since `notFound()` is called after streaming has started, the status code stays `200` and `noindex` is added to the page.[^11]

## Step 10: The CMS webhook

```ts
// app/api/revalidate/route.ts
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (request.headers.get("x-revalidate-secret") !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = (await request.json()) as { slug?: string };
  revalidateTag(slug ? `product-${slug}` : "products", "max");

  return Response.json({ revalidated: true });
}
```

Put the secret in `.env.local`:

```bash
# .env.local
REVALIDATE_SECRET=change-me
```

The `"max"` profile works as *stale-while-revalidate*: the first visitor after the webhook gets the old page immediately while the refresh starts in the background, and the next visitor sees the new data.[^3] This was tried in a production build while the guide was being written: the first request after the webhook showed the old data and the second the new.

## Step 11: The SEO files

Add the three files from the [Metadata and SEO](/academy/nextjs/metadata-and-seo) lesson:

```ts
// app/sitemap.ts
import type { MetadataRoute } from "next";

import { getProducts } from "@/lib/products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();

  return [
    { url: "https://shop.example.com/products" },
    ...products.map((product) => ({
      url: `https://shop.example.com/products/${product.slug}`,
    })),
  ];
}
```

```ts
// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/cart" },
    sitemap: "https://shop.example.com/sitemap.xml",
  };
}
```

```tsx
// app/products/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";

import { getProduct } from "@/lib/products";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 96, background: "white" }}>
      {product?.name ?? "Store"}
    </div>,
    size,
  );
}
```

Once Next.js finds `opengraph-image.tsx`, it adds the `og:image` tag to the product page's `<head>` itself; thanks to `metadataBase`, the address becomes a full URL.[^12]

## Step 12: Test instant navigation

Install [!playwright] and the Next.js test helper:[^13][^14]

```command
npm install -D @playwright/test @next/playwright
```

```command
npx playwright install chromium
```

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
```

```ts
// e2e/product.spec.ts
import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

test("the product page opens instantly and stock arrives later", async ({ page }) => {
  await page.goto("/products");

  await instant(page, async () => {
    await page.getByRole("link", { name: "Canvas Shoe" }).click();
    await page.waitForURL((url) => url.pathname === "/products/canvas-sneaker");

    await expect(page.getByRole("heading", { name: "Canvas Shoe" })).toBeVisible();
    await expect(page.getByText("Checking stock...")).toBeVisible();
  });

  await expect(page.getByText("12 left in stock")).toBeVisible();
});

test("adding to cart updates the cart count", async ({ page }) => {
  await page.goto("/products/canvas-sneaker");
  await page.getByRole("button", { name: "Add to cart" }).click();

  await expect(page.getByRole("status")).toHaveText("Canvas Shoe added to cart.");
  await expect(page.getByRole("link", { name: "Cart (1)" })).toBeVisible();
});
```

```command
npx playwright test
```

Inside the `instant()` block, only the interface that is ready at the moment of the click is visible; request-time data is held back until the block ends. The test confirms that the product name is there and that the stock has not arrived yet.[^14]

- Without `waitForURL`, the selector can find an element on the source page before the destination arrives. Waiting for the target URL prevents that.[^14]
- Delete the `prefetch` in `ProductList` and run the test again. Because the product name no longer appears inside the block, the test fails. If somebody changes that link later, CI catches it the same way.

The tests run against `next dev`, where the test API is open by default.[^14] Playwright itself is in the [Playwright](/academy/playwright) guide.

## Step 13: Final check

```bash
npm run lint
npm run build
```

`next build` checks the types too. In the build output the product pages are marked `◐`: the static shell was produced at build time and the stock streams at request time. The refresh interval for the product information comes from `cacheLife("hours")`.[^2]

```text
├   /products/[slug]
│ ├ ◐ /products/canvas-sneaker                1h      1d
│ ├ ◐ /products/leather-backpack              1h      1d
│ └ ◐ /products/wool-beanie                   1h      1d
├ ƒ /api/revalidate
```

Open it with `npm start` and try this sequence: the search, a product page, **Add to cart**, the **Leather Backpack** with zero stock, removing from the cart, `/products/nope`, `/sitemap.xml` and `/products/canvas-sneaker/opengraph-image`.

> [!TIP]
>
> If you are going to work on this project with an agent, install the `next-dev-loop` skill and ask it to run `npx playwright test` after every change. The detail is in the [Next.js with AI agents](/academy/nextjs/ai-agents) lesson.

## Try it yourself

- Set the `cart` cookie to `{"canvas-sneaker":99}` in DevTools. What does the cart show? What happens when you press **Add to cart**? Think about why a real shop keeps the cart in a database.
- Delete the `"use cache"`, `cacheLife` and `cacheTag` lines from `getProduct` and run the `instant()` test. Why did it fail? *(If you delete only `"use cache"`, `cacheLife` raises an error.)*
- Put `new Date().toISOString()` into the description `getProduct` returns. Open it with `npm run build && npm start` and call the webhook with `curl -X POST -H "x-revalidate-secret: change-me" -H "content-type: application/json" -d '{"slug":"canvas-sneaker"}' localhost:3000/api/revalidate`; then refresh the page twice.
- Add a recommendations section to the product page and wrap it in the `SectionBoundary` from the [Error handling](/academy/nextjs/error-handling) lesson. When the recommendations fail, does the rest of the page stay in place?
- Add the total price to the cart page. Did you work it out on the server or on the client, and why?

## Sources

1. [Next.js: Installation](https://nextjs.org/docs/app/getting-started/installation) *(doc)* — `create-next-app` and the default settings.
2. [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching) *(doc)* — `"use cache"`, `cacheLife`, `connection()`, reading runtime data inside a `<Suspense>`, and the static shell.
3. [Next.js: revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag) *(doc)* — Revalidating by tag, the `"max"` profile and the stale-while-revalidate behaviour.
4. [Next.js: cookies](https://nextjs.org/docs/app/api-reference/functions/cookies) *(doc)* — A cookie only being written in a Server Function or a Route Handler, and the interface updating in the same round trip.
5. [Next.js: Form Component](https://nextjs.org/docs/app/api-reference/components/form) *(doc)* — A form that writes the search into the URL, and the client-side transition.
6. [Next.js: Adopting Partial Prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching) *(doc)* — Moving URL data inside a `<Suspense>`, and prefetching cached content with `prefetch={true}`.
7. [Next.js: generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params) *(doc)* — Prerendering dynamic segments at build time.
8. [Next.js: Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) *(doc)* — `generateMetadata`, and the page not reading the same data twice.
9. [Next.js: Server Actions and Mutations](https://nextjs.org/docs/app/guides/server-actions) *(doc)* — Treating every action as an untrusted entry point, the page being re-rendered when a cookie is written, and data with interface in one round trip.
10. [Next.js: Forms](https://nextjs.org/docs/app/guides/forms) *(doc)* — Passing an argument to an action with `bind`, and forms that work before JavaScript loads.
11. [Next.js: Streaming, Status codes](https://nextjs.org/docs/app/guides/streaming#status-codes) *(doc)* — `notFound()` after streaming has started, and `noindex`.
12. [Next.js: opengraph-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) *(doc)* — A share image generated in code, and the automatic `og:image` tag.
13. [Playwright: Installation](https://playwright.dev/docs/intro) *(doc)* — Installing, downloading the browsers and running the tests.
14. [Next.js: Instant Navigation](https://nextjs.org/docs/app/guides/instant-navigation) *(doc)* — The `instant()` test, waiting for the target URL, and the test API in `next dev`.
