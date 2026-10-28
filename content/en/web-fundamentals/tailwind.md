---
title: "Tailwind"
description: "Styling and responsive layout with utility classes."
lastVerified: "2026-10-17"
translationKey: "web-fundamentals/tailwind"
---

## What Tailwind is

[!tailwind] is a CSS framework where you write styles by combining small single-purpose classes in your HTML, rather than naming classes in a separate CSS file. The approach is called **utility-first**.[^1]

```html
<div class="mx-auto flex max-w-sm items-center gap-4 rounded-xl bg-white p-6 shadow-lg">
  <p class="text-xl font-medium text-gray-900">Hello</p>
</div>
```

Each class maps to a single CSS rule: `flex` → `display: flex`, `p-6` → padding, `rounded-xl` → border-radius. This lesson builds on the CSS lesson. Tailwind is no substitute for knowing CSS; it only lets you write it faster.

Why it caught on:[^1]

- **Speed:** no naming a class, no going back and forth between the HTML and a CSS file. *(Before Tailwind, minutes went into deciding what to call an element. Writing the CSS was the easy part; settling on `.card-wrapper` or `.card-container` was not.)*
- **Safe changes:** adding or removing a class on an element affects that element and nothing else.
- **CSS that stops growing:** the stylesheet does not grow in step with every new feature.

At first glance it looks like inline styles, but the difference is large: the values come from a fixed design scale (`p-4`, `p-6`, not an arbitrary `13px`), and states that inline styles cannot express, `hover`, focus or a screen width, are supported.[^1][^2] For where the idea came from, read the article by Tailwind's creator [Adam Wathan](https://adamwathan.me/).[^3]

[!tailwind] is the most used CSS framework today: in the State of CSS 2025 survey, more than half of the roughly 4,000 people who answered the question said they use it.[^4]

## Setup

This lesson uses [!tailwind] v4 syntax. In v4 there is no `tailwind.config.js` file and no `content` setting; Tailwind scans the project's files and generates the CSS for the classes you used.[^5]

In a Next.js project:[^6]

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

In projects that use Vite the package is `@tailwindcss/vite`.[^7] To try it without installing anything, use the official online editor, Tailwind Play.[^8]

> [!WARNING]
>
> Most tutorials out there are still written against v3: lines such as `tailwind.config.js` or `@tailwind base;` are the old syntax. Some class names changed too (`shadow-sm` became `shadow-xs`). The differences are listed in the upgrade guide.[^9]

Tailwind's base styles (**Preflight**) reset the browser defaults: margins go to zero, `h1`–`h6` look like normal text, and lists lose their bullets.[^10] That is the answer to "why isn't my heading big?"; you set the size with a class.

## The basic classes

| What for | Example | CSS equivalent |
| :-- | :-- | :-- |
| Spacing | `p-4`, `px-6`, `mt-2`, `mx-auto` | `padding`, `margin` |
| Layout | `flex`, `items-center`, `gap-4`, `grid grid-cols-3` | `display`, alignment, `gap` |
| Size | `w-full`, `max-w-md`, `h-12` | `width`, `max-width`, `height` |
| Type | `text-lg`, `font-bold`, `leading-tight` | `font-size`, `font-weight`, `line-height` |
| Colour | `text-gray-900`, `bg-sky-500`, `bg-black/75` | `color`, `background-color`, opacity |
| Edges | `border`, `rounded-lg`, `shadow-md` | `border`, `border-radius`, `box-shadow` |

Colours come in eleven shades, from 50 (lightest) to 950 (darkest), and a suffix such as `/75` sets the opacity.[^11] When you need a one-off value that is not on the scale, use square brackets: `top-[117px]`, `bg-[#316ff6]`.[^12]

## States: hover, focus and the rest

Putting a **variant** in front of a class applies it only when that state is true.[^2]

```html
<button class="bg-sky-500 hover:bg-sky-700 focus:outline-2 disabled:opacity-50">
  Save
</button>
```

- **Pseudo-classes:** `hover:`, `focus:`, `active:`, `disabled:`, `first:`.[^13]
- **The parent's state:** give the parent `group` and the child changes with `group-hover:` when the pointer is over the parent.[^13]
- **Attributes:** variants such as `aria-expanded:` and `data-active:` hook into accessibility and state attributes.[^13]

Variants chain: `dark:md:hover:bg-fuchsia-600`.[^13]

## Responsive

Tailwind is **mobile-first**: a class with no prefix applies at every size, while a prefix such as `md:` means "at this width and above".[^14]

| Prefix | Applies from |
| :-- | :-- |
| `sm:` | 40rem (640px) |
| `md:` | 48rem (768px) |
| `lg:` | 64rem (1024px) |
| `xl:` | 80rem (1280px) |
| `2xl:` | 96rem (1536px) |

```html
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">...</div>
```

This list is one column on a phone, two on a tablet and three on a wide screen.

> [!DONT]
>
> - Do not write `sm:text-center` and expect it to centre on mobile; `sm:` does not mean "on small screens", it means "at 640px and above".

> [!DO]
>
> - Write the mobile style with no prefix and override it for the larger screen: `text-center sm:text-left`.[^14]

To change a component by the space it sits in rather than by the screen, there are **container queries**: the parent gets `@container` and the child classes such as `@md:flex-row`.[^14]

## Dark mode

The `dark:` variant follows the operating system's theme preference (`prefers-color-scheme`) by default.[^15]

```html
<div class="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">...</div>
```

If you want a button to switch the theme, bind the `dark:` variant to a class instead; the dark styles then take effect when `<html class="dark">`:[^15]

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

## Theme

Design values such as colours, fonts and breakpoints are defined inside CSS, in a `@theme` block. Every variable you add there generates new classes automatically.[^16]

```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.62 0.19 259);
  --font-display: "Inter", sans-serif;
}
```

The classes `bg-brand-500`, `text-brand-500` and `font-display` are now available. The variable's prefix (`--color-*`, `--font-*`, `--breakpoint-*`) decides which family of classes appears. Theme values remain ordinary CSS variables too, readable anywhere with `var(--color-brand-500)`. For variables you do not want to generate classes, use `:root` instead of `@theme`.[^16]

## Using it in React

### Solve repetition with a component

When you find yourself writing the same long list of classes in many places, the answer is usually not a new CSS class but a **component**: the styling lives in one place and stays the same everywhere.[^17] If the list is rendered in a loop, the classes are already written once.[^17] Moving classes into CSS with `@apply` is possible, but it is not the first thing to reach for.[^18]

### Don't build class names piece by piece

Tailwind scans your source files as plain text. It cannot see a class name assembled at runtime, so it does not generate the CSS for it either.[^19]

```tsx
// Doesn't work: the text bg-blue-600 never appears in the source
<button className={`bg-${color}-600`}>Save</button>

// Works: the full class names are written out in the source
const colorVariants = {
  blue: "bg-blue-600 hover:bg-blue-500",
  red: "bg-red-600 hover:bg-red-500",
};

<button className={colorVariants[color]}>Save</button>
```

### Merging conflicting classes

When a component takes a `className` from outside on top of its own defaults, `px-2` and `px-4` can end up on the same element, and which one wins becomes unclear. The common answer is to collect the conditional classes with `clsx` and strip the conflicting ones with `tailwind-merge`; the two are usually wrapped together in a helper called `cn`.[^20][^21]

```command
npm install clsx tailwind-merge
```

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

cn("px-2 py-1", isLarge && "px-4"); // "py-1 px-4" when isLarge is true
```

## Tools

- **Tailwind CSS IntelliSense:** an extension for VS Code and Cursor; it completes class names, flags invalid ones and shows the generated CSS on hover.[^22]
- **The Prettier plugin:** it puts classes in the same order in every file, which makes long lists easier to read.[^22]

## Criticism

[!tailwind] is a divisive tool. The objections you hear most: long class lists make the HTML harder to read, a typo in a class name (`txt-blue`) goes unnoticed in the editor, and you have to learn Tailwind's naming on top of CSS itself.[^23][^24] Its defenders point to the consistency a fixed design scale brings to a team, a point even harsh critics concede.[^24] For a balanced take, [Chris Coyier](https://chriscoyier.net/)'s article is a good place to start.[^23]

## Going deeper

- **Official docs:** the "Core concepts" section of the Tailwind docs covers every heading in this lesson in depth; the class reference pages are there when you need them.[^1]
- **Code from v3:** the upgrade guide, for when you meet an older project or tutorial.[^9]
- **Talk:** [Sarah Dayan](https://sarahdayan.dev) on why the utility-first approach appeared, in 18 minutes (dotCSS 2019).[^25]
- **Talk:** Sarah Dayan on why utility classes are not inline styles (CSS Day 2024).[^26]
- **Article:** Sarah Dayan's defence of utility-first, which counts the downsides honestly too.[^27]

## Sources

1. [Tailwind: Styling with utility classes](https://tailwindcss.com/docs/styling-with-utility-classes) *(doc)* — The utility-first approach, what it buys you and how it differs from inline styles.
2. [Tailwind: Styling hover and focus states](https://tailwindcss.com/docs/styling-with-utility-classes#styling-hover-and-focus-states) *(doc)* — How variant prefixes work and the CSS they generate.
3. [Adam Wathan](https://adamwathan.me/): [CSS Utility Classes and "Separation of Concerns"](https://adamwathan.me/css-utility-classes-and-separation-of-concerns/) *(article)* — The case for moving from semantic CSS to utility-first.
4. [State of CSS 2025: Other tools](https://2025.stateofcss.com/en-US/other-tools/) *(research)* — CSS framework usage; Tailwind in 2,041 of 3,977 responses.
5. [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4) *(doc)* — The CSS-first configuration and automatic content scanning that came with v4.
6. [Tailwind: Install with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs) *(doc)* — The install steps for a Next.js project.
7. [Tailwind: Installing with Vite](https://tailwindcss.com/docs/installation/using-vite) *(doc)* — Installing with the Vite plugin.
8. [Tailwind Play](https://play.tailwindcss.com/) *(doc)* — The official Tailwind editor, running in the browser.
9. [Tailwind: Upgrade guide](https://tailwindcss.com/docs/upgrade-guide) *(doc)* — The syntax, class names and browser support that changed from v3 to v4.
10. [Tailwind: Preflight](https://tailwindcss.com/docs/preflight) *(doc)* — How Tailwind resets the default styles.
11. [Tailwind: Colors](https://tailwindcss.com/docs/colors) *(doc)* — The default colour palette and the opacity suffix.
12. [Tailwind: Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles) *(doc)* — One-off values in square brackets, `@layer` and `@utility`.
13. [Tailwind: Hover, focus, and other states](https://tailwindcss.com/docs/hover-focus-and-other-states) *(doc)* — Pseudo-class, `group`/`peer`, `aria-*` and `data-*` variants.
14. [Tailwind: Responsive design](https://tailwindcss.com/docs/responsive-design) *(doc)* — The breakpoints, the mobile-first rule and container queries.
15. [Tailwind: Dark mode](https://tailwindcss.com/docs/dark-mode) *(doc)* — The `dark:` variant and taking manual control of the theme.
16. [Tailwind: Theme variables](https://tailwindcss.com/docs/theme) *(doc)* — `@theme`, the variable prefixes and how it differs from `:root`.
17. [Tailwind: Reusing styles](https://tailwindcss.com/docs/reusing-styles) *(doc)* — Handling repetition with a loop or a component.
18. [Tailwind: Functions and directives](https://tailwindcss.com/docs/functions-and-directives) *(doc)* — `@apply`, `@theme`, `@source` and the other directives.
19. [Tailwind: Detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files) *(doc)* — Why dynamic class names are not generated.
20. [tailwind-merge](https://github.com/dcastil/tailwind-merge) *(doc)* — The library that merges conflicting Tailwind classes.
21. [Steve Kinney](https://stevekinney.com/): [clsx and tailwind-merge](https://stevekinney.com/courses/tailwind/clsx-and-tailwind-merge) *(article)* — The `cn` helper and using the two libraries together.
22. [Tailwind: Editor setup](https://tailwindcss.com/docs/editor-setup) *(doc)* — The IntelliSense extension and class sorting with Prettier.
23. [Chris Coyier](https://chriscoyier.net/): [If we're gonna criticize utility-class frameworks, let's be fair about it](https://css-tricks.com/if-were-gonna-criticize-utility-class-frameworks-lets-be-fair-about-it/) *(article)* — Which criticisms of utility frameworks are fair.
24. [Colton Voege](https://colton.dev/): [Tailwind is the Worst of All Worlds](https://colton.dev/blog/tailwind-is-the-worst-of-all-worlds/) *(article)* — A sharp critique of Tailwind, and the upsides it grants.
25. [Sarah Dayan](https://sarahdayan.dev): [In Defense of Utility-First CSS (dotCSS 2019)](https://www.youtube.com/watch?v=R50q4NES6Iw) *(video)* — How CSS decays in growing projects, and the utility-first approach.
26. [Sarah Dayan](https://sarahdayan.dev): [Utility First CSS Isn't Inline Styles (CSS Day 2024)](https://www.youtube.com/watch?v=g6wtyg3O4Fo) *(video)* — The difference between utility classes and inline styles.
27. [Sarah Dayan](https://sarahdayan.dev): [In Defense of Utility-First CSS](https://www.freecodecamp.org/news/in-defense-of-utility-first-css-4f406acee6fb) *(article)* — Composition, a comparison with BEM, and the downsides of utility-first.
