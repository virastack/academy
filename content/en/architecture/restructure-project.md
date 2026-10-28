---
title: "Restructuring a project"
description: "Moving a messy e-commerce project to a feature-based structure."
lastVerified: "2026-10-22"
translationKey: "architecture/restructure-project"
---

## Scenario

You have a small store. The products are listed, they are added to the cart, the detail page opens. The application works but its structure is a mess:

| The problem | Where |
| :-- | :-- |
| The files are arranged by type | `components/`, `hooks/`, `utils/`, `types/` |
| Generic file names | `utils/utils.ts`, `types/types.ts` |
| `PascalCase` file names | `ProductCard.tsx`, `useCart.ts` |
| `../../../` imports | `app/products/[slug]/page.tsx` |
| An `export *` barrel and a cycle | `components/index.ts` with `hooks/useCart.ts` |
| The product card knows about the cart | `AddToCartButton` inside `ProductCard` |

Your job is to move this project to the structure from the [Folder structure and naming](/academy/architecture/folder-structure) and [Component and code organisation](/academy/architecture/component-organization) lessons. There is one rule: the user must see no difference.

The starter and the solution are on GitHub: [examples/architecture/restructure-project](https://github.com/virastack/academy/tree/main/examples/architecture/restructure-project). Start from the `starter/` folder and compare with `solution/` when you get stuck.

> [!NOTE]
>
> The project was written with `next@16.4.2`, `eslint@9.39.5` and `@playwright/test@1.64.1`. The tests were run in Chromium against a production build.

## Step 1: Run the test first

In [Martin Fowler](https://martinfowler.com)'s definition, refactoring is restructuring the code's internals *without changing its observable behaviour*.[^1] The way to know the behaviour did not change is a test.

A Playwright test is ready in the project. It adds products to the cart and checks the summary in the header:

```ts
// e2e/cart.spec.ts
await page.getByRole("button", { name: "Add Mechanical Keyboard to cart" }).click();
await page.getByRole("button", { name: "Add Wireless Mouse to cart" }).click();
await expect(summary).toHaveText("Cart: 2 items, €3,398.00");
```

```command
cd starter
npm install
npx playwright install chromium
npm run test:e2e
```

Two tests should pass. The test knows nothing about the file paths, the component names or the state; it only looks at what the user sees. [Kent C. Dodds](https://kentcdodds.com) writes that tests tied to internal details break during a refactoring while the code is sound.[^2] This test, on the other hand, will not change at all during the move.

## Step 2: Add the rules

Turn the rules on at the very start. The lint errors become the list of things to do.

```js
// eslint.config.mjs
{
  files: ["src/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{ regex: "^\\.\\./", message: "Use the `@/` alias instead of `../`." }],
    }],
    "import/no-cycle": "error",
    "import/no-restricted-paths": ["error", {
      zones: [
        { target: "./src/features/cart", from: "./src/features", except: ["./cart"] },
        { target: "./src/features/products", from: "./src/features", except: ["./products"] },
        { target: "./src/features", from: "./src/app" },
        { target: ["./src/components", "./src/helpers"], from: ["./src/features", "./src/app"] },
      ],
    }],
  },
},
```

`eslint-config-next` already registers the `import` plugin, so you do not have to install it separately.

- `no-restricted-imports` forbids only the imports starting with `../`.[^3]
- `import/no-cycle` finds circular imports.[^4]
- `import/no-restricted-paths` stops the features importing each other and the flow being reversed.[^5]

> [!WARNING]
>
> Do not use the `import/no-relative-parent-imports` rule for the `../` ban. The rule looks at the resolved file path. In a trial it counted aliased imports such as `@/components/ui/button` as errors too.

```command
npm run lint
```

```text
src/components/CartSummary.tsx
  3:1  error  '../hooks/useCart' import is restricted from being used by a pattern. Use the `@/` alias instead of `../`  no-restricted-imports
  3:1  error  Dependency cycle via ../components:3  import/no-cycle

✖ 22 problems (22 errors, 0 warnings)
```

The zone errors do not appear yet, because there is no `features/` folder. They will show up during the move.

## Step 3: Separate the shared code

`utils/utils.ts` holds three different jobs together. Move each function to where it is used:

| Function | Its new place | Why |
| :-- | :-- | :-- |
| `formatPrice` | `helpers/format-price.ts` | Both the product and the cart use it |
| `getCartTotal` | `features/cart/helpers/cart-total.ts` | Only the cart uses it |
| `getProductBySlug` | `features/products/data/products.ts` | It should sit with the product data |

`Button` is a shared part of two features too; it goes to `components/ui/button.tsx`. `types/types.ts` is split in two: `Product` to the product, `CartItem` to the cart.

Only the code two features really share moves to the shared layer.[^6] The rest stays inside the feature; as [Kent C. Dodds](https://kentcdodds.com) says, code stays close to where it is relevant.[^7]

## Step 4: Move the features

```text
src/
├── app/
├── components/ui/button.tsx
├── helpers/format-price.ts
└── features/
    ├── products/
    │   ├── components/product-card.tsx
    │   ├── data/products.ts
    │   ├── types/product.ts
    │   └── index.ts
    └── cart/
        ├── components/{cart-provider,cart-summary,add-to-cart-button}.tsx
        ├── helpers/cart-total.ts
        ├── types/cart-item.ts
        └── index.ts
```

Make the file names `kebab-case`. CI, running on Linux, distinguishes upper and lower case; picking one spelling prevents the *"Module not found"* surprise in production.[^8] Write the imports with `@/`; `create-next-app` sets that alias up itself.[^9]

## Step 5: Break the cycle

At the start the cycle is built like this: `CartSummary` → `hooks/useCart` → `components/index.ts` → `CartSummary`. The `export *` barrel ties everything to everything.

Two changes are enough:

1. Move `useCart` into `cart-provider.tsx`. The context and the hook live in the same file.
2. Keep the `index.ts` at the feature's root thin: only the parts the outside uses, as named re-exports.[^10]

```ts
// features/cart/index.ts
export { AddToCartButton } from "./components/add-to-cart-button";
export { CartProvider } from "./components/cart-provider";
export { CartSummary } from "./components/cart-summary";
export type { CartItem } from "./types/cart-item";
```

The feature's own files import each other directly by file path, not through `index.ts`. [TkDodo](https://tkdodo.eu) explains how easily barrels lead to circular imports.[^11]

## Step 6: Separate the features

When you move the `ProductCard` file to `features/products`, lint says:

```text
src/features/products/components/product-card.tsx
  2:33  error  Unexpected path "@/features/cart" imported in restricted zone  import/no-restricted-paths
```

The product card should not know about the cart. Pass the button from outside the card, with a prop:

```tsx
// features/products/components/product-card.tsx
export function ProductCard({ product, action }: { product: Product; action?: React.ReactNode }) {
  return (
    <article className="card">
      <h2><Link href={`/products/${product.slug}`}>{product.name}</Link></h2>
      <p>{formatPrice(product.price)}</p>
      {action}
    </article>
  );
}
```

```tsx
// app/page.tsx
<ProductCard product={product} action={<AddToCartButton {...product} />} />
```

Combining two features is the page's job. The flow stays one-way: shared code → features → the application.[^6]

## Step 7: The final check

```command
npm run lint && npm run typecheck && npm run test:e2e
```

All three should pass without errors. If the test file passes without a single line changing, the move preserved the behaviour.

> [!TIP]
>
> If you are going to hand this job to a coding agent, do steps 1 and 2 yourself first. The test and the lint become a target the agent can check its own work against.

## Try it yourself

- Import `@/features/cart/components/cart-provider` from inside `features/products` and see the error.
- Add a `checkout` feature. Write its own line into the zone list; if it needs the cart total, decide where you have to move `cartTotal`.
- Write `features/cart/index.ts` with `export *`, then import `useCart` from there and look at the `import/no-cycle` output.

## Sources

1. [Martin Fowler: Definition Of Refactoring](https://martinfowler.com/bliki/DefinitionOfRefactoring.html) *(article)* — The definition of refactoring: restructuring the internals without changing the observable behaviour. September 1, 2004.
2. [Kent C. Dodds: Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details) *(article)* — Tests tied to internal details giving false alarms during a refactoring. August 17, 2020.
3. [ESLint: no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports) *(doc)* — Restricting import paths with `regex` inside `patterns`.
4. [eslint-plugin-import: no-cycle](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-cycle.md) *(repo)* — Detecting circular imports, and `maxDepth`.
5. [eslint-plugin-import: no-restricted-paths](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md) *(repo)* — The ban on imports between folders with `target`, `from` and `except`.
6. [bulletproof-react: Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) *(repo)* — The feature folders, the ban on imports between features and the one-way flow.
7. [Kent C. Dodds: Colocation](https://kentcdodds.com/blog/colocation) *(article)* — The principle of putting code close to where it is relevant. June 17, 2019.
8. [joulev/nextjs-faq: "Module not found" on deployment](https://github.com/joulev/nextjs-faq/blob/main/content/module-not-found-due-to-case-sensitivity.mdx) *(article)* — Imports that break in production because of case sensitivity.
9. [Next.js: Installation](https://nextjs.org/docs/app/getting-started/installation) *(doc)* — The `@/*` alias and absolute imports.
10. [Feature-Sliced Design: Public API](https://feature-sliced.design/docs/reference/public-api) *(doc)* — `index.ts` as a feature's outward contract, and the `export *` problem.
11. [TkDodo: Please Stop Using Barrel Files](https://tkdodo.eu/blog/please-stop-using-barrel-files) *(article)* — The effect of barrel files on circular imports and on speed. July 26, 2024.
