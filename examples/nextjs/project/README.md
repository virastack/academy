# Ürün Kataloğu

[Next.js rehberindeki](https://virastack.com/academy/nextjs/project) proje dersinin çalışan hali. Takıldığınızda karşılaştırın.

`create-next-app` ile kurulmuş küçük bir mağaza: ürün listesi ve arama, cache'li ürün sayfası ve akan stok bilgisi, cookie'de sepet, CMS webhook'u, SEO dosyaları ve bir `instant()` testi.

## Çalıştırma

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` webhook'un kullandığı `REVALIDATE_SECRET` değerini taşır.

## Kontroller

```bash
npm run lint
npm run build
npx playwright install chromium
npx playwright test
```

`next build` tipleri de kontrol eder. Playwright testi `npm run dev` ile kendi sunucusunu açar.

| Dosya | Ne öğretir |
| :-- | :-- |
| `lib/products.ts` | `"use cache"`, `cacheLife`, `cacheTag`, `connection()` |
| `lib/cart.ts` | Cookie'de sepet, `server-only` |
| `app/layout.tsx`, `components/cart-link.tsx` | Kök layout, `<Suspense>` içinde sepet linki |
| `app/products/page.tsx`, `components/product-list.tsx` | `next/form` ile arama, `searchParams` |
| `app/products/[slug]/page.tsx` | `params`'ı `<Suspense>` içinde okumak, `prefetch` |
| `app/actions.ts`, `components/add-to-cart-form.tsx`, `app/cart/page.tsx` | Server Action, `useActionState`, `bind` |
| `app/products/[slug]/not-found.tsx`, `app/products/error.tsx` | `notFound`, `error.tsx` ve `retry` |
| `app/api/revalidate/route.ts` | Webhook ile `revalidateTag` |
| `app/products/[slug]/opengraph-image.tsx`, `app/sitemap.ts`, `app/robots.ts` | Paylaşım görseli, site haritası, `robots.txt` |
| `e2e/product.spec.ts` | `instant()` ile anında navigasyon testi |
