---
title: "Cache ve render modeli"
description: "Cache Components, use cache, cacheLife, cacheTag ve statik kabuk."
lastVerified: "2026-10-21"
translationKey: "nextjs/caching-and-rendering"
---

## Varsayılan: Her şey dinamik

Next.js'in cache modeli son üç sürümde değişti. Next.js 14'te `fetch` varsayılan olarak cache'liydi; 15'te bu varsayılan kaldırıldı.[^1] 16 ile gelen **Cache Components** ise kuralı tersine çevirdi: veri her istekte taze okunur, neyi cache'leyeceğinizi siz `"use cache"` ile söylersiniz.[^2] 16.4'ten beri yeni projelerde bu model açık gelir.[^3]

> [!WARNING]
>
> AI araçları ve eski tutorial'lar hâlâ `export const dynamic = "force-static"`, `export const revalidate = 60` ya da `fetch(url, { next: { revalidate: 60 } })` önerir. Bunlar önceki modele aittir. Cache Components'te karşılıkları `"use cache"` ve `cacheLife`'tır.[^4]

## Statik kabuk

Build sırasında Next.js her sayfayı render etmeyi dener. Tamamlanabilen her şey **statik kabuğa** *(static shell)* girer ve CDN'den anında sunulur. Tamamlanamayan kısımlar için `<Suspense>` fallback'i kabuğa konur, içerik istek anında akar. Bu modelin adı **Partial Prerendering** *(PPR)*.[^2]

| Kodda | Sonuç |
| :-- | :-- |
| Statik JSX, import, saf hesaplama | Kabuğa girer |
| `"use cache"` ile cache'lenmiş veri | Kabuğa girer |
| `<Suspense>` içindeki cache'lenmemiş veri, `cookies()`, `headers()` | Fallback kabuğa girer, içerik istek anında akar |
| `<Suspense>` dışında cache'lenmemiş veri | Geliştirmede uyarı ve önerilen çözümler |

`next build` çıktısında böyle sayfalar `◐` *(Partial Prerender)* işaretiyle görünür. Bu rehberin [proje](/academy/nextjs/project) uygulamasında ürün sayfası, cache'li ürün bilgisi ve akan stok bilgisiyle böyle işaretlendi.

Next.js ekibinin önerdiği kalıp, async işi ağaçta **olabildiğince aşağı** itmektir. Ne kadar derindeyse kabuk o kadar dolu olur.[^2]

## use cache

`"use cache"`, async bir fonksiyonun ya da component'in sonucunu cache'ler. Argümanlar otomatik olarak cache anahtarına girer; `getProduct("a")` ile `getProduct("b")` ayrı kayıtlardır.[^5]

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

Doküman her `"use cache"`'in yanına bir `cacheLife` yazmayı önerir; yazmazsanız `default` profili uygulanır.[^2] Sık kullanılan profiller:[^6]

| Profil | Tarayıcıda taze *(stale)* | Arka planda yenilenir *(revalidate)* | Süresi dolar *(expire)* |
| :-- | :-- | :-- | :-- |
| `minutes` | 5 dk | 1 dk | 1 saat |
| `hours` | 5 dk | 1 saat | 1 gün |
| `days` | 5 dk | 1 gün | 1 hafta |
| `max` | 5 dk | 30 gün | 1 yıl |

`seconds` gibi çok kısa ömürlü cache'ler kabuğa alınmaz, dinamik bir delik olarak kalır.[^6]

`"use cache"`'i bir component'e de yazabilirsiniz. Cache'li component'e `children` olarak verdiğiniz dinamik içerik cache kaydına girmez, olduğu gibi geçer.[^5]

## Kullanıcıya özel veri

`cookies()`, `headers()` ve `searchParams` istek anında bilinir. Bunları okuyan component `<Suspense>` içinde olmalıdır.[^2]

```tsx
import { cookies } from "next/headers";
import { Suspense } from "react";

export default function Page() {
  return (
    <>
      <h1>Mağaza</h1>
      <Suspense fallback={<span>Sepet</span>}>
        <CartCount />
      </Suspense>
    </>
  );
}

async function CartCount() {
  const cart = (await cookies()).get("cart")?.value;
  return <span>Sepet ({cart ? Object.keys(JSON.parse(cart)).length : 0})</span>;
}
```

`"use cache"` içinde `cookies()` çağıramazsınız. Değeri dışarıda okuyup **argüman olarak** verin; argüman cache anahtarına girer.[^5]

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

`Math.random()`, `Date.now()` ve `crypto.randomUUID()` de her çalışmada farklı değer üretir. Her istekte yeni değer istiyorsanız önce `await connection()` çağırın ve `<Suspense>` ile sarın; herkese aynı değer yetiyorsa `"use cache"` ile cache'leyin.[^2]

## Cache'i güncellemek

İki yol var: süreyle *(`cacheLife`)* ya da bir olaydan sonra elle.[^7]

| API | Ne yapar | Nerede |
| :-- | :-- | :-- |
| `updateTag("products")` | Kaydı hemen siler; kullanıcı kendi değişikliğini anında görür | Yalnızca Server Action |
| `revalidateTag("products", "max")` | Eskiyi sunarken arka planda yeniler | Server Action ve Route Handler |
| `revalidatePath("/products")` | Bir adresin tüm verisini geçersiz kılar | Server Action ve Route Handler |

Doküman etiket tabanlı yenilemeyi tercih etmeyi önerir; daha nokta atışıdır.[^7] CMS gibi seyrek değişen içerik için uzun bir `cacheLife("max")` ve bir etiket verip, içerik değişince CMS'in webhook'uyla `revalidateTag` çağırmak gereksiz yenilemeyi önler.[^7] Webhook'u [Route Handler ve proxy](/academy/nextjs/route-handlers-and-proxy) dersinde yazacaksınız.

## Cache nerede durur

| Katman | Varsayılan |
| :-- | :-- |
| Statik kabuk *(HTML)* | Build'de üretilir, CDN'den sunulur |
| `"use cache"` çalışma zamanı kaydı | Sunucu örneğinin belleğinde. Serverless'ta istekler arası kalmayabilir |
| Tarayıcı | Navigasyonda gelen sonuç `stale` süresi boyunca tekrar istenmez |

Sunucular arası paylaşılan, kalıcı bir cache gerekiyorsa `"use cache: remote"` var. Her istek bir ağ gidiş-dönüşü demek, bu yüzden yalnızca isabet oranı yüksekse kazandırır.[^2] Hiçbir cache yeni bir deploy'a taşınmaz; anahtar build kimliğini içerir.[^5]

## Kendin dene

- `getProduct`'tan `"use cache"`'i silin ve `next dev`'deki uyarıyı okuyun. Önerilen iki çözümü tek tek deneyin.
- `next build` çıktısında sayfaların yanındaki `○`, `◐` ve `ƒ` işaretlerini karşılaştırın.
- `"use cache"` içinde `cookies()` çağırın. Hata mesajı ne diyor?
- `cacheLife("seconds")` verin ve build çıktısındaki değişikliğe bakın.

## Detaylı öğrenmek için

- **Yazı:** [Aurora Scharff](https://aurorascharff.no/), "Cache Components in Next.js"; tek bir mağaza sayfası üzerinden ilk cache'ten etiketle yenilemeye kadar modeli adım adım anlatır.[^8]
- **Video:** Aurora Scharff'ın Next.js Conf 2025 konuşması "Composition, Caching, and Architecture in Modern Next.js".[^9]
- **Video:** Next.js ekibinin "Why Partial Prerendering and how it works" anlatımı *(10 dk)*.[^10]
- **Resmi doküman:** "Migrating to Cache Components" rehberi; `dynamic`, `revalidate`, `unstable_cache` gibi eski ayarların karşılıkları.[^4]

## Kaynaklar

1. [Next.js: Upgrading to Version 15](https://nextjs.org/docs/app/guides/upgrading/version-15) *(doc)* — `fetch` ve `GET` Route Handler'larının artık varsayılan olarak cache'lenmemesi.
2. [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching) *(doc)* — Cache Components, statik kabuk, runtime API'ler, `connection()`, kabuğu büyütmek ve cache'in nerede saklandığı.
3. [Next.js Blog: Next.js 16.4](https://nextjs.org/blog/next-16-4) *(doc)* — 6 Ekim 2026. Cache Components'in yeni projelerde varsayılan olması.
4. [Next.js: Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components) *(doc)* — Eski route segment ayarlarının ve `fetch` seçeneklerinin karşılıkları.
5. [Next.js: use cache](https://nextjs.org/docs/app/api-reference/directives/use-cache) *(doc)* — Cache anahtarı, serileştirme, runtime API kısıtı, `children` ile composition ve deploy'lar arası davranış.
6. [Next.js: cacheLife](https://nextjs.org/docs/app/api-reference/functions/cacheLife) *(doc)* — Profiller, `stale`/`revalidate`/`expire` ve kısa ömürlü cache'in prerender davranışı.
7. [Next.js: Revalidating](https://nextjs.org/docs/app/getting-started/revalidating) *(doc)* — `cacheTag`, `updateTag`, `revalidateTag`, `revalidatePath` ve neyin cache'leneceği.
8. [Aurora Scharff](https://aurorascharff.no/): [Cache Components in Next.js](https://certificates.dev/blog/cache-components-in-nextjs) *(article)* — 9 Temmuz 2026, certificates.dev. `use cache`, `cacheLife`, `cacheTag` ve isteğe bağlı yenileme.
9. [Aurora Scharff](https://aurorascharff.no/): [Composition, Caching, and Architecture in Modern Next.js](https://nextjs.org/conf/session/modern-nextjs-development-composition-caching-and-architecture) *(video)* — Next.js Conf 2025 oturumu.
10. [Next.js: Why Partial Prerendering and how it works](https://www.youtube.com/watch?v=MTcPrTIBkpA) *(video)* — Next.js dokümanında önerilen 10 dakikalık PPR anlatımı.
