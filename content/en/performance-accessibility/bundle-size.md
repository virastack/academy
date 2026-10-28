---
title: "Bundle size"
description: "Shrinking the bundle and seeing what gets loaded."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/bundle-size"
---

## What a bundle is

A **bundle** is the output files your application code and its dependencies are combined and optimised into, for the browser and the server. The tool that does this is called a **bundler**. A small bundle downloads faster, needs less execution time and improves the Core Web Vitals values.[^1]

JavaScript's cost is not only the download: the real cost of processing a script is the download plus the time running it on the CPU, and that is felt especially on low-powered phones.[^2] In 2025 the median page loaded 708 KB of JavaScript on desktop and 646 KB on mobile.[^3]

The bundler you use today most likely comes ready. In Next.js 16 the default bundler is **Turbopack**.[^4] Vite 8, meanwhile, uses a single Rust-based bundler called **Rolldown**.[^5] Next.js does optimisations such as code splitting and tree shaking automatically; your job is not to get in their way, and to see what is being loaded.[^1]

## Tree shaking

**Tree shaking** is dropping unused code (dead code) from the bundle. The bundler works out which module exports what and where it is imported from the `import`/`export` statements.[^6]

```tsx
// utils.ts
export function formatPrice(n: number) { /* ... */ }
export function parseCsv(text: string) { /* ... */ } // never imported

// page.tsx
import { formatPrice } from "./utils"; // parseCsv does not enter the bundle
```

A few conditions have to hold for it to work:[^7][^8]

- **Use ES modules.** Because `require()` is a function called at runtime, the bundler cannot safely analyse it at build time.
- **The `sideEffects` field:** if a package says `"sideEffects": false` in `package.json`, the bundler drops the unused files without hesitation. Files that work just by being imported (a polyfill, global CSS) have to be listed, otherwise they can be dropped in production.
- **Prefer named imports** and pick packages that publish ES modules. Import patterns that pull in the whole library can break tree shaking in older setups.

## Code splitting

**Code splitting** is splitting the bundle into pieces and loading the code needed for the first view first, and the rest when it is needed. A large initial script keeps the main thread busy and delays interaction.[^9] The V8 team's rule of thumb: split a bundle that exceeds 50-100 kB into smaller pieces.[^2]

The basic tool is a dynamic `import()`. The module is downloaded as a separate file when the line runs:[^10]

```tsx
"use client";

export function Search({ names }: { names: string[] }) {
  return (
    <input
      onChange={async (e) => {
        const Fuse = (await import("fuse.js")).default; // downloaded only when you type
        console.log(new Fuse(names).search(e.currentTarget.value));
      }}
    />
  );
}
```

### React.lazy

To load a component the moment it is first rendered, `lazy` is used. While it loads, `Suspense` shows the fallback. The imported component has to be a **default export**, and the `lazy` call has to be made **outside** the component, at the module's top level; define it inside and the state resets on every render.[^11]

```tsx
import { lazy, Suspense } from "react";

const MarkdownPreview = lazy(() => import("./MarkdownPreview"));

export function Editor() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <MarkdownPreview />
    </Suspense>
  );
}
```

### next/dynamic

In Next.js, `next/dynamic` is the combination of `React.lazy` and `Suspense`. Lazy loading makes sense for Client Components; Server Components are already split automatically.[^10]

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("./Chart"), {
  loading: () => <p>Loading chart...</p>,
});

export function Report() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Show the chart</button>
      {open && <Chart />} {/* the code is downloaded only on the click */}
    </>
  );
}
```

For a named export, you write `import("./hello").then((mod) => mod.Hello)`. The `ssr: false` option only works inside a Client Component and raises an error in a Server Component.[^10]

> [!TIP]
>
> Heavy pieces that are not visible in the first screen — a modal, a chart, a rich text editor, a map — are the best candidates for code splitting.

## Seeing the bundle

Instead of guessing, look inside the bundle. These tools draw every module as a rectangle whose area is proportional to its size (a **treemap**).[^1]

### Next.js

In Next.js 16.1 and later there is a built-in analysis tool that works with Turbopack:[^1]

```command
npx next analyze
```

In the interface you can filter by route, by client/server environment and by file type, and click a module to see which import chain brought it onto the page.[^1][^12] With `--output` the result is saved into the `.next/diagnostics/analyze` folder; that is handy for comparing before and after an optimisation.[^1] The tool was announced as `next experimental-analyze` in the first releases, so you may see that name in older articles.[^12]

If your project is built with `--webpack`, the `@next/bundle-analyzer` plugin and the `ANALYZE=true npm run build` command are used.[^1]

### Vite

In Vite the common choice is `rollup-plugin-visualizer`; it produces an HTML report after the build.[^13]

```command
npm install --save-dev rollup-plugin-visualizer
```

```ts
// vite.config.ts
import { defineConfig, type PluginOption } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [visualizer({ gzipSize: true }) as PluginOption], // last in the list
});
```

If you want to look without adding any configuration, `npx vite-bundle-visualizer` runs the same plugin for you.[^14]

## Seeing a package's cost without installing it

Before you add a new dependency, look at its size. **Bundlephobia** shows an npm package's size, what it is made of and its exports.[^15] **pkg-size.dev** actually installs and bundles the package in your browser; because it does a fresh install every time instead of using a cache, it also reflects changes in the nested dependencies.[^16]

> [!DO]
>
> - Before adding a package, look at its size and whether it is suitable for tree shaking.
> - Compare two packages that do the same job with these tools.

## Barrel files

A **barrel file** is a file with no code of its own that only re-exports other modules (usually `index.ts`). When a barrel is put in every folder, a single import can load a large part of the project in a chain; that slows down the development server, the tests and the linter in particular.[^17]

```ts
// components/index.ts (a barrel)
export * from "./Button";
export * from "./Modal";
export * from "./DataGrid"; // anyone who wants Button runs this too
```

Icon and UI libraries come with large barrels too; some have close to 10,000 exports in their entry file.[^18] This is why Next.js offers the `optimizePackageImports` option: it analyses the barrel and points the import directly at the module you use.[^18] Popular libraries such as `lucide-react`, `date-fns`, `@mui/material` and `react-icons` are already optimised by default; for a package that is not on the list, you add it by hand:[^19]

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
> - Do not put an `index.ts` barrel in every folder of your own project; import from the file directly: `import { Button } from "@/components/Button"`.[^17]

## Third-party scripts

Analytics, tag manager, chat and ad scripts do not appear in your bundle but use the same main thread. More than 90% of pages use at least one third-party resource; the median page makes 83 third-party requests on desktop and 79 on mobile.[^20] The general rule: if it is not needed on the critical rendering path, load the third-party script with `async` or `defer`.[^21]

In Next.js you do this with `next/script` and the `strategy` prop:[^22]

| Strategy | When it loads | Example |
| :-- | :-- | :-- |
| `beforeInteractive` | Before the Next.js code; only in the root layout | Bot detection, cookie consent |
| `afterInteractive` | The default; after part of the hydration | A tag manager, analytics |
| `lazyOnload` | While the browser is idle, after everything has loaded | A chat widget, a social media plugin |

```tsx
import Script from "next/script";

export default function Page() {
  return <Script src="https://example.com/chat.js" strategy="lazyOnload" />;
}
```

The `worker` strategy is still experimental and does not work in the App Router. Event props such as `onLoad` can only be used in a Client Component.[^22]

## Server Components and the client bundle

Libraries used in a Server Component are not sent to the client; only the produced HTML goes to the browser. So moving heavy work that needs no browser API and no interaction — syntax highlighting, markdown processing, preparing a chart — into a Server Component is an effective way to shrink the client bundle.[^1]

## Going deeper

- **Official guide:** Next.js's guide to bundle analysis and shrinking large bundles.[^1]
- **Essential reading:** Addy Osmani and Mathias Bynens's V8 article on the cost of JavaScript.[^2]
- **Talk:** Stephen Cooper's roughly 26-minute talk on tree shaking, `sideEffects`, barrel files and tracking bundle size in CI (WeAreDevelopers World Congress 2025).[^23]
- **Talk:** Abhijeet Prasad's 17-minute talk on shrinking the JavaScript the build tools produce (JSNation US 2024).[^24]
- **Tree shaking in practice:** Smashing Magazine's tree shaking reference guide.[^8]

## Sources

1. [Next.js: Optimizing package bundling](https://nextjs.org/docs/app/guides/package-bundling) *(doc)* — The Bundle Analyzer, `@next/bundle-analyzer`, `optimizePackageImports` and moving heavy work into a Server Component.
2. [V8: The cost of JavaScript in 2019](https://v8.dev/blog/cost-of-javascript-2019) *(article)* — Addy Osmani and Mathias Bynens. The download and execution cost, and the advice to split a bundle over 50-100 kB.
3. [Web Almanac 2025: Page Weight](https://almanac.httparchive.org/en/2025/page-weight) *(research)* — The median JavaScript size and request count per page.
4. [Next.js 16 (beta)](https://nextjs.org/blog/next-16-beta) *(doc)* — Turbopack becoming the default bundler, and falling back with `--webpack`.
5. [Vite 8](https://vite.dev/blog/announcing-vite8) *(doc)* — Rolldown becoming Vite's single bundler.
6. [MDN: Tree shaking](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking) *(doc)* — The definition of tree shaking and how it relates to `import`/`export`.
7. [webpack: Tree Shaking](https://webpack.js.org/guides/tree-shaking/) *(doc)* — The ES module requirement, the `sideEffects` field and CSS files.
8. [Atila Fassina: Tree-Shaking: A Reference Guide](https://www.smashingmagazine.com/2021/05/tree-shaking-reference-guide) *(article)* — The difference between CommonJS and ESM, `sideEffects`, pure annotations and named imports.
9. [web.dev: Reduce JavaScript payloads with code splitting](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting) *(doc)* — The effect of a large initial script, and splitting with `import()`.
10. [Next.js: Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading) *(doc)* — `next/dynamic`, `ssr: false`, named exports and loading a library with `import()`.
11. [React: lazy](https://react.dev/reference/react/lazy) *(doc)* — The `lazy` signature, the default export requirement, `Suspense` and defining it at the top level.
12. [Next.js 16.1](https://nextjs.org/blog/next-16-1) *(doc)* — The announcement of the experimental Bundle Analyzer and its features.
13. [rollup-plugin-visualizer](https://unpkg.com/rollup-plugin-visualizer@7.1.1/README.md) *(repo)* — The Vite setup, the report templates and the gzip/Brotli options.
14. [vite-bundle-visualizer](https://github.com/KusStar/vite-bundle-visualizer) *(repo)* — A bundle report for a Vite project in a single command.
15. [Bundlephobia](https://bundlephobia.com/package/pino-http) *(doc)* — A tool that analyses npm packages' size, composition and exports.
16. [pkg-size.dev](https://github.com/privatenumber/pkg-size.dev/blob/develop/README.md) *(repo)* — A size tool that installs and bundles packages in the browser.
17. [Marvin Hagemeister: The barrel file debacle](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/) *(article)* — Why barrel files slow the tools down, and the cost of the module count.
18. [Shu Ding: How we optimized package imports in Next.js](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js) *(article)* — How `optimizePackageImports` works and the measured gains.
19. [Next.js: optimizePackageImports](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports) *(doc)* — The setting and the list of libraries optimised by default.
20. [Web Almanac 2025: Third Parties](https://almanac.httparchive.org/en/2025/third-parties) *(research)* — The third-party usage rate and the request count per page.
21. [web.dev: Load Third-Party JavaScript](https://web.dev/articles/optimizing-content-efficiency-loading-third-party-javascript/) *(doc)* — `async`/`defer`, preconnect, lazy loading and self-hosting.
22. [Next.js: Script Component](https://nextjs.org/docs/app/api-reference/components/script) *(doc)* — The `next/script` strategies and the event props.
23. [Stephen Cooper: A Practical Guide to Reducing Bundle Size (WeAreDevelopers World Congress 2025)](https://www.wearedevelopers.com/videos/1439-a-practical-guide-to-reducing-bundle-size) *(video)* — Tree shaking, barrel files and bundle size regression testing.
24. [Abhijeet Prasad: The Performance Impact of Generated JavaScript (JSNation US 2024)](https://gitnation.com/contents/the-performance-impact-of-generated-javascript) *(video)* — Minification, down-compilation and monitoring bundle size.
