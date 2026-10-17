---
title: "Tailwind"
description: "Utility sınıflarıyla stil ve responsive düzen."
lastVerified: "2026-10-17"
translationKey: "web-fundamentals/tailwind"
---

## Tailwind Nedir

[!tailwind], stili ayrı bir CSS dosyasında isimlendirilmiş sınıflarla değil, HTML'de tek iş yapan küçük sınıfları birleştirerek yazdığınız bir CSS framework'üdür. Bu yaklaşıma **utility-first** denir.[^1]

```html
<div class="mx-auto flex max-w-sm items-center gap-4 rounded-xl bg-white p-6 shadow-lg">
  <p class="text-xl font-medium text-gray-900">Merhaba</p>
</div>
```

Her sınıf tek bir CSS kuralına karşılık gelir: `flex` → `display: flex`, `p-6` → padding, `rounded-xl` → border-radius. Bu ders CSS dersinin üstüne kurulur. CSS bilinmeden Tailwind kullanılmaz; Tailwind yalnızca CSS'i daha hızlı yazdırır.

Neden bu kadar yaygın:[^1]

- **Hız:** Sınıfa isim bulmak, HTML ile CSS dosyası arasında gidip gelmek yok. *(Tailwind'den önce bir elemente ne isim vereceğimizi düşünürken dakikalar geçerdi. CSS yazmak işin kolay kısmıydı; asıl zor olan `.card-wrapper` mı `.card-container` mı, ona karar vermekti.)*
- **Güvenli değişiklik:** Bir elemana sınıf eklemek ya da silmek yalnızca o elemanı etkiler.
- **Büyümeyen CSS:** Yeni özellik eklendikçe CSS dosyası doğrusal olarak büyümez.

İlk bakışta inline style'a benzer ama farkı büyüktür: değerler sabit bir tasarım ölçeğinden gelir (`p-4`, `p-6`; rastgele `13px` değil) ve `hover`, focus ya da ekran genişliği gibi inline style'ın yapamadığı durumlar desteklenir.[^1][^2] Fikrin nereden çıktığını Tailwind'in yaratıcısı [Adam Wathan](https://adamwathan.me/)'ın yazısı anlatır.[^3]

[!tailwind] bugün en çok kullanılan CSS framework'ü: State of CSS 2025 anketinde bu soruyu yanıtlayan yaklaşık 4.000 kişinin yarısından fazlası Tailwind kullandığını söyledi.[^4]

## Kurulum

Bu ders [!tailwind] v4 sözdizimini kullanır. v4'te `tailwind.config.js` dosyası ve `content` ayarı yoktur; Tailwind projedeki dosyaları tarayıp kullandığınız sınıfların CSS'ini kendisi üretir.[^5]

Next.js projesinde:[^6]

```command
npm install tailwindcss @tailwindcss/postcss postcss
```

```js
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

```css
/* app/globals.css */
@import "tailwindcss";
```

Vite kullanan projelerde paket `@tailwindcss/vite`'tır.[^7] Hiçbir şey kurmadan denemek için resmi online editör Tailwind Play'i kullanabilirsiniz.[^8]

> [!WARNING]
>
> İnternetteki eğitimlerin çoğu hâlâ v3 ile yazılmış: `tailwind.config.js`, `@tailwind base;` gibi satırlar görürseniz bu eski sözdizimidir. Bazı sınıfların adı da değişti (`shadow-sm` → `shadow-xs` gibi). Farklar upgrade guide'da listelenir.[^9]

Tailwind'in temel stilleri (**Preflight**) tarayıcı varsayılanlarını sıfırlar: margin'ler sıfırlanır, `h1`–`h6` normal metin boyutunda görünür, listelerde madde işareti olmaz.[^10] "Başlığım neden büyük değil?" sorusunun cevabı budur; boyutu sınıfla verirsiniz.

## Temel Sınıflar

| Ne için | Örnek | CSS karşılığı |
| :-- | :-- | :-- |
| Boşluk | `p-4`, `px-6`, `mt-2`, `mx-auto` | `padding`, `margin` |
| Düzen | `flex`, `items-center`, `gap-4`, `grid grid-cols-3` | `display`, hizalama, `gap` |
| Boyut | `w-full`, `max-w-md`, `h-12` | `width`, `max-width`, `height` |
| Yazı | `text-lg`, `font-bold`, `leading-tight` | `font-size`, `font-weight`, `line-height` |
| Renk | `text-gray-900`, `bg-sky-500`, `bg-black/75` | `color`, `background-color`, opaklık |
| Kenar | `border`, `rounded-lg`, `shadow-md` | `border`, `border-radius`, `box-shadow` |

Renkler 50 (en açık) ile 950 (en koyu) arasında 11 tondan oluşur; `/75` gibi bir ek rengin opaklığını ayarlar.[^11] Ölçekte olmayan tek seferlik bir değer gerekirse köşeli parantez kullanılır: `top-[117px]`, `bg-[#316ff6]`.[^12]

## Durumlar: hover, focus ve diğerleri

Bir sınıfın önüne **variant** eklemek, onu yalnızca o durum gerçekleştiğinde uygular.[^2]

```html
<button class="bg-sky-500 hover:bg-sky-700 focus:outline-2 disabled:opacity-50">
  Kaydet
</button>
```

- **Pseudo-class:** `hover:`, `focus:`, `active:`, `disabled:`, `first:`.[^13]
- **Ebeveynin durumu:** Ebeveyne `group` verilir, çocuk `group-hover:` ile ebeveynin üstüne gelindiğinde değişir.[^13]
- **Attribute:** `aria-expanded:`, `data-active:` gibi variant'lar erişilebilirlik ve durum attribute'larına bağlanır.[^13]

Variant'lar zincirlenebilir: `dark:md:hover:bg-fuchsia-600`.[^13]

## Responsive

Tailwind **mobile-first** çalışır: ön eksiz bir sınıf her ekranda geçerlidir, `md:` gibi bir ön ek ise "bu genişlik ve üstü" demektir.[^14]

| Ön ek | Başladığı genişlik |
| :-- | :-- |
| `sm:` | 40rem (640px) |
| `md:` | 48rem (768px) |
| `lg:` | 64rem (1024px) |
| `xl:` | 80rem (1280px) |
| `2xl:` | 96rem (1536px) |

```html
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">...</div>
```

Bu liste telefonda tek, tablette iki, geniş ekranda üç sütun olur.

> [!DONT]
>
> - `sm:text-center` yazıp mobilde ortalanmasını beklemeyin; `sm:` "küçük ekranda" değil, "640px ve üstünde" demektir.

> [!DO]
>
> - Mobil stili ön eksiz yazın, büyük ekranı ezin: `text-center sm:text-left`.[^14]

Bileşeni ekrana göre değil, içinde durduğu alana göre değiştirmek için **container query** vardır: ebeveyne `@container`, çocuğa `@md:flex-row` gibi sınıflar verilir.[^14]

## Dark Mode

`dark:` variant'ı varsayılan olarak işletim sisteminin tema tercihine (`prefers-color-scheme`) bakar.[^15]

```html
<div class="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">...</div>
```

Temayı bir butonla açıp kapatmak istiyorsanız `dark:` variant'ını bir class'a bağlarsınız; `<html class="dark">` olduğunda dark stiller devreye girer:[^15]

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

## Tema

Renk, font, breakpoint gibi tasarım değerleri CSS içinde `@theme` bloğunda tanımlanır. Buraya eklenen her değişken otomatik olarak yeni sınıflar üretir.[^16]

```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.62 0.19 259);
  --font-display: "Inter", sans-serif;
}
```

Artık `bg-brand-500`, `text-brand-500` ve `font-display` sınıfları kullanılabilir. Değişkenin öneki (`--color-*`, `--font-*`, `--breakpoint-*`) hangi sınıf ailesinin oluşacağını belirler. Tema değerleri normal CSS değişkeni olarak da durur, `var(--color-brand-500)` ile her yerde okunur. Sınıf üretmesini istemediğiniz değişkenler için `@theme` yerine `:root` kullanılır.[^16]

## React'te Kullanım

### Tekrarı component ile çözün

Aynı uzun sınıf listesini birçok yerde yazıyorsanız çözüm genellikle yeni bir CSS sınıfı değil, bir **component**'tir: stil tek yerde durur, her yerde aynı kalır.[^17] Liste döngüyle üretiliyorsa sınıf zaten bir kez yazılmıştır.[^17] `@apply` ile sınıfları CSS'e taşımak mümkündür ama öncelikli yol değildir.[^18]

### Sınıf adını parça parça üretmeyin

Tailwind kaynak dosyalarını düz metin olarak tarar; çalışma anında birleştirilen sınıf adlarını göremez, bu yüzden CSS'ini de üretmez.[^19]

```tsx
// Çalışmaz: bg-blue-600 metni kaynakta hiç geçmiyor
<button className={`bg-${color}-600`}>Kaydet</button>

// Çalışır: tam sınıf adları kaynakta açıkça yazılı
const colorVariants = {
  blue: "bg-blue-600 hover:bg-blue-500",
  red: "bg-red-600 hover:bg-red-500",
};

<button className={colorVariants[color]}>Kaydet</button>
```

### Çakışan sınıfları birleştirmek

Bir component varsayılan sınıflarının üstüne dışarıdan `className` alıyorsa `px-2` ile `px-4` aynı elemanda kalabilir ve hangisinin kazanacağı belirsizleşir. Yaygın çözüm `clsx` ile koşullu sınıfları toplamak, `tailwind-merge` ile çakışanları ayıklamaktır; ikisi genellikle `cn` adlı bir yardımcıda birleştirilir.[^20][^21]

```command
npm install clsx tailwind-merge
```

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

cn("px-2 py-1", isLarge && "px-4"); // isLarge true ise "py-1 px-4"
```

## Araçlar

- **Tailwind CSS IntelliSense:** VS Code ve Cursor için eklenti; sınıf adlarını tamamlar, hatalı sınıfı işaretler, üzerine gelince üretilen CSS'i gösterir.[^22]
- **Prettier eklentisi:** Sınıfları her dosyada aynı sıraya dizer, böylece uzun listeler daha kolay okunur.[^22]

## Eleştiriler

[!tailwind] tartışmalı bir araç. En sık itirazlar: uzun sınıf listeleri HTML'i okumayı zorlaştırır, sınıf adındaki yazım hatası (`txt-blue`) editörde fark edilmez ve CSS'e ek olarak Tailwind'in isimlendirmesini de öğrenmek gerekir.[^23][^24] Savunanlar ise sabit tasarım ölçeğinin ekip içinde tutarlılık sağladığını vurgular; sert eleştirmenler bile bu noktayı kabul eder.[^24] Dengeli bir değerlendirme için [Chris Coyier](https://chriscoyier.net/)'in yazısı iyi bir başlangıçtır.[^23]

## Detaylı Öğrenmek İçin

- **Resmi doküman:** Tailwind dokümanının "Core concepts" bölümü bu dersin her başlığını derinlemesine anlatır; sınıf referans sayfalarına ihtiyaç oldukça bakılır.[^1]
- **v3'ten gelen kod:** Eski bir projeyle ya da eğitimle karşılaşırsanız upgrade guide.[^9]
- **Konuşma:** [Sarah Dayan](https://frontstuff.io/)'ın utility-first yaklaşımın neden ortaya çıktığını anlattığı 18 dakikalık konuşma (dotCSS 2019).[^25]
- **Konuşma:** Sarah Dayan'ın utility sınıflarının neden inline style olmadığını anlattığı konuşma (CSS Day 2024).[^26]
- **Yazı:** Sarah Dayan'ın utility-first savunusu; dezavantajları da dürüstçe sayar.[^27]

## Kaynaklar

1. [Tailwind: Styling with utility classes](https://tailwindcss.com/docs/styling-with-utility-classes) *(doc)* — Utility-first yaklaşım, faydaları ve inline style'dan farkı.
2. [Tailwind: Styling hover and focus states](https://tailwindcss.com/docs/styling-with-utility-classes#styling-hover-and-focus-states) *(doc)* — Variant ön eklerinin nasıl çalıştığı ve üretilen CSS.
3. [Adam Wathan](https://adamwathan.me/): [CSS Utility Classes and "Separation of Concerns"](https://adamwathan.me/css-utility-classes-and-separation-of-concerns/) *(article)* — Semantic CSS'ten utility-first'e geçişin gerekçesi.
4. [State of CSS 2025: Other tools](https://2025.stateofcss.com/en-US/other-tools/) *(research)* — CSS framework kullanımı; Tailwind 3.977 yanıtın 2.041'inde.
5. [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4) *(doc)* — v4 ile gelen CSS-first yapılandırma ve otomatik içerik tarama.
6. [Tailwind: Install with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs) *(doc)* — Next.js projesine kurulum adımları.
7. [Tailwind: Installing with Vite](https://tailwindcss.com/docs/installation/using-vite) *(doc)* — Vite plugin'i ile kurulum.
8. [Tailwind Play](https://play.tailwindcss.com/) *(doc)* — Tarayıcıda çalışan resmi Tailwind editörü.
9. [Tailwind: Upgrade guide](https://tailwindcss.com/docs/upgrade-guide) *(doc)* — v3'ten v4'e değişen sözdizimi, sınıf adları ve tarayıcı desteği.
10. [Tailwind: Preflight](https://tailwindcss.com/docs/preflight) *(doc)* — Tailwind'in varsayılan stilleri nasıl sıfırladığı.
11. [Tailwind: Colors](https://tailwindcss.com/docs/colors) *(doc)* — Varsayılan renk paleti ve opaklık eki.
12. [Tailwind: Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles) *(doc)* — Köşeli parantezle tek seferlik değer, `@layer` ve `@utility`.
13. [Tailwind: Hover, focus, and other states](https://tailwindcss.com/docs/hover-focus-and-other-states) *(doc)* — Pseudo-class, `group`/`peer`, `aria-*` ve `data-*` variant'ları.
14. [Tailwind: Responsive design](https://tailwindcss.com/docs/responsive-design) *(doc)* — Breakpoint'ler, mobile-first kuralı ve container query.
15. [Tailwind: Dark mode](https://tailwindcss.com/docs/dark-mode) *(doc)* — `dark:` variant'ı ve temayı elle kontrol etmek.
16. [Tailwind: Theme variables](https://tailwindcss.com/docs/theme) *(doc)* — `@theme`, değişken önekleri ve `:root` ile farkı.
17. [Tailwind: Reusing styles](https://tailwindcss.com/docs/reusing-styles) *(doc)* — Tekrarı döngü ve component ile yönetmek.
18. [Tailwind: Functions and directives](https://tailwindcss.com/docs/functions-and-directives) *(doc)* — `@apply`, `@theme`, `@source` ve diğer direktifler.
19. [Tailwind: Detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files) *(doc)* — Dinamik sınıf adlarının neden üretilmediği.
20. [tailwind-merge](https://github.com/dcastil/tailwind-merge) *(doc)* — Çakışan Tailwind sınıflarını birleştiren kütüphane.
21. [Steve Kinney](https://stevekinney.com/): [clsx and tailwind-merge](https://stevekinney.com/courses/tailwind/clsx-and-tailwind-merge) *(article)* — `cn` yardımcısı ve iki kütüphanenin birlikte kullanımı.
22. [Tailwind: Editor setup](https://tailwindcss.com/docs/editor-setup) *(doc)* — IntelliSense eklentisi ve Prettier ile sınıf sıralama.
23. [Chris Coyier](https://chriscoyier.net/): [If we're gonna criticize utility-class frameworks, let's be fair about it](https://css-tricks.com/if-were-gonna-criticize-utility-class-frameworks-lets-be-fair-about-it/) *(article)* — Utility framework'lerine yönelik eleştirilerin hangilerinin adil olduğu.
24. [Colton Voege](https://colton.dev/): [Tailwind is the Worst of All Worlds](https://colton.dev/blog/tailwind-is-the-worst-of-all-worlds/) *(article)* — Tailwind'e sert bir eleştiri ve kabul ettiği artıları.
25. [Sarah Dayan](https://frontstuff.io/): [In Defense of Utility-First CSS (dotCSS 2019)](https://www.youtube.com/watch?v=R50q4NES6Iw) *(video)* — Büyüyen projelerde CSS'in bozulması ve utility-first yaklaşım.
26. [Sarah Dayan](https://frontstuff.io/): [Utility First CSS Isn't Inline Styles (CSS Day 2024)](https://www.youtube.com/watch?v=g6wtyg3O4Fo) *(video)* — Utility sınıfları ile inline style arasındaki fark.
27. [Sarah Dayan](https://frontstuff.io/): [In Defense of Utility-First CSS](https://www.freecodecamp.org/news/in-defense-of-utility-first-css-4f406acee6fb) *(article)* — Composition, BEM karşılaştırması ve utility-first'in dezavantajları.
