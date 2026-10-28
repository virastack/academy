---
title: "Core Web Vitals"
description: "What LCP, INP and CLS mean."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/core-web-vitals"
---

## What Core Web Vitals are

**Core Web Vitals** are the three user experience metrics Google recommends measuring for every web page. Each one measures a different side of the experience, and each can be collected from real users:[^1]

| Metric | What it measures | Good |
| :-- | :-- | :-- |
| **Largest Contentful Paint (LCP)** | Loading: when the main content appeared | 2.5 s or less |
| **Interaction to Next Paint (INP)** | Interaction: how fast the page responded to a tap | 200 ms or less |
| **Cumulative Layout Shift (CLS)** | Visual stability: did the content shift unexpectedly | 0.1 or less |

In short, they answer three questions: did the page open quickly, did it react as soon as it was touched, did it move around while you were reading?

## The thresholds and the 75th percentile

Every metric has three bands: **good**, **needs improvement** and **poor**.[^2]

| Metric | Good | Needs improvement | Poor |
| :-- | :-- | :-- | :-- |
| LCP | ≤ 2500 ms | 2500-4000 ms | > 4000 ms |
| INP | ≤ 200 ms | 200-500 ms | > 500 ms |
| CLS | ≤ 0.1 | 0.1-0.25 | > 0.25 |

The assessment is not made on a single visit. A page counts as "good" on a metric if it meets the threshold at the **75th percentile** of its visits; that is, at least three out of every four visits have to stay under the target. The 75th percentile represents most of the visits while stopping a few extreme measurements from spoiling the result.[^2] Mobile and desktop are assessed separately but the thresholds are the same; because mobile devices are more limited, the thresholds were largely set by what mobile can achieve.[^2] A page that is "good" on all three metrics passes Core Web Vitals.[^1]

## LCP: when the main content appeared

**LCP** is the time from the moment the user starts navigating to the page until the largest piece of content visible on screen is painted.[^3] The elements that can be candidates are:[^3]

- `<img>` and `<image>` inside an SVG
- `<video>` (the poster image or the first frame)
- A background image given with `url()` in CSS (a gradient does not count)
- Block elements containing text (a heading, a paragraph)

The browser stops reporting new LCP candidates once the user clicks, scrolls or presses a key.[^3]

**The typical causes:** a slow server response (TTFB), render-blocking CSS and JavaScript, an LCP image discovered late or lazy-loaded, and fonts that load late.[^3][^4] We cover the image and font side in the [Images and fonts](/academy/performance-accessibility/images-and-fonts) lesson.

## INP: how fast the page responded

**INP** watches the latency of the clicks, taps and key presses made throughout a visit, and reports a single value that nearly all of them stay under. Hovering, scrolling and zooming do not count.[^5] On most pages the slowest interaction is reported; on highly interactive pages the worst one out of every 50 interactions is ignored.[^5]

An interaction's duration has three parts:[^5]

1. **Input delay:** the wait until the event handlers start running.
2. **Processing duration:** how long handlers such as `onClick` run.
3. **Presentation delay:** painting the next frame to the screen after the handlers finish.

INP replaced **First Input Delay (FID)** on March 12, 2024.[^6] FID only looked at the waiting time of the first interaction; INP measures every interaction, until the painting is done.[^5] So if you see FID in an older article, know that it is no longer a Core Web Vital.

**The typical causes:** tasks that keep the main thread busy for a long time (over 50 ms), more JavaScript than necessary, a large DOM and unnecessary re-renders in React.[^4][^7] We look at those in the [Render performance in React](/academy/performance-accessibility/render-performance) and [Bundle size](/academy/performance-accessibility/bundle-size) lessons.

## CLS: did the page move

**CLS** measures the visible content shifting unexpectedly. The text moving down while you read it, or the button changing place just as you tap it, are examples.[^8]

Every shift is scored by how much of the screen it affected and how far the element travelled. Shifts close together (less than 1 second apart, at most 5 seconds in total) form a group; CLS is the worst group's score, not the total accumulated over the page.[^8] Shifts within 500 ms of a user's click are considered expected and do not count; content being pushed down when you open a menu is not a problem.[^8]

**The typical causes:** images and videos with no `width`/`height`, ads and embeds that change size later, banners added on top of existing content, and web fonts painted at a different size from the fallback font.[^8][^4] Most of the fixes are in the [Images and fonts](/academy/performance-accessibility/images-and-fonts) lesson.

```tsx
// An image with no known size pushes everything below it once it loads
<img src="/cover.jpg" alt="Cover" />

// The browser reserves the space up front, so there is no shift
<img src="/cover.jpg" alt="Cover" width={1200} height={630} />
```

## The supporting metrics

**Time to First Byte (TTFB)** and **First Contentful Paint (FCP)** are not Core Web Vitals; they are used to diagnose LCP problems such as a slow server or render-blocking resources. **Total Blocking Time (TBT)**, meanwhile, is a lab metric looked at in place of INP in a test environment where there is no user interaction.[^1]

## Field and lab data

**Field data** is collected from real users, on their own devices, networks and locations; Google's public data set, the **Chrome User Experience Report (CrUX)**, is an example. **Lab data**, on the other hand, is obtained by loading the page in a controlled environment with fixed device and network settings, and gives repeatable results for debugging. The two often differ: in a test the cache is empty, the user does not click or scroll, and the LCP element can change with the screen size. So when you have both, the field data takes priority; the lab data helps you find the problem while developing.[^9] We cover where to read these measurements in the [Measuring](/academy/performance-accessibility/measuring) lesson.

> [!WARNING]
>
> INP needs a real user interaction, so an automated lab test cannot measure INP.[^1] Do not assume that a good lab result means the field INP is good too.

As of December 2025, LCP and INP are supported in all the major browsers; CLS can still only be measured in Chromium-based browsers. CrUX also only collects data from Chrome users.[^10]

## Why it matters

The real reason is the user: a user who gets bored of a slow or unstable page may move to another site.[^11] Farfetch, for example, reported that for every 100 ms LCP went over 2.5 seconds, the conversion rate dropped by about 1.3%.[^12]

On the search side, Google says Core Web Vitals are used in its ranking systems. But the same page also says a good score does not guarantee the top spot, and that Google tries to show the most relevant content even when the page experience is weak.[^13] So Core Web Vitals are not an SEO shortcut; content relevance always comes first.

> [!TIP]
>
> According to the 2025 data, only 48% of sites pass all three metrics on mobile, and 56% on desktop. The weakest link on mobile is LCP: 62% of sites are in the good band.[^14] Being "good" still means being above average.

## Going deeper

- **Official introduction:** web.dev's Web Vitals page; the metrics' lifecycle, the supporting metrics and a list of tools.[^1]
- **Why the 75th percentile:** the article explaining how and why the thresholds were set.[^2]
- **Talk:** Barry Pollard's 29-minute talk with the three most effective recommendations per metric (JSNation 2023).[^15]
- **Talk:** Andrea Verlicchi's talk on the INP bugs on real sites and their fixes (We Love Speed 2024).[^16]
- **Data:** the Web Almanac 2025 Performance chapter; where the metrics stand across the web.[^14]

## Sources

1. [web.dev: Web Vitals](https://web.dev/articles/vitals) *(doc)* — The definition of Core Web Vitals, the three metrics, the lifecycle, TTFB/FCP/TBT and the field and lab tools.
2. [web.dev: How the Core Web Vitals metrics thresholds were defined](https://web.dev/articles/defining-core-web-vitals-thresholds) *(doc)* — The good and poor thresholds, the reasoning behind the 75th percentile, and the same threshold for mobile and desktop.
3. [web.dev: Largest Contentful Paint (LCP)](https://web.dev/articles/lcp) *(doc)* — The definition of LCP, the candidate elements and when the measurement stops.
4. [web.dev: The most effective ways to improve Core Web Vitals](https://web.dev/articles/top-cwv) *(doc)* — The three most effective recommendations per metric, and the common causes.
5. [web.dev: Interaction to Next Paint (INP)](https://web.dev/articles/inp) *(doc)* — Which interactions count, how the value is chosen, and the three phases of an interaction.
6. [web.dev: Advancing Interaction to Next Paint](https://web.dev/blog/inp-cwv) *(doc)* — The announcement that INP became a Core Web Vital in place of FID on March 12, 2024.
7. [Geoff Graham: Preparing For Interaction To Next Paint, A New Web Core Vital (Smashing Magazine)](https://smashingmagazine.com/2023/12/preparing-interaction-next-paint-web-core-vital) *(article)* — The difference between INP and FID, and the common causes of a bad INP.
8. [web.dev: Cumulative Layout Shift (CLS)](https://web.dev/articles/cls) *(doc)* — The shift score, the session windows, the expected shifts and the common causes.
9. [web.dev: Why lab and field data can be different](https://web.dev/articles/lab-and-field-data-differences) *(doc)* — The definition of lab and field data, why they differ and which one to prioritise.
10. [web.dev: LCP and INP are now Baseline Newly available](https://web.dev/blog/lcp-and-inp-are-now-baseline-newly-available) *(doc)* — LCP and INP arriving in all the major browsers in December 2025, and the state of CLS and CrUX.
11. [web.dev: Optimize Core Web Vitals for business decision makers](https://web.dev/articles/optimize-cwv-business) *(doc)* — The effect of user experience on engagement, conversion and customer loss.
12. [web.dev: Farfetch case study](https://web.dev/case-studies/farfetch) *(research)* — How the LCP and CLS improvements relate to conversion and bounce rate.
13. [Google Search Central: Understanding page experience in Google Search results](https://developers.google.com/search/docs/appearance/page-experience) *(doc)* — Where Core Web Vitals sit in ranking, and a good score not being a ranking guarantee.
14. [HTTP Archive: Web Almanac 2025, Performance](https://almanac.httparchive.org/en/2025/performance) *(research)* — The Core Web Vitals pass rates on mobile and desktop, with July 2025 CrUX data.
15. [Barry Pollard: Top Core Web Vitals Recommendations for 2023 (JSNation 2023)](https://gitnation.com/contents/top-core-web-vitals-recommendations-for-2023) *(video)* — 29 minutes. Three recommendations each for LCP, CLS and INP.
16. [Andrea Verlicchi: How I made the web more responsive (We Love Speed 2024)](https://andreaverlicchi.eu/en/blog/how-i-made-web-more-responsive-inp-video-we-love-speed-2024-nantes/) *(video)* — An introduction to INP, finding slow interactions and three common mistakes seen in the field.
