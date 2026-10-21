---
title: "Server ve Client Components"
description: "'use client' sınırı, composition, serileştirme ve server-only."
lastVerified: "2026-10-21"
translationKey: "nextjs/server-and-client-components"
---

## İki Ortam, Tek Ağaç

App Router'da layout ve sayfalar varsayılan olarak **Server Component**'tir. Sunucuda çalışır, veritabanına doğrudan erişebilir ve tarayıcıya JavaScript göndermez. Etkileşim gerektiğinde ağaca **Client Component** eklersiniz.[^1]

| Server Component | Client Component |
| :-- | :-- |
| Veri çekmek, veritabanı ve API anahtarı kullanmak | `useState`, `onClick`, `onChange` |
| Tarayıcıya giden JavaScript'i azaltmak | `useEffect` ve custom hook'lar |
| İçeriği sunucudan akıtmak | `localStorage`, `window` gibi tarayıcı API'leri |

[Josh W. Comeau](https://www.joshwcomeau.com/)'nun zihinsel modeli işe yarar: Server Component'ler **yalnızca sunucuda ve bir kez** çalışır, yeniden render edilmez. Bu yüzden state ve Effect'leri yoktur. Client Component'ler ise bugüne kadar yazdığınız React'tir; sunucuda bir kez HTML için render edilir, sonra tarayıcıda yaşar.[^2]

## 'use client' Bir Kapıdır

`"use client"`, bir component'i değil bir **modül sınırını** işaretler. Dosyanın en üstüne yazılır; o dosya, import ettiği her şey ve doğrudan render ettiği component'ler istemci paketine girer.[^1]

```tsx
// components/like-button.tsx
"use client";

import { useState } from "react";

export function LikeButton({ initialLikes }: { initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes);
  return <button onClick={() => setLikes(likes + 1)}>{likes} beğeni</button>;
}
```

```tsx
// app/products/[slug]/page.tsx
import { LikeButton } from "@/components/like-button";

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);

  return (
    <article>
      <h1>{product?.name}</h1>
      <LikeButton initialLikes={12} />
    </article>
  );
}
```

[Dan Abramov](https://overreacted.io/) bu iki direktifi şöyle özetler: `"use client"` tipli bir `<script>` etiketi, `"use server"` tipli bir `fetch` çağrısıdır. İkisi de bir modülün diğer ortamdan nasıl görüneceğini söyler.[^3]

> [!DO]
>
> - `"use client"`'ı ağacın **yapraklarına** koyun: arama kutusu, beğeni butonu, sepet çekmecesi.
> - Sayfanın geri kalanını Server Component bırakın; istemci paketi küçük kalır.[^1]

> [!DONT]
>
> - Bir hook hatası aldınız diye `page.tsx`'in en üstüne `"use client"` yazmak. Tüm sayfa ve import ettikleri istemciye taşınır.

## Composition: Server'ı Client'ın İçine Koymak

Bir Client Component, bir Server Component'i **import edemez**; import ettiği her şey istemci olur. Ama onu `children` ya da başka bir prop olarak **alabilir**. Server Component sunucuda render edilir, Client Component yalnızca hazır sonucu yerleştirir.[^1]

```tsx
// components/drawer.tsx
"use client";

import { useState } from "react";

export function Drawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(!open)}>Sepet</button>
      {open && <div role="dialog">{children}</div>}
    </>
  );
}
```

```tsx
// app/layout.tsx içinde
<Drawer>
  <CartItems /> {/* Server Component: sepeti sunucuda okur */}
</Drawer>
```

[Aurora Scharff](https://aurorascharff.no/) bunu tasarım kuralı olarak önerir: etkileşimi *(açma-kapama, animasyon, scroll)* küçük client sarmalayıcılara taşıyın, veriyi ve içeriği server tarafında bırakın. Sarmalayıcı yeniden kullanılabilir olur, veri çekme istemciye kaymaz.[^4]

## Sınırdan Ne Geçer

Server'dan Client'a giden prop'lar ağ üzerinden gider, bu yüzden **serileştirilebilir** olmalıdır.[^5]

| Geçer | Geçmez |
| :-- | :-- |
| string, number, boolean, `null` | Sıradan fonksiyon *(`onClick={() => ...}`)* |
| Düz nesne ve dizi, `Map`, `Set`, `Date` | Class örneği |
| JSX *(component sonucu)* | `Symbol()` |
| Promise *(istemcide `use` ile okunur)* | |
| Server Function *(`"use server"`)* | |

Fonksiyon geçemediği için event handler'ları Client Component'in içinde yazarsınız. Sunucuda çalışacak bir işlem gerekiyorsa [Server Actions](/academy/nextjs/server-actions) kullanılır.

## Context ve Üçüncü Parti Component'ler

Server Component'te Context yoktur. Tema ya da sepet gibi paylaşılan state için provider'ı bir Client Component'e koyup layout'ta kullanın. Provider'ı ağaçta **olabildiğince derine** koymak, Next.js'in statik kısımları optimize etmesini kolaylaştırır.[^1]

```tsx
// components/theme-provider.tsx
"use client";

import { createContext } from "react";

export const ThemeContext = createContext<"light" | "dark">("light");

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext value="dark">{children}</ThemeContext>;
}
```

`useState` kullanan ama dosyasında `"use client"` olmayan bir kütüphane component'i Server Component'te hata verir. Çözüm, onu kendi dosyanızda `"use client"` ile yeniden export etmektir.[^1]

## Sunucu Kodunu Sunucuda Tutmak

Aynı modül iki ortamda da import edilebilir. API anahtarı okuyan bir fonksiyonun yanlışlıkla istemciye girmemesi için dosyanın başına `server-only` yazın; bir Client Component import ederse build hata verir.[^1]

```ts
// lib/products.ts
import "server-only";

export async function getProduct(slug: string) {
  // process.env.API_KEY burada güvende
}
```

Ortam değişkenleri de aynı kuralla çalışır: yalnızca `NEXT_PUBLIC_` ile başlayanlar istemci paketine girer, diğerleri istemcide boş string olur.[^1]

> [!CAUTION]
>
> Server Component'ten Client Component'e veritabanı satırının tamamını prop olarak vermeyin. Prop'lar sayfanın kaynağında görünür. Next.js'in güvenlik rehberi, istemciye yalnızca gereken alanları taşıyan küçük nesneler *(DTO)* döndürmeyi önerir.[^6]

## Kendin Dene

- `LikeButton`'dan `"use client"`'ı silin. Hata mesajını okuyun.
- `ProductPage`'den `LikeButton`'a `onLike={() => {}}` prop'u geçirin. Hangi hata çıkıyor?
- Bir Server Component'e `console.log` ekleyin. Çıktı terminalde mi, tarayıcı konsolunda mı? Aynısını `LikeButton` için deneyin.
- `CartItems`'ı `Drawer`'ın dosyasında import edip kullanın, sonra `children` olarak verin. İlk durumda ne oluyor?
- `lib/products.ts`'e `import "server-only"` ekleyip bir Client Component'ten import edin.

## Detaylı Öğrenmek İçin

- **Yazı:** [Josh W. Comeau](https://www.joshwcomeau.com/), "Making Sense of React Server Components"; Server Component'lerin neden var olduğunu en sade anlatan yazılardan.[^2]
- **Yazı:** [Dan Abramov](https://overreacted.io/), "What Does 'use client' Do?" ve "Impossible Components"; direktiflerin modül sistemiyle ilişkisi ve iki ortamı birleştiren component'ler.[^3][^7]
- **Yazı:** [Aurora Scharff](https://aurorascharff.no/), "Server and Client Component Composition in Practice"; gerçek arayüzlerden composition örnekleri.[^4]
- **Resmi doküman:** "The Server and Client Boundary" rehberi; her component türünün nerede çalıştığını ve sınırın nasıl işlediğini adım adım anlatır.[^8]

## Kaynaklar

1. [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) *(doc)* — Ne zaman hangisi, `"use client"` sınırı, composition, context provider, üçüncü parti component ve `server-only`.
2. [Josh W. Comeau](https://www.joshwcomeau.com/): [Making Sense of React Server Components](https://www.joshwcomeau.com/react/server-components/) *(article)* — 2023, Kasım 2024'te güncellendi. Server Component'lerin yalnızca sunucuda çalışması ve yeniden render edilmemesi.
3. [Dan Abramov](https://overreacted.io/): [What Does "use client" Do?](https://overreacted.io/what-does-use-client-do/) *(article)* — 25 Nisan 2025. `"use client"` ve `"use server"`'ın modül sistemi açısından anlamı.
4. [Aurora Scharff](https://aurorascharff.no/): [Server and Client Component Composition in Practice](https://aurorascharff.no/posts/server-client-component-composition-in-practice/) *(article)* — 5 Ağustos 2025. Client sarmalayıcılar ve Suspense ile composition kalıpları.
5. [React: 'use client'](https://react.dev/reference/rsc/use-client) *(doc)* — Modül sınırı ve serileştirilebilir prop tipleri.
6. [Next.js: Data Security](https://nextjs.org/docs/app/guides/data-security) *(doc)* — Data Access Layer, DTO, tainting ve istemciye veri sızdırmamak.
7. [Dan Abramov](https://overreacted.io/): [Impossible Components](https://overreacted.io/impossible-components/) *(article)* — 22 Nisan 2025. Sunucu verisini ve istemci etkileşimini tek component'te birleştirmek.
8. [Next.js: The Server and Client Boundary](https://nextjs.org/docs/app/guides/server-and-client-boundary) *(doc)* — Component türlerinin nerede çalıştığı ve sınırın işleyişi.
