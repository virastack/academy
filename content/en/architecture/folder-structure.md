---
title: "Folder structure and naming"
description: "A feature-based structure, file naming and import rules."
lastVerified: "2026-10-22"
translationKey: "architecture/folder-structure"
---

A folder structure has a simple job: when you are about to change something, finding the relevant files in one place. If you group files not by their type (`components/`, `hooks/`, `utils/`) but by the feature they belong to (the cart, the product list, checkout), changing a feature is done in a single folder. The principle is the one in [Kent C. Dodds](https://kentcdodds.com)'s colocation article: put code as close as possible to where it is relevant.[^1]

This guide covers the feature-based structure, the naming and the import rules that work the same way in [!nextjs] and [!tanstack-start].

## By type or by feature?

|  | By type | By feature |
| --- | --- | --- |
| The structure | Every feature's files under `components/`, `hooks/`, `stores/` | All the cart's files under `features/cart/` |
| While changing the cart | You hunt for files in several large folders | It is done in one folder |
| As it grows | One feature spreads across many folders | The feature stays in one place |

Arranging by type is common because it is easy to start with in frameworks such as [!nextjs] and [!nuxt]. But as the project grows, changing one feature means touching many large folders.[^2]

Independent sources recommend arranging by feature. **bulletproof-react** recommends collecting most of the code under `features/`, to stop feature code mixing with the shared components.[^3] **Feature-Sliced Design** turns the same idea into a stricter methodology: the code is split into layers, and the layers into highly cohesive slices.[^4]

It is talked about on conference stages too. At Conf42, Aleksandr Guzenko explains with this methodology how architectural debt can be stopped from piling up by limiting the dependencies.[^5] At HolyJS, [Alexander Morgunov](https://amorgunov.com) covers the method's concepts (modularity, the public API, separating the infrastructure from the business logic) together with its weak spots (cross-imports between modules, insufficient documentation, code scattered across layers).[^6] So the approach is not an indisputable recipe but a choice with trade-offs.

## The top-level structure

ViraStack uses this structure too. A simplified version of its template:[^7]

```text
src/
├── app/ | routes/   # the routing
├── features/        # the feature modules
├── components/      # shared components (ui/, layout/, shared/)
├── hooks/           # shared hooks
├── lib/             # configured library instances (the API client, date-fns)
├── helpers/         # pure functions with no package imports
├── schemas/
├── stores/
├── types/
├── constants/
├── config/
├── providers/
├── styles/
└── env.ts
```

Before opening a new folder, look at whether it fits one of the existing ones.[^7]

The real decision is that the project code sits **outside** the routing folder:

|  | [!nextjs] | [!tanstack-start] |
| --- | --- | --- |
| The routing folder | `app/` | `src/routes/` |
| The options the framework offers | The project code can be outside `app`, inside `app`, or split by route[^8] | Files and folders prefixed with `-` do not enter the route tree, and are used to hold code in route folders[^9] |
| The framework's own special names | `page`, `layout`, `route`, `_folder`, `(group)`, `[param]`[^8] | `__root`, `$param`, the `_` prefix (a pathless layout), the `-` prefix[^9] |

Next.js has no opinion on the structure; it asks you to stay consistent with the strategy you pick.[^8] In this structure, folders such as `features/` and `components/` sit at the same level as `app/` and `routes/`, which is the *"keep the project code outside `app`"* strategy.[^7] The `src/` folder is optional in Next.js and separates the application code from the configuration files in the root directory.[^8]

## Inside a feature folder

```text
features/cart/
├── api/          # the request functions and API hooks
├── components/
├── hooks/
├── schemas/      # the Zod schemas
├── stores/
├── types/
└── index.ts
```

Alongside these there can be `constants/`, `data/` and `helpers/` too.[^7] Not every feature needs all of them; only open the folder you need.[^3]

The test file sits next to the file it tests (`cart-summary.test.tsx`). The end-to-end tests, on the other hand, stay in the project root, because they are not tied to the `src/` structure.[^1]

> [!TIP]
>
> **A folder name can be a type; let the file name say the domain.** **Feature-Sliced Design** counts generic folder names such as `types/`, `components/` and `utils/`, and generic file names such as `types.ts`, `utils.ts` and `helpers.ts`, as a problem: code from different domains piles up in the same file.[^2] Write `helpers/format-price.ts` instead of `helpers/utils.ts`.

## When does shared code move to the global layer?

Everything starts inside `features/[feature]/`. Once a second feature needs the same code, the code moves to the global `src/` layer (`components/`, `lib/`, `hooks/`).

Why does it move? Because features do not import from each other. Combining features is the page (application) layer's job, so every feature stays independent.[^3] **Feature-Sliced Design** also forbids slices in the same layer from using each other.[^4] The flow is one-way: shared code → features → the application.[^3]

| Stays inside the feature | Moves to the global layer |
| --- | --- |
| `features/cart/components/cart-summary.tsx` | `components/ui/button.tsx` |
| The function that calculates the cart total | The function that formats a currency (`helpers/`) |
| The cart API hooks | The shared API client (`lib/api.ts`) |

`helpers/` is for pure functions with no package imports, and configured instances that use a package go under `lib/`.[^7]

> [!TIP]
>
> **Why on the second use, not the third?** The well-known *"Rule of Three"* works like this: the first time you write it, the second time you notice the repetition and copy it anyway, and the third time you extract it into shared code.[^10] In this structure the rule is stricter: if two features need the same code, the code moves to the global layer, because features cannot import each other.[^7]

> [!WARNING]
>
> **Not all code that looks alike is the same code.** The cycle [Sandi Metz](https://sandimetz.com) describes: someone extracts the repetition into a shared function, then a parameter and a condition are added for the next new need, and the shared code becomes incomprehensible.[^11] For [Metz](https://sandimetz.com), duplication is far cheaper than the wrong abstraction.[^12] [Dan Abramov](https://overreacted.io)'s *The Wet Codebase* talk tells the same trap as a story: the shared abstraction extracted to prevent copying accumulates special cases and becomes generic. His advice is not to be afraid of inlining a bad abstraction.[^13] Before you move it, ask: do the two uses share the same rule, or do they resemble each other by coincidence? Cleaning up coincidental duplication too early makes the code brittle.[^10]

## Import rules

### 1. use an alias, not `../`

```ts
// ❌ It changes with whichever folder you are in
import { Button } from '../../../components/ui/button'

// ✅ The same in every file
import { Button } from '@/components/ui/button'
```

- **[!nextjs]:** `create-next-app` sets up the `@/*` alias by default.[^14]
- **[!tanstack-start]:** an alias does not come by default. The example in the documentation uses `~/*`. In Vite 8 and later there is built-in support that reads the tsconfig paths (off by default), and for Vite 7 and earlier the `vite-tsconfig-paths` plugin is needed.[^15]
- **To enforce it:** give ESLint's built-in `no-restricted-imports` rule `{ patterns: [{ regex: "^\\.\\./" }] }`. Only the imports starting with `../` are forbidden, and sibling (`./b`) and subfolder (`./lib/a`) imports stay free.[^16] The `import/no-relative-parent-imports` rule is not suitable for this job: because it looks at the resolved file path, it counts imports written with `@/` as errors too. In a trial the `@/components/ui/button` import failed for that reason.

### 2. no imports between features

Combine the features in the page:

```tsx
// app/products/[id]/page.tsx
import { ProductDetail } from '@/features/products'
import { AddToCartButton } from '@/features/cart'
```

Every feature exports the parts it opens to the outside through the `index.ts` at its root (see the `index.ts` section below).

There is no import from inside `features/products` to `features/cart`. You will see how to enforce this rule with ESLint in the [Component and code organisation](/academy/architecture/component-organization) guide.

### 3. `index.ts`: a front door or a burden?

In feature-based structures an `index.ts` is usually put at every feature's root. There are two views on this:

|  | A single entry (a public API) | A direct import |
| --- | --- | --- |
| Who argues for it | **Feature-Sliced Design**: the index file is the feature's outward contract[^17] | **bulletproof-react**: a direct import, because of tree shaking and performance problems in Vite[^3]. [Marvin Hagemeister](https://marvinh.dev): if barrels have spread everywhere, delete them all[^18]. [TkDodo](https://tkdodo.eu): drop the barrel in application code[^19] |
| What you gain | When the feature's internal structure changes, the imports outside it do not break[^17] | Faster tools, clear dependencies[^20] |
| What it costs | The risk of circular imports, and slowdown in large projects[^17][^19] | Moving a file affects every import, and the encapsulation is weakened[^20] |

The measurements are clear in large projects. [Marvin Hagemeister](https://marvinh.dev) writes that in projects where barrels have spread to every folder, deleting them all can speed many tasks up by 60-80%. He adds that a few barrels are usually not a problem.[^18] [TkDodo](https://tkdodo.eu) brought the number of modules one page loads in his own Next.js project down from about 11 thousand to 3.5 thousand (68%).[^19] Atlassian measured a 75% drop in build minutes per commit in the Jira frontend, and notes that in exchange they lost the packages' public API.[^20]

> [!TIP]
>
> **The middle road:**
>
> - A single, thin `index.ts` at the feature's root: named re-exports only, no `export *`.[^17]
> - No separate barrel in the feature's subfolders (such as `components/index.ts`).[^17]
> - The files of the same feature import each other directly by file path, not through `index.ts`. That is how circular imports are prevented.[^17][^19]
> - Turn the `import/no-cycle` rule on.[^19]
> - If the dev server or the tests get slow, the barrels are the first place to look.[^18]

## Naming

- **Files and folders in `kebab-case`:** `cart-summary.tsx`, `use-cart.ts`. macOS and Windows do not distinguish upper and lower case; Linux (CI, the live server) does. An import that works locally can give a *"Module not found"* error in production.[^21] Pick one spelling and enforce it with lint (`unicorn/filename-case`).[^19]
- **The component name in `PascalCase`, the file name in `kebab-case`:** the `tab-list.tsx` file exports `TabList`.[^19]
- **Do not touch the names the framework imposes:** names such as `page.tsx`, `layout.tsx`, `__root.tsx` and `$postId.tsx` are part of the routing.[^8][^9]
- **Avoid generic names:** instead of `utils.ts`, `types.ts` and `helpers.ts`, give a name that says the domain.[^2]
- **The test file next to the source:** `cart-summary.test.tsx`.[^1]

> [!TIP]
>
> Do not explain this structure to the agent every time; write it into a rules file. `create-next-app` adds an `AGENTS.md` file for coding agents itself.[^14] Lint rules such as the `../` ban also act as a check for the agent, which we covered in the [Agentic coding](/academy/ai/agentic-coding) guide.

## Try it yourself

1. Pick a feature from your project (the cart, say) and move its files under `features/cart/`. Only open the subfolders you need.
2. Find a function two features use (price formatting, say). Do they share the same rule, or do they resemble each other by coincidence? If it is the same, move it under `helpers/`.
3. Turn the `../` ban on with `no-restricted-imports` and change the imports containing `../` to the alias.
4. Count the `index.ts` files in your project. Turn the ones outside the feature roots into direct imports.
5. Watch Aleksandr Guzenko's [Preventing architectural debt with Feature-Sliced Design](https://conf42.com/JavaScript_2024_Aleksandr_Guzenko_3_architecturaldebt_featuresliceddesign_cleancode) talk and look at which of the dependency problems he describes exist in your project.[^5]

## Sources

1. [Kent C. Dodds: Colocation](https://kentcdodds.com/blog/colocation) *(article)* — The principle of putting code close to where it is relevant, the tests and the helper files. June 17, 2019.
2. [Feature-Sliced Design: Desegmentation](https://feature-sliced.design/docs/guides/issues/desegmented) *(doc)* — The problems with arranging by type, and avoiding generic folder and file names.
3. [bulletproof-react: Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) *(repo)* — The feature folder structure, the ban on imports between features, the one-way flow and the barrel note.
4. [Feature-Sliced Design: Layers](https://feature-sliced.design/docs/reference/layers) *(doc)* — Layers, slices and the import rule between slices.
5. [Aleksandr Guzenko: Preventing architectural debt with Feature-Sliced Design (Conf42 JavaScript 2024)](https://conf42.com/JavaScript_2024_Aleksandr_Guzenko_3_architecturaldebt_featuresliceddesign_cleancode) *(video)* — Tangled dependencies turning into architectural debt, and limiting that with Feature-Sliced Design. The slides are on the page.
6. [Alexander Morgunov: Getting to Grips with Feature-Sliced Design (HolyJS 2024 Autumn)](https://holyjs.ru/en/archive/2024%20Autumn/talks/20005543/) *(video)* — The concepts, the public API and cross-imports, and the common problems such as weak documentation.
7. [ViraStack AI: architecture.mdc](https://github.com/virastack/ai/blob/main/templates/rules/architecture.mdc) *(repo)* — The directory structure and the rules in this guide, written as an agent rule.
8. [Next.js: Project structure and organization](https://nextjs.org/docs/app/getting-started/project-structure) *(doc)* — The file conventions, the `src` folder, the private folders and the project organisation strategies.
9. [TanStack Router: File Naming Conventions](https://tanstack.com/router/latest/docs/routing/file-naming-conventions) *(doc)* — The `__root`, `$`, `_` and `-` prefixes, and excluding a file from the route tree.
10. [Justin Weiss: I Dry-ed Up My Code and Now It's Hard to Work With](https://www.justinweiss.com/articles/i-dry-ed-up-my-code-and-now-its-hard-to-work-with-what-happened/) *(article)* — The "three strikes" rule, and the difference between necessary and coincidental duplication.
11. [Sandi Metz: The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction) *(article)* — How the wrong abstraction comes about, and the way back. January 20, 2016.
12. [Sandi Metz: All the Little Things (RailsConf 2014)](https://youtu.be/8bZh5LMaSmE) *(video)* — The talk the claim that duplication is cheaper than the wrong abstraction comes from.
13. [Dan Abramov: The Wet Codebase (Deconstruct)](https://www.deconstructconf.com/2019/dan-abramov-the-wet-codebase) *(video)* — The cost of early abstraction, and inlining a bad abstraction. The conference page lists it under 2019; the event date on the page is April 2020.
14. [Next.js: Installation](https://nextjs.org/docs/app/getting-started/installation) *(doc)* — The `@/*` alias, an absolute import example and `AGENTS.md`.
15. [TanStack Start: Path Aliases](https://tanstack.com/start/latest/docs/framework/react/guide/path-aliases) *(doc)* — An alias not coming by default in Start, and the setup per Vite version.
16. [ESLint: no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports) *(doc)* — Restricting import paths with `regex` inside `patterns`.
17. [Feature-Sliced Design: Public API](https://feature-sliced.design/docs/reference/public-api) *(doc)* — The index file as a public API, the `export *` problem and the costs of index files.
18. [Marvin Hagemeister: The barrel file debacle](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/) *(article)* — The effect of barrel files on tool performance. October 8, 2023.
19. [TkDodo: Please Stop Using Barrel Files](https://tkdodo.eu/blog/please-stop-using-barrel-files) *(article)* — Circular imports, the module count measurement and file name consistency. July 26, 2024.
20. [Atlassian: How We Achieved 75% Faster Builds by Removing Barrel Files](https://www.atlassian.com/blog/how-we-build/faster-builds-when-removing-barrel-files) *(article)* — The results measured in the Jira frontend, and the trade-offs. Tim Sebastian, June 26, 2025.
21. [joulev/nextjs-faq: "Module not found" on deployment](https://github.com/joulev/nextjs-faq/blob/main/content/module-not-found-due-to-case-sensitivity.mdx) *(article)* — Imports that work locally and break in production because of case sensitivity.
