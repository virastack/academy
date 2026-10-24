---
title: "Route Handler ve proxy"
description: "API uç noktası, webhook, proxy.ts ve hangisinin ne zaman kullanılacağı."
lastVerified: "2026-10-21"
translationKey: "nextjs/route-handlers-and-proxy"
---

## Hangisi ne için

Next.js'te sunucuda kod çalıştırmanın dört yolu var. Yanlış olanı seçmek, App Router'daki en yaygın hatalardan biri:[^1]

| İhtiyaç | Doğru araç |
| :-- | :-- |
| Sayfa için veri okumak | Server Component |
| Formdan ya da butondan veri değiştirmek | Server Action |
| Dışarıdan çağrılan bir adres: webhook, mobil uygulama, OAuth geri dönüşü, dosya indirme | Route Handler |
| Her istekten önce yönlendirme, rewrite ya da başlık eklemek | `proxy.ts` |

## Route Handler

`route.ts` dosyası, Web standardı `Request` ve `Response` ile çalışan bir HTTP uç noktasıdır. Her HTTP metodu için bir fonksiyon export edersiniz.[^2]

```ts
// app/api/products/[slug]/route.ts
import type { NextRequest } from "next/server";

import { getProduct } from "@/lib/products";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/products/[slug]">) {
  const { slug } = await ctx.params;
  const product = await getProduct(slug);

  if (!product) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ slug: product.slug, name: product.name, price: product.price });
}
```

`RouteContext`, `PageProps` gibi global bir yardımcıdır; `params` tipini klasörden üretir.[^2] Aynı klasörde hem `page.tsx` hem `route.ts` olamaz; ikisi de o adresin tüm isteklerini üstlenir.[^2]

Cache Components açıkken `GET` handler'ları sayfalarla aynı kurala uyar: istek verisi okumuyorsa build'de statik üretilir, okuyorsa istek anında çalışır. `"use cache"`'i doğrudan handler'a değil, çağırdığı yardımcı fonksiyona yazın.[^2]

> [!DONT]
>
> - Kendi Server Component'inizden kendi Route Handler'ınıza `fetch` atmak. Fonksiyonu doğrudan çağırın.[^1]
> - Route Handler'ı bir Server Action yerine form göndermek için kullanmak. Action tipli ve tek istekte sayfayı da günceller.

## Webhook: CMS değişince cache'i yenilemek

Bir CMS içerik değişince sizin adresinize istek atabilir. Handler isteği doğrular ve ilgili etiketi yeniler:[^3]

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

Route Handler'lar da açık uç noktalardır. Dokümanın güvenlik listesi kısa: gelen başlıklara güvenmeyin, rate limit koyun, webhook gövdesini sağlayıcının imzasıyla doğrulayın ve korunan kaynaklarda yetki kontrol edin.[^3] Rol kontrolü örneği [Yetkilendirme ve roller](/academy/auth-security/authorization-and-roles) dersinde.

Yanıttan sonra çalışacak işler *(log, analitik)* için `after()` kullanın; kullanıcı yanıtı beklemez.[^4]

```ts
import { after } from "next/server";

after(() => logEvent("product_revalidated"));
```

## proxy.ts

Next.js 16'da `middleware.ts`'in adı `proxy.ts` oldu. İş aynı: istek uygulamaya ulaşmadan önce çalışır, yönlendirir, rewrite eder ya da başlık değiştirir. Varsayılan olarak Node.js runtime'ında çalışır.[^5][^6]

Örnek: ana sayfanın iki tasarımını A/B testiyle denemek. Kullanıcı bir gruba atanır, B grubu URL değişmeden `/home-b` sayfasını görür:

```ts
// proxy.ts
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const bucket = request.cookies.get("home-test")?.value ?? (Math.random() < 0.5 ? "a" : "b");

  const response =
    bucket === "b"
      ? NextResponse.rewrite(new URL("/home-b", request.url))
      : NextResponse.next();

  response.cookies.set("home-test", bucket);
  return response;
}

export const config = {
  matcher: "/",
};
```

İki kural:

- **`matcher`'ı unutmayın.** Yoksa proxy statik dosyalar ve görseller dahil her istekte çalışır; yanlış bir yönlendirme CSS'i ve resimleri de engelleyebilir.[^5]
- **Basit yönlendirme için önce `next.config.ts`'teki `redirects`'e bakın.** Proxy, istek verisine bakan mantık için.[^6]

> [!WARNING]
>
> Proxy yavaş veri çekme ya da tam bir yetki sistemi için değildir. Cookie var mı diye bakıp iyimser yönlendirme yapabilir; asıl kontrol veriye yakın yapılır.[^6] Neden böyle olduğu ve CVE-2025-29927 örneği [Next.js'te auth](/academy/auth-security/auth-in-nextjs) dersinde.

## Kendin dene

- `app/api/products/[slug]/route.ts`'i yazın ve `curl localhost:3000/api/products/canvas-sneaker` ile çağırın.
- Webhook'u gizli anahtar olmadan ve anahtarla çağırın; iki yanıtı karşılaştırın.
- A/B örneğini kurun, `home-test` cookie'sini DevTools'tan silip sayfayı birkaç kez yenileyin.
- `proxy.ts`'ten `matcher`'ı silin ve her isteğe `console.log` yazdırın. Bir sayfa açılınca kaç kez çalışıyor?
- `next.config.ts`'e `/old-shop` → `/products` yönlendirmesini `redirects` ile ekleyin.

## Detaylı öğrenmek için

- **Resmi doküman:** "Backend for Frontend" rehberi; içerik türleri, bir backend'e proxy'leme, webhook'lar, güvenlik ve sınırlar.[^3]
- **Yazı:** [Lee Robinson](https://leerob.com/), "Common mistakes with the Next.js App Router"; Route Handler'ı gereksiz kullanmak ve diğer hatalar.[^1]
- **Resmi doküman:** `proxy.js` referansı; `matcher` kalıpları, cookie ve başlık okuma, `middleware`'den geçiş.[^5]

## Kaynaklar

1. [Lee Robinson](https://leerob.com/): [Common mistakes with the Next.js App Router and how to fix them](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) *(article)* — Vercel blogu. Server Component'ten Route Handler çağırmak ve doğru aracı seçmek.
2. [Next.js: Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) *(doc)* — `route.ts`, HTTP metotları, Cache Components ile `GET`, `RouteContext` ve rota çakışması.
3. [Next.js: Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend) *(doc)* — Webhook ile `revalidateTag`, backend'e proxy'leme, güvenlik maddeleri ve sınırlar.
4. [Next.js: after](https://nextjs.org/docs/app/api-reference/functions/after) *(doc)* — Yanıttan sonra iş planlamak.
5. [Next.js: proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) *(doc)* — `matcher`, Node.js runtime, `middleware`'den geçiş ve sürüm geçmişi.
6. [Next.js: Proxy](https://nextjs.org/docs/app/getting-started/proxy) *(doc)* — Kullanım alanları, `redirects` önerisi ve proxy'nin tam yetki çözümü olmaması.
