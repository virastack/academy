---
title: "Metadata ve SEO"
description: "metadata, generateMetadata, OG görseli, sitemap, robots ve JSON-LD."
lastVerified: "2026-10-21"
translationKey: "nextjs/metadata-and-seo"
---

## SEO'da Next.js'in payı

Google'ın başlangıç rehberine göre arama motorunun işi üç adımdır: sayfayı bulmak, taramak ve içeriği anlamak.[^1] Google JavaScript'i de çalıştırabilir ama bunu sonradan, ayrı bir sırada yapar; sunucuda render edilmiş HTML bu adımı kolaylaştırır.[^2] App Router sayfaları zaten sunucuda render eder ve botlara akış yerine tamamlanmış HTML gönderir.[^3]

Geriye sizin işiniz kalır: her sayfaya doğru başlık ve açıklama, paylaşım görseli, site haritası ve gerekiyorsa yapılandırılmış veri.

## Statik metadata

`layout.tsx` ya da `page.tsx`'ten bir `metadata` nesnesi export edin. Next.js `<head>` etiketlerini kendisi üretir. Yalnızca Server Component'lerde çalışır.[^4]

```tsx
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://shop.example.com"),
  title: { default: "Mağaza", template: "%s | Mağaza" },
  description: "Next.js ile kurulmuş küçük bir ürün kataloğu.",
};
```

```tsx
// app/products/page.tsx
export const metadata: Metadata = { title: "Ürünler" }; // → "Ürünler | Mağaza"
```

- `title.template` alt segmentlerdeki başlığa ek yapar. Template kullanıyorsanız `default` zorunludur.[^5]
- `metadataBase` sayesinde OG görseli ve canonical gibi alanlara göreli adres yazabilirsiniz.[^5]

## Veriye bağlı metadata

Ürün sayfasının başlığı üründen gelir. `generateMetadata` bunun için:[^4]

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

Sayfa ve `generateMetadata` aynı veriyi okuyor. `getProduct` `"use cache"` ile ya da `React.cache` ile sarılıysa sorgu bir kez çalışır.[^4]

Dinamik sayfalarda Next.js metadata'yı **akıtır**: görsel içerik önce gelir, `<head>` etiketleri hazır olunca eklenir. `<head>`'de görmeyi bekleyen botlar *(Twitterbot, Slackbot, Bingbot gibi)* user agent'larından tanınır ve tamamlanmış sayfayı alır.[^4]

## Paylaşım görseli, sitemap ve robots

Bazı metadata dosya adıyla tanımlanır. Dosyayı ilgili klasöre koymanız yeter:[^6]

| Dosya | Sonuç |
| :-- | :-- |
| `app/favicon.ico`, `app/icon.png` | Site ikonu |
| `app/opengraph-image.png` | Varsayılan paylaşım görseli |
| `app/products/[slug]/opengraph-image.tsx` | Her ürün için kodla üretilen görsel |
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

Paylaşım görselini kodla üretmek için `next/og`'daki `ImageResponse` JSX ve CSS'ten PNG oluşturur. Yalnızca flexbox ve CSS'in bir alt kümesi desteklenir; `display: grid` çalışmaz.[^4]

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
      {product?.name ?? "Mağaza"}
    </div>,
    size,
  );
}
```

## Yapılandırılmış veri: JSON-LD

JSON-LD, sayfanın bir ürün, makale ya da etkinlik olduğunu makinenin anlayacağı şekilde anlatır. Google bunu zengin sonuçlar *(fiyat, puan)* için kullanır.[^7] Next.js'in önerisi sayfada bir `<script type="application/ld+json">` render etmektir:[^8]

```tsx
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name,
  description: product.description,
  offers: { "@type": "Offer", price: product.price, priceCurrency: "TRY" },
};

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
/>;
```

> [!CAUTION]
>
> `JSON.stringify` HTML'i temizlemez. Ürün adında `</script>` gibi bir değer XSS açığı yaratabilir. Örnekteki `<` → `<` değişimini atlamayın.[^8]

Sonucu Google'ın Rich Results Test aracıyla kontrol edin.[^8] Sayfa hızı da sıralamayı etkiler; Core Web Vitals, görsel ve font [Performans ve Erişilebilirlik](/academy/performance-accessibility/core-web-vitals) rehberinde.

## Kendin dene

- Ürün sayfasını açıp DevTools'ta `<head>`'e bakın. `<title>` template'e göre mi oluşmuş?
- `/sitemap.xml` ve `/robots.txt` adreslerini açın.
- `opengraph-image.tsx`'i ekleyin ve `/products/canvas-sneaker/opengraph-image` adresinde görseli görün.
- Ürün adını `<b>Test</b>` yapıp JSON-LD'yi `replace` olmadan ve onunla render edin; sayfa kaynağını karşılaştırın.

## Detaylı öğrenmek için

- **Resmi doküman:** Google Search Central "SEO Starter Guide"; bir sitenin aramada nasıl bulunduğunu temelden anlatır.[^1]
- **Resmi doküman:** Google'ın "JavaScript SEO basics" sayfası; Googlebot'un JavaScript'i nasıl işlediği ve sunucuda render'ın yeri.[^2]
- **Resmi doküman:** Next.js `generateMetadata` referansı; tüm metadata alanları ve Cache Components ile davranışı.[^5]

## Kaynaklar

1. [Google Search Central: SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) *(doc)* — Arama motorunun sayfayı bulması, taraması ve anlaması için temel uygulamalar.
2. [Google Search Central: Understand JavaScript SEO Basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) *(doc)* — Googlebot'un tarama, render ve dizine ekleme aşamaları.
3. [Next.js: Streaming, Bots and crawlers](https://nextjs.org/docs/app/guides/streaming#bots-and-crawlers) *(doc)* — Botlara tamamlanmış HTML gönderilmesi.
4. [Next.js: Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) *(doc)* — Statik ve üretilen metadata, akış, veri tekrarını önleme, dosya tabanlı metadata ve `ImageResponse`.
5. [Next.js: generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) *(doc)* — Metadata alanları, `title.template`, `metadataBase` ve `alternates`.
6. [Next.js: Metadata Files](https://nextjs.org/docs/app/api-reference/file-conventions/metadata) *(doc)* — `icon`, `opengraph-image`, `sitemap` ve `robots` dosya kuralları.
7. [Google Search Central: Introduction to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) *(doc)* — Yapılandırılmış verinin ne işe yaradığı ve JSON-LD önerisi.
8. [Next.js: JSON-LD](https://nextjs.org/docs/app/guides/json-ld) *(doc)* — `<script>` ile JSON-LD, XSS'e karşı `<` kaçışı ve doğrulama araçları.
