---
title: "Accessibility testing"
description: "Automated scanning and manual checking with a screen reader."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/accessibility-testing"
---

## What accessibility testing is

Accessibility testing is checking that a page can be used in different ways: with the keyboard, with a screen reader, with magnification. It has two layers: **automated scanning** (a tool running rules over the DOM) and **manual checking** (actually using the page with the keyboard and a screen reader). The two do not replace each other; they complement each other.

## What automated tools catch

Automated tools quickly find the problems that are visible in the code, such as a missing `alt`, an unlabelled form field, low contrast or invalid ARIA. But they cannot answer the questions that need context, such as "Does this `alt` text describe the image correctly?" or "Is the focus order sensible?" The figures vary with the method of measurement:

| Study | The finding |
| :-- | :-- |
| Deque, 2021 (more than 2,000 audits) | On average 57% of the issues were found by automated testing. The figure was calculated by the **number** of issues, and the frequently occurring error types push it up.[^1] |
| GOV.UK, 2017 (143 faulty test pages) | The best tool found 41% of the errors; 42 errors (29%) were found by none of the 10 tools.[^2] |
| Adrian Roselli, 2023 (a single page, WCAG 2.1 AA) | A manual review found 37 errors; axe found 2, and the best free tool 5.[^3] |

In WebAIM's 2026 scan, 95.9% of a million home pages had an automatically detected WCAG error. The report also reminds you of this: finding no errors does not mean the page is accessible.[^4]

> [!WARNING]
>
> A clean scan report does not mean "accessible". Automated testing is the starting point for manual checking.

## axe-core

**axe-core** is Deque's open-source accessibility rule engine. It covers the A, AA and AAA rules of WCAG 2.0, 2.1 and 2.2, and aims for zero false positives: if it reports something as an error, it really is one.[^5] The Playwright integration, the browser extensions and many other tools use this engine.

The basic use is a single function: `axe.run()` returns a Promise, and if the `violations` array in the result is empty, no automatically detectable error was found.[^5]

## Scanning a component with Vitest

To scan the rendered DOM with axe in component tests, you do not need an extra matcher package; you can call axe-core directly. The Vitest and React Testing Library setup is covered in the [Vitest track](/academy/vitest/setup).

```command
npm install -D axe-core
```

```tsx
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { expect, test } from 'vitest'
import { SignupForm } from './SignupForm'

test('SignupForm has no automatically detectable a11y issues', async () => {
  const { container } = render(<SignupForm />)
  const results = await axe.run(container)
  expect(results.violations).toEqual([])
})
```

There are two limits you should know about. axe-core's JSDOM support is limited, and the `color-contrast` rule does not work in JSDOM; test the contrast in a real browser (with Playwright).[^5][^6] If the component renders through a portal, scan `baseElement` instead of `container`.[^6]

> [!TIP]
>
> If you want a matcher such as `toHaveNoViolations()`, `vitest-axe` is jest-axe forked for Vitest and uses the same API.[^7] But the package's last release came out in 2022; look at how well it is maintained before adding it.[^7]

## Scanning a page with Playwright

To scan a whole page in a real browser, `AxeBuilder` from the `@axe-core/playwright` package is used.[^8] The Playwright setup is covered in the [Playwright track](/academy/playwright). Running it in CI together with keyboard navigation, aria snapshots and visual tests is in the [Accessibility and visual tests](/academy/playwright/accessibility-and-visual-tests) lesson.

```command
npm install -D @axe-core/playwright
```

```tsx
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('no automatically detectable a11y issues on the home page', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
```

`withTags` limits the scan to particular WCAG levels; some axe rules are "best practice" rules with no WCAG equivalent.[^8] To scan one section of the page, `.include('#menu')` is used, and to leave a known problem out temporarily, `.exclude()` or `.disableRules(['duplicate-id'])`. Before scanning a section that only appears through interaction, such as a dropdown menu, wait for that section to appear.[^8]

> [!DO]
>
> - Open states such as a menu or a modal and scan them like that; an error in a closed menu does not show up in the scan.

> [!DONT]
>
> - Do not hide problems permanently with `exclude`; all the children of the selected element are left out of the scan too.[^8]

## eslint-plugin-jsx-a11y

**eslint-plugin-jsx-a11y** examines JSX statically, without running the code, and shows the errors in the editor as you write. Because it only looks at static code, it has to be complemented by a tool that tests the running DOM, and by testing with assistive technology.[^9]

```js
// eslint.config.js
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  jsxA11y.flatConfigs.recommended,
  // add the files and globals settings in a separate object
]
```

The shared config does not set `files` or globals, so you add those yourself.[^9] Next.js's `eslint-config-next` package brings in the React, React Hooks and Next.js rule sets; if you have already installed a plugin such as `jsx-a11y`, using `@next/eslint-plugin-next` directly is recommended to avoid a conflict.[^10]

## The limit of the Lighthouse score

The Lighthouse accessibility score is a weighted average of the automated audits. The weights are given according to axe's user impact assessment, and every audit either passes or fails. The audits that have to be done manually never enter the score at all.[^11] You saw how to run Lighthouse in the [Measuring](/academy/performance-accessibility/measuring) lesson.

Manuel Matuzović built a page that hides its content from a screen reader, removes the focus ring and disables the mouse, and still scores 100 in Lighthouse. His conclusion: automated testing is only the first step.[^12]

## Manual checking: a keyboard tour

Put the mouse aside and use the page with the keyboard only:[^13]

- Go forward with `Tab` and back with `Shift+Tab`. Can you reach all the links, buttons, form fields and media controls?
- Can you leave every element you enter with `Tab` (is there no keyboard trap)?
- Does the focus move in a sensible reading order?
- Is the focused element always clearly visible?

On macOS you may first have to turn on keyboard navigation to all controls in the system settings.[^13] How to fix what these checks turn up is in the [Keyboard and focus management](/academy/performance-accessibility/keyboard-and-focus) lesson.

## DevTools accessibility tree

What a screen reader reads is not the DOM but the accessibility tree the browser produces (remember the HTML lesson). To see it in Chrome DevTools:[^14]

1. Select an element in the **Elements** panel.
2. Open the **Accessibility** tab (under "More Tabs" if it is not visible).
3. Turn the "Show accessibility tree" option on; the DOM tree is replaced by the whole page's accessibility tree.

When you select a node, the properties the browser computed appear under **Computed Properties**. The **Source Order Viewer** in the same tab shows the elements' source order with numbers.[^14]

## A first step with a screen reader

A screen reader is like a skill: it improves with practice. A few shortcuts are enough to start.

**VoiceOver** (built into macOS, works best with Safari):[^15]

| Action | Shortcut |
| :-- | :-- |
| Turn it on / off | `Cmd+F5` |
| The VO key | `Control+Option` |
| Next item | `VO+Right arrow` |
| The rotor (the list of headings, links, landmarks) | `VO+U` |
| Next heading | `VO+Cmd+H` |
| Stop the speech | `Control` |

**NVDA** (free, for Windows):[^16]

| Action | Shortcut |
| :-- | :-- |
| Start it | `Ctrl+Alt+N` |
| Stop the speech | `Ctrl` |
| Next line | `Down arrow` |
| Next heading / landmark | `H` / `D` |
| The elements list | `NVDA+F7` |
| Switch between browse and focus mode | `NVDA+Space` |

You can pick Caps Lock as the NVDA key during the installation.[^16]

> [!TIP]
>
> On the first tour, look at three things only: do the page's headings form a meaningful list through the rotor or `H`, are the buttons and links read out with their names, and are the form fields announced with their labels?

## Going deeper

- **Talk:** Manuel Matuzović, "Building the most inaccessible site possible with a perfect Lighthouse score" (Access All Areas 21).[^17]
- **A first manual review:** W3C's Easy Checks guide, the checks that need no tools.[^13]
- **Comparing the tools:** Adrian Roselli's article comparing a manual review with four free tools.[^3]
- **A screen reader guide:** WebAIM's VoiceOver article, with more shortcuts, iOS included.[^15]

## Sources

1. [Deque: Automated Testing Study Identifies 57 Percent of Digital Accessibility Issues](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues) *(research)* — The automated testing coverage based on more than 2,000 audits, calculated by the number of issues.
2. [GOV.UK Accessibility Blog: What we found when we tested tools on the world's least-accessible webpage](https://accessibility.blog.gov.uk/2017/02/24/what-we-found-) *(research)* — How much of a page with 143 errors 10 automated tools found.
3. [Adrian Roselli: Comparing Manual and Free Automated WCAG Reviews](https://adrianroselli.com/2023/01/comparing-manual-and-free-automated-wcag-reviews.html) *(article)* — A manual review compared with axe, ARC, WAVE and Equal Access on the same page.
4. [WebAIM Million 2026](https://webaim.org/projects/million/) *(research)* — The automatically detected errors on a million home pages, and the limit of an automated tool.
5. [dequelabs/axe-core](https://github.com/dequelabs/axe-core) *(repo)* — The WCAG versions axe-core covers, using `axe.run`, and the JSDOM limits.
6. [jest-axe README](https://cdn.jsdelivr.net/npm/jest-axe@10.0.0/README.md) *(repo)* — Using axe with React Testing Library, and the notes on contrast in JSDOM and on portals.
7. [npm: vitest-axe](https://www.npmjs.com/package/vitest-axe) *(doc)* — jest-axe forked for Vitest, the matcher setup and the release history.
8. [Playwright: Accessibility testing](https://playwright.dev/docs/accessibility-testing) *(doc)* — `AxeBuilder`, `withTags`, `include`/`exclude` and the limits of automated testing.
9. [jsx-eslint/eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) *(repo)* — The rules that examine JSX statically, and using flat config.
10. [Next.js: ESLint Plugin](https://nextjs.org/docs/app/api-reference/config/eslint) *(doc)* — What `eslint-config-next` contains, and avoiding a conflict with other plugins.
11. [Chrome for Developers: Lighthouse accessibility score](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) *(doc)* — The accessibility score being calculated as a weighted average.
12. [Manuel Matuzović: Building the most inaccessible site possible with a perfect Lighthouse score](https://www.matuzo.at/blog/building-the-most-inaccessible-site-possible-with-a-perfect-lighthouse-score/) *(article)* — A page that scores 100 but cannot be used, and the tricks used.
13. [W3C WAI: Easy Checks, A First Review of Web Accessibility](https://w3c.github.io/wai-website/test-evaluate/preliminary/) *(doc)* — The first checks with no tools, keyboard access and visible focus included.
14. [Chrome for Developers: Accessibility features reference](https://developer.chrome.com/docs/devtools/accessibility/reference?hl=en) *(doc)* — The Accessibility tab, the full-page accessibility tree and the Source Order Viewer.
15. [WebAIM: Using VoiceOver to Evaluate Web Accessibility](https://webaim.org/articles/voiceover/) *(article)* — Turning VoiceOver on, the VO keys, the rotor and the basic navigation shortcuts.
16. [WebAIM: Using NVDA to Evaluate Web Accessibility](https://webaim.org/articles/nvda/) *(article)* — Installing NVDA, browse/focus mode and the basic shortcuts.
17. [Manuel Matuzović: Building the most inaccessible site possible with a perfect Lighthouse score (Access All Areas 21)](https://conffab.com/presentation/building-the-most-inaccessible-site-possible-with-a-perfect-lighthouse-score/) *(video)* — A talk showing why a perfect automated score is not enough.
