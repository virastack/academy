---
title: "Colour, contrast and motion"
description: "Readable colours, zooming and reduced motion."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/color-contrast-and-motion"
---

## What contrast is

A **contrast ratio** expresses the brightness difference between the colour of text (or of an interface part) and the colour behind it as a single number, such as `4.5:1`. The higher the ratio, the easier the text is to read for anyone with low visual acuity, a different colour perception, or a phone in the sunlight.

This is the most common accessibility error on the web: in 2026, low-contrast text was found on 83.9% of a million home pages, with an average of 34 separate instances per page.[^1]

## Text contrast (1.4.3)

WCAG 2.2's **1.4.3 Contrast (Minimum)** criterion (AA) sets two thresholds:[^2]

| What | Minimum ratio |
| :-- | :-- |
| Normal text | 4.5:1 |
| Large text: 18pt (about 24px), or 14pt bold (about 18.5px) | 3:1 |

- **No rounding:** a colour pair that comes out at 4.499:1 does not meet 4.5:1.[^2]
- **The exceptions:** the text of an inactive component, purely decorative text and the text inside a logo are not subject to this rule.[^2]
- **Why 4.5:** the 3:1 recommended for standard text was raised to 4.5:1 to compensate for the contrast sensitivity that decreases with age and mild vision loss.[^2]

## Non-text contrast (1.4.11)

**1.4.11 Non-text Contrast** (AA) asks that visuals which are not text but carry meaning be at least **3:1** against the adjacent colour:[^3]

- A visual that identifies a component: an input's border, a checkbox's outline.
- A mark that shows a state: the selected tab, a checked box, the focus indicator.
- The meaningful parts of graphics: the slices of a pie chart, icons.

A checkbox with a `#9D9D9D` grey border on a white background fails this criterion at 2.7:1. Inactive components and the browser's unmodified default appearance are exceptions.[^3] The focus indicator's details are in the Keyboard and focus lesson.

## Checking in DevTools

Chrome DevTools shows the contrast in several places:[^4]

1. **The inspect tooltip:** hover over some text in the Elements panel and the ratio appears; if it is insufficient, a warning icon shows up.
2. **The Color Picker:** click the square next to the `color` value in Styles and open the **Contrast ratio** section. It shows whether it passes AA and AAA, and which shades are sufficient through the lines in the colour field; **Use suggested color** picks a suitable colour for you.
3. **CSS Overview:** it collects the contrast problems across the whole page in one list (Colors > Contrast issues).

> [!TIP]
>
> If the background colour is not defined (text over an image or a gradient), the ratio may not appear; pick the background from the page with the eyedropper. Force the hover and focus states with the `:hov` button in the Styles panel and check them separately.[^5]

The **vision deficiency emulation** in the Rendering tab lets you see the page with blurred vision or a different colour perception.[^6] The automated scanning tools are in the Accessibility testing lesson.

## Don't convey information by colour alone (1.4.1)

**1.4.1 Use of Color** (A) asks that colour is not the **only** visual way of conveying information. For someone who cannot tell red from green, "the red fields are required" carries no meaning.[^7]

```tsx
// Bad: the error is only shown by a red border
<input className="border-red-600" />

// Good: colour + icon + text
<input id="email" aria-describedby="email-error" className="border-red-600" />
<p id="email-error" className="text-red-700">
  <AlertIcon aria-hidden="true" /> Enter a valid email address.
</p>
```

The same rule applies to links within text: the link colour has to differ from the surrounding text by at least 3:1, and if the difference relies on perceiving a particular colour, an extra visual cue such as an underline is required.[^7]

> [!DONT]
>
> - Do not distinguish chart series, form errors or states (active/inactive) by colour alone.

> [!DO]
>
> - Use text, an icon, a pattern or an underline in addition to the colour.[^7]

## About APCA

The **APCA** algorithm, which aims to measure contrast more realistically, was in the WCAG 3 draft for a while but was removed in 2023; which algorithm WCAG 3 will use is still unclear and the standard is expected in 2030 at the earliest, so what holds today is the WCAG 2 ratios.[^8]

## Text enlargement and reflow

Users enlarge the text or zoom the page. Two criteria ask that this keeps working without breaking:

- **1.4.4 Resize Text (AA):** no content or function may be lost when the text is enlarged up to **200%** without assistive technology; text that is clipped or overlaps breaks this criterion.[^9]
- **1.4.10 Reflow (AA):** the content has to be readable at **320 CSS px** wide without horizontal scrolling. That is the equivalent of 400% zoom on a 1280px-wide screen. Content that needs a two-dimensional layout, such as a map, a data table or a video, is an exception.[^10]

In practice: give the font sizes in `rem` as you saw in the CSS lesson, do not lock a text box with a fixed `height`, and build the layout responsively. To test, zoom to 400% in the browser or reduce the width to 320px in DevTools.

## Target size (2.5.8)

**2.5.8 Target Size (Minimum)** (AA), which arrived with WCAG 2.2, asks that clicked or tapped targets be at least **24x24 CSS px**.[^11][^12]

```css
.icon-button {
  min-width: 24px;
  min-height: 24px;
}
```

If the target is smaller, it is also enough to leave sufficient space that a 24px-diameter circle drawn at its centre does not touch the neighbouring targets. Links within a sentence, an alternative of sufficient size doing the same job, and the browser's unmodified controls are exceptions. For the important buttons, the stricter 2.5.5 Target Size (Enhanced) can be aimed at.[^11]

## Reduced motion

Large zooms, spinning elements and **parallax** in particular can trigger dizziness and nausea in people with a vestibular disorder.[^13][^14] Operating systems offer a "reduce motion" setting for this (Animation Effects on Windows, Reduce Motion on macOS and iOS, Remove animations on Android). The browser passes that preference to the page with the **`prefers-reduced-motion`** media query; it has been supported in all browsers since 2020.[^13]

The operating system does not turn web animations off by itself; honouring the preference is the developer's job.[^15] The recommended approach is **no-motion-first**: do not write the animation by default, and add it only when the user has not stated a preference.[^15][^16]

```css
.card {
  opacity: 1;
}

@media (prefers-reduced-motion: no-preference) {
  .card {
    transition: transform 300ms ease;
  }
  .card:hover {
    transform: translateY(-4px);
  }
}
```

"Reduced" does not mean no motion at all. Turning a large slide or zoom into a **crossfade**, and removing the parallax while keeping the content, is enough; small colour and opacity changes usually cause no problem.[^14] Do not delete feedback such as hover entirely either, just take the motion out of it.[^16]

As you may remember from the Tailwind lesson, the same thing is done with variants: `motion-safe:` applies only when the user has not reduced motion, and `motion-reduce:` only when they have.[^17]

```html
<button class="motion-safe:transition motion-safe:hover:-translate-y-0.5">
  Save
</button>
```

In animations driven by JavaScript (React Spring, Framer Motion, GSAP) you read the preference with `window.matchMedia`. The hook below is adapted and shortened from Josh Comeau's example; because the preference is unknown on the server, the initial value assumes "motion reduced":[^18]

```tsx
"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: no-preference)";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setReduced(!mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(!e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
```

To test without changing the setting, you can open the Command Palette in DevTools and pick the `prefers-reduced-motion: reduce` emulation.[^15] On pages with a lot of motion, offering the user a "stop the animations" control within the page is recommended too.[^14]

## Forced colors

In **forced colors** mode, such as the high contrast themes on Windows, the browser replaces your colours with a limited palette the user picked, and removes `box-shadow`. A button that only stands out through its shadow can become invisible in that mode; adding a border with a system colour such as `ButtonText` inside `@media (forced-colors: active)` is enough. Do not turn this mode into a separate design, just fix what breaks.[^19] Its equivalent in Tailwind is the `forced-colors:` variant.[^17]

## Going deeper

- **Talk:** Val Head's talk on designing safe animation for motion sensitivities (Web Directions Code 2020, watchable on Conffab with a free account).[^20]
- **Article:** Val Head's Smashing article explaining with examples which motion is a trigger and what to put in its place.[^14]
- **Animation in React:** Josh Comeau's `prefers-reduced-motion` article; an example with React Spring and an SSR note.[^15]
- **The future of contrast:** Adrian Roselli's article summarising the state of WCAG 3 and APCA as of April 2026.[^8]
- **What changed in WCAG 2.2:** W3C's summary listing the new criteria.[^12]

## Sources

1. [WebAIM Million 2026](https://webaim.org/projects/million/) *(research)* — How widespread low-contrast text is on home pages, and the number of instances per page.
2. [W3C: Understanding SC 1.4.3 Contrast (Minimum)](https://w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) *(doc)* — The 4.5:1 and 3:1 thresholds, the definition of large text, the exceptions and the reasoning behind the ratio.
3. [W3C: Understanding SC 1.4.11 Non-text Contrast](https://w3.org/WAI/WCAG22/Understanding/non-text-contrast) *(doc)* — The 3:1 rule for interface components, states and graphics.
4. [Chrome for Developers: Make your website more readable](https://developer.chrome.com/docs/devtools/accessibility/contrast?hl=en) *(doc)* — Finding low contrast in DevTools and fixing it with the suggested colour.
5. [WebAIM: Using Chrome Developer Tools to check contrast](https://webaim.org/articles/contrast/devtools) *(article)* — The Color Picker steps, picking the background and testing the hover/focus states.
6. [Chrome for Developers: DevTools Tips: Discover and fix low contrast text](https://developer.chrome.com/blog/devtools-tips-5) *(doc)* — A short tip showing the contrast tools and the vision deficiency emulation.
7. [W3C: Understanding SC 1.4.1 Use of Color](https://w3.org/WAI/WCAG22/Understanding/use-of-color.html) *(doc)* — Not conveying information by colour alone, with link and form field examples.
8. [Adrian Roselli: WCAG3 Contrast as of April 2026](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html) *(article)* — APCA's status in the WCAG 3 draft and the recommendation for today.
9. [W3C: Understanding SC 1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text) *(doc)* — Text being enlargeable up to 200%, and the exceptions.
10. [W3C: Understanding SC 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow) *(doc)* — Reading at 320 CSS px wide without scrolling in two directions.
11. [W3C: Understanding SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) *(doc)* — The 24x24 CSS px target size, the spacing test and the exceptions.
12. [W3C WAI: What's New in WCAG 2.2](https://w3.org/WAI/standards-guidelines/wcag/new-in-22/) *(doc)* — The nine criteria added in WCAG 2.2 and the removed 4.1.1.
13. [MDN: prefers-reduced-motion](https://developer.mozilla.org/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) *(doc)* — The media query values, the operating system settings and the browser support.
14. [Val Head: Designing With Reduced Motion For Motion Sensitivities](https://www.smashingmagazine.com/2020/09/design-reduced-motion-sensitivities) *(article)* — The kinds of triggering motion, the crossfade alternative and a motion toggle.
15. [Josh W. Comeau: Accessible Animations in React with "prefers-reduced-motion"](https://joshwcomeau.com/react/prefers-reduced-motion/) *(article)* — The no-motion-first approach, the React hook and the emulation in DevTools.
16. [Michelle Barker: Respecting Users' Motion Preferences](https://smashingmagazine.com/2021/10/respecting-users-motion-preferences/) *(article)* — Reduced-motion-first CSS, `matchMedia` and keeping the feedback.
17. [Tailwind: Hover, focus, and other states](https://tailwindcss.com/docs/hover-focus-and-other-states) *(doc)* — The `motion-safe:`, `motion-reduce:` and `forced-colors:` variants.
18. [Josh W. Comeau: usePrefersReducedMotion](https://www.joshwcomeau.com/snippets/react-hooks/use-prefers-reduced-motion/) *(article)* — The code of the React hook that reads the motion preference, and an SSR note.
19. [MDN: forced-colors](https://developer.mozilla.org/docs/Web/CSS/@media/forced-colors) *(doc)* — The properties that change in forced colors mode, the system colours and the recommendations.
20. [Val Head: Prefers Reduced Motion: Designing Safer Animation for Motion Sensitivities (Code 2020)](https://conffab.com/presentation/prefers-reduced-motion-designing-safer-animation-for-motion-sensitivities/) *(video)* — Motion sensitivity, `prefers-reduced-motion` and safe animation alternatives.
