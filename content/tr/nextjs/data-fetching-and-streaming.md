---
title: "Veri çekme ve streaming"
description: "Sunucuda veri okuma, Suspense ile akış, şelaleyi önleme ve istemcide veri."
lastVerified: "2026-10-21"
translationKey: "nextjs/data-fetching-and-streaming"
---

## Veriyi component'te okumak

Server Component `async` olabilir. Veriyi `fetch` ile, bir ORM ile ya da doğrudan veritabanından okursunuz. Arada bir API katmanı gerekmez ve kimlik bilgileri istemciye gitmez.[^1]

```tsx
// app/products/page.tsx
import { getProducts } from "@/lib/products";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <ul>
      {products.map((product) => (
        <li key={product.slug}>{product.name}</li>
      ))}
    </ul>
  );
}
```

> [!DONT]
>
> - Server Component'ten kendi `app/api/...` route'unuza `fetch` atmak. İkisi de sunucuda çalışır; ekstra bir HTTP isteği kazanırsınız. [Lee Robinson](https://leerob.com/)'un App Router'da en sık gördüğü hata listesinin ilk maddesi bu: fonksiyonu doğrudan çağırın.[^2]

Veriyi kullanan component'te okuyun, prop olarak taşımayın. Aynı adrese yapılan `fetch` istekleri tek render içinde otomatik birleştirilir. `fetch` dışındaki erişimler *(ORM, SDK)* için fonksiyonu React'in `cache`'iyle sarın; aynı istek içindeki tekrar çağrılar tek sonucu paylaşır.[^1][^3]

```ts
// lib/user.ts
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
```

`React.cache` yalnızca **tek bir isteğin** içinde geçerlidir; istekler arasında veri saklamaz.[^1] İstekler arası cache [bir sonraki dersin](/academy/nextjs/caching-and-rendering) konusu.

## Streaming: Hazır olanı önce göndermek

Yavaş bir sorgu bütün sayfayı bekletir. **Streaming**, sayfayı parçalara bölüp hazır olanı hemen gönderir, yavaş kısmı sonradan akıtır. Bunun iki yolu var:[^1]

| Yol | Ne sarar | Ne zaman |
| :-- | :-- | :-- |
| `loading.tsx` | Segmentteki sayfanın tamamını | Sayfa geneli bir iskelet yeterliyse |
| `<Suspense>` | Yalnızca yavaş component'i | Sayfanın geri kalanı hemen görünsün istiyorsanız |

```tsx
import { Suspense } from "react";

export default function ProductPage() {
  return (
    <>
      <ProductInfo />
      <Suspense fallback={<p>Yorumlar yükleniyor...</p>}>
        <Reviews />
      </Suspense>
    </>
  );
}
```

Cache Components açık bir projede bu seçim isteğe bağlı değildir. Cache'lenmemiş bir veriyi `<Suspense>` dışında okursanız Next.js geliştirmede **blocking route** uyarısı verir ve iki çözüm önerir: `<Suspense>` ile sarmak ya da veriyi `"use cache"` ile cache'lemek.[^4]

Dokümanın önerisi `<Suspense>`'i veriye yakın koymaktır. `loading.tsx` yalnızca sayfayı sarar; aynı segmentin layout'unda okunan veri onu bekletmez, navigasyonu kilitler.[^1] Fallback'i de anlamlı tasarlayın: başlık, kapak görseli ya da sonraki ekranın iskeleti, dönen bir ikondan iyidir.[^1]

> [!NOTE]
>
> Arama motoru botlarına sayfa akıtılmaz. Next.js veriyi bekleyip tamamlanmış HTML'i gönderir.[^5]

## Şelaleyi önlemek

Bir component içinde art arda yazılan `await`'ler sırayla çalışır. Birbirine bağlı değillerse istekleri önce başlatıp sonra bekleyin:[^1]

```tsx
// Sırayla: toplam süre = ikisinin toplamı
const product = await getProduct(slug);
const reviews = await getReviews(slug);

// Paralel: toplam süre = en yavaşı
const [product, reviews] = await Promise.all([getProduct(slug), getReviews(slug)]);
```

Daha iyi bir yol çoğu zaman veriyi **ayrı component'lere bölmektir**. `<ProductInfo>` ve `<Reviews>` kendi verisini okur, her biri kendi `<Suspense>`'iyle bağımsız akar. Kardeş Suspense sınırları paralel çalışır.[^5]

İkinci istek birincinin sonucuna bağlıysa *(önce sanatçı, sonra albümleri)* şelale kaçınılmazdır. Bu durumda ilk isteğin hızlı olduğundan emin olun ya da sonucunu cache'leyin.[^1]

## Promise'i istemciye akıtmak

Bir Client Component sunucu verisine ihtiyaç duyuyorsa Promise'i `await` etmeden prop olarak verin; istemcide React'in `use`'uyla okuyun:[^1][^6]

```tsx
// app/products/[slug]/page.tsx
export default function Page() {
  const reviews = getReviews("canvas-sneaker"); // await yok

  return (
    <Suspense fallback={<p>Yorumlar yükleniyor...</p>}>
      <ReviewList reviews={reviews} />
    </Suspense>
  );
}
```

```tsx
// components/review-list.tsx
"use client";

import { use } from "react";

export function ReviewList({ reviews }: { reviews: Promise<Review[]> }) {
  const items = use(reviews);
  return <ul>{items.map((review) => <li key={review.id}>{review.text}</li>)}</ul>;
}
```

## İstemcide veri: Kütüphane ne zaman gerekir

Çoğu sayfa için Server Component'ler yeter. Dokümana göre bir Client Component sunucu verisini bir kez okuyacaksa Promise + `use` yeterli; tarayıcıda paylaşılan bir cache gerektiğinde *(odaklanınca yenileme, polling, sonsuz liste, iyimser güncelleme)* SWR ya da [!tanstack-query] kullanılır.[^7]

TanStack Query'nin maintainer'ı [Dominik Dorfmeister](https://tkdodo.eu/) da Server Component'lerle aynı sonuca varır: veri çoğunlukla sunucuda okunuyor ve etkileşim azsa kütüphaneye gerek kalmayabilir; ama istemcide sık değişen veri olan ekranlarda hâlâ değerlidir.[^8] Sunucuda sorguyu önceden doldurmak [TanStack Query](/academy/tanstack-query) rehberinde.

## Kendin dene

- `getProduct` ve `getReviews`'a 1'er saniye gecikme ekleyin. Art arda `await` ile `Promise.all`'ı karşılaştırın.
- `Reviews`'ı `<Suspense>` dışına alın. Sayfa ne kadar geç açılıyor?
- `app/products/loading.tsx` ekleyin ve ürünler arasında gezinirken iskeleti izleyin.
- `ReviewList`'e Promise yerine `await` edilmiş diziyi verin. Farkı nerede görüyorsunuz?

## Detaylı öğrenmek için

- **Resmi doküman:** "Streaming" rehberi; HTML akışının nasıl çalıştığı, Core Web Vitals'a etkisi ve proxy, CDN gibi akışı bozan katmanlar.[^5]
- **Yazı:** [Lee Robinson](https://leerob.com/), "Common mistakes with the Next.js App Router"; Route Handler'ı gereksiz çağırmaktan Suspense'i yanlış yere koymaya kadar on hata.[^2]
- **Yazı:** [Dominik Dorfmeister](https://tkdodo.eu/), "You Might Not Need React Query"; Server Component'lerin istemci veri kütüphanelerine etkisi.[^8]
- **Resmi doküman:** "Client-side data fetching" rehberi; sunucudan ilk veriyi verip istemci cache'iyle devam etmek.[^7]

## Kaynaklar

1. [Next.js: Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data) *(doc)* — Server Component'te veri, `loading.js` ve Suspense, sıralı ve paralel istek, `React.cache`, preload ve `use`.
2. [Lee Robinson](https://leerob.com/): [Common mistakes with the Next.js App Router and how to fix them](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) *(article)* — Vercel blogu. Server Component'ten Route Handler çağırmak ve diğer yaygın hatalar.
3. [React: cache](https://react.dev/reference/react/cache) *(doc)* — İstek kapsamlı memoization ve sınırları.
4. [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching) *(doc)* — Cache'lenmemiş verinin Suspense içinde akması ve blocking route uyarısındaki çözümler.
5. [Next.js: Streaming](https://nextjs.org/docs/app/guides/streaming) *(doc)* — Kardeş ve iç içe Suspense sınırları, botlar, HTTP durum kodları ve Web Vitals.
6. [React: use](https://react.dev/reference/react/use) *(doc)* — Promise'i istemcide okumak ve sunucuda mı istemcide mi çözüleceği.
7. [Next.js: Client-side data fetching](https://nextjs.org/docs/app/guides/client-side-data-fetching) *(doc)* — Kütüphane ne zaman gerekir, sunucudan ilk veri ve cache katmanlarını koordine etmek.
8. [Dominik Dorfmeister](https://tkdodo.eu/): [You Might Not Need React Query](https://tkdodo.eu/blog/you-might-not-need-react-query) *(article)* — 2023. Server Component'ler ve React Query'nin yeri.
