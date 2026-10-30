---
title: "Navigasyon ve prefetch"
description: "Partial Prefetching, anında navigasyon, korunan state ve useLinkStatus."
lastVerified: "2026-10-21"
translationKey: "nextjs/navigation-and-prefetching"
---

## Hızlı navigasyonun üç parçası

Sayfalar server'da render edilir. Yani bir linke tıklayınca client server'ı beklemek zorunda kalabilir. Next.js bu beklemeyi üç şeyle gizler:[^1]

- **Prefetch:** `<Link>` ekrana girince hedefi arka planda yükler.
- **Streaming:** Hazır olan kısım hemen gelir, gerisi `<Suspense>` fallback'inin yerine akar.
- **Client tarafı geçiş:** Ortak layout'lar yerinde kalır, yalnızca değişen kısım yenilenir.

## Partial prefetching

Next.js 16.3 ile gelen **Partial Prefetching**, her rota için tek bir yeniden kullanılabilir **App Shell** üretir: URL'ye bağlı olmayan statik ve cache'li içerik, artı fallback'ler. Aynı rotaya giden yirmi link yirmi ayrı istek değil, tek bir App Shell paylaşır.[^2][^3] `create-next-app` ile açılan projelerde açık gelir *(`partialPrefetching: true`)*.

App Shell bütün linklerde ortak olduğu için tek bir URL'ye ait veri taşıyamaz. `params` ve `searchParams` bu yüzden **URL verisi** sayılır. Onları `<Suspense>` dışında okursanız geliştirmede *"URL data outside of Suspense"* uyarısı çıkar. Uyarı build'i kırmaz ama o rotaya geçişin anında olmasını engelleyebilir. Çözüm, `params` Promise'ini `await` etmeden bir child'a vermektir:[^4]

```tsx
// app/products/[slug]/page.tsx
export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<p>Loading product...</p>}>
      <ProductDetails params={params} />
    </Suspense>
  );
}

async function ProductDetails({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return <h1>{product.name}</h1>;
}
```

`cookies()` ve `headers()` URL verisi değildir. Linke göre değil oturuma göre değişirler, App Shell'de kalabilirler.[^4]

Ürün adı artık fallback'in arkasında. Tıklar tıklamaz görünsün istiyorsanız linke `prefetch={true}` verin. Bu, linkin `params` ve `searchParams`'ına bağlı **cache'li** içeriği de tıklamadan önce getirir. Bedeli her link için bir sunucu çağrısıdır; bu yüzden yalnızca en olası hedeflerde kullanın.[^2][^4]

```tsx
<Link href={`/products/${product.slug}`} prefetch>
  {product.name}
</Link>
```

Bu rehberin proje uygulamasında `prefetch` olmadan ürün sayfasına geçişte yalnızca *"Loading product..."* göründü. `prefetch` ve `"use cache"`'li `getProduct` ile ürün adı tıklama anında geldi. Bunu koruyan `instant()` testi [Ürün kataloğu](/academy/nextjs/project) projesinde.

## Anında navigasyon

Next.js'in tanımıyla bir navigasyon **anında** *(instant)* ise kullanıcı tıkladığı an statik, cache'li ve fallback içerik görünür; gerisi akarak gelir.[^5]

İnce bir nokta var: sayfayı doğrudan açmak ile bir linkle gelmek farklıdır. Linkle gelirken yalnızca iki sayfanın **ortak layout'unun altı** yeniden render edilir. Kök layout'taki bir `<Suspense>` doğrudan açılışı kapsar ama `/products/a`'dan `/products/b`'ye geçişi kapsamaz.[^5] Bunu elle takip etmek zor olduğu için Cache Components geliştirmede her sayfayı iki durum için de **doğrular** ve geçişi kilitleyen component'i hata ekranında gösterir.[^5][^6]

Bir segmentin bilerek beklemesine izin vermek için:

```tsx
// app/checkout/layout.tsx
export const instant = false;
```

İki araç daha var:[^5]

- **Navigation Inspector:** Next.js DevTools'ta sayfayı ilk yükleme ya da prefetch edilmiş hâlinde dondurur. Kabukta ne kadar anlamlı içerik olduğunu görürsünüz.
- **`instant()` testi:** `@next/playwright` paketindeki yardımcı, dinamik içeriği geri tutup yalnızca anında görünen arayüzü test etmenizi sağlar. Biri ileride kabuğu bozarsa CI'da yakalanır.

> [!TIP]
>
> 16.4 ile gelen `ensureStatic` bunun bir adım ötesidir: bir sayfanın kabuğunun ya da tamamının statik kalmasını **zorunlu** kılar; biri istek anında çalışan kod eklerse build kırılır.[^7]

## Activity: Geri dönünce state yerinde

Cache Components açıkken Next.js, ayrıldığınız sayfayı silmez; React'in `<Activity>` component'iyle **gizler**. Geri döndüğünüzde form taslağı, scroll konumu ve açık bir `<details>` olduğu gibi durur. Effect'ler gizlenince temizlenir, görünür olunca yeniden kurulur. En fazla son üç rota saklanır.[^8][^9]

Bu her zaman istenen davranış değildir. Bir açılır menü geri dönünce hâlâ açık durmamalı. Doküman bunu `useLayoutEffect`'in cleanup'ında state'i sıfırlayarak çözer:[^8]

```tsx
"use client";

import { useLayoutEffect, useState } from "react";

export function SortMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useLayoutEffect(() => {
    return () => setIsOpen(false);
  }, []);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Sırala</button>
      {isOpen && <ul>{/* seçenekler */}</ul>}
    </div>
  );
}
```

> [!WARNING]
>
> Gizlenen sayfa `display: none` ile DOM'da kalır. Uçtan uca testte `page.locator("h1")` iki başlık bulabilir. Bu rehberin proje uygulamasında tam olarak bu oldu. Görünürlüğe bakan `getByRole` ve `getByLabel` sorgularını kullanın.[^8] Playwright'ın kendisi [Playwright](/academy/playwright) rehberinde.

## Yavaş ağda geri bildirim

Ağ yavaşsa prefetch tıklamadan önce bitmeyebilir. `useLinkStatus`, tıklanan linkin beklemede olduğunu söyler; linkin içine küçük bir gösterge koyabilirsiniz:[^1][^10]

```tsx
"use client";

import { useLinkStatus } from "next/link";

export function PendingDot() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden>•</span> : null;
}
```

```tsx
<Link href="/cart">
  Sepet <PendingDot />
</Link>
```

Göstergeyi kısa bir gecikmeyle *(ör. 100 ms)* görünür yapmak, hızlı geçişlerde yanıp sönmesini önler.[^1] Binlerce linkli listelerde `prefetch={false}` vererek gereksiz isteği kesebilirsiniz; karşılığında o sayfalar tıklanınca yüklenir.[^1]

Geçişleri canlandırmak için React 19.3'te kararlı hâle gelen `<ViewTransition>`'ı kullanabilirsiniz. Next.js'in rehberi küçük resmin büyük görsele dönüşmesinden yön bildiren geçişlere kadar örnekler veriyor.[^11] React tarafı [View Transition ve Activity](/academy/react/view-transitions-and-activity) dersinde.

## Kendin dene

- Ürün listesinde `next build && next start` ile production'da çalışın. Network sekmesinde linkler ekrana girince gelen prefetch isteklerini izleyin. *(Geliştirmede prefetch yapılmaz.)*
- Bir ürün linkine `prefetch` verin ve gelen isteği diğerleriyle karşılaştırın.
- Ürün sayfasına bir `<input>` koyun, bir şey yazın, başka sayfaya gidip geri dönün. Yazdığınız duruyor mu?
- Navigation Inspector'da **Pause on navigations**'ı açıp bir linke tıklayın. Kabukta ne görünüyor?

## Detaylı öğrenmek için

- **Resmi doküman:** "Building App-like Experiences with Next.js 16.3"; [Aurora Scharff](https://aurorascharff.no/)'ın da yazarları arasında olduğu, anında navigasyonu bir uygulama üzerinden anlatan yazı.[^12]
- **Resmi doküman:** "Instant Navigation" rehberi; kilitlenen bir navigasyonu adım adım anında hâle getirmek ve `instant()` testleri.[^5]
- **Resmi doküman:** "Preserving UI state" rehberi; Activity'nin neyi koruduğu ve neyi sıfırlamanız gerektiği.[^8]
- **Video:** Next.js Conf 2025 açılış konuşmasının anında navigasyon ve Cache Components bölümü.[^13]

## Kaynaklar

1. [Next.js: Linking and Navigating](https://nextjs.org/docs/app/getting-started/linking-and-navigating) *(doc)* — Prefetch, streaming, client tarafı geçiş, yavaş ağ, `useLinkStatus` ve prefetch'i kapatmak.
2. [Next.js: partialPrefetching](https://nextjs.org/docs/app/api-reference/config/next-config-js/partialPrefetching) *(doc)* — Rota başına App Shell, `prefetch={true}` ile link bazlı prefetch ve sürüm geçmişi.
3. [Next.js Blog: Next.js 16.3, Instant Navigations](https://nextjs.org/blog/next-16-3-instant-navigations) *(doc)* — Partial Prefetching, Instant Insights, Navigation Inspector ve `instant()` yardımcısı.
4. [Next.js: Adopting Partial Prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching) *(doc)* — URL verisinin App Shell'e girmemesi, `params`'ı `<Suspense>` içine taşımak ve `prefetch={true}` ile URL verisini önceden getirmek.
5. [Next.js: Instant Navigation](https://nextjs.org/docs/app/guides/instant-navigation) *(doc)* — "Anında"nın tanımı, doğrudan açılış ile client geçişi farkı, doğrulama, inceleme ve e2e testleri.
6. [Next.js: instant](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/instant) *(doc)* — `instant` export'u, doğrulama seviyeleri ve Navigation Inspector.
7. [Next.js: ensureStatic](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/ensureStatic) *(doc)* — 16.4. App Shell, prefetch ya da tüm rotanın statik kalmasını zorunlu kılmak.
8. [Next.js: Preserving UI state](https://nextjs.org/docs/app/guides/preserving-ui-state) *(doc)* — Activity ile korunan state, sıfırlama kalıpları ve görünürlüğe duyarlı test seçicileri.
9. [Next.js: cacheComponents](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents) *(doc)* — Navigasyonda Activity kullanımı ve Effect'lerin temizlenmesi.
10. [Next.js: useLinkStatus](https://nextjs.org/docs/app/api-reference/functions/use-link-status) *(doc)* — Bekleyen navigasyonu göstermek ve hızlı geçişte göstergeyi geciktirmek.
11. [Next.js: View Transitions](https://nextjs.org/docs/app/guides/view-transitions) *(doc)* — Görsel morph, Suspense açılışları ve yönlü geçişler.
12. [Next.js Blog: Building App-like Experiences with Next.js 16.3](https://nextjs.org/blog/building-app-like-experiences-with-nextjs-16-3) *(doc)* — Cache Components ve Partial Prefetching ile uygulama gibi hissettiren navigasyon.
13. [Next.js Conf 2025: Opening Keynote](https://www.youtube.com/watch?v=myjrQS_7zNk&t=856s) *(video)* — 22 Ekim 2025. 14:16'dan itibaren anında navigasyon ve Cache Components.
