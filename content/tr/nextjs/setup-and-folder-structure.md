---
title: "Kurulum ve proje yapısı"
description: "create-next-app varsayılanları, app klasörü, özel dosyalar ve kodun yeri."
lastVerified: "2026-10-21"
translationKey: "nextjs/setup-and-folder-structure"
---

## Bu rehber ne anlatıyor

[!nextjs] dokümanı güncel ve ayrıntılı. Bu rehber onu tekrar etmiyor. Her derste konuyu kısaca özetleyip Next.js ekibinin ve deneyimli mühendislerin önerilerini, yaygın hataları topluyor. Sürüm: Next.js 16.4 *(Ekim 2026)*, React 19.3.[^1]

Ön koşul [React](/academy/react/setup-and-tooling) rehberi. Component, state, Suspense ve Actions'ı orada gördünüz. Burada bunların sunucuyla birleştiği yeri öğreneceksiniz.

> [!NOTE]
>
> Bu rehberdeki kodlar `create-next-app@16.4.2` ile açılan bir projede `tsc`, `eslint` ve `next build` ile kontrol edildi.

## Next.js ne getirir

React yalnızca arayüz kütüphanesidir. Routing, veri çekme ve sunucuda render için bir framework gerekir. React ekibi yeni uygulamalara Next.js App Router'ı önerdiği framework'ler arasında sayar.[^2]

Next.js'in farkı render modelinde. Çoğu framework bir sayfayı ya tamamen statik ya tamamen dinamik sayar. Next.js bu sınırı **component** seviyesine indirir: aynı sayfada anında gelen statik bir kabuk *(shell)* ve sonradan akan dinamik parçalar olabilir.[^3] Rehberin geri kalanı bu fikrin üzerine kurulu.

## İlk proje

```command
npx create-next-app@latest my-shop --yes
```

```bash
cd my-shop
npm run dev
```

`--yes` önerilen varsayılanları seçer:[^4]

| Ayar | Varsayılan |
| :-- | :-- |
| Dil ve stil | [!typescript] ve [!tailwind] |
| Lint | [!eslint] *(Biome da seçilebilir)* |
| Router | App Router |
| Bundler | Turbopack |
| Cache Components ve Partial Prefetching | Açık |
| `AGENTS.md` | Var |
| React Compiler | Kapalı |

Turbopack, Next.js 16'dan beri hem `next dev` hem `next build` için varsayılan.[^5] 16.4 ile yeni projeler **Cache Components** açık gelir; sayfalar varsayılan olarak dinamik olur ve neyin cache'leneceğini siz seçersiniz.[^1] Bu modeli [Cache ve render modeli](/academy/nextjs/caching-and-rendering) dersinde göreceksiniz.

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
```

> [!WARNING]
>
> Next.js 16'dan beri `next build` lint çalıştırmaz ve `next lint` komutu yoktur. Lint'i `npm run lint` ile ayrıca çalıştırın.[^4] CI kurulumu [Kod Kalitesi](/academy/architecture/code-quality) dersinde.

## Önemli dosyalar

| Dosya | Ne işe yarar |
| :-- | :-- |
| `app/layout.tsx` | Kök layout; `<html>` ve `<body>` burada, zorunlu |
| `app/page.tsx` | `/` adresindeki sayfa |
| `public/` | Olduğu gibi sunulan statik dosyalar *(`public/logo.png` → `/logo.png`)* |
| `next.config.ts` | Framework ayarları |
| `proxy.ts` | İstekten önce çalışan kod *(isteğe bağlı)* |
| `AGENTS.md` | AI agent'ları projedeki sürümün dokümanına yönlendirir |

`AGENTS.md`'nin işi ilginç: agent'a eğitim verisine değil, `node_modules/next/dist/docs/` altındaki, kurulu sürümle eşleşen dokümana bakmasını söyler.[^6] Ayrıntısı [AI agent'larla Next.js](/academy/nextjs/ai-agents) dersinde.

## app klasörü ve özel dosyalar

App Router'da **klasörler** URL'yi, **özel dosyalar** o adreste ne gösterileceğini belirler. Bir klasör ancak içinde `page.tsx` ya da `route.ts` olduğunda erişilebilir olur.[^7]

| Dosya | Görevi |
| :-- | :-- |
| `page.tsx` | Sayfanın kendisi |
| `layout.tsx` | Alt sayfaları saran, gezinmede korunan ortak arayüz |
| `loading.tsx` | Sayfa yüklenirken gösterilen iskelet *(Suspense)* |
| `error.tsx` | Hata sınırı *(Error Boundary)* |
| `not-found.tsx` | 404 arayüzü |
| `route.ts` | API uç noktası |

Next.js bu dosyaları sabit bir sırayla iç içe koyar: `layout` > `error` > `loading` > `not-found` > `page`.[^7] React rehberindeki Suspense ve Error Boundary'yi hatırlayın: `loading.tsx` bir `<Suspense>`, `error.tsx` bir Error Boundary'dir. Next.js onları dosya adından kurar.

## Kodu nereye koymalı

Next.js yapı konusunda görüş bildirmez, tutarlı olmanızı ister.[^7] İşe yarayan üç kural var:

- **Colocation güvenlidir.** `app/products/` içine `product-card.tsx` koymak yeni bir adres açmaz; adres yalnızca `page.tsx` ile açılır.
- **`_` ile başlayan klasör** *(private folder)* routing'den tamamen çıkar: `app/products/_components/`.
- **Parantezli klasör** *(route group)* URL'ye eklenmez: `app/(shop)/cart/page.tsx` → `/cart`. Bölümleri gruplamak ve onlara ayrı layout vermek için kullanılır.

Büyüyen projelerde `app/` klasörünü yalnızca routing için tutup kodu `features/` altında toplamak yaygın bir tercih. Bu yaklaşımı [Klasör Yapısı ve İsimlendirme](/academy/architecture/folder-structure) dersi anlatıyor.

> [!TIP]
>
> Editörünüzde sekmeler `page.tsx`, `page.tsx`, `page.tsx` diye dolacak. Next.js dokümanı VS Code ve Cursor için `workbench.editor.customLabels.patterns` ayarıyla sekmeye klasör adını yazdırmayı önerir *(ör. `products/[slug] - page.tsx`)*.[^4]

## Güncel kalmak

Next.js sık sürüm çıkarır. Her sürüm güvenlik yaması da içerir. Küçük ve sık güncellemek, büyük ve seyrek güncellemekten kolaydır.[^4]

```bash
npx next upgrade
```

Güncelleme, paketle gelen dokümanı da yeni sürüme taşır. Böylece agent'lar her zaman kurulu sürümün dokümanını okur.[^4]

## Kendin dene

- `my-shop` projesini kurun. `next.config.ts`'te `cacheComponents` ve `partialPrefetching`'in açık geldiğini görün.
- `app/about/page.tsx` oluşturun ve `/about`'a gidin. Sonra dosyayı `app/(marketing)/about/page.tsx`'e taşıyın; adres değişti mi?
- `app/about/_components/team.tsx` oluşturun. `/about/_components/team` adresine gidince ne oluyor?
- `AGENTS.md`'yi açın ve agent'ı hangi klasöre yönlendirdiğini okuyun.

## Detaylı öğrenmek için

- **Resmi doküman:** Next.js Learn kursu; App Router ile adım adım bir panel uygulaması kurar.[^8]
- **Resmi doküman:** "Rendering Philosophy" sayfası; statik ile dinamiği neden bir yelpaze olarak gördüklerini ve bunun hosting'e etkisini anlatır.[^3]
- **Video:** Next.js Conf 2025 açılış konuşması; [Guillermo Rauch](https://rauchg.com/), [Sam Selikoff](https://samselikoff.com/) ve Jimmy Lai Next.js 16'yı tanıtıyor.[^9]
- **Resmi doküman:** Next.js 16 duyurusu; Turbopack, `proxy.ts` ve Cache Components'in ilk hâli.[^5]

## Kaynaklar

1. [Next.js Blog: Next.js 16.4](https://nextjs.org/blog/next-16-4) *(doc)* — 6 Ekim 2026. Cache Components'in tüm uygulamalara önerilmesi, `create-next-app`'te varsayılan olması ve React 19.3.
2. [React: Creating a React App](https://react.dev/learn/creating-a-react-app) *(doc)* — Next.js App Router, React Router ve Expo önerisi.
3. [Next.js: Rendering Philosophy](https://nextjs.org/docs/app/guides/rendering-philosophy) *(doc)* — Statik ve dinamiğin component seviyesinde bir yelpaze olması ve altyapıya etkisi.
4. [Next.js: Installation](https://nextjs.org/docs/app/getting-started/installation) *(doc)* — `create-next-app` varsayılanları, lint ayarı, editör etiketleri ve `next upgrade`.
5. [Next.js Blog: Next.js 16](https://nextjs.org/blog/next-16) *(doc)* — 21 Ekim 2025. Turbopack'in varsayılan olması, `middleware`'in `proxy` olması ve Cache Components.
6. [Next.js: AI Coding Agents](https://nextjs.org/docs/app/guides/ai-agents) *(doc)* — Paketle gelen doküman ve `AGENTS.md`'deki yönetilen talimat bloğu.
7. [Next.js: Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) *(doc)* — Özel dosyalar, component hiyerarşisi, colocation, private folder ve route group.
8. [Next.js: Learn](https://nextjs.org/learn) *(doc)* — Next.js ekibinin ücretsiz App Router kursu.
9. [Next.js Conf 2025: Opening Keynote](https://www.youtube.com/watch?v=myjrQS_7zNk) *(video)* — 22 Ekim 2025. Next.js 16, Cache Components ve anında navigasyon.
