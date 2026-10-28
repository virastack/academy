---
title: "Ürün kataloğu"
description: "Cache, streaming, Server Action ve metadata ile ürün listesi, detay sayfası ve sepet."
lastVerified: "2026-10-21"
translationKey: "nextjs/project"
---

## Senaryo

Küçük bir mağaza kuracaksınız. Uygulama:

- `/products` adresinde ürünleri listeler; arama kutusu aramayı URL'ye yazar.
- Ürün sayfasında adı ve fiyatı cache'ten anında, stoğu istek anında akıtarak gösterir.
- **Add to cart** stoğu sunucuda kontrol eder, sepeti cookie'ye yazar; üstteki sepet sayısı aynı yanıtta güncellenir.
- `/cart` sepeti listeler ve ürün kaldırır.
- Bir CMS ürün değişince webhook'u çağırır, ilgili cache yenilenir.
- Her ürünün başlığı, canonical adresi, paylaşım görseli ve JSON-LD'si olur; site haritası ve `robots.txt` üretilir.
- Bir `instant()` testi ürün sayfasına geçişin anında kaldığını korur.

Amaç tasarım değil, derslerdeki parçaların birlikte çalışmasıdır. Her parçanın hangi dersten geldiği:

| Parça | Dosya | Ders |
| :-- | :-- | :-- |
| `"use cache"`, `cacheLife`, `cacheTag`, `connection()` | `lib/products.ts` | Cache ve render modeli |
| Cookie'de sepet, `server-only` | `lib/cart.ts` | Server ve Client Components |
| Kök layout, `<Suspense>` içinde sepet linki | `app/layout.tsx`, `components/cart-link.tsx` | Routing ve layout, Veri çekme ve streaming |
| `next/form`, `searchParams` | `app/products/page.tsx`, `components/product-list.tsx` | Routing ve layout |
| `params`'ı `<Suspense>` içinde okumak, `prefetch` | `app/products/[slug]/page.tsx` | Navigasyon ve prefetch |
| Server Action, `useActionState`, `bind` | `app/actions.ts`, `components/add-to-cart-form.tsx`, `app/cart/page.tsx` | Server Actions |
| `notFound`, `error.tsx` ve `retry` | `not-found.tsx`, `error.tsx` | Hata yönetimi |
| Webhook ile `revalidateTag` | `app/api/revalidate/route.ts` | Route Handler ve proxy |
| `generateMetadata`, OG görseli, sitemap, JSON-LD | `app/products/[slug]/`, `app/sitemap.ts`, `app/robots.ts` | Metadata ve SEO |
| `instant()` testi | `e2e/product.spec.ts` | Navigasyon ve prefetch |

Projenin çalışan hali GitHub'da: [examples/nextjs/project](https://github.com/virastack/academy/tree/main/examples/nextjs/project). Takıldığınızda karşılaştırın.

## Adım 1: Projeyi kurun

[Kurulum ve proje yapısı](/academy/nextjs/setup-and-folder-structure) dersindeki gibi varsayılanlarla bir proje açın:[^1]

```command
npx create-next-app@latest my-shop --yes
```

`next.config.ts`'te `cacheComponents: true` ve `partialPrefetching: true` hazır gelir; bu proje ikisine de dayanıyor. `app/page.tsx`'in içeriğini Adım 4'te değiştireceksiniz.

## Adım 2: Veri katmanı

Gerçek bir veritabanı yerine gecikmeli fonksiyonlar kullanın. Ürün bilgisi saatlerce değişmez, cache'lenir. Stok ise her istekte güncel olmalı.

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

- `"use cache"` sonucu argümanlara göre saklar. `getProduct("canvas-sneaker")` ile `getProduct("wool-beanie")` ayrı kayıtlardır.[^2]
- İki etiket var: `products` tüm listeyi, `product-${slug}` tek ürünü yeniler. Adım 10'daki webhook bunları kullanacak.[^3]
- `connection()` Next.js'e *"bunu prerender etme, istek anında çalıştır"* der. Stok her ziyarette yeniden okunur.[^2]

## Adım 3: Cookie'de sepet

Sepeti bir cookie'de JSON olarak tutun. Cookie okumak Server Component'te serbesttir; yazmak ise yalnızca bir Server Action ya da Route Handler'da olur, çünkü cookie yanıt başlığıyla gönderilir.[^4]

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

`httpOnly` cookie'yi tarayıcıdaki JavaScript'ten gizler. Yine de kullanıcı onu DevTools'tan değiştirebilir; bu yüzden içindeki her değeri güvenilmez kabul edeceksiniz *(Adım 7 ve 8)*.

## Adım 4: Layout ve sepet linki

Sepet sayısı cookie'den gelir, yani istek anında hesaplanır. Onu `<Suspense>` içine alırsanız header'ın geri kalanı statik kabukta kalır.[^2]

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

`create-next-app`'in yazdığı `layout.tsx` Geist font'larını `next/font` ile yükler. Bu dosyayla değiştirince `globals.css`'teki `--font-geist-sans` ve `--font-geist-mono` değişkenleri boşta kalır; onları `system-ui, sans-serif` ve `ui-monospace, monospace` ile değiştirin.

## Adım 5: Ürün listesi ve arama

`next/form`, `action` bir adres olduğunda aramayı `?q=` olarak URL'ye yazar ve istemci tarafında geçiş yapar.[^5] `searchParams` istek anında bilinir; okuyan kısım `<Suspense>` içinde olmalı.[^2]

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

`q` bir dizi de olabilir *(`?q=a&q=b`)*; `typeof` kontrolü bu yüzden var. `prefetch` ürün sayfasındaki cache'li içeriği tıklamadan önce getirir; etkisini Adım 12'deki test gösterecek.[^6]

## Adım 6: Ürün sayfası

Sayfanın üç katmanı var:

| Katman | İçerik | Ne zaman gelir |
| :-- | :-- | :-- |
| App Shell | `<article>` ve *"Loading product..."* | Tüm ürün linkleri için ortak, hemen |
| Cache'li detay | Ad, açıklama, fiyat, JSON-LD | `prefetch` ile tıklamadan önce |
| İstek anı | Stok ve **Add to cart** | Tıkladıktan sonra akarak |

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

- `ProductPage` `async` değil ve `params`'ı `await` etmiyor. Promise'i `<Suspense>` içindeki child'a veriyor. `await params` sayfanın en üstünde olsaydı geliştirmede *"URL data outside of Suspense"* uyarısı çıkardı.[^6]
- `generateStaticParams` üç ürünü build'de prerender eder. Ürüne doğrudan gelen ziyaretçi adı statik HTML'de görür.[^7]
- `generateMetadata` ve `ProductDetails` aynı `getProduct`'ı çağırıyor; `"use cache"` sayesinde veri bir kez okunur.[^8]

## Adım 7: Add to cart

Server Action stoğu ve ürünü sunucuda doğrular. İstemciden gelen `slug`'a güvenmez.[^9]

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

Header'daki **Cart (1)** için hiçbir şey yazmadınız. Bir Server Action cookie yazınca Next.js o sayfayı sunucuda yeniden render eder ve yeni arayüzü action'ın yanıtıyla aynı turda gönderir.[^4][^9] Stok kontrolü bir hata değil, beklenen bir durum; bu yüzden `throw` yerine mesaj dönüyor.

## Adım 8: Sepet sayfası

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

- Ürünler `Promise.all` ile paralel okunur; sırayla `await` etmek bir şelale yaratırdı.
- Cookie'de artık var olmayan bir ürün olabilir; `[]` dönen satır listeden düşer.
- `bind`, `slug`'ı action'a ilk argüman olarak bağlar. Form JavaScript yüklenmeden de çalışır.[^10]
- `robots: { index: false }` sepet sayfasını arama sonuçlarından çıkarır.

## Adım 9: Bulunamadı ve hata

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

`error.tsx` `app/products/` altında olduğu için hem listeyi hem ürün sayfalarını korur; header yerinde kalır. `/products/nope` adresi `not-found.tsx`'i gösterir. `notFound()` akış başladıktan sonra çağrıldığı için durum kodu `200` kalır ve sayfaya `noindex` eklenir.[^11]

## Adım 10: CMS webhook'u

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

Gizli anahtarı `.env.local`'a yazın:

```bash
# .env.local
REVALIDATE_SECRET=change-me
```

`"max"` profili *stale-while-revalidate* çalışır: webhook'tan sonraki ilk ziyaretçi eski sayfayı hemen alır ve arka planda yenileme başlar, sonraki ziyaretçi yeni veriyi görür.[^3] Bu rehber yazılırken production build'de denendi: webhook'tan sonraki ilk istek eski veriyi, ikincisi yenisini gösterdi.

## Adım 11: SEO dosyaları

[Metadata ve SEO](/academy/nextjs/metadata-and-seo) dersindeki üç dosyayı ekleyin:

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

Next.js `opengraph-image.tsx`'i bulunca ürün sayfasının `<head>`'ine `og:image` etiketini kendisi ekler; `metadataBase` sayesinde adres tam URL olur.[^12]

## Adım 12: Anında navigasyonu test edin

[!playwright] ve Next.js'in test yardımcısını kurun:[^13][^14]

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

`instant()` bloğunun içinde yalnızca tıklama anında hazır olan arayüz görünür; istek anı verisi blok bitene kadar bekletilir. Test, ürün adının orada olduğunu ve stoğun henüz gelmediğini doğruluyor.[^14]

- `waitForURL` olmadan seçici, hedef sayfa gelmeden kaynak sayfadaki bir öğeyi bulabilir. Hedef URL'yi beklemek bunu önler.[^14]
- `ProductList`'teki `prefetch`'i silip testi yeniden çalıştırın. Ürün adı artık bloğun içinde görünmediği için test başarısız olur. Biri ileride bu linki değiştirirse CI aynı şekilde yakalar.

Testler `next dev`'e karşı çalışır; test API'si orada kendiliğinden açıktır.[^14] Playwright'ın kendisi [Playwright](/academy/playwright) rehberinde.

## Adım 13: Son kontrol

```bash
npm run lint
npm run build
```

`next build` tipleri de kontrol eder. Build çıktısında ürün sayfaları `◐` ile işaretlenir: statik kabuk build'de üretildi, stok istek anında akıyor. Ürün bilgisinin yenilenme süresi `cacheLife("hours")`'tan gelir.[^2]

```text
├   /products/[slug]
│ ├ ◐ /products/canvas-sneaker                1h      1d
│ ├ ◐ /products/leather-backpack              1h      1d
│ └ ◐ /products/wool-beanie                   1h      1d
├ ƒ /api/revalidate
```

`npm start` ile açın ve şu sırayı deneyin: arama, ürün sayfası, **Add to cart**, stoğu 0 olan **Leather Backpack**, sepetten kaldırma, `/products/nope`, `/sitemap.xml` ve `/products/canvas-sneaker/opengraph-image`.

> [!TIP]
>
> Bu projeyi bir agent'la geliştirecekseniz `next-dev-loop` skill'ini kurun ve her değişiklikten sonra `npx playwright test`'i çalıştırmasını isteyin. Ayrıntısı [AI agent'larla Next.js](/academy/nextjs/ai-agents) dersinde.

## Kendin dene

- DevTools'tan `cart` cookie'sini `{"canvas-sneaker":99}` yapın. Sepet ne gösteriyor? **Add to cart**'ye basınca ne oluyor? Gerçek bir mağazada sepetin neden veritabanında tutulduğunu düşünün.
- `getProduct`'tan `"use cache"`, `cacheLife` ve `cacheTag` satırlarını silip `instant()` testini çalıştırın. Neden başarısız oldu? *(Yalnızca `"use cache"`'i silerseniz `cacheLife` hata verir.)*
- `getProduct`'ın döndürdüğü açıklamaya `new Date().toISOString()` koyun. `npm run build && npm start` ile açıp webhook'u `curl -X POST -H "x-revalidate-secret: change-me" -H "content-type: application/json" -d '{"slug":"canvas-sneaker"}' localhost:3000/api/revalidate` ile çağırın; sayfayı iki kez yenileyin.
- Ürün sayfasına öneriler bölümü ekleyin ve [Hata yönetimi](/academy/nextjs/error-handling) dersindeki `SectionBoundary` ile sarın. Öneriler hata verince sayfanın geri kalanı yerinde kalıyor mu?
- Sepet sayfasına toplam fiyatı ekleyin. Hesabı sunucuda mı istemcide mi yaptınız, neden?
- `next.config.ts`'e `/sepet` → `/cart` yönlendirmesini `redirects` ile ekleyin.

## Kaynaklar

1. [Next.js: Installation](https://nextjs.org/docs/app/getting-started/installation) *(doc)* — `create-next-app` ve varsayılan ayarlar.
2. [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching) *(doc)* — `"use cache"`, `cacheLife`, `connection()`, runtime veriyi `<Suspense>` içinde okumak ve statik kabuk.
3. [Next.js: revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag) *(doc)* — Etiketle yenileme, `"max"` profili ve stale-while-revalidate davranışı.
4. [Next.js: cookies](https://nextjs.org/docs/app/api-reference/functions/cookies) *(doc)* — Cookie'nin yalnızca Server Function ya da Route Handler'da yazılması ve aynı turda güncellenen arayüz.
5. [Next.js: Form Component](https://nextjs.org/docs/app/api-reference/components/form) *(doc)* — Aramayı URL'ye yazan form ve istemci tarafı geçiş.
6. [Next.js: Adopting Partial Prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching) *(doc)* — URL verisini `<Suspense>` içine taşımak ve `prefetch={true}` ile cache'li içeriği önceden getirmek.
7. [Next.js: generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params) *(doc)* — Dinamik segmentleri build'de prerender etmek.
8. [Next.js: Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) *(doc)* — `generateMetadata` ve sayfanın aynı veriyi tekrar okumaması.
9. [Next.js: Server Actions and Mutations](https://nextjs.org/docs/app/guides/server-actions) *(doc)* — Her action'ı güvenilmez giriş noktası saymak, cookie yazınca sayfanın yeniden render edilmesi ve tek turda veri ile arayüz.
10. [Next.js: Forms](https://nextjs.org/docs/app/guides/forms) *(doc)* — `bind` ile action'a argüman geçmek ve JavaScript yüklenmeden çalışan formlar.
11. [Next.js: Streaming, Status codes](https://nextjs.org/docs/app/guides/streaming#status-codes) *(doc)* — Akış başladıktan sonra `notFound()` ve `noindex`.
12. [Next.js: opengraph-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) *(doc)* — Kodla üretilen paylaşım görseli ve otomatik `og:image` etiketi.
13. [Playwright: Installation](https://playwright.dev/docs/intro) *(doc)* — Kurulum, tarayıcıları indirmek ve testleri çalıştırmak.
14. [Next.js: Instant Navigation](https://nextjs.org/docs/app/guides/instant-navigation) *(doc)* — `instant()` testi, hedef URL'yi beklemek ve `next dev`'de test API'si.
