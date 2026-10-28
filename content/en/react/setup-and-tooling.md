---
title: "Setup and tooling"
description: "A framework or Vite, Strict Mode, lint rules and writing React with AI."
lastVerified: "2026-10-21"
translationKey: "react/setup-and-tooling"
---

## What this guide covers

[!react]'s official documentation at [react.dev](https://react.dev) is excellent. This guide does not repeat it. Each lesson summarises the topic briefly and gathers the advice of experienced engineers along with the mistakes people keep making. Version: React 19.3 *(September 2026)*.[^1]

The prerequisite is the [JavaScript](/academy/web-fundamentals/javascript) lesson from Web Fundamentals. [Kent C. Dodds](https://kentcdodds.com/) gives the same advice: before moving to React you should be comfortable with destructuring, arrow functions, `map`/`filter`, modules and promises; most of the difficulty people meet in React is really JavaScript.[^2] There is a separate [TypeScript](/academy/typescript/introduction-and-setup) guide for types; the examples here are `.tsx` but do not go into typing.

## A framework, or Vite?

The React team recommends starting a new application with a **framework**: [!nextjs] *(App Router)*, [!react-router] *(framework mode)*, or Expo for mobile. Frameworks bring routing, data fetching and server rendering with them, and can also be published as a static site with no server.[^3]

To learn the fundamentals of React, or to write an SPA that needs no server, **Vite** is enough. The documentation says plainly that this has a cost: the day you need routing, data fetching and SSR, you start writing your own small framework.[^4]

| Situation | Recommendation |
| :-- | :-- |
| You are learning React | [!vite] |
| An SPA that only runs in the browser, such as a dashboard or a tool | Vite + React Router + [!tanstack-query] |
| SEO, first-load speed and server data matter | Next.js or React Router in framework mode |
| iOS and Android | Expo |

> [!WARNING]
>
> `create-react-app` is no longer used. The React team retired it for new projects in February 2025.[^5] If a tutorial says `npx create-react-app`, it is out of date.

The lessons in this guide go with Vite. Topics specific to Next.js *(Server Components, Server Actions)* are in the [Next.js](/academy/nextjs) guide.

## The first project

```command
npm create vite@latest my-shop -- --template react-ts
```

```bash
cd my-shop
npm install
npm run dev
```

The Vite template comes with React 19.3, TypeScript and [Oxlint](https://oxc.rs).[^6] The files that matter:

| File | What it does |
| :-- | :-- |
| `index.html` | The single HTML page; `<div id="root">` lives here |
| `src/main.tsx` | Attaches React to `#root` |
| `src/App.tsx` | Your first component |
| `vite.config.ts` | The Vite and `@vitejs/plugin-react` settings |

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

## Strict Mode

`<StrictMode>` turns on extra checks that only run in development. It renders components twice, sets up and tears down Effects and ref callbacks one extra time, and warns about old APIs.[^7] The point is to catch impure rendering and missing cleanup before they reach production. It does not affect the production build.

> [!DONT]
>
> - Removing `StrictMode` because "my Effect runs twice". Running twice is not a bug but a test that reveals one. The fix is to write the cleanup, which comes in the Effect lesson.[^7]

## Lint: leave the React rules to the machine

The Rules of React are usually broken without any error: the application runs, but behaves wrongly. That is why linting is essential.

The Oxlint in the Vite template only turns on the `rules-of-hooks` rule.[^6] The React team's own plugin, `eslint-plugin-react-hooks`, includes rules based on the React Compiler's analysis in its `recommended` preset: it catches setting state during render, a synchronous `setState` inside an Effect, reading a `ref` during render, and defining a component inside a component. These rules work whether or not you use the compiler.[^8]

Add the plugin to the [!eslint] setup from the [Code Quality](/academy/architecture/code-quality) guide:

```command
npm install -D eslint-plugin-react-hooks
```

```js
// eslint.config.js
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export default defineConfig([reactHooks.configs.flat.recommended]);
```

The `recommended` preset is updated as new rules are added; use it rather than turning rules on one by one.[^9]

## React Compiler and DevTools

**React Compiler** adds memoization automatically at build time. It comes switched off in the Vite template because of its effect on build speed.[^6] To turn it on in Vite:[^10]

```command
npm install -D babel-plugin-react-compiler @rolldown/plugin-babel
```

```ts
// vite.config.ts
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
```

What the compiler does, and how it relates to `memo` and `useMemo`, is covered in the [Render performance in React](/academy/performance-accessibility/render-performance) lesson.

**React Developer Tools** is a browser extension. The **Components** tab shows the tree, the props and the state, and lets you change values live. The **Profiler** tab measures render times.[^11]

## Writing React with AI

Models have seen a great deal of old React code, so they may suggest old patterns. Even the agent skill the React team uses while writing react.dev tells the model to *"be suspicious of your own knowledge; you were often trained on outdated or incorrect React patterns"*.[^12] The old advice you see most often:

| Old advice | Today |
| :-- | :-- |
| `create-react-app` | Vite or a framework |
| `forwardRef` | `ref` is an ordinary prop |
| `<ThemeContext.Provider>` | `<ThemeContext value={...}>` |
| `useEffect` + `setState` for a derived value | Calculate during render |
| `useCallback` on every function | React Compiler |

Three things help:

- **Give it the current documentation as context.** react.dev offers an `llms.txt` index for agents, and adding `.md` to the end of any page returns plain Markdown *(e.g. `react.dev/learn/you-might-not-need-an-effect.md`)*.[^13]
- **Make the linter the gatekeeper.** The rules above check the code the AI writes too. Tell the agent to *"run `npm run lint` before committing"*.
- **Write your rules into a skill.** Project rules, and ready-made skills such as Vercel's `react-best-practices`, are covered in the [Skills](/academy/ai/skills) lesson.

## Try it yourself

- Set up the `my-shop` project, change a piece of text in `App.tsx` and watch the page update without reloading.
- Add `eslint-plugin-react-hooks`. Define a second component inside a component in `App.tsx` and read what the linter says.
- Install React DevTools, select `App` in the Components tab and change its state.
- Ask an AI tool to *"set up a React project with Vite"*. Compare the command it suggests with this lesson.

## Going deeper

- **Official docs:** React's documentation; the "Quick Start" and "Thinking in React" pages are the best place to begin.[^14]
- **Official docs:** the "Creating a React App" and "Build a React App from Scratch" pages; they set out the difference between a framework and Vite.[^3][^4]
- **Video:** the "React and AI" panel at React Conf 2025; the React team and tool authors discuss writing React with AI *(day 1 stream)*.[^15]
- **Article:** [Kent C. Dodds](https://kentcdodds.com/)'s list of the JavaScript to know before starting React.[^2]

## Sources

1. [React Blog: React 19.3](https://react.dev/blog/2026/09/09/react-19-3) *(doc)* — September 9, 2026. View Transitions and Fragment Refs becoming stable, `browser()` and Trusted Types support.
2. [Kent C. Dodds](https://kentcdodds.com/): [JavaScript to Know for React](https://kentcdodds.com/blog/javascript-to-know-for-react) *(article)* — From 2020; the JavaScript features to know before React.
3. [React: Creating a React App](https://react.dev/learn/creating-a-react-app) *(doc)* — The Next.js, React Router and Expo recommendation; frameworks also being publishable without a server.
4. [React: Build a React App from Scratch](https://react.dev/learn/build-a-react-app-from-scratch) *(doc)* — Setting up with Vite, Parcel and Rsbuild; the cost of writing your own framework.
5. [React Blog: Sunsetting Create React App](https://react.dev/blog/2025/02/14/sunsetting-create-react-app) *(doc)* — February 14, 2025. CRA being retired for new projects, and the migration routes.
6. [Vite: create-vite templates](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) *(repo)* — The `react-ts` template; the Oxlint setup and why React Compiler is off by default. Checked against create-vite 9.3.
7. [React: StrictMode](https://react.dev/reference/react/StrictMode) *(doc)* — Double rendering in development, and Effects and ref callbacks being run again.
8. [React: eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks) *(doc)* — The recommended rules and the compiler-backed lints.
9. [React: eslint-plugin-react-hooks README](https://github.com/react/react/blob/main/packages/eslint-plugin-react-hooks/README.md) *(repo)* — Flat config setup and the advice to use the `recommended` preset.
10. [React: React Compiler Installation](https://react.dev/learn/react-compiler/installation) *(doc)* — Installing `reactCompilerPreset` and `@rolldown/plugin-babel` for Vite.
11. [React: React Developer Tools](https://react.dev/learn/react-developer-tools) *(doc)* — The browser extension, and the Components and Profiler tabs.
12. [React: react.dev react-expert skill](https://github.com/reactjs/react.dev/blob/main/.claude/skills/react-expert/SKILL.md) *(repo)* — The React documentation's agent skill; the warning that the model should distrust old React patterns.
13. [React: Add llms.txt to react.dev](https://github.com/reactjs/react.dev/pull/8267) *(repo)* — `llms.txt` being added to react.dev, and pages being served as `.md`.
14. [React: Documentation](https://react.dev/learn) *(doc)* — The official React documentation, from "Quick Start" to the API reference.
15. [React: React Conf 2025, React and AI Panel](https://www.youtube.com/watch?v=zyVRg2QR6LA&t=18741s) *(video)* — Day 1 stream. The React and AI panel, moderated by Lee Robinson.
