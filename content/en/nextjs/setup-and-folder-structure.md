---
title: "Setup and project structure"
description: "The create-next-app defaults, the app folder, the special files and where code goes."
lastVerified: "2026-10-21"
translationKey: "nextjs/setup-and-folder-structure"
---

## What this guide covers

The [!nextjs] documentation is current and detailed. This guide does not repeat it. Each lesson summarises the topic briefly and gathers the advice of the Next.js team and of experienced engineers, along with the common mistakes. Version: Next.js 16.4 *(October 2026)*, React 19.3.[^1]

The prerequisite is the [React](/academy/react/setup-and-tooling) guide. You met components, state, Suspense and Actions there. Here you will learn where they meet the server.

> [!NOTE]
>
> The code in this guide was checked with `tsc`, `eslint` and `next build` in a project created with `create-next-app@16.4.2`.

## What Next.js brings

React is only a user interface library. Routing, data fetching and server rendering need a framework. The React team lists the Next.js App Router among the frameworks it recommends for new applications.[^2]

What sets Next.js apart is its rendering model. Most frameworks treat a page as either entirely static or entirely dynamic. Next.js takes that line down to the **component** level: the same page can have a static shell that arrives instantly and dynamic parts that stream in afterwards.[^3] The rest of the guide is built on that idea.

## The first project

```command
npx create-next-app@latest my-shop --yes
```

```bash
cd my-shop
npm run dev
```

`--yes` picks the recommended defaults:[^4]

| Setting | Default |
| :-- | :-- |
| Language and styling | [!typescript] and [!tailwind] |
| Lint | [!eslint] *(Biome can be chosen too)* |
| Router | App Router |
| Bundler | Turbopack |
| Cache Components and Partial Prefetching | On |
| `AGENTS.md` | Included |
| React Compiler | Off |

Turbopack has been the default for both `next dev` and `next build` since Next.js 16.[^5] With 16.4, new projects come with **Cache Components** on; pages are dynamic by default and you choose what gets cached.[^1] You will meet that model in the [Cache and the rendering model](/academy/nextjs/caching-and-rendering) lesson.

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
```

> [!WARNING]
>
> Since Next.js 16, `next build` does not run the linter and there is no `next lint` command. Run the linter separately with `npm run lint`.[^4] The CI setup is in the [Code Quality](/academy/architecture/code-quality) lesson.

## The files that matter

| File | What it does |
| :-- | :-- |
| `app/layout.tsx` | The root layout; `<html>` and `<body>` live here, and it is required |
| `app/page.tsx` | The page at `/` |
| `public/` | Static files served as they are *(`public/logo.png` → `/logo.png`)* |
| `next.config.ts` | The framework settings |
| `proxy.ts` | Code that runs before the request *(optional)* |
| `AGENTS.md` | Points AI agents at the documentation of the installed version |

`AGENTS.md` does something interesting: it tells the agent to look not at its training data but at the documentation under `node_modules/next/dist/docs/`, which matches the installed version.[^6] The detail is in the [Next.js with AI agents](/academy/nextjs/ai-agents) lesson.

## The app folder and the special files

In the App Router, **folders** decide the URL and **special files** decide what is shown at that address. A folder only becomes reachable once it has a `page.tsx` or a `route.ts` in it.[^7]

| File | Its job |
| :-- | :-- |
| `page.tsx` | The page itself |
| `layout.tsx` | Shared interface that wraps the pages below it and survives navigation |
| `loading.tsx` | The skeleton shown while the page loads *(Suspense)* |
| `error.tsx` | The error boundary |
| `not-found.tsx` | The 404 interface |
| `route.ts` | An API endpoint |

Next.js nests these files in a fixed order: `layout` > `error` > `loading` > `not-found` > `page`.[^7] Remember Suspense and the Error Boundary from the React guide: `loading.tsx` is a `<Suspense>` and `error.tsx` is an Error Boundary. Next.js builds them from the file name.

## Where to put your code

Next.js does not take a position on structure; it asks you to be consistent.[^7] Three rules that work:

- **Colocation is safe.** Putting `product-card.tsx` inside `app/products/` does not open a new address; only `page.tsx` does that.
- **A folder starting with `_`** *(a private folder)* is taken out of routing entirely: `app/products/_components/`.
- **A folder in parentheses** *(a route group)* is not added to the URL: `app/(shop)/cart/page.tsx` → `/cart`. It is used to group sections and give them separate layouts.

In growing projects it is a common choice to keep the `app/` folder for routing only and gather the code under `features/`. The [Folder structure and naming](/academy/architecture/folder-structure) lesson covers that approach.

> [!TIP]
>
> Your editor's tabs will fill up with `page.tsx`, `page.tsx`, `page.tsx`. The Next.js documentation suggests putting the folder name in the tab with the `workbench.editor.customLabels.patterns` setting in VS Code and Cursor *(e.g. `products/[slug] - page.tsx`)*.[^4]

## Keeping up to date

Next.js releases often, and every release includes security fixes too. Updating in small steps often is easier than updating in big steps rarely.[^4]

```bash
npx next upgrade
```

The upgrade moves the bundled documentation to the new version as well, so agents always read the documentation of the installed version.[^4]

## Try it yourself

- Set up the `my-shop` project. Check that `cacheComponents` and `partialPrefetching` come on in `next.config.ts`.
- Create `app/about/page.tsx` and go to `/about`. Then move the file to `app/(marketing)/about/page.tsx`; did the address change?
- Create `app/about/_components/team.tsx`. What happens when you go to `/about/_components/team`?
- Open `AGENTS.md` and read which folder it points the agent at.

## Going deeper

- **Official docs:** the Next.js Learn course; it builds a dashboard application step by step with the App Router.[^8]
- **Official docs:** the "Rendering Philosophy" page; why they see static and dynamic as a spectrum, and what that means for hosting.[^3]
- **Video:** the Next.js Conf 2025 opening keynote; [Guillermo Rauch](https://rauchg.com/), [Sam Selikoff](https://samselikoff.com/) and Jimmy Lai introduce Next.js 16.[^9]
- **Official docs:** the Next.js 16 announcement; Turbopack, `proxy.ts` and the first version of Cache Components.[^5]

## Sources

1. [Next.js Blog: Next.js 16.4](https://nextjs.org/blog/next-16-4) *(doc)* — October 6, 2026. Cache Components being recommended for all applications, being the default in `create-next-app`, and React 19.3.
2. [React: Creating a React App](https://react.dev/learn/creating-a-react-app) *(doc)* — The Next.js App Router, React Router and Expo recommendation.
3. [Next.js: Rendering Philosophy](https://nextjs.org/docs/app/guides/rendering-philosophy) *(doc)* — Static and dynamic as a spectrum at the component level, and what it means for infrastructure.
4. [Next.js: Installation](https://nextjs.org/docs/app/getting-started/installation) *(doc)* — The `create-next-app` defaults, the lint setting, editor labels and `next upgrade`.
5. [Next.js Blog: Next.js 16](https://nextjs.org/blog/next-16) *(doc)* — October 21, 2025. Turbopack becoming the default, `middleware` becoming `proxy`, and Cache Components.
6. [Next.js: AI Coding Agents](https://nextjs.org/docs/app/guides/ai-agents) *(doc)* — The bundled documentation and the managed instruction block in `AGENTS.md`.
7. [Next.js: Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) *(doc)* — The special files, the component hierarchy, colocation, private folders and route groups.
8. [Next.js: Learn](https://nextjs.org/learn) *(doc)* — The Next.js team's free App Router course.
9. [Next.js Conf 2025: Opening Keynote](https://www.youtube.com/watch?v=myjrQS_7zNk) *(video)* — October 22, 2025. Next.js 16, Cache Components and instant navigation.
