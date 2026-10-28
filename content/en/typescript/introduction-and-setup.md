---
title: "Introduction and setup"
description: "What TypeScript is, why it is used and type checking in a first project."
lastVerified: "2026-10-17"
translationKey: "typescript/introduction-and-setup"
---

## What TypeScript is

[!typescript] is a language that adds a **static type** system on top of JavaScript. It contains all of JavaScript's features; every piece of working JavaScript is also valid TypeScript.[^1] That is why TypeScript is called a **superset** of JavaScript.

The difference is this: you write down which type a variable, a function parameter or an object has *(or you let TypeScript work it out)*, and before the code runs, a **type checker** checks whether those types are consistent.[^2]

This lesson covers what TypeScript is, how it is installed in a project and where the type checking happens. Writing the types themselves comes step by step in the lessons that follow.

## Why use it

JavaScript is dynamically typed: a variable's type is only known once the code runs. TypeScript gives you that information while you are writing. There are three concrete benefits:

- **Errors show up before you run anything.** A value of the wrong type, a misspelled property, a function you forgot to call: all of them get a red line in the editor.[^2]
- **The editor knows your code.** Autocomplete shows which fields an object has and which parameters a function expects.
- **Changing things is safe.** Rename a field and every file that uses it reports an error; nothing slips past you.

The industry went the same way. In the State of JS 2025 survey, 40% of respondents said they write TypeScript only *(34% in 2024)*; missing static types is still named as JavaScript's biggest pain point.[^3]

### A first example

Think of a simple piece of JavaScript that works out a cart total. One of the prices arrived from the API as text:

```js
const cart = [
  { name: "Wireless Headphones", price: 1299 },
  { name: "Phone Case", price: "249" },
];

const total = cart.reduce((sum, item) => sum + item.price, 0);
console.log(total); // "1299249" — string concatenation, not addition
```

JavaScript raises nothing; it quietly produces the wrong answer. Write the same code in TypeScript, describing the shape of a cart item, and the error is caught before the code runs:

```ts
type CartItem = {
  name: string;
  price: number;
};

const cart: CartItem[] = [
  { name: "Wireless Headphones", price: 1299 },
  { name: "Phone Case", price: "249" },
  // Error: Type 'string' is not assignable to type 'number'.
];
```

Defining types with `type` is covered in detail in [Interface, type and union](/academy/typescript/interfaces-types-and-unions).

## Types do not exist at runtime

Browsers and Node.js do not understand TypeScript types. Before the code runs the types are stripped, and what is left is plain JavaScript. As the Handbook puts it, type annotations never change the runtime behaviour of the program.[^2]

```ts
// What you write
function formatPrice(price: number): string {
  return `€${price}`;
}

// What runs (after the types are erased)
function formatPrice(price) {
  return `€${price}`;
}
```

> [!WARNING]
>
> TypeScript only checks the code **you wrote**. Data from `fetch`, the result of `JSON.parse` and form input all arrive at runtime and pass through no type check at all. Giving an API response the `Product` type does not guarantee the data really looks like that. Narrowing that kind of data safely is covered in [Narrowing and type guards](/academy/typescript/narrowing-and-type-guards), and validating it with a schema in the [!zod] lesson on the Forms track.

## Try it in the Playground

The shortest way to try something without installing anything is the TypeScript Playground.[^4] You write code on the left, errors appear underlined straight away, and on the right you watch the JavaScript output with the types stripped. You can share what you wrote as a link, which is very handy when asking a question.

Paste the cart example above into the Playground and try hovering over the `price: "249"` line.

## .ts and .tsx

TypeScript files use the `.ts` extension. Any file that contains JSX has to be `.tsx`; the extension is what tells TypeScript there is JSX in the file.[^5]

| File | Extension |
| :-- | :-- |
| Type definitions, helper functions, API calls | `types.ts`, `format-price.ts` |
| React components | `ProductCard.tsx`, `App.tsx` |

## A new project: React and TypeScript with Vite

The easiest way to start a TypeScript project with [!react] is [!vite]'s `react-ts` template.[^6]

```command
npm create vite@latest my-store -- --template react-ts
```

The template comes with `src/main.tsx` and `src/App.tsx` ready, and three tsconfig files in the root *(`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`)*. The `build` script in `package.json` is `tsc -b && vite build`: the type check runs first, and the build stops if there is an error.

> [!NOTE]
>
> As of October 2026 the `create-vite` 9.2 template installs the `typescript` package as `~6.0.2`, while the latest release on npm is 7.0. The reason for the gap is in the TypeScript 7 section below.

The tsconfig files tell the compiler which files to check and under which rules; the detail is in [tsconfig and strict mode](/academy/typescript/tsconfig-and-strict-mode).

## Adding it to an existing project

TypeScript is an npm package, and it brings a compiler command called `tsc`.[^2] Install it as a development dependency:

```command
npm install -D typescript
```

Then create a `tsconfig.json`:

```command
npx tsc --init
```

In TypeScript 7 this command produces a file with the recommended settings such as `strict`, `noUncheckedIndexedAccess` and `verbatimModuleSyntax` turned on. In a React project you also need the `@types/react` and `@types/react-dom` packages.[^5] After that you can start turning files into `.ts` / `.tsx` one at a time; the JavaScript files keep working.

## Who does the type checking?

This is the point newcomers to TypeScript skip most often. TypeScript does two separate jobs in a project, and different tools do them:

| Job | Who does it |
| :-- | :-- |
| Stripping the types and producing JavaScript | Vite *(Oxc)*, Next.js *(SWC)*, esbuild, Node.js |
| Checking whether the types are correct | `tsc` and the editor |

Vite only transforms `.ts` files and **does no type checking**; its documentation leaves that job to the editor and the build process.[^7] So the development server will happily run code with a type error in it. Next.js also compiles with SWC during development, while `next build` does type check by default and stops the build on an error.[^8]

That is why you run the type check separately:

```command
npx tsc --noEmit
```

`--noEmit` only checks, without producing JavaScript files. In the Vite template the right command is `npx tsc -b`.

> [!CAUTION]
>
> The root `tsconfig.json` in the Vite template contains no files of its own *(`"files": []`)*; it only references the other two. Running `npx tsc --noEmit` in the root therefore checks nothing and succeeds even when there are errors. Use `npx tsc -b` in Vite projects.

In practice you see type errors in three places: in the editor as you write, during the build, and in CI. The CI step is set up in [tsconfig and strict mode](/academy/typescript/tsconfig-and-strict-mode).

## Running it directly with Node.js

From versions 22.18 and 23.6 on, [!nodejs] can run `.ts` files with no extra tooling; the feature became stable in 24.12 and 25.2.[^9] Node replaces the type syntax with whitespace and runs the code, which is called **type stripping**.

```command
node price.ts
```

The approach has two limits:[^9]

- **There is no type checking.** Badly typed code runs too; you still need `tsc` to check it.
- **Only erasable syntax is supported.** `enum`, `namespace` with runtime code, and class parameter properties all need a transform, so they are not supported. `.tsx` files do not run either, and `tsconfig.json` is not read.

It is ideal for scripts and small tools. In a React application, Vite or Next.js does this job.

## TypeScript 7

TypeScript 7, released on July 8, 2026, is the **native** version of the compiler, ported to the Go language. It is typically 8 to 12 times faster on a full build; installing it and the `tsc` command stay the same.[^10] `strict` is now on by default.

TypeScript 7 does not offer a JavaScript API yet. Tools that use TypeScript as a library *(typescript-eslint, Vue and Svelte among them)* work with 6.0 for now, and the `@typescript/typescript6` package was published for that.[^10] That is why the Vite template still installs 6.0. Next.js, on the other hand, uses the project's own `tsc` command during `next build`, so it works with TypeScript 7 directly.[^8]

If you are just starting out, the split barely affects you: code that compiles cleanly on 6.0 compiles the same way on 7.0.[^10]

## Try it yourself

- Write the `CartItem` type from the first example in the Playground, make `price` a string and read the error message.
- Misspell a field name in the same code *(`item.prise`)* and look at what TypeScript suggests.
- Create a `react-ts` project with `npm create vite@latest`, put a deliberate type error in `App.tsx`, and while `npm run dev` is running, find it with `npx tsc -b`.
- Write a `price.ts` file and run it with `node price.ts`.

## Going deeper

- **Official docs:** the "The Basics" chapter of the TypeScript Handbook; static type checking, `tsc` and erased types.[^2]
- **Book:** the "TypeScript In The Development Pipeline" chapter of [Matt Pocock](https://www.mattpocock.com/)'s Total TypeScript Essentials, readable online.[^11]
- **Book:** [Dan Vanderkam](https://danvk.org/)'s Effective TypeScript *(2nd edition, 2024, 83 items)*.[^12]
- **Talk:** Anders Hejlsberg's "A 10x faster TypeScript" on porting the compiler to Go *(Microsoft Developer, 2025, 14 min)*.[^13]
- **Practice:** every example in this lesson runs in the TypeScript Playground.[^4]

## Sources

1. [TypeScript Handbook: TypeScript for JavaScript Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html) *(doc)* — Existing JavaScript code also being TypeScript, and type inference.
2. [TypeScript Handbook: The Basics](https://www.typescriptlang.org/docs/handbook/2/basic-types.html) *(doc)* — Static type checking, installing `tsc`, "Erased Types" and the strict settings.
3. [InfoQ: State of JavaScript 2025](https://www.infoq.com/news/2026/03/state-of-js-survey-2025) *(research)* — 40% of respondents writing TypeScript only; missing static types as the biggest pain point.
4. [TypeScript Playground](https://www.typescriptlang.org/play/) *(doc)* — Writing TypeScript in the browser, the output and a shareable link.
5. [react.dev: Using TypeScript](https://react.dev/learn/typescript) *(doc)* — Files with JSX being `.tsx`, and adding `@types/react` to an existing project.
6. [Vite: Getting Started](https://vite.dev/guide/) *(doc)* — The `npm create vite@latest` command, the `--template` flag and the Node.js version requirement.
7. [Vite: Features — TypeScript](https://vite.dev/guide/features#typescript) *(doc)* — Vite only transforming, doing no type checking, and the `tsc --noEmit` recommendation.
8. [Next.js: TypeScript](https://nextjs.org/docs/app/api-reference/config/typescript) *(doc)* — Type checking during `next build`, `ignoreBuildErrors` and use with TypeScript 7.
9. [Node.js: Modules — TypeScript](https://nodejs.org/api/typescript.html) *(doc)* — The versions where type stripping is the default, the unsupported syntax and the absence of type checking.
10. [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) *(article)* — The native compiler, the 8–12x speed-up, the new defaults and tool compatibility through `@typescript/typescript6`.
11. [Matt Pocock](https://www.mattpocock.com/): [TypeScript In The Development Pipeline](https://www.totaltypescript.com/books/total-typescript-essentials/typescript-in-the-development-pipeline) *(article)* — The browser not being able to run TypeScript, Vite not type checking, and `tsc --noEmit` in CI.
12. [Dan Vanderkam](https://danvk.org/): [Effective TypeScript](https://effectivetypescript.com/) *(article)* — The 83-item book, and a blog of TypeScript writing.
13. [Anders Hejlsberg: A 10x faster TypeScript](https://www.youtube.com/watch?v=pNlq-EVld70) *(video)* — About 14 minutes. The decision to go native with Go, and the first measurements.
