---
title: "Bundle boyutu"
description: "Paketi küçültme ve neyin yüklendiğini görme."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/bundle-size"
---

## Bundle Nedir

**Bundle**, uygulama kodunuzun ve bağımlılıklarının tarayıcı ve sunucu için birleştirilip optimize edilmiş çıktı dosyalarıdır. Bu işi yapan araca **bundler** denir. Küçük bundle daha hızlı iner, daha az çalıştırma süresi ister ve Core Web Vitals değerlerini iyileştirir.[^1]

JavaScript'in bedeli yalnızca indirme değildir: script'i işlemenin asıl maliyeti indirme ve CPU'da çalıştırma süresidir, bu da özellikle düşük güçlü telefonlarda hissedilir.[^2] 2025'te medyan bir sayfa masaüstünde 708 KB, mobilde 646 KB JavaScript yüklüyordu.[^3]

Bugün kullanacağınız bundler büyük ihtimalle hazır gelir. Next.js 16'da varsayılan bundler **Turbopack**'tir.[^4] Vite 8 ise **Rolldown** adlı tek bir Rust tabanlı bundler kullanır.[^5] Next.js code splitting ve tree shaking gibi optimizasyonları otomatik yapar; sizin işiniz bunlara engel olmamak ve neyin yüklendiğini görmektir.[^1]

## Tree Shaking

**Tree shaking**, kullanılmayan kodun (dead code) bundle'dan atılmasıdır. Bundler, hangi modülün ne export ettiğini ve nerede import edildiğini `import`/`export` ifadelerinden çıkarır.[^6]

```tsx
// utils.ts
export function formatPrice(n: number) { /* ... */ }
export function parseCsv(text: string) { /* ... */ } // hiç import edilmiyor

// page.tsx
import { formatPrice } from "./utils"; // parseCsv bundle'a girmez
```

İşe yaraması için birkaç şart var:[^7][^8]

- **ES module kullanın.** `require()` çalışma anında çağrılan bir fonksiyon olduğu için bundler onu derleme anında güvenle analiz edemez.
- **`sideEffects` alanı:** Bir paket `package.json`'da `"sideEffects": false` diyorsa bundler kullanılmayan dosyaları çekinmeden atar. Yalnızca import edildiği için çalışan dosyalar (polyfill, global CSS) listede belirtilmelidir, yoksa production'da düşebilir.
- **Named import tercih edin** ve ES module yayınlayan paketleri seçin. Kütüphanenin tamamını getiren import kalıpları eski kurulumlarda tree shaking'i bozabilir.

## Code Splitting

**Code splitting**, bundle'ı parçalara bölüp ilk görünüm için gereken kodu önce, geri kalanı ihtiyaç olunca yüklemektir. Büyük bir başlangıç script'i ana thread'i meşgul eder, etkileşimi geciktirir.[^9] V8 ekibinin pratik kuralı: 50-100 kB'ı aşan bir bundle'ı daha küçük parçalara bölün.[^2]

Temel araç dinamik `import()`'tur. Modül, satır çalıştığında ayrı bir dosya olarak iner:[^10]

```tsx
"use client";

export function Search({ names }: { names: string[] }) {
  return (
    <input
      onChange={async (e) => {
        const Fuse = (await import("fuse.js")).default; // yalnızca yazınca iner
        console.log(new Fuse(names).search(e.currentTarget.value));
      }}
    />
  );
}
```

### React.lazy

Bir component'i ilk render edildiği anda yüklemek için `lazy` kullanılır. Yüklenirken `Suspense` fallback'i gösterir. İçe aktarılan component **default export** olmalı ve `lazy` çağrısı component'in **dışında**, modülün üst seviyesinde yapılmalıdır; içeride tanımlarsanız her render'da state sıfırlanır.[^11]

```tsx
import { lazy, Suspense } from "react";

const MarkdownPreview = lazy(() => import("./MarkdownPreview"));

export function Editor() {
  return (
    <Suspense fallback={<p>Yükleniyor...</p>}>
      <MarkdownPreview />
    </Suspense>
  );
}
```

### next/dynamic

Next.js'te `next/dynamic`, `React.lazy` ile `Suspense`'in birleşimidir. Lazy loading Client Component'ler için anlamlıdır; Server Component'ler zaten otomatik olarak bölünür.[^10]

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("./Chart"), {
  loading: () => <p>Grafik yükleniyor...</p>,
});

export function Report() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Grafiği göster</button>
      {open && <Chart />} {/* kod yalnızca tıklayınca iner */}
    </>
  );
}
```

Named export için `import("./hello").then((mod) => mod.Hello)` yazılır. `ssr: false` seçeneği yalnızca Client Component içinde çalışır, Server Component'te hata verir.[^10]

> [!TIP]
>
> Modal, grafik, zengin metin editörü, harita gibi ilk ekranda görünmeyen ve ağır olan parçalar code splitting için en iyi adaylardır.

## Bundle'ı Görmek

Tahmin etmek yerine bundle'ın içine bakın. Bu araçlar her modülü alanı boyutuyla orantılı bir dikdörtgen olarak çizer (**treemap**).[^1]

### Next.js

Next.js 16.1 ve sonrasında Turbopack ile çalışan yerleşik bir analiz aracı vardır:[^1]

```command
npx next analyze
```

Arayüzde route'a, client/server ortamına ve dosya türüne göre filtreleyebilir, bir modüle tıklayıp onu sayfaya hangi import zincirinin getirdiğini görebilirsiniz.[^1][^12] `--output` ile sonuç `.next/diagnostics/analyze` klasörüne kaydedilir; optimizasyon öncesi ve sonrasını karşılaştırmak için kullanışlıdır.[^1] Araç ilk sürümlerde `next experimental-analyze` adıyla duyuruldu, eski yazılarda bu adı görebilirsiniz.[^12]

Projeniz `--webpack` ile derleniyorsa `@next/bundle-analyzer` plugin'i ve `ANALYZE=true npm run build` komutu kullanılır.[^1]

### Vite

Vite'ta yaygın seçenek `rollup-plugin-visualizer`'dır; build sonrası bir HTML rapor üretir.[^13]

```command
npm install --save-dev rollup-plugin-visualizer
```

```ts
// vite.config.ts
import { defineConfig, type PluginOption } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [visualizer({ gzipSize: true }) as PluginOption], // listede en sonda
});
```

Hiç ayar eklemeden bakmak isterseniz `npx vite-bundle-visualizer` aynı plugin'i sizin için çalıştırır.[^14]

## Paketin Maliyetini Kurmadan Görmek

Yeni bir bağımlılık eklemeden önce boyutuna bakın. **Bundlephobia** bir npm paketinin boyutunu, neyden oluştuğunu ve export'larını gösterir.[^15] **pkg-size.dev** paketi tarayıcınızda gerçekten kurup bundle'lar; önbellek yerine her seferinde taze kurulum yaptığı için iç içe bağımlılıklardaki değişiklikleri de yansıtır.[^16]

> [!DO]
>
> - Paketi eklemeden önce boyutuna ve tree shaking'e uygun olup olmadığına bakın.
> - Aynı işi yapan iki paketi bu araçlarla karşılaştırın.

## Barrel Dosyaları

**Barrel dosyası**, kendi kodu olmayan, yalnızca başka modülleri yeniden export eden dosyadır (çoğunlukla `index.ts`). Her klasöre bir barrel koyulduğunda tek bir import, zincirleme olarak projenin büyük kısmını yükleyebilir; bu da özellikle geliştirme sunucusunu, testleri ve lint'i yavaşlatır.[^17]

```ts
// components/index.ts (barrel)
export * from "./Button";
export * from "./Modal";
export * from "./DataGrid"; // Button'ı isteyen herkes bunu da işletir
```

İkon ve UI kütüphaneleri de büyük barrel'larla gelir; bazılarında giriş dosyasında 10.000'e yakın export vardır.[^18] Next.js bu yüzden `optimizePackageImports` seçeneğini sunar: barrel'ı analiz edip import'u doğrudan kullandığınız modüle yönlendirir.[^18] `lucide-react`, `date-fns`, `@mui/material`, `react-icons` gibi popüler kütüphaneler varsayılan olarak zaten optimize edilir; listede olmayan bir paket için elle eklersiniz:[^19]

```ts
// next.config.ts
const nextConfig = {
  experimental: {
    optimizePackageImports: ["my-icon-library"],
  },
};

export default nextConfig;
```

> [!DONT]
>
> - Kendi projenizde her klasöre `index.ts` barrel'ı koymayın; doğrudan dosyadan import edin: `import { Button } from "@/components/Button"`.[^17]

## Üçüncü Parti Script'ler

Analytics, tag manager, chat ve reklam script'leri sizin bundle'ınızda görünmez ama aynı ana thread'i kullanır. Sayfaların %90'ından fazlası en az bir üçüncü parti kaynak kullanıyor; medyan sayfa masaüstünde 83, mobilde 79 üçüncü parti isteği yapıyor.[^20] Genel kural: kritik render yolunda gerekmiyorsa üçüncü parti script'i `async` ya da `defer` ile yükleyin.[^21]

Next.js'te bunu `next/script` ve `strategy` prop'u ile yaparsınız:[^22]

| Strateji | Ne zaman yüklenir | Örnek |
| :-- | :-- | :-- |
| `beforeInteractive` | Next.js kodundan önce; yalnızca root layout'ta | Bot tespiti, çerez onayı |
| `afterInteractive` | Varsayılan; hydration'ın bir kısmından sonra | Tag manager, analytics |
| `lazyOnload` | Tarayıcı boştayken, her şey yüklendikten sonra | Chat widget'ı, sosyal medya eklentisi |

```tsx
import Script from "next/script";

export default function Page() {
  return <Script src="https://example.com/chat.js" strategy="lazyOnload" />;
}
```

`worker` stratejisi hâlâ deneyseldir ve App Router'da çalışmaz. `onLoad` gibi olay prop'ları yalnızca Client Component'te kullanılabilir.[^22]

## Server Components ve Client Bundle

Server Component'te kullanılan kütüphaneler istemciye gönderilmez; tarayıcıya yalnızca üretilen HTML gider. Bu yüzden syntax highlighting, markdown işleme ya da grafik hazırlama gibi tarayıcı API'si ve etkileşim gerektirmeyen ağır işleri Server Component'e taşımak, client bundle'ı küçültmenin etkili bir yoludur.[^1]

## Detaylı Öğrenmek İçin

- **Resmi rehber:** Next.js'in bundle analizi ve büyük bundle'ları küçültme rehberi.[^1]
- **Temel okuma:** Addy Osmani ve Mathias Bynens'in JavaScript'in maliyetini anlattığı V8 makalesi.[^2]
- **Konuşma:** Stephen Cooper'ın tree shaking, `sideEffects`, barrel dosyaları ve CI'da bundle boyutu takibini anlattığı yaklaşık 26 dakikalık konuşma (WeAreDevelopers World Congress 2025).[^23]
- **Konuşma:** Abhijeet Prasad'ın build araçlarının ürettiği JavaScript'i küçültmeyi anlattığı 17 dakikalık konuşma (JSNation US 2024).[^24]
- **Tree shaking pratikte:** Smashing Magazine'in tree shaking başvuru rehberi.[^8]

## Kaynaklar

1. [Next.js: Optimizing package bundling](https://nextjs.org/docs/app/guides/package-bundling) *(doc)* — Bundle Analyzer, `@next/bundle-analyzer`, `optimizePackageImports` ve ağır işi Server Component'e taşımak.
2. [V8: The cost of JavaScript in 2019](https://v8.dev/blog/cost-of-javascript-2019) *(article)* — Addy Osmani ve Mathias Bynens. İndirme ve çalıştırma maliyeti, bundle'ı 50-100 kB üstünde bölme önerisi.
3. [Web Almanac 2025: Page Weight](https://almanac.httparchive.org/en/2025/page-weight) *(research)* — Sayfa başına medyan JavaScript boyutu ve istek sayısı.
4. [Next.js 16 (beta)](https://nextjs.org/blog/next-16-beta) *(doc)* — Turbopack'in varsayılan bundler olması ve `--webpack` ile geri dönüş.
5. [Vite 8](https://vite.dev/blog/announcing-vite8) *(doc)* — Rolldown'ın Vite'ın tek bundler'ı olması.
6. [MDN: Tree shaking](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking) *(doc)* — Tree shaking tanımı ve `import`/`export` ile ilişkisi.
7. [webpack: Tree Shaking](https://webpack.js.org/guides/tree-shaking/) *(doc)* — ES module şartı, `sideEffects` alanı ve CSS dosyaları.
8. [Atila Fassina: Tree-Shaking: A Reference Guide](https://www.smashingmagazine.com/2021/05/tree-shaking-reference-guide) *(article)* — CommonJS ile ESM farkı, `sideEffects`, pure annotation ve named import.
9. [web.dev: Reduce JavaScript payloads with code splitting](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting) *(doc)* — Büyük başlangıç script'inin etkisi ve `import()` ile bölme.
10. [Next.js: Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading) *(doc)* — `next/dynamic`, `ssr: false`, named export ve kütüphaneyi `import()` ile yükleme.
11. [React: lazy](https://react.dev/reference/react/lazy) *(doc)* — `lazy` imzası, default export şartı, `Suspense` ve üst seviyede tanımlama.
12. [Next.js 16.1](https://nextjs.org/blog/next-16-1) *(doc)* — Deneysel Bundle Analyzer'ın duyurusu ve özellikleri.
13. [rollup-plugin-visualizer](https://unpkg.com/rollup-plugin-visualizer@7.1.1/README.md) *(repo)* — Vite kurulumu, rapor şablonları ve gzip/Brotli seçenekleri.
14. [vite-bundle-visualizer](https://github.com/KusStar/vite-bundle-visualizer) *(repo)* — Vite projesinde tek komutla bundle raporu.
15. [Bundlephobia](https://bundlephobia.com/package/pino-http) *(doc)* — npm paketlerinin boyutunu, bileşimini ve export'larını analiz eden araç.
16. [pkg-size.dev](https://github.com/privatenumber/pkg-size.dev/blob/develop/README.md) *(repo)* — Paketleri tarayıcıda kurup bundle'layan boyut aracı.
17. [Marvin Hagemeister: The barrel file debacle](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/) *(article)* — Barrel dosyalarının araçları neden yavaşlattığı ve modül sayısının maliyeti.
18. [Shu Ding: How we optimized package imports in Next.js](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js) *(article)* — `optimizePackageImports`'un nasıl çalıştığı ve ölçülen kazançlar.
19. [Next.js: optimizePackageImports](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports) *(doc)* — Ayar ve varsayılan olarak optimize edilen kütüphaneler listesi.
20. [Web Almanac 2025: Third Parties](https://almanac.httparchive.org/en/2025/third-parties) *(research)* — Üçüncü parti kullanım oranı ve sayfa başına istek sayısı.
21. [web.dev: Load Third-Party JavaScript](https://web.dev/articles/optimizing-content-efficiency-loading-third-party-javascript/) *(doc)* — `async`/`defer`, preconnect, lazy load ve self-host.
22. [Next.js: Script Component](https://nextjs.org/docs/app/api-reference/components/script) *(doc)* — `next/script` stratejileri ve olay prop'ları.
23. [Stephen Cooper: A Practical Guide to Reducing Bundle Size (WeAreDevelopers World Congress 2025)](https://www.wearedevelopers.com/videos/1439-a-practical-guide-to-reducing-bundle-size) *(video)* — Tree shaking, barrel dosyaları ve bundle boyutu regresyon testi.
24. [Abhijeet Prasad: The Performance Impact of Generated JavaScript (JSNation US 2024)](https://gitnation.com/contents/the-performance-impact-of-generated-javascript) *(video)* — Minification, down-compilation ve bundle boyutunu izleme.
