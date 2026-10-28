---
title: "Routing ve layout"
description: "Sayfa, layout, dinamik segment, route group ve Link ile gezinme."
lastVerified: "2026-10-21"
translationKey: "nextjs/routing-and-layouts"
---

## Klasör = adres

App Router dosya tabanlıdır. Her klasör URL'de bir **segment**, klasördeki `page.tsx` o adresin sayfasıdır.[^1]

```text
app/
├── layout.tsx              # tüm sayfaları sarar
├── page.tsx                # /
└── products/
    ├── layout.tsx          # /products ve altını sarar
    ├── page.tsx            # /products
    └── [slug]/
        └── page.tsx        # /products/canvas-sneaker
```

## Layout: Gezinmede kalan arayüz

Layout, alt sayfaları `children` olarak sarar. Kullanıcı `/products/a`'dan `/products/b`'ye geçtiğinde ortak layout **yeniden render edilmez**; state'i ve scroll'u korunur, yalnızca sayfa değişir.[^1]

```tsx
// app/products/layout.tsx
export default function ProductsLayout({ children }: LayoutProps<"/products">) {
  return (
    <section>
      <aside>Kategoriler</aside>
      {children}
    </section>
  );
}
```

`LayoutProps` ve `PageProps` import etmeden kullandığınız global tiplerdir. Next.js onları `next dev`, `next build` ya da `next typegen` sırasında klasörlerinizden üretir; `params` tipini elle yazmazsınız.[^1]

Layout yeniden render edilmediği için iki sınırı vardır:[^2]

- `searchParams` alamaz; değer bayatlardı. URL parametresini sayfada ya da bir Client Component'te `useSearchParams` ile okuyun.
- Aktif menü için `pathname` alamaz. Linkleri `usePathname` kullanan küçük bir Client Component'e taşıyın.

> [!WARNING]
>
> Oturum kontrolünü layout'a koymayın. Layout gezinmede tekrar çalışmadığı için her alt sayfayı korumaz. Kontrolü veriye yakın yapın; [Next.js'te auth](/academy/auth-security/auth-in-nextjs) dersi bunu ayrıntılı anlatıyor.

## Dinamik segment

Köşeli parantezli klasör veriden üretilen sayfalar içindir:[^3]

| Klasör | Eşleşen adres |
| :-- | :-- |
| `[slug]` | `/products/canvas-sneaker` |
| `[...slug]` | `/shop/shoes`, `/shop/shoes/sneakers` |
| `[[...slug]]` | `/docs`, `/docs/setup`, `/docs/setup/node` |

```tsx
// app/products/[slug]/page.tsx
export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);

  return <h1>{product?.name}</h1>;
}
```

`params` ve `searchParams` bir **Promise**'tir; `await` etmeden kullanamazsınız. Eski tutorial'larda `params.slug` diye doğrudan okunur; Next.js 15'ten beri bu değişti.[^4]

> [!NOTE]
>
> Bu ve sonraki birkaç dersteki örnekler kısa olsun diye `params`'ı sayfanın en üstünde okuyor. Partial Prefetching açıkken Next.js geliştirmede bunu bir uyarıyla işaretler; çünkü bir rotaya giden bütün linkler tek bir kabuğu paylaşır. Gerçek projede `params`'ı `<Suspense>` içindeki bir child'da okuyun. Nedeni [Navigasyon ve prefetch](/academy/nextjs/navigation-and-prefetching) dersinde.[^5]

## searchParams: Sayfada mı, istemcide mi

| İhtiyaç | Kullanın |
| :-- | :-- |
| Filtre ve sayfalamayla sunucudan veri çekmek | Sayfanın `searchParams` prop'u |
| Zaten yüklenmiş bir listeyi istemcide süzmek | `useSearchParams` hook'u |

`searchParams` okumak sayfanın o kısmını istek anına bağlar. Cache Components ile bunu bir `<Suspense>` içinde yapmanız gerekir; nedenini [Cache ve render modeli](/academy/nextjs/caching-and-rendering) dersinde göreceksiniz.[^1]

## Route Group ve birden fazla layout

Parantezli klasör URL'ye eklenmez ama kendi layout'una sahip olabilir. Mağaza ve pazarlama sayfalarına farklı üst menü vermek için:[^6]

```text
app/
├── (marketing)/
│   ├── layout.tsx          # pazarlama menüsü
│   └── about/page.tsx      # /about
└── (shop)/
    ├── layout.tsx          # mağaza menüsü ve sepet
    └── cart/page.tsx       # /cart
```

Kök `app/layout.tsx`'i silip her gruba kendi `<html>`'li layout'unu verirseniz birden fazla kök layout kurarsınız. Gruplar arasında geçişte sayfa tamamen yeniden yüklenir.[^6]

## Link ile gezinme

`<Link>`, `<a>`'yı genişletir. Görünür linklerin hedefini arka planda **prefetch** eder ve tıklamada sayfayı yenilemeden geçiş yapar; ortak layout'lar yerinde kalır.[^7]

```tsx
import Link from "next/link";

<Link href={`/products/${product.slug}`}>{product.name}</Link>;
```

Kodla yönlendirme için `useRouter` kullanılır. Doğru import yeri `next/navigation`'dır. `next/router` eski Pages Router'a aittir ve App Router'da çalışmaz.[^8] AI araçları bu ikisini sık karıştırır.

Arama gibi URL'ye parametre yazan formlar için `next/form` var. `<form>` gibi davranır ama gönderimi istemci tarafı gezinmeye çevirir ve JavaScript yüklenmeden de çalışır:[^9]

```tsx
import Form from "next/form";

<Form action="/products">
  <input name="q" aria-label="Search products" />
  <button>Search</button>
</Form>;
```

> [!TIP]
>
> `next.config.ts`'te `typedRoutes: true` açarsanız `<Link href="/prodcts">` gibi yazım hataları tip hatası olur.[^10]

## İleri kalıplar

İki kalıp belirli arayüzler içindir, her projede gerekmez:[^11][^12]

| Kalıp | Klasör | Örnek |
| :-- | :-- | :-- |
| Parallel route | `@cart/` | Aynı layout'ta bağımsız yüklenen iki bölüm |
| Intercepting route | `(.)photo/[id]` | Listeden açılan fotoğrafı modal olarak göstermek, linki paylaşınca tam sayfa |

## Kendin dene

- `app/products/[slug]/page.tsx`'te `params`'ı `await` etmeden `params.slug` diye okuyun. TypeScript ne diyor?
- `products/layout.tsx`'e bir sayaç butonu *(Client Component)* ekleyin. İki ürün arasında gezinin; sayaç sıfırlanıyor mu?
- Aktif menü linkini `usePathname` ile işaretleyen bir `NavLink` yazın.
- `typedRoutes`'u açıp var olmayan bir adrese link verin.

## Detaylı öğrenmek için

- **Resmi doküman:** "Layouts and Pages" ve "Linking and Navigating" sayfaları; prefetch, streaming ve istemci tarafı geçişin birlikte nasıl çalıştığını anlatır.[^1][^7]
- **Resmi doküman:** `layout.js` referansının "Caveats" bölümü; layout'un neden `searchParams` ve `pathname` almadığını örneklerle gösterir.[^2]
- **Resmi doküman:** Next.js Learn kursunun layout ve navigasyon bölümleri.[^13]

## Kaynaklar

1. [Next.js: Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages) *(doc)* — Sayfa, iç içe layout, dinamik segment, `searchParams` ve `PageProps`/`LayoutProps` yardımcıları.
2. [Next.js: layout.js](https://nextjs.org/docs/app/api-reference/file-conventions/layout) *(doc)* — Layout'un yeniden render edilmemesi, `searchParams` ve `pathname` sınırları, aktif link örneği.
3. [Next.js: Dynamic Route Segments](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) *(doc)* — `[slug]`, catch-all ve optional catch-all segmentler.
4. [Next.js: Upgrading to Version 15](https://nextjs.org/docs/app/guides/upgrading/version-15) *(doc)* — `params`, `searchParams`, `cookies` ve `headers`'ın async olması.
5. [Next.js: Adopting Partial Prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching) *(doc)* — URL verisinin paylaşılan App Shell'e girmemesi ve `params`'ı `<Suspense>` içine taşımak.
6. [Next.js: Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) *(doc)* — URL'yi etkilemeden gruplama, gruba özel layout ve birden fazla kök layout.
7. [Next.js: Linking and Navigating](https://nextjs.org/docs/app/getting-started/linking-and-navigating) *(doc)* — Prefetch, streaming, istemci tarafı geçiş ve yavaş geçişin nedenleri.
8. [Next.js: useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router) *(doc)* — `next/navigation`'dan import, `push`, `replace`, `refresh` ve Pages Router farkı.
9. [Next.js: Form Component](https://nextjs.org/docs/app/api-reference/components/form) *(doc)* — URL parametresi yazan formlar, istemci tarafı gezinme ve progressive enhancement.
10. [Next.js: TypeScript](https://nextjs.org/docs/app/api-reference/config/typescript) *(doc)* — `typedRoutes` ile tip güvenli linkler.
11. [Next.js: Parallel Routes](https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes) *(doc)* — `@slot` klasörleri ve `default.tsx`.
12. [Next.js: Intercepting Routes](https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes) *(doc)* — `(.)`, `(..)` kalıpları ve modal örneği.
13. [Next.js: Learn, Creating Layouts and Pages](https://nextjs.org/learn/dashboard-app/creating-layouts-and-pages) *(doc)* — Kursun layout ve sayfa bölümü.
