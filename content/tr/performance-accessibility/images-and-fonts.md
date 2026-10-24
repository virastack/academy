---
title: "Görsel ve font"
description: "Görsel boyutu, format ve font yükleme."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/images-and-fonts"
---

## Görsel ve Font Neden Önemli

Görseller ve fontlar sayfanın ilk görünüşünü doğrudan belirler. 2025'te mobil sayfaların %76'sında, masaüstü sayfaların %85'inde **Largest Contentful Paint (LCP)** öğesi bir görseldi; mobil sayfaların %87'si de en az bir web fontu kullanıyordu.[^1] Yanlış yüklenen bir görsel LCP'yi geciktirir, boyutu belirtilmemiş bir görsel ya da geç gelen bir font ise **Cumulative Layout Shift (CLS)** ile sayfayı kaydırır. Bu metriklerin ne anlama geldiğini Core Web Vitals dersinde gördünüz; burada dört soruya bakıyoruz: hangi format, hangi boyut, hangi öncelik ve yer kayması nasıl önlenir.

## Görsel Formatları

| Format | Ne zaman |
| :-- | :-- |
| **AVIF** | Fotoğraflar; aynı görünüm için JPEG'den yaklaşık %50 küçük |
| **WebP** | Fotoğraf ve grafikler; JPEG'den ortalama %25-35, kayıpsız modda PNG'den %26 küçük |
| **JPEG** | Fotoğraflar için yedek (fallback) format |
| **PNG** | Şeffaflık gereken ya da ekran görüntüsü gibi keskin kenarlı görseller için yedek |
| **SVG** | İkon, logo, grafik; her boyutta net çizilmesi gerekenler |

Kaynak: MDN'in format rehberi.[^2] WebP bugün tüm modern tarayıcılarda çalışır. AVIF Chrome 85, Firefox 93 ve Safari 16.1'den beri desteklenir ama MDN hâlâ bir yedek format sunmanızı önerir.[^2] Gerçek dünyada geçiş yavaş: 2025'te LCP görsellerinin %57'si JPG, %26'sı PNG, yalnızca %11'i WebP'ydi; AVIF ve diğerleri %2'nin altında kaldı.[^1]

Birden fazla format sunmanın yolu `<picture>`'dır. Tarayıcı `type`'ını desteklemediği `<source>`'u atlar, hiçbirini desteklemezse `<img>`'e düşer.[^3]

```html
<picture>
  <source srcset="kapak.avif" type="image/avif" />
  <source srcset="kapak.webp" type="image/webp" />
  <img src="kapak.jpg" width="1200" height="800" alt="Sahilde gün batımı" />
</picture>
```

## Doğru Boyut: srcset ve sizes

Telefona 2000 piksellik masaüstü görselini göndermek, kullanıcının hiç görmeyeceği baytları indirtmektir. `srcset` tarayıcıya aynı görselin farklı genişlikteki kopyalarını, `sizes` ise görselin sayfada ne kadar yer kaplayacağını söyler; tarayıcı ekran genişliğine ve piksel yoğunluğuna göre en uygun dosyayı seçer.[^4]

```html
<img
  src="kapak-1000.jpg"
  srcset="kapak-500.jpg 500w, kapak-1000.jpg 1000w, kapak-1500.jpg 1500w"
  sizes="(min-width: 768px) 500px, 100vw"
  width="1000"
  height="667"
  alt="Sahilde gün batımı"
/>
```

Bu örnekte görsel 768px ve üstünde 500px genişliğinde, altında ekran genişliğinde gösterilir. 320px genişliğinde, piksel yoğunluğu 3 olan bir telefon 960 piksele ihtiyaç duyar ve tarayıcı `1000w` dosyasını seçer.[^4] `sizes` içinde yüzde kullanılamaz, göreli değer için `vw` yazılır.[^5] Görsel her ekranda aynı boyuttaysa (avatar, logo) `1x`, `2x` yoğunluk tanımları yeterlidir.[^4]

> [!TIP]
>
> 3x ekranlarda 3x görsel göndermek çoğu zaman fark edilmez. Bir ürün listesinde yoğunluğu 2x ile sınırlamak, görünür kalite kaybı olmadan görsel ağırlığını %45 azalttı.[^6]

## width ve height ile Yer Ayırmak

Görselin `width` ve `height` attribute'larını her zaman yazın. Tarayıcı bu iki değerden en-boy oranını hesaplar ve görsel inmeden önce yerini ayırır; böylece altındaki metin aşağı itilmez.[^7] Boyutu bilemediğiniz durumlarda CSS `aspect-ratio` ile yer ayırabilirsiniz.[^7] Bu hâlâ en yaygın hatalardan biri: 2025'te mobil sayfaların %62'sinde en az bir görselin boyutu eksikti.[^1]

## loading="lazy": LCP Görselinde Değil

`loading="lazy"` görselin indirilmesini, görsel ekrana yaklaşana kadar erteler; sayfanın altındaki görseller ilk görünen içerikle bant genişliği için yarışmaz. Desteklemeyen tarayıcı attribute'u yok sayar.[^8]

Tuzak, ilk ekranda görünen görseli de lazy yapmaktır. Tarayıcı görselin ekranda olduğunu ancak sayfayı yerleştirdikten sonra anlar ve indirme gecikir.[^8] WordPress üzerinde yapılan bir testte ilk ekrandaki görselleri lazy loading'den çıkarmak mobil LCP'yi %18 iyileştirdi, tasarruf edilen bayt miktarı ise değişmedi.[^9] Buna rağmen 2025'te mobil sayfaların yaklaşık %17'si LCP görselini hâlâ lazy yüklüyordu.[^1]

> [!DO]
>
> - Ekranın altında kalan görsellere `loading="lazy"` verin.

> [!DONT]
>
> - Hero görseline ya da LCP öğesine `loading="lazy"` vermeyin.[^8]

## fetchpriority="high"

Tarayıcı ekrandaki bir görselin önceliğini normalde sayfayı yerleştirdikten sonra yükseltir. `fetchpriority="high"` LCP görselinin bunu beklemeden, baştan yüksek öncelikle istenmesini sağlar.[^10] Google Flights'ta LCP arka plan görseline yüksek öncelik vermek LCP'yi 2,6 saniyeden 1,9 saniyeye indirdi.[^10]

```html
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Kampanya görseli" />
```

Bu bir ipucudur, emir değil; tarayıcı yine kendi kararını verebilir.[^10] Bir carousel'de yalnızca ilk görsele `high` verin; her şeye yüksek öncelik vermek hiçbirini öne çıkarmaz.[^11] Chrome DevTools'taki "LCP request discovery" insight'ı tam olarak üç şeye bakar: LCP görseli HTML'de doğrudan bulunabiliyor mu, `fetchpriority=high` var mı ve lazy yüklenmiyor mu.[^12]

## Next.js `<Image>`

`next/image`, `<img>`'in üstüne kurulu bir component'tir: `srcset`'i sizin yerinize üretir, tarayıcının desteklediği formatı `Accept` header'ına bakarak seçer ve varsayılan olarak lazy yükler.[^13]

```tsx
import Image from "next/image";
import hero from "./hero.jpg";

export function Hero() {
  return (
    <Image
      src={hero}
      alt="Kampanya görseli"
      sizes="100vw"
      loading="eager"
    />
  );
}
```

- **Boyut:** `width` ve `height` zorunludur ve yalnızca en-boy oranını bildirir, görünen boyutu CSS belirler; statik import edilen görsellerde (`import hero from "./hero.jpg"`) otomatik okunur. Boyut bilinmiyorsa `fill` kullanılır, ebeveynin `position: relative` olması gerekir.[^13]
- **sizes:** `fill` ya da CSS ile responsive yapılan görsellerde verin. Verilmezse tarayıcı görselin ekran genişliğinde (`100vw`) olduğunu varsayar ve gereğinden büyük dosya indirebilir.[^13]
- **LCP görseli:** Varsayılan `lazy` olduğu için LCP görseline `loading="eager"` ya da `fetchPriority="high"` verin. Next.js 16'da `priority` prop'u kaldırılmaya aday (deprecated), yerine `preload` geldi; doküman çoğu durumda `preload` yerine bu iki seçeneği önerir.[^13]
- **Format:** Varsayılan çıktı WebP'dir. AVIF için `next.config` içinde `formats: ["image/avif", "image/webp"]` yazılır.[^13]
- **Dış kaynak:** Başka bir domain'deki görseller için `remotePatterns` ile izin vermek gerekir. Next.js 16'dan beri kalite değerleri de `qualities` listesiyle sınırlıdır, varsayılan `[75]`.[^13]

## Font Formatı ve Barındırma

Font için tek format yeterlidir: **WOFF2**. WOFF'tan yaklaşık %30 daha iyi sıkıştırır ve geniş tarayıcı desteğine sahiptir.[^14][^15] Web'deki font isteklerinin yaklaşık %65'i bugün WOFF2.[^16]

Fontu kendi domain'inizden sunmak (self-hosting) çoğu durumda üçüncü parti bir sunucudan indirmekten hızlıdır, çünkü ek bağlantı kurulmaz.[^15] Sitelerin yaklaşık %72'si en az bir fontu kendi domain'inden sunuyor.[^16]

Kritik bir fontu erken indirtmek için `preload` kullanılabilir. Fontlar CORS ile indirildiği için `crossorigin` şarttır; her fontu preload etmek ise bant genişliğini diğer kritik dosyalardan çalar.[^15]

```html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
```

## font-display

Font inene kadar metnin ne yapacağını `@font-face` içindeki `font-display` belirler.[^15][^14]

| Değer | Davranış |
| :-- | :-- |
| `block` | Varsayılan. Metin font gelene kadar görünmez (Chromium ve Firefox'ta en fazla 3 saniye) |
| `swap` | Metin hemen yedek fontla görünür, font gelince değişir; kayma olabilir |
| `fallback` | Yaklaşık 100ms görünmezlik, sonra yedek font; font yaklaşık 3 saniye içinde gelmezse kullanılmaz |
| `optional` | Font yaklaşık 100ms içinde gelmezse o sayfada hiç kullanılmaz; kayma olmaz |

`swap` metni en hızlı gösteren değerdir ve sayfaların yaklaşık yarısında kullanılıyor.[^14][^16] Layout shift'i tamamen önlemek istiyorsanız `optional` en güvenli seçenektir, bedeli ilk ziyarette fontun görünmeyebilmesidir.[^7][^14]

## Subset ve Variable Font

- **Subset:** Fontta kullanmadığınız karakterleri (glyph) çıkarmaktır ve dosya boyutunu ciddi küçültür. `unicode-range` ile tarayıcıya fontun hangi karakterleri kapsadığını söylerseniz, dosya yalnızca sayfada o karakterlerden biri geçtiğinde indirilir.[^14] Ortanca font dosyası sıkıştırılmış hâlde 35 KB civarındadır; en büyük %10'luk dilim 100 KB'ı aşar ve bunun nedenleri arasında subset yapılmamış dosyalar da vardır.[^16]
- **Variable font:** Light, regular, bold gibi ayrı dosyalar yerine tek dosyada tüm kalınlıkları taşır.[^14] Masaüstü sitelerin %39'u, mobil sitelerin %41'i en az bir variable font kullanıyor.[^16] Tek dosya tek bir statik dosyadan büyük olabilir; çok sayıda kalınlık kullanmıyorsanız kazanç az olur.[^14]

## Yedek Font ve Layout Shift

Font değiştiğinde sayfa kayar, çünkü web fontu ile yedek font aynı metin için farklı genişlik ve yükseklik kaplar.[^14] Çözüm, yedek fontu web fontuna benzetmektir: `size-adjust`, `ascent-override`, `descent-override` ve `line-gap-override` descriptor'ları yedek fontun ölçülerini ayarlar.[^7]

Next.js'te bu ayarı elle yapmanız gerekmez: `next/font` yedek fontu sizin yerinize hesaplar.[^17]

## next/font

`next/font`, Google Fonts dahil fontları build sırasında indirip kendi domain'inizden sunar; tarayıcı Google'a hiç istek atmaz.[^17] Varsayılanları performans için ayarlıdır: `display: "swap"`, `preload: true` ve CLS'i azaltmak için otomatik hesaplanan bir yedek font (`adjustFontFallback`).[^17]

```tsx
// app/layout.tsx
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

```css
/* app/globals.css */
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-inter);
}
```

- Next.js variable font kullanmanızı önerir; variable olmayan bir fontta `weight` zorunludur.[^17]
- `subsets` hangi karakter setinin preload edileceğini belirler; preload açıkken boş bırakırsanız uyarı alırsınız. Fontunuzun hangi subset'leri olduğunu Google Fonts sayfasından kontrol edin.[^17]
- Kendi font dosyanız için `next/font/local` ve `src: "./fonts/marka.woff2"` kullanılır.[^17]

> [!TIP]
>
> Türkçe içerikte `ğ`, `ş`, `ı`, `İ` gibi harflerin seçtiğiniz subset'te bulunduğunu fontun Google Fonts sayfasındaki subset listesinden ve gerçek metinle kontrol edin.[^17]

## Detaylı Öğrenmek İçin

- **Kurs:** web.dev'in ücretsiz Learn Performance kursundaki görsel ve font bölümleri.[^4][^15]
- **Veri:** Web Almanac 2025'in Fonts bölümü; formatlar, barındırma, `font-display` ve variable font kullanımı.[^16]
- **Konuşma:** Paul Calvano'nun HTTP Archive verisiyle sık yapılan performans hatalarını anlattığı konuşma (Lazy Load '22); ilk ekrandaki görselleri lazy yüklemek dahil.[^18]
- **Konuşma:** Andrea Verlicchi'nin responsive görselleri otomatikleştirmeyi anlattığı konuşma (Lazy Load '22).[^19]
- **Yazı:** Addy Osmani'nin `fetchpriority` ipucu; LCP görseli ve önceliği düşürülecek script'ler için kısa örnekler.[^20]

## Kaynaklar

1. [HTTP Archive: Web Almanac 2025, Performance](https://almanac.httparchive.org/en/2025/performance) *(research)* — LCP öğe türleri ve formatları, lazy yüklenen LCP görselleri, `fetchpriority` ve boyutsuz görsel oranları.
2. [MDN: Image file type and format guide](https://developer.mozilla.org/docs/Web/Media/Guides/Formats/Image_types) *(doc)* — AVIF, WebP, JPEG, PNG ve SVG'nin sıkıştırma oranları, tarayıcı desteği ve hangisinin ne zaman seçileceği.
3. [MDN: `<picture>`](https://developer.mozilla.org/docs/Web/HTML/Element/picture) *(doc)* — `<source type>` ile format seçimi ve `<img>`'e düşme.
4. [web.dev: Image performance](https://web.dev/learn/performance/image-performance?hl=en) *(doc)* — Formatlar, sıkıştırma, `srcset` yoğunluk ve genişlik tanımları, `sizes` ve lazy loading.
5. [Ire Aderinokun: Responsive Images, The srcset and sizes Attributes](https://bitsofco.de/the-srcset-and-sizes-attributes/) *(article)* — `w` tanımları ve `sizes`'ın birlikte nasıl çalıştığı.
6. [Andrea Verlicchi: How to cap image fidelity to 2x](https://www.andreaverlicchi.eu/en/blog/capping-image-fidelity-2x-minimize-loading-time/) *(article)* — Yüksek yoğunluklu telefonlarda görseli 2x ile sınırlayarak %45 tasarruf.
7. [web.dev: Optimize Cumulative Layout Shift](https://web.dev/optimize-cls/) *(doc)* — Görsellere boyut vermek, `aspect-ratio`, fontların neden kaydırdığı ve `size-adjust`.
8. [web.dev: Browser-level image lazy loading](https://web.dev/articles/lazy-loading-images) *(doc)* — `loading` değerleri, tarayıcı desteği ve ilk ekrandaki görselleri lazy yapmama uyarısı.
9. [web.dev: The performance effects of too much lazy loading](https://web.dev/articles/lcp-lazy-loading?authuser=8) *(research)* — Felix Arntz ve Rick Viscomi. WordPress verisi ve testiyle lazy loading'in LCP'ye etkisi.
10. [web.dev: Optimize resource loading with the Fetch Priority API](https://web.dev/fetch-priority?hl=nl) *(doc)* — `fetchpriority` değerleri, LCP görselinde kullanımı ve Google Flights örneği.
11. [Adrian Bece: Boost Resource Loading With fetchpriority (Smashing Magazine)](https://www.smashingmagazine.com/2022/04/boost-resource-loading-new-priority-hint-fetchpriority/) *(article)* — Carousel örneği, lazy loading ile birlikte kullanım ve ölçülü kullanma uyarısı.
12. [Chrome for Developers: LCP request discovery](https://developer.chrome.com/docs/performance/insights/lcp-discovery) *(doc)* — DevTools insight'ının LCP görseli için kontrol ettiği üç koşul.
13. [Next.js: Image Component](https://nextjs.org/docs/app/api-reference/components/image) *(doc)* — `next/image` prop'ları, `sizes`, `preload`, `priority`'nin Next.js 16'da kaldırılmaya aday olması, `formats` ve `qualities`.
14. [web.dev: Best practices for fonts](https://web.dev/articles/font-best-practices) *(doc)* — `font-display` değerlerinin artı eksileri, WOFF2, subset, `unicode-range`, variable font ve yedek font.
15. [web.dev: Optimize web fonts](https://web.dev/learn/performance/optimize-web-fonts) *(doc)* — Preconnect, preload, self-hosting, WOFF2, `font-display` ve subset.
16. [HTTP Archive: Web Almanac 2025, Fonts](https://almanac.httparchive.org/en/2025/fonts) *(research)* — WOFF2 payı, self-hosting, `font-display: swap`, preload ve variable font kullanım oranları.
17. [Next.js: Font Module](https://nextjs.org/docs/app/api-reference/components/font) *(doc)* — `next/font` seçenekleri, varsayılanlar, subset, yerel font ve Tailwind ile kullanım.
18. [Paul Calvano: Performance Mistakes, an HTTP Archive deep dive (Lazy Load '22)](https://conffab.com/presentation/performance-mistakes-an-http-archive-deep-dive/) *(video)* — Lazy yüklenen LCP görselleri, eksik `crossorigin` ve kullanılmayan preload'lar.
19. [Andrea Verlicchi: Get speedy with responsive images automation (Lazy Load '22)](https://new-openai.conffab.com/presentations/get-speedy-with-responsive-images-automation) *(video)* — Responsive görsel uygulamaları ve bunları otomatikleştiren açık kaynak bir araç.
20. [Addy Osmani: Use fetchpriority=high to load your LCP hero image sooner](https://addyosmani.com/blog/fetch-priority/) *(article)* — LCP görseline yüksek, önemsiz script'lere düşük öncelik vermek.
