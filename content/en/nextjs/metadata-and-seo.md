---
title: "Metadata and SEO"
description: "metadata, generateMetadata, OG images, sitemap, robots and JSON-LD."
lastVerified: "2026-10-21"
translationKey: "nextjs/metadata-and-seo"
---

## What Next.js does for SEO

Per Google's starter guide, a search engine's work comes in three steps: finding the page, crawling it and understanding the content.[^1] Google can run JavaScript too, but it does so afterwards, in a separate queue; HTML rendered on the server makes that step easier.[^2] App Router pages are rendered on the server already, and bots get completed HTML rather than a stream.[^3]

What is left is your job: the right title and description on every page, a share image, a sitemap and, where needed, structured data.

## Static metadata

Export a `metadata` object from `layout.tsx` or `page.tsx`. Next.js produces the `<head>` tags itself. It only works in Server Components.[^4]

```tsx
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://shop.example.com"),
  title: { default: "Store", template: "%s | Store" },
  description: "A small product catalogue built with Next.js.",
};
```

```tsx
// app/products/page.tsx
export const metadata: Metadata = { title: "Products" }; // → "Products | Store"
```

- `title.template` adds to the title in the segments below it. If you use a template, `default` is required.[^5]
- `metadataBase` lets you write relative addresses in fields such as the OG image and the canonical link.[^5]

## Metadata that depends on data

A product page's title comes from the product. `generateMetadata` is for that:[^4]

```tsx
// app/products/[slug]/page.tsx
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
```

The page and `generateMetadata` read the same data. If `getProduct` is wrapped with `"use cache"` or with `React.cache`, the query runs once.[^4]

On dynamic pages Next.js **streams** the metadata: the visible content comes first and the `<head>` tags are added once they are ready. Bots that expect them in the `<head>` *(Twitterbot, Slackbot and Bingbot among them)* are recognised by their user agent and get the completed page.[^4]

## The share image, the sitemap and robots

Some metadata is defined by file name. Putting the file in the right folder is all it takes:[^6]

| File | Result |
| :-- | :-- |
| `app/favicon.ico`, `app/icon.png` | The site icon |
| `app/opengraph-image.png` | The default share image |
| `app/products/[slug]/opengraph-image.tsx` | An image generated in code for each product |
| `app/sitemap.ts` | `/sitemap.xml` |
| `app/robots.ts` | `/robots.txt` |

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

To generate the share image in code, `ImageResponse` from `next/og` turns JSX and CSS into a PNG. Only flexbox and a subset of CSS are supported; `display: grid` does not work.[^4]

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

## Structured data: JSON-LD

JSON-LD describes, in a way a machine can read, that the page is a product, an article or an event. Google uses it for rich results *(the price, a rating)*.[^7] Next.js recommends rendering a `<script type="application/ld+json">` on the page:[^8]

```tsx
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name,
  description: product.description,
  offers: { "@type": "Offer", price: product.price, priceCurrency: "EUR" },
};

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
/>;
```

> [!CAUTION]
>
> `JSON.stringify` does not sanitise HTML. A value such as `</script>` in the product name can open an XSS hole. Do not skip the `<` → `<` replacement in the example.[^8]

Check the result with Google's Rich Results Test.[^8] Page speed affects ranking too; Core Web Vitals, images and fonts are in the [Performance and Accessibility](/academy/performance-accessibility/core-web-vitals) guide.

## Try it yourself

- Open the product page and look at the `<head>` in DevTools. Was the `<title>` built from the template?
- Open the `/sitemap.xml` and `/robots.txt` addresses.
- Add `opengraph-image.tsx` and see the image at `/products/canvas-sneaker/opengraph-image`.
- Make the product name `<b>Test</b>` and render the JSON-LD with and without the `replace`; compare the page source.

## Going deeper

- **Official docs:** Google Search Central's "SEO Starter Guide"; how a site is found in search, from the ground up.[^1]
- **Official docs:** Google's "JavaScript SEO basics" page; how Googlebot handles JavaScript and where server rendering fits.[^2]
- **Official docs:** the Next.js `generateMetadata` reference; all the metadata fields and the behaviour with Cache Components.[^5]

## Sources

1. [Google Search Central: SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) *(doc)* — The basic practices for a search engine to find, crawl and understand a page.
2. [Google Search Central: Understand JavaScript SEO Basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) *(doc)* — Googlebot's crawling, rendering and indexing stages.
3. [Next.js: Streaming, Bots and crawlers](https://nextjs.org/docs/app/guides/streaming#bots-and-crawlers) *(doc)* — Completed HTML being sent to bots.
4. [Next.js: Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) *(doc)* — Static and generated metadata, streaming, avoiding duplicate queries, file-based metadata and `ImageResponse`.
5. [Next.js: generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) *(doc)* — The metadata fields, `title.template`, `metadataBase` and `alternates`.
6. [Next.js: Metadata Files](https://nextjs.org/docs/app/api-reference/file-conventions/metadata) *(doc)* — The `icon`, `opengraph-image`, `sitemap` and `robots` file conventions.
7. [Google Search Central: Introduction to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) *(doc)* — What structured data is for, and the recommendation of JSON-LD.
8. [Next.js: JSON-LD](https://nextjs.org/docs/app/guides/json-ld) *(doc)* — JSON-LD in a `<script>`, escaping `<` against XSS, and the validation tools.
