---
title: "Hata yönetimi"
description: "Beklenen hatalar, error.tsx ve retry, catchError ve notFound."
lastVerified: "2026-10-21"
translationKey: "nextjs/error-handling"
---

## İki tür hata

Next.js hataları ikiye ayırır ve ikisini farklı ele alır:[^1]

| Tür | Örnek | Nasıl ele alınır |
| :-- | :-- | :-- |
| Beklenen hata | Geçersiz kupon, stokta yok, bulunamayan ürün | Değer olarak döndürün ya da `notFound()` çağırın |
| Beklenmeyen hata | Veritabanı çöktü, koddaki bir bug | `throw` edin; hata sınırı yakalasın |

## Beklenen hatalar: Değer döndürün

Server Action'da doğrulama hatası için `throw` etmeyin; `useActionState`'e bir mesaj döndürün. Doküman bu durumda `try`/`catch` ve `throw` yerine hatayı dönüş değeri olarak modellemeyi önerir.[^1] Örneği [Server Actions](/academy/nextjs/server-actions) dersinde gördünüz.

Server Component'te de aynı mantık geçerli: yanıt başarısızsa bir mesaj render edin.

```tsx
async function Reviews({ slug }: { slug: string }) {
  const res = await fetch(`https://api.example.com/reviews/${slug}`);
  if (!res.ok) return <p>Yorumlar şu an yüklenemiyor.</p>;

  const reviews: Review[] = await res.json();
  return <ReviewList reviews={reviews} />;
}
```

## Bulunamadı: notFound

Olmayan bir ürüne gelindiğinde `notFound()` çağırın. En yakın `not-found.tsx` gösterilir.[^1] `ProductDetails`, [Navigasyon ve prefetch](/academy/nextjs/navigation-and-prefetching) dersindeki gibi sayfanın `<Suspense>`'i içinde render ediliyor.

```tsx
// app/products/[slug]/page.tsx
import { notFound } from "next/navigation";

async function ProductDetails({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return <h1>{product.name}</h1>;
}
```

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

> [!NOTE]
>
> Sayfa akmaya başladıysa sunucu `200` durum koduna bağlanmıştır; sonradan çağrılan `notFound()` bunu `404`'e çeviremez. Next.js bu durumda sayfaya `<meta name="robots" content="noindex">` ekler, arama motoru sayfayı dizine almaz. Aynı şekilde akış sırasında `redirect()` bir HTTP yönlendirmesi değil istemci tarafı yönlendirme olur.[^2] Bu rehberin proje uygulamasında `/products/nope` tam olarak böyle davrandı.

> [!WARNING]
>
> `notFound()` ve `redirect()` içeride bir hata fırlatarak çalışır. Onları bir `try` bloğunun içinde çağırırsanız `catch` yakalar ve çalışmazlar. `try`/`catch` dışında çağırın.[^3]

## Beklenmeyen hatalar: error.tsx

Bir segmente `error.tsx` eklemek, o segmenti bir Error Boundary ile sarar. Hata en yakın üst sınıra kadar çıkar; böylece hatayı sayfanın bir bölümüyle sınırlayabilirsiniz. Error Boundary'ler Client Component olmalıdır.[^4]

```tsx
// app/products/error.tsx
"use client";

import { useEffect } from "react";

export default function ProductsError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error); // hata izleme servisine gönderin
  }, [error]);

  return (
    <>
      <h2>Products could not be loaded.</h2>
      <button onClick={() => retry()}>Tekrar dene</button>
    </>
  );
}
```

Üç ayrıntı:[^4]

- `retry()`, segmentin verisini **yeniden çekip** tekrar render eder. 16.3'te kararlı hâle geldi. Eski örneklerdeki `reset()` yalnızca hata durumunu temizler, veriyi tekrar çekmez.
- `error` tipi `unknown`'dır. `message` ya da `digest` okumadan önce daraltın. Doküman `instanceof Error` örneğini verir, ama Suspense içinde fırlatılan bir sunucu hatası bu kontrolden geçmeyebilir; `"digest" in error` gibi alanın kendisini kontrol etmek daha güvenlidir *(bkz. [Hata izleme](/academy/production/error-monitoring))*.
- Production'da Server Component hataları genel bir mesajla gelir; ayrıntı sızmasın diye. `error.digest`, sunucu loglarındaki kaydı bulmanızı sağlar.

Kök layout'taki hataları yakalamak için `app/global-error.tsx` var. Kök layout'un yerini aldığı için kendi `<html>` ve `<body>` etiketlerini yazar.[^1]

## Component seviyesinde: catchError

Bir sayfadaki tek bir bölümü *(öneriler, yorumlar)* korumak için dosya kuralı yerine `catchError` kullanabilirsiniz. 16.3'te kararlı hâle geldi.[^5]

```tsx
// components/section-boundary.tsx
"use client";

import { catchError, type ErrorInfo } from "next/error";

function SectionError(props: { title: string }, { retry }: ErrorInfo) {
  return (
    <div role="alert">
      <p>{props.title} yüklenemedi.</p>
      <button onClick={() => retry()}>Tekrar dene</button>
    </div>
  );
}

export default catchError(SectionError);
```

```tsx
<SectionBoundary title="Öneriler">
  <Recommendations />
</SectionBoundary>
```

Kendi Error Boundary class'ınızdan farkı: `redirect()` ve `notFound()`'u yanlışlıkla yakalamaz, `retry()` ile veriyi yeniden çeker ve başka bir sayfaya geçince hata durumu kendiliğinden temizlenir.[^5]

## Hata sınırının yakalamadıkları

Error Boundary'ler render sırasındaki hataları yakalar. Bir `onClick` içindeki hata yakalanmaz; onu `try`/`catch` ile yakalayıp state'te tutun. `startTransition` içinde fırlatılan hata ise en yakın sınıra gider.[^1] Canlı ortamda hataları toplamak [Production'a Hazırlık](/academy/production) rehberinin konusu.

## Kendin dene

- `getProducts`'ın içine `throw new Error("db down")` yazın. `error.tsx` görünüyor mu? Header yerinde duruyor mu?
- Hatayı yalnızca ilk çağrıda fırlatacak şekilde değiştirin ve **Tekrar dene**'ye basın.
- `next build && next start` ile çalıştırıp `error` nesnesinin mesajına bakın. Geliştirmedekiyle aynı mı?
- `notFound()`'u bir `try` bloğuna alın. Ne oluyor?

## Detaylı öğrenmek için

- **Resmi doküman:** "Error Handling" sayfası; beklenen ve beklenmeyen hatalar, iç içe sınırlar ve `global-error`.[^1]
- **Resmi doküman:** `error.js` referansı; `retry` ile `reset` farkı ve özel hata sınırı örneği.[^4]
- **Resmi doküman:** React'in Error Boundary anlatımı; sınırın yakaladığı ve yakalamadığı hatalar.[^6]

## Kaynaklar

1. [Next.js: Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) *(doc)* — Beklenen hatalar, `notFound`, iç içe `error.js`, `catchError`, event handler hataları ve `global-error`.
2. [Next.js: Streaming, Status codes](https://nextjs.org/docs/app/guides/streaming#status-codes) *(doc)* — Akış başladıktan sonra `notFound()` ve `redirect()` davranışı, `noindex` meta etiketi.
3. [Next.js: redirect](https://nextjs.org/docs/app/api-reference/functions/redirect) *(doc)* — `redirect`'in hata fırlatarak çalışması ve `try` bloğu dışında çağrılması.
4. [Next.js: error.js](https://nextjs.org/docs/app/api-reference/file-conventions/error) *(doc)* — `error`, `error.digest`, `retry` ve `reset` prop'ları, production'daki genel mesaj ve sürüm geçmişi.
5. [Next.js: catchError](https://nextjs.org/docs/app/api-reference/functions/catchError) *(doc)* — Component seviyesinde hata sınırı, `retry` ve framework hatalarıyla uyum.
6. [React: Catching rendering errors with an Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) *(doc)* — Error Boundary'nin çalışma şekli ve sınırları.
