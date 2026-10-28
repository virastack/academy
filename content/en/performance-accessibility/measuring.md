---
title: "Measuring (Lighthouse, DevTools)"
description: "Reading a Lighthouse score and what to look at in DevTools."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/measuring"
---

## What measuring is

In the Core Web Vitals lesson you saw what LCP, INP and CLS mean. In this lesson we look at where to read those numbers. There are two kinds of data: **lab data** is produced in a controlled environment with one device, one network and usually an empty cache; **field data** is the distribution of real users' experiences on their different devices and networks, and is reported at the 75th percentile.[^1]

The two do not give the same number, and they are not expected to. Decide what to fix with the field data, and find out why with the lab data.[^1] Many people start with Lighthouse and lose time on low-value fixes; it is more productive to look first at which metric is bad on which page in the real user data.[^2]

| Tool | Kind of data | What it's for |
| :-- | :-- | :-- |
| Lighthouse | Lab | Simulating a page load to get a score and recommendations |
| PageSpeed Insights | Field (CrUX) + lab | Real user data and a remote Lighthouse report |
| The DevTools Performance panel | Lab (+ a CrUX comparison) | Finding the cause of the problem on a timeline |
| `web-vitals` / `useReportWebVitals` | Field (your own data) | Continuous measurement from your own users |

## Lighthouse

**Lighthouse** is a tool that audits a page and scores it in the Performance, Accessibility, Best Practices and SEO categories, and it comes with its own panel inside Chrome DevTools.[^3] As of 2026 the current major version is **Lighthouse 13**; released in October 2025, this version replaced many of the old performance audits with the shared audits of **Insights** in the DevTools Performance panel.[^4] The information in this lesson is written against v13.4.0, released in June 2026.[^5]

To run it in DevTools:[^3]

1. Open the page in an incognito window and switch to the **Lighthouse** panel in DevTools.
2. Pick the mode: **Navigation** loads the page from the start, **Timespan** records while you interact with the page, and **Snapshot** audits the page as it is right now.
3. Pick the device (mobile or desktop) and the categories, and start the audit.

> [!TIP]
>
> Even an incognito window does not completely remove the effect of browser extensions and stored data. Results taken on different computers cannot be compared directly either.[^3]

### How the score is calculated

The performance score is calculated not from the audits but from five metrics. Lighthouse 13 did not change the scoring; the weights have been the same since Lighthouse 10:[^6][^4]

| Metric | Weight |
| :-- | :-- |
| **Total Blocking Time (TBT)** | 30% |
| Largest Contentful Paint (LCP) | 25% |
| Cumulative Layout Shift (CLS) | 25% |
| First Contentful Paint (FCP) | 10% |
| Speed Index | 10% |

Every metric is turned into a score between 0 and 100 with a log-normal curve derived from real site data in the HTTP Archive. The colours: 0-49 red (poor), 50-89 orange (needs improvement), 90-100 green (good).[^6] INP is not in the list: a lab test cannot know when the user will interact with the page, so TBT is used for responsiveness. TBT can be good while INP is bad.[^1]

> [!WARNING]
>
> A Lighthouse score is not your site's Core Web Vitals assessment. The data Google Search uses in its page experience signal is the CrUX data coming from real users.[^7]

### Why the score changes every time

Seeing a different score when you audit the same page twice is normal. Most of the variability comes not from Lighthouse but from the environment: the A/B tests and ads on the page, the local network, the computer's hardware and the applications or extensions running at the same time.[^8] The Lighthouse team's advice is to look not at a single result but at the **median** of several runs; the median of 5 runs is about twice as stable as a single run. Do not run more than one Lighthouse at the same time on the same machine.[^8]

Lighthouse also takes a CPU measurement in every test, so the score comes out higher on a fast computer. PageSpeed Insights, on the other hand, loads the page on a fast connection while simulating a slow network, and runs on Google's servers rather than on your computer; those are the main reasons its score differs from the one in DevTools.[^9]

### Mobile and desktop

The mobile test simulates a mid-range mobile device on a mobile network; the desktop test emulates a desktop on a wired connection.[^10] Desktop has had its own score curve since Lighthouse v6, so do not compare the two scores with each other.[^6]

## PageSpeed Insights and CrUX

The **Chrome User Experience Report (CrUX)** is Google's public data set collecting Chrome users' real experience on popular sites. For a page or an origin to be in the list, it has to be publicly available and have a statistically significant number of visitors. The data is reached through PageSpeed Insights, the CrUX API, BigQuery and CrUX Vis.[^7]

**PageSpeed Insights (PSI)** (`pagespeed.web.dev`) shows two things together for a URL: the last 28 days of field data from CrUX at the top, and a remotely run Lighthouse report below.[^10]

- The values are at the 75th percentile; that is, they represent most users' experience.[^10]
- If there is not enough data for the page, PSI falls back to the whole site's (**origin**) data; if there is none for the origin either, no field data appears at all.[^10]

For a sense of scale: in 2025, 48% of sites had good Core Web Vitals values on mobile, and 56% on desktop.[^11]

## The DevTools performance panel

The moment the Performance panel is opened, without even recording, it shows the page's local **LCP** and **CLS** values live; as you interact with the page, **INP** is added too. Hover over a value and the metric's breakdown appears.[^12] For a detailed performance investigation, this panel is recommended over Lighthouse.[^3]

- **The LCP element:** the live metrics screen links to the LCP element; hover over it and it is highlighted on the page, click it and it opens in the Elements panel.[^13]
- **Interaction log:** the clicks and key presses you make while DevTools is open are listed with their type, target and latency.[^13]
- **Field data:** with **Field data > Set up** you can pull the CrUX data in and compare it with your local result; you can map `localhost` to your live domain.[^12]
- **Throttling:** your computer is much faster than your users'. Measure with CPU throttling (20x, say) and the network presets (Slow 4G, say); when the field data is connected, the panel suggests your users' most common device and network condition.[^12][^13]

To find the cause of a problem, record the page load with **Record load performance**.[^12] The **Insights** sidebar next to the recording gives Lighthouse-style recommendations. For example **LCP by phase** splits the LCP time into four sub-parts, and **LCP request discovery** shows how much earlier the LCP image could be loaded.[^14] How to fix these findings is the subject of the Images and fonts and Bundle size lessons.

## Measuring from real users

CrUX only covers Chrome users and sites with enough traffic, and it does not give a detailed breakdown either. Collecting data from your own users is called **Real User Monitoring (RUM)**.[^2]

### The web-vitals library

GoogleChrome's `web-vitals` library measures metrics such as LCP, INP and CLS in the real user's browser and hands them to a callback.[^15]

```command
npm install web-vitals
```

```tsx
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({ name: metric.name, value: metric.value, rating: metric.rating, id: metric.id });
  navigator.sendBeacon('/analytics', body);
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
```

`sendBeacon` is preferred because it can send the data even while the page is closing. If the user never interacts with the page, INP is not reported. To see which element caused the problem, use the `web-vitals/attribution` entry point; an `attribution` field is added to the metric, but the bundle grows a little.[^15]

### Next.js: `useReportWebVitals`

Next.js gives you the same metrics (TTFB, FCP, LCP, CLS, INP) through the `useReportWebVitals` hook in `next/web-vitals`. The hook has to run in a Client Component; keeping it in its own file and adding it to the root layout therefore limits the client boundary to that module.[^16]

```tsx
// app/_components/web-vitals.tsx
'use client';

import { useReportWebVitals } from 'next/web-vitals';

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const report: ReportWebVitalsCallback = (metric) => {
  navigator.sendBeacon('/analytics', JSON.stringify(metric));
};

export function WebVitals() {
  useReportWebVitals(report);
  return null;
}
```

```tsx
// app/layout.tsx
import { WebVitals } from './_components/web-vitals';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
```

> [!WARNING]
>
> Define the callback outside the component. If you pass a function that changes on every render, the same metric can be reported more than once.[^16]

The metric object carries fields such as `name`, `value`, `rating` (`good`, `needs-improvement`, `poor`), `id` and `navigationType`. When you send it to a tool such as Google Analytics, the `id` field lets you work out the distribution and the percentiles yourself.[^16]

## Going deeper

- **Talk:** Barry Pollard and Ewa Gasperowicz's talk at JSNation 2025 on the new Performance panel, the live metrics, the throttling setting and Insights (29 min).[^17]
- **Lab versus field:** Philip Walton's article going through why the two kinds of data diverge, for LCP, CLS and INP one by one.[^1]
- **Score variability:** the Lighthouse team's document listing the sources of variability and the recommended test environment.[^8]
- **PSI versus Lighthouse:** Matt Zeunert's article explaining the difference between simulated and real throttling.[^9]

## Sources

1. [web.dev: Why lab and field data can be different](https://web.dev/articles/lab-and-field-data-differences) *(doc)* — Philip Walton; why lab and field data differ for LCP, CLS and INP, and which one to prioritise.
2. [Sia Karamalegos: 14 web performance tips for 2025](https://sia.codes/posts/web-perf-tips-2025/) *(article)* — Starting with field data, the limits of CrUX, and moving to RUM.
3. [Chrome DevTools: Lighthouse](https://developer.chrome.com/docs/devtools/lighthouse) *(doc)* — Running the Lighthouse panel, the Navigation/Timespan/Snapshot modes and the settings.
4. [Chrome for Developers: Lighthouse 13](https://developer.chrome.com/blog/lighthouse-13-0?hl=es) *(doc)* — Barry Pollard and Connor Clark; the move to the Insights audits, and the scoring staying the same.
5. [GitHub: Lighthouse v13.4.0](https://github.com/GoogleChrome/lighthouse/releases/tag/v13.4.0) *(repo)* — The June 2026 release notes and its arrival in DevTools with Chrome 151.
6. [Chrome for Developers: How Lighthouse calculates your overall Performance score](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring) *(doc)* — The metric weights, the log-normal score curve, the colour ranges and the desktop scoring.
7. [Chrome for Developers: Overview of CrUX](https://developer.chrome.com/docs/crux) *(doc)* — What CrUX is, the eligibility conditions, the ways to access it and its use in Search.
8. [Lighthouse: Score Variability](https://github.com/GoogleChrome/lighthouse/blob/master/docs/variability.md) *(repo)* — The sources of score variability, using the median, and the test environment recommendations.
9. [DebugBear (Matt Zeunert): PageSpeed Insights vs. Lighthouse](https://www.debugbear.com/blog/why-is-my-lighthouse-score-different-from-pagespeed-insights) *(article)* — Why the DevTools and PSI scores differ because of throttling, the CPU and the location.
10. [Google: About PageSpeed Insights](https://developers.google.com/speed/docs/insights/v5/about) *(doc)* — Lab and field data, the 28-day CrUX window, the 75th percentile and falling back to the origin level.
11. [HTTP Archive Web Almanac 2025: Performance](https://almanac.httparchive.org/de/2025/performance) *(research)* — The share of sites with good Core Web Vitals on mobile and desktop in 2025.
12. [Chrome DevTools: Performance panel overview](https://developer.chrome.com/docs/devtools/performance/overview) *(doc)* — The live metrics, the throttling settings, recording, and connecting the field data.
13. [Chrome for Developers: Monitor your local and real-user Core Web Vitals performance in DevTools](https://developer.chrome.com/blog/devtools-realtime-cwv) *(doc)* — Rick Viscomi; the live metrics, the LCP element, the interaction log and the throttling recommendations.
14. [Chrome for Developers: Insights sidebar in the Performance panel](https://developer.chrome.com/blog/devtools-insights-sidebar?hl=nl) *(doc)* — Brendan Kenny; the Insights sidebar, LCP by phase and LCP request discovery.
15. [GitHub: GoogleChrome/web-vitals](https://github.com/GoogleChrome/web-vitals) *(repo)* — The installation, `onLCP`/`onINP`/`onCLS`, sending with `sendBeacon` and the attribution build.
16. [Next.js: useReportWebVitals](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals) *(doc)* — Using the hook in the App Router, the metric fields and sending the results to an external system.
17. [Barry Pollard and Ewa Gasperowicz: Supercharge Your Debugging With the New Features in Chrome DevTools (JSNation 2025)](https://gitnation.com/contents/supercharge-your-debugging-with-the-new-features-in-chrome-devtools) *(video)* — 29 minutes; the new Performance panel, the live metrics, the CrUX comparison and Insights.
