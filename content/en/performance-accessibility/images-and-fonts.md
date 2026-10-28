---
title: "Images and fonts"
description: "Image size, format and font loading."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/images-and-fonts"
---

## Why images and fonts matter

Images and fonts decide the page's first appearance directly. In 2025 the **Largest Contentful Paint (LCP)** element was an image on 76% of mobile pages and 85% of desktop pages; 87% of mobile pages also used at least one web font.[^1] An image loaded the wrong way delays LCP, while an image with no stated size or a font that arrives late shifts the page through **Cumulative Layout Shift (CLS)**. You saw what these metrics mean in the Core Web Vitals lesson; here we look at four questions: which format, which size, which priority, and how to prevent the layout shift.

## Image formats

| Format | When |
| :-- | :-- |
| **AVIF** | Photos; about 50% smaller than JPEG for the same look |
| **WebP** | Photos and graphics; 25-35% smaller than JPEG on average, and 26% smaller than PNG in lossless mode |
| **JPEG** | The fallback format for photos |
| **PNG** | A fallback for images that need transparency or have sharp edges, such as a screenshot |
| **SVG** | Icons, logos, charts; anything that has to stay crisp at every size |

The source is MDN's format guide.[^2] WebP works in every modern browser today. AVIF has been supported since Chrome 85, Firefox 93 and Safari 16.1, but MDN still recommends offering a fallback format.[^2] In the real world the move is slow: in 2025, 57% of LCP images were JPG and 26% PNG, with only 11% WebP; AVIF and the others stayed under 2%.[^1]

The way to offer more than one format is `<picture>`. The browser skips a `<source>` whose `type` it does not support, and falls back to `<img>` if it supports none of them.[^3]

```html
<picture>
  <source srcset="cover.avif" type="image/avif" />
  <source srcset="cover.webp" type="image/webp" />
  <img src="cover.jpg" width="1200" height="800" alt="Sunset on the beach" />
</picture>
```

## The right size: srcset and sizes

Sending a 2000-pixel desktop image to a phone makes the user download bytes they will never see. `srcset` tells the browser about copies of the same image at different widths, and `sizes` how much room the image will take on the page; the browser picks the best file for the screen width and the pixel density.[^4]

```html
<img
  src="cover-1000.jpg"
  srcset="cover-500.jpg 500w, cover-1000.jpg 1000w, cover-1500.jpg 1500w"
  sizes="(min-width: 768px) 500px, 100vw"
  width="1000"
  height="667"
  alt="Sunset on the beach"
/>
```

In this example the image is shown 500px wide at 768px and above, and at the screen width below that. A 320px-wide phone with a pixel density of 3 needs 960 pixels, and the browser picks the `1000w` file.[^4] A percentage cannot be used inside `sizes`; write `vw` for a relative value.[^5] If the image is the same size on every screen (an avatar, a logo), `1x` and `2x` density descriptors are enough.[^4]

> [!TIP]
>
> Sending a 3x image to a 3x screen usually goes unnoticed. In a product list, capping the density at 2x reduced the image weight by 45% with no visible loss of quality.[^6]

## Reserving space with width and height

Always write an image's `width` and `height` attributes. The browser works out the aspect ratio from those two values and reserves the space before the image arrives, so the text below it is not pushed down.[^7] In the cases where you cannot know the size, you can reserve space with the CSS `aspect-ratio`.[^7] This is still one of the most common mistakes: in 2025, 62% of mobile pages had at least one image with a missing size.[^1]

## loading="lazy": not on the LCP image

`loading="lazy"` postpones downloading an image until it comes close to the screen; the images further down the page then do not compete for bandwidth with the first visible content. A browser that does not support it ignores the attribute.[^8]

The trap is making an image visible in the first screen lazy too. The browser only works out that the image is on screen after it lays the page out, and the download is delayed.[^8] In a test on WordPress, taking the first-screen images out of lazy loading improved mobile LCP by 18%, while the number of bytes saved did not change.[^9] Even so, in 2025 around 17% of mobile pages still lazy-loaded their LCP image.[^1]

> [!DO]
>
> - Give `loading="lazy"` to the images below the fold.

> [!DONT]
>
> - Do not give `loading="lazy"` to the hero image or the LCP element.[^8]

## fetchpriority="high"

The browser normally raises the priority of an on-screen image only after it lays the page out. `fetchpriority="high"` makes the LCP image be requested at high priority from the start, without waiting for that.[^10] On Google Flights, giving the LCP background image a high priority brought LCP down from 2.6 seconds to 1.9 seconds.[^10]

```html
<img src="hero.avif" fetchpriority="high" width="1200" height="600" alt="Campaign image" />
```

This is a hint, not an order; the browser can still make its own decision.[^10] In a carousel, give `high` to the first image only; giving everything a high priority puts nothing in front.[^11] The "LCP request discovery" insight in Chrome DevTools looks at exactly three things: can the LCP image be found directly in the HTML, does it have `fetchpriority=high`, and is it not lazy-loaded.[^12]

## Next.js `<Image>`

`next/image` is a component built on top of `<img>`: it produces the `srcset` for you, picks the format the browser supports by looking at the `Accept` header, and lazy-loads by default.[^13]

```tsx
import Image from "next/image";
import hero from "./hero.jpg";

export function Hero() {
  return (
    <Image
      src={hero}
      alt="Campaign image"
      sizes="100vw"
      loading="eager"
    />
  );
}
```

- **The size:** `width` and `height` are required and only state the aspect ratio; CSS decides the displayed size. For statically imported images (`import hero from "./hero.jpg"`) they are read automatically. When the size is unknown, `fill` is used, and the parent has to be `position: relative`.[^13]
- **sizes:** pass it for images made responsive with `fill` or with CSS. Without it, the browser assumes the image is the screen's width (`100vw`) and can download a bigger file than needed.[^13]
- **The LCP image:** because the default is `lazy`, give the LCP image `loading="eager"` or `fetchPriority="high"`. In Next.js 16 the `priority` prop is deprecated and `preload` arrived in its place; the documentation recommends those two options over `preload` in most cases.[^13]
- **The format:** the default output is WebP. For AVIF, write `formats: ["image/avif", "image/webp"]` in `next.config`.[^13]
- **External sources:** images on another domain have to be allowed with `remotePatterns`. Since Next.js 16 the quality values are also limited by a `qualities` list, `[75]` by default.[^13]

## Font format and hosting

One format is enough for a font: **WOFF2**. It compresses about 30% better than WOFF and has wide browser support.[^14][^15] Around 65% of font requests on the web are WOFF2 today.[^16]

Serving a font from your own domain (self-hosting) is faster than downloading it from a third-party server in most cases, because no extra connection is made.[^15] Around 72% of sites serve at least one font from their own domain.[^16]

`preload` can be used to get a critical font downloaded early. Because fonts are downloaded with CORS, `crossorigin` is required; preloading every font, on the other hand, steals bandwidth from the other critical files.[^15]

```html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
```

## font-display

What the text does until the font arrives is decided by `font-display` inside `@font-face`.[^15][^14]

| Value | Behaviour |
| :-- | :-- |
| `block` | The default. The text is invisible until the font arrives (at most 3 seconds in Chromium and Firefox) |
| `swap` | The text appears immediately in the fallback font and changes when the font arrives; a shift is possible |
| `fallback` | About 100ms of invisibility, then the fallback font; if the font does not arrive within about 3 seconds it is not used |
| `optional` | If the font does not arrive within about 100ms it is not used on that page at all; there is no shift |

`swap` is the value that shows the text fastest, and it is used on around half of all pages.[^14][^16] If you want to prevent layout shift entirely, `optional` is the safest option, at the cost of the font possibly not appearing on the first visit.[^7][^14]

## Subsets and variable fonts

- **A subset** takes the characters (glyphs) you do not use out of the font, and shrinks the file considerably. If you tell the browser which characters the font covers with `unicode-range`, the file is only downloaded when one of those characters appears on the page.[^14] The median font file is around 35 KB compressed; the largest 10% exceed 100 KB, and files that were never subset are among the reasons.[^16]
- **A variable font** carries every weight in a single file instead of separate files for light, regular and bold.[^14] 39% of desktop sites and 41% of mobile sites use at least one variable font.[^16] The single file can be larger than one static file; if you do not use many weights, the gain is small.[^14]

## The fallback font and layout shift

When the font changes the page shifts, because the web font and the fallback font take up a different width and height for the same text.[^14] The fix is to make the fallback font resemble the web font: the `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override` descriptors adjust the fallback font's metrics.[^7]

In Next.js you do not have to do this by hand: `next/font` works the fallback font out for you.[^17]

## next/font

`next/font` downloads the fonts, Google Fonts included, at build time and serves them from your own domain; the browser never makes a request to Google.[^17] Its defaults are set for performance: `display: "swap"`, `preload: true` and an automatically computed fallback font to reduce CLS (`adjustFontFallback`).[^17]

```tsx
// app/layout.tsx
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
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

- Next.js recommends using a variable font; with a non-variable font, `weight` is required.[^17]
- `subsets` decides which character set is preloaded; leave it empty while preload is on and you get a warning. Check which subsets your font has on its Google Fonts page.[^17]
- For your own font file, `next/font/local` and `src: "./fonts/brand.woff2"` are used.[^17]

> [!TIP]
>
> If your content has accented or special characters *(`é`, `ñ`, `ø`, `ł`)*, check from the subset list on the font's Google Fonts page, and with real text, that the subset you picked contains them.[^17]

## Going deeper

- **Full course:** the image and font chapters of web.dev's free Learn Performance course.[^4][^15]
- **Data:** the Fonts chapter of Web Almanac 2025; the formats, the hosting, `font-display` and variable font usage.[^16]
- **Talk:** Paul Calvano's talk on the common performance mistakes in the HTTP Archive data (Lazy Load '22), lazy-loading first-screen images among them.[^18]
- **Talk:** Andrea Verlicchi's talk on automating responsive images (Lazy Load '22).[^19]
- **Article:** Addy Osmani's `fetchpriority` tip; short examples for the LCP image and for the scripts whose priority should be lowered.[^20]

## Sources

1. [HTTP Archive: Web Almanac 2025, Performance](https://almanac.httparchive.org/en/2025/performance) *(research)* — The LCP element types and formats, lazy-loaded LCP images, `fetchpriority` and the share of images with no size.
2. [MDN: Image file type and format guide](https://developer.mozilla.org/docs/Web/Media/Guides/Formats/Image_types) *(doc)* — The compression ratios and browser support of AVIF, WebP, JPEG, PNG and SVG, and when to pick which.
3. [MDN: `<picture>`](https://developer.mozilla.org/docs/Web/HTML/Element/picture) *(doc)* — Picking a format with `<source type>`, and falling back to `<img>`.
4. [web.dev: Image performance](https://web.dev/learn/performance/image-performance?hl=en) *(doc)* — The formats, compression, the `srcset` density and width descriptors, `sizes` and lazy loading.
5. [Ire Aderinokun: Responsive Images, The srcset and sizes Attributes](https://bitsofco.de/the-srcset-and-sizes-attributes/) *(article)* — How the `w` descriptors and `sizes` work together.
6. [Andrea Verlicchi: How to cap image fidelity to 2x](https://www.andreaverlicchi.eu/en/blog/capping-image-fidelity-2x-minimize-loading-time/) *(article)* — A 45% saving from capping images at 2x on high-density phones.
7. [web.dev: Optimize Cumulative Layout Shift](https://web.dev/optimize-cls/) *(doc)* — Giving images a size, `aspect-ratio`, why fonts cause shifts, and `size-adjust`.
8. [web.dev: Browser-level image lazy loading](https://web.dev/articles/lazy-loading-images) *(doc)* — The `loading` values, the browser support and the warning against making first-screen images lazy.
9. [web.dev: The performance effects of too much lazy loading](https://web.dev/articles/lcp-lazy-loading?authuser=8) *(research)* — Felix Arntz and Rick Viscomi. The effect of lazy loading on LCP, with WordPress data and a test.
10. [web.dev: Optimize resource loading with the Fetch Priority API](https://web.dev/fetch-priority?hl=nl) *(doc)* — The `fetchpriority` values, its use on the LCP image and the Google Flights example.
11. [Adrian Bece: Boost Resource Loading With fetchpriority (Smashing Magazine)](https://www.smashingmagazine.com/2022/04/boost-resource-loading-new-priority-hint-fetchpriority/) *(article)* — The carousel example, using it together with lazy loading, and the warning to use it sparingly.
12. [Chrome for Developers: LCP request discovery](https://developer.chrome.com/docs/performance/insights/lcp-discovery) *(doc)* — The three conditions the DevTools insight checks for the LCP image.
13. [Next.js: Image Component](https://nextjs.org/docs/app/api-reference/components/image) *(doc)* — The `next/image` props, `sizes`, `preload`, `priority` being deprecated in Next.js 16, `formats` and `qualities`.
14. [web.dev: Best practices for fonts](https://web.dev/articles/font-best-practices) *(doc)* — The pros and cons of the `font-display` values, WOFF2, subsets, `unicode-range`, variable fonts and the fallback font.
15. [web.dev: Optimize web fonts](https://web.dev/learn/performance/optimize-web-fonts) *(doc)* — Preconnect, preload, self-hosting, WOFF2, `font-display` and subsets.
16. [HTTP Archive: Web Almanac 2025, Fonts](https://almanac.httparchive.org/en/2025/fonts) *(research)* — The WOFF2 share, self-hosting, `font-display: swap`, preload and the variable font usage rates.
17. [Next.js: Font Module](https://nextjs.org/docs/app/api-reference/components/font) *(doc)* — The `next/font` options, the defaults, subsets, a local font and using it with Tailwind.
18. [Paul Calvano: Performance Mistakes, an HTTP Archive deep dive (Lazy Load '22)](https://conffab.com/presentation/performance-mistakes-an-http-archive-deep-dive/) *(video)* — Lazy-loaded LCP images, a missing `crossorigin` and unused preloads.
19. [Andrea Verlicchi: Get speedy with responsive images automation (Lazy Load '22)](https://new-openai.conffab.com/presentations/get-speedy-with-responsive-images-automation) *(video)* — Responsive image practices and an open-source tool that automates them.
20. [Addy Osmani: Use fetchpriority=high to load your LCP hero image sooner](https://addyosmani.com/blog/fetch-priority/) *(article)* — Giving the LCP image a high priority and unimportant scripts a low one.
