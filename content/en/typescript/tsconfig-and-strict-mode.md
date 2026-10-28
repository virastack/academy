---
title: "tsconfig and strict mode"
description: "Compiler settings, the strict flags and type checking in CI."
lastVerified: "2026-10-17"
translationKey: "typescript/tsconfig-and-strict-mode"
---

## What tsconfig.json is

A `tsconfig.json` in a folder marks that folder as the root of a TypeScript project. The file defines which files are checked and which rules apply. When you run `tsc` without naming a file, the compiler looks for this file starting in the current folder and working upwards.[^1]

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "strict": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

| Field | What it does |
| :-- | :-- |
| `compilerOptions` | The compiler settings; most of this lesson is about these |
| `include` | The files or folders to include in the project *(relative to the tsconfig)*[^2] |
| `extends` | Inherits settings from another tsconfig file[^2] |
| `references` | Splits the project into smaller connected pieces *(the Vite template uses this)* |

## strict mode

TypeScript's strictness is less a single switch than a **set of dials**: you can turn the checks on and off one by one. `"strict": true` turns all of them on at once.[^3]

| Flag | What it does |
| :-- | :-- |
| `noImplicitAny` | Stops variables and parameters whose type cannot be inferred from quietly becoming `any` |
| `strictNullChecks` | Makes `null` and `undefined` separate types; you cannot use them unchecked |
| `strictFunctionTypes` | Compares function parameters more strictly |
| `strictBindCallApply` | Checks the arguments of `bind`, `call` and `apply` |
| `strictPropertyInitialization` | Requires class fields to be initialised in the constructor |
| `strictBuiltinIteratorReturn` | Treats the return value of built-in iterators as `undefined` rather than `any` |
| `noImplicitThis` | Treats a `this` of unclear type as an error |
| `useUnknownInCatchVariables` | Makes `error` in `catch (error)` `unknown` instead of `any` |
| `alwaysStrict` | Applies JavaScript's `"use strict"` mode to the output |

The list is the strict family from the TSConfig reference.[^4] The two you will notice most are `noImplicitAny` and `strictNullChecks`:

```ts
function getProduct(id) {}
// Error: Parameter 'id' implicitly has an 'any' type.

try {
  await fetchProducts();
} catch (error) {
  console.log(error.message);
  // Error: 'error' is of type 'unknown'.
}
```

With TypeScript 6.0, `strict` became **on by default**, and TypeScript 7 kept that default.[^5][^6] Writing `"strict": true` in the file still states your intent clearly. Even when migrating an old project, turn the flags on one at a time rather than switching `strict` off entirely.

## Flags beyond strict

### noUncheckedIndexedAccess

It is not part of `strict`, but it is the most useful addition. It adds `undefined` to the result of reaching into an array or an object with an index signature.[^7] It stops you forgetting that the array might be empty:

```ts
const products: Product[] = await fetchProducts();

const first = products[0]; // Product | undefined
console.log(first.name);
// Error: 'first' is possibly 'undefined'.

if (first) {
  console.log(first.name); // now Product
}
```

[Matt Pocock](https://www.mattpocock.com/) says this flag should really be part of `strict`.[^8] In TypeScript 7, `tsc --init` produces it turned on. In the Vite template it is off, so you have to add it yourself.

### The others

| Flag | What it does | Recommendation |
| :-- | :-- | :-- |
| `noUnusedLocals` | Treats an unused local variable as an error[^2] | On in the Vite template |
| `noUnusedParameters` | Treats an unused parameter as an error, except ones starting with `_`[^2] | On in the Vite template |
| `noFallthroughCasesInSwitch` | Catches `case`s with a forgotten `break` | On in the Vite template |
| `exactOptionalPropertyTypes` | Forbids assigning `undefined` explicitly to a `discountCode?: string` field[^4] | Optional; strict but noisy |

Matt Pocock finds flags such as `noUnusedLocals` "noisy" and suggests adding them only if you want them.[^8] Either is a reasonable choice; pick one as a team.

## Settings for a React application

In an application using Vite or Next.js, the JavaScript is produced by the bundler, not by TypeScript. TypeScript only runs as a **type checker**. The settings follow from that:

| Setting | Value | What it means |
| :-- | :-- | :-- |
| `target` | `es2023` | Which JavaScript version's syntax is allowed |
| `lib` | `["ES2023", "DOM"]` | Which global APIs are typed; `DOM` is required for browser code[^9] |
| `module` | `esnext` | Modern `import`/`export`; the default in TypeScript 7[^6] |
| `moduleResolution` | `bundler` | Resolves imports the way a bundler does; no extension needed on relative imports[^4] |
| `jsx` | `react-jsx` | The React 17+ JSX transform; no `import React` needed per file[^10] |
| `noEmit` | `true` | Produces no JavaScript files, only checks |
| `verbatimModuleSyntax` | `true` | Imports not marked `type` are kept and marked ones are erased entirely; it makes you write `import type`[^11] |
| `isolatedModules` | `true` | Treats code that single-file transformers *(Oxc, SWC, esbuild)* cannot support as an error[^12] |
| `erasableSyntaxOnly` | `true` | Forbids TypeScript syntax that produces runtime code, such as `enum` and parameter properties *(TypeScript 5.8)*[^13] |
| `skipLibCheck` | `true` | Does not check the `.d.ts` files inside `node_modules`; buys speed[^8] |

With `verbatimModuleSyntax` on, you write type-only imports like this:

```ts
import type { Product } from "./types";
import { formatPrice, type CartItem } from "./cart";
```

## The three files in the Vite template

`npm create vite@latest -- --template react-ts` *(create-vite 9.2)* produces three files:

| File | Scope |
| :-- | :-- |
| `tsconfig.json` | Contains no files itself *(`"files": []`)*, and gives `references` to the other two |
| `tsconfig.app.json` | The `src` folder: the application code that runs in the browser, with `DOM` in `lib` |
| `tsconfig.node.json` | `vite.config.ts`: the configuration that runs on Node, with `node` in `types` |

The application code and the configuration that runs on Node run in different environments, so they are checked with separate settings. The heart of `tsconfig.app.json` looks like this:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

There is no `strict` in the file, because it is already the default in the TypeScript 6.0 the template installs. `types: ["vite/client"]` adds the types for `import.meta.env` and for image and CSS imports.[^14]

In a project using `references`, the type check is run with `tsc -b` *(`--build`)*; that command finds the referenced projects and checks them in the right order.[^15] The template's `build` script is `tsc -b && vite build`.

> [!CAUTION]
>
> Running `npx tsc --noEmit` in the root checks no files at all in this template, because the root `tsconfig.json` is empty. The command succeeds even when there are errors. Use `npx tsc -b` or `npx tsc --noEmit -p tsconfig.app.json`.

## tsconfig in Next.js

A [!nextjs] project created with `create-next-app` comes with a `tsconfig.json` ready; in an existing project, turning a file into `.ts` and running `next dev` makes Next.js create the file itself.[^16] The generated file has `strict`, `noEmit`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `isolatedModules`, the `@/*` path alias and Next.js's editor plugin *(`"plugins": [{ "name": "next" }]`)*. It also produces a type file called `next-env.d.ts`, which should not be edited by hand.[^16]

`next build` stops the build if there is a type error. `typescript.ignoreBuildErrors` turns that check off; the documentation only recommends it if you run the type check somewhere else.[^16]

## Path aliases

To write `@/components/ProductCard` instead of a long relative path such as `../../../components/ProductCard`, you use `paths`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

`paths` only tells TypeScript about the mapping; it does not change the imports in the output. The bundler has to know the mapping at runtime as well.[^4] In Vite you turn on the `resolve: { tsconfigPaths: true }` setting in `vite.config.ts` for that.[^14] Next.js reads `paths` itself.

> [!WARNING]
>
> Older guides show `"baseUrl": "."` alongside `paths`. `baseUrl` was deprecated in TypeScript 6.0 and removed entirely in TypeScript 7, where it gives `Option 'baseUrl' has been removed.`[^5][^6] Write the paths with a leading `./` and no `baseUrl`.

## @types packages and .d.ts

The types for a library written in JavaScript live in **declaration** *(`.d.ts`)* files. Many packages ship those files themselves; for the ones that do not, community-written types are published under the `@types/` prefix *(`@types/react`, `@types/node`)*.[^17] If importing a package gives you "Could not find a declaration file", try `npm install -D @types/<package-name>` first.

From TypeScript 6.0 on, the default for the `types` setting is an empty array: global types *(Node's `process`, for instance)* are no longer loaded on their own, and you have to write something like `"types": ["node"]` explicitly.[^5] That is why the `types` lines in the Vite template are there.

## typescript-eslint

`tsc` finds type errors; a linter finds patterns that are wrong but type-correct, such as an unawaited promise. TypeScript support for [!eslint] comes from typescript-eslint. For rules that use type information you pick the `recommendedTypeChecked` configuration, or the stricter `strictTypeChecked`, and turn on `projectService`:[^18]

```js
// eslint.config.mjs
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig({
  files: ["**/*.{ts,tsx}"],
  extends: [
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
  ],
  languageOptions: {
    parserOptions: {
      projectService: true,
    },
  },
});
```

typescript-eslint only recommends `strictTypeChecked` if a good part of the team is experienced in TypeScript.[^19]

> [!NOTE]
>
> typescript-eslint currently supports TypeScript versions in the range `>=4.8.4 <6.1.0`.[^20] Because TypeScript 7 does not offer an API yet, the TypeScript team recommends keeping 6.0 alongside it for tools such as linters, through the `@typescript/typescript6` package.[^6] The current Vite template, meanwhile, ships with `oxlint` rather than ESLint.

## Type checking in CI

Since the bundler does no type checking, the way to guarantee that broken code does not reach the main branch is to run `tsc` in CI.[^21] First add a script to `package.json`:

```json
{
  "scripts": {
    "typecheck": "tsc -b"
  }
}
```

In Next.js, or any project with a single tsconfig, the value is `tsc --noEmit`. In a [!github] Actions workflow, running that script as a step is all it takes:[^22]

```yaml
      - run: npm ci
      - run: npm run typecheck
```

If a pull request has a type error, this step turns red. The whole workflow *(triggers, caching, permissions)* is in the [CI/CD (GitHub Actions)](/academy/production/cicd) lesson.

## Try it yourself

- Add `"noUncheckedIndexedAccess": true` to the Vite template's `tsconfig.app.json` and see how many new errors `npx tsc -b` reports.
- Turn `strict` off and on from the TS Playground's **TS Config** menu; watch which errors disappear on the same code.
- Set up the `@/*` alias with both `paths` and `resolve.tsconfigPaths`; then turn only one of them on and compare how the editor and `vite build` behave.
- Put a deliberate type error in a file and watch the CI workflow turn red.

## Going deeper

- **Article:** [Matt Pocock](https://www.mattpocock.com/)'s TSConfig Cheat Sheet; ready-made blocks for projects with and without a bundler.[^8]
- **Book:** the "Configuring TypeScript" chapter of Matt Pocock's Total TypeScript Essentials; `extends`, `lib`, `jsx` and project references.[^23]
- **Official docs:** the TSConfig Reference; every setting with a description and an example.[^4]
- **Official docs:** typescript-eslint's "Linting with Type Information" guide.[^18]
- **Article:** the TypeScript 6.0 announcement; the changed defaults and writing `paths` without `baseUrl`.[^5]

## Sources

1. [TypeScript Handbook: What is a tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) *(doc)* — The project root, `tsc` searching for the file, and ready-made base settings through `extends`.
2. [TSConfig Reference: Root Fields](https://www.typescriptlang.org/tsconfig/) *(doc)* — Descriptions of `include`, `extends`, `references`, `noUnusedLocals` and `noUnusedParameters`.
3. [TypeScript Handbook: The Basics — Strictness](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#strictness) *(doc)* — Strictness working like a dial, `noImplicitAny` and `strictNullChecks`.
4. [TSConfig Reference: strict](https://www.typescriptlang.org/tsconfig/#strict) *(doc)* — The flags in the strict family, `exactOptionalPropertyTypes`, `moduleResolution: bundler` and `paths`.
5. [Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) *(article)* — The `strict` and `types: []` defaults, `baseUrl` being deprecated, and how to write `paths`.
6. [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) *(article)* — The 7.0 defaults, the removed settings, and tool compatibility through `@typescript/typescript6`.
7. [TSConfig Reference: noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html) *(doc)* — `undefined` being added to index signature access, with an example.
8. [Matt Pocock](https://www.mattpocock.com/): [The TSConfig Cheat Sheet](https://www.totaltypescript.com/tsconfig-cheat-sheet) *(article)* — The recommended base and strict settings, and the case for `noUncheckedIndexedAccess` and `skipLibCheck`.
9. [react.dev: Using TypeScript](https://react.dev/learn/typescript) *(doc)* — A React project needing `dom` in `lib` and a valid `jsx` setting.
10. [TSConfig Reference: jsx](https://www.typescriptlang.org/tsconfig/jsx.html) *(doc)* — The `react/jsx-runtime` transform with `react-jsx`.
11. [TSConfig Reference: verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html) *(doc)* — Imports marked `type` being erased and the rest left as they are.
12. [TSConfig Reference: isolatedModules](https://www.typescriptlang.org/tsconfig/isolatedModules.html) *(doc)* — The limits of transformers that work one file at a time.
13. [Announcing TypeScript 5.8](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8) *(article)* — The introduction of the `--erasableSyntaxOnly` flag and the reasoning behind it.
14. [Vite: Features — TypeScript](https://vite.dev/guide/features#typescript) *(doc)* — No type checking, the `isolatedModules` recommendation and the `vite/client` types; for `resolve.tsconfigPaths`, see [Shared Options](https://vite.dev/config/shared-options).
15. [TypeScript Handbook: Project References](https://www.typescriptlang.org/docs/handbook/project-references.html) *(doc)* — `references`, and `tsc -b` building the projects in the right order.
16. [Next.js: TypeScript](https://nextjs.org/docs/app/api-reference/config/typescript) *(doc)* — The automatic `tsconfig.json`, `next-env.d.ts`, type checking during the build and `ignoreBuildErrors`.
17. [TypeScript Handbook: Consumption](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html) *(doc)* — Installing `@types/` packages, and packages that bring their own types.
18. [typescript-eslint: Linting with Type Information](https://typescript-eslint.io/getting-started/typed-linting) *(doc)* — An example configuration with `recommendedTypeChecked`, `strictTypeChecked` and `projectService`.
19. [typescript-eslint: Shared Configs](https://typescript-eslint.io/users/configs) *(doc)* — The ready-made configurations, and the warning about `strict-type-checked`.
20. [typescript-eslint: Dependency Versions](https://typescript-eslint.io/users/dependency-versions) *(doc)* — The supported TypeScript version range.
21. [Matt Pocock](https://www.mattpocock.com/): [TypeScript In The Development Pipeline](https://www.totaltypescript.com/books/total-typescript-essentials/typescript-in-the-development-pipeline) *(article)* — Using `tsc --noEmit` like a linter, and type checking in CI.
22. [GitHub Docs: Building and testing Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs) *(doc)* — `actions/checkout`, `actions/setup-node`, the npm cache and `npm ci`.
23. [Matt Pocock](https://www.mattpocock.com/): [Configuring TypeScript](https://www.totaltypescript.com/books/total-typescript-essentials/configuring-typescript) *(article)* — The base configuration, `strict`, `isolatedModules`, `verbatimModuleSyntax` and project references.
