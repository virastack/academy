---
title: "Setup"
description: "Installing Vitest, jsdom and React Testing Library."
lastVerified: "2026-10-14"
translationKey: "vitest/setup"
---

## Requirements

- Node.js 22.12 or newer.
- Vite 6.4 or newer.
- React 18 or 19.

These are the requirements for Vitest 5.[^1] If your project was created with Vite, no extra setup is needed.

## Install the packages

```command
npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```

| Package | What it's for |
| --- | --- |
| `vitest` | The test runner |
| `jsdom` | The DOM environment |
| `@testing-library/react` | `render`, `screen` and `renderHook` |
| `@testing-library/dom` | React Testing Library's peer dependency |
| `@testing-library/jest-dom` | The DOM matchers |
| `@testing-library/user-event` | User interaction |

> [!WARNING]
>
> Install the `@testing-library/dom` package separately. React Testing Library does not install it for you.[^2]

## The Vitest setting

Add a `test` block to `vite.config.ts`. Take the `defineConfig` function from the `vitest/config` package.

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/vitest.setup.ts"],
  },
});
```

| Setting | Meaning |
| --- | --- |
| `environment: "jsdom"` | The tests run in the jsdom environment. Because the default environment is `node`, `document` is undefined without this setting.[^3] |
| `globals: true` | You use the `describe`, `test`, `expect` and `vi` functions without importing them.[^4] |
| `setupFiles` | The file that runs before every test file.[^5] |

## The setup file

Create `src/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

This line adds matchers such as `toBeInTheDocument` to Vitest.[^6]

## TypeScript types

Add two packages to the `types` list in `tsconfig.app.json`. If your project has a single `tsconfig.json`, use that file.[^4]

```json
{
  "compilerOptions": {
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  }
}
```

## The scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

| Command | Behaviour |
| --- | --- |
| `npm test` | Watch mode. When a file changes, the related tests run again.[^7] |
| `npm run test:run` | Runs the tests once. Use this one in CI. |

Vitest writes its report files to the `.vitest` folder. Add that folder to `.gitignore`:[^1]

```bash
.vitest/
```

## The first test

For our e-commerce example, create the `Product` type first. File: `src/types.ts`.

```ts
export type Product = {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
};
```

Write a function that formats the price in euros. File: `src/format-price.ts`.

```ts
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}
```

Write a component that shows the product's name and price. File: `src/ProductCard.tsx`.

```tsx
import { formatPrice } from "./format-price";
import type { Product } from "./types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article>
      <h2>{product.name}</h2>
      <p>{formatPrice(product.price)}</p>
    </article>
  );
}
```

Now write the test. File: `src/ProductCard.test.tsx`.

```tsx
import { render, screen } from "@testing-library/react";
import { ProductCard } from "./ProductCard";

test("shows the product name and price", () => {
  render(
    <ProductCard
      product={{ id: 1, name: "Wireless Headphones", price: 1299, inStock: true }}
    />,
  );

  expect(
    screen.getByRole("heading", { name: "Wireless Headphones" }),
  ).toBeInTheDocument();
  expect(screen.getByText("€1,299.00")).toBeInTheDocument();
});
```

Run the test:

```bash
npm run test:run
```

If the test passes, the setup is done. Vitest runs the files whose names contain `.test.` or `.spec.`.[^8] Put the test file next to the file it tests.

<details>
<summary>Common setup errors</summary>

- `document is not defined`: the test environment is still `node`. Add the `environment: "jsdom"` setting.
- `Invalid Chai property: toBeInTheDocument`: the setup file was not loaded. Check the `setupFiles` path.
- TypeScript complains about `toBeInTheDocument`: add `@testing-library/jest-dom` to the `types` list.
- `Cannot find module '@testing-library/dom'`: the peer dependency is missing. Install the package.

</details>

<details>
<summary>globals: false and Next.js</summary>

- If you use `globals: false`, import the `test`, `expect` and `vi` functions from the `vitest` package in every test file. React Testing Library's automatic cleanup depends on the global `afterEach` function, so in that case call `afterEach(() => cleanup())` in the setup file.[^4]
- In Next.js projects Vitest works for Client Components and synchronous Server Components. Use an E2E test for `async` Server Components.[^9]

</details>

## Try it yourself

- Create the file `src/format-price.test.ts`.
- Test that `formatPrice(0)` returns `€0.00`.
- Break the expected value on purpose. Watch the test fail.
- Fix the expected value. Watch the test pass.

## Sources

1. [Vitest: Getting Started](https://vitest.dev/guide/) *(doc)* — The Vite and Node requirements, the install command and the `.vitest` folder.
2. [React Testing Library: Introduction](https://testing-library.com/docs/react-testing-library/intro) *(doc)* — Installing `@testing-library/react`, and the `@testing-library/dom` peer dependency.
3. [Vitest: environment](https://vitest.dev/config/environment) *(doc)* — The default `node` environment, and installing jsdom separately.
4. [Vitest: globals](https://vitest.dev/config/globals) *(doc)* — The `globals` setting, the `vitest/globals` type and React Testing Library's automatic cleanup.
5. [Vitest: setupFiles](https://vitest.dev/config/setupfiles) *(doc)* — Setup files running before every test file.
6. [jest-dom](https://github.com/testing-library/jest-dom) *(repo)* — The `@testing-library/jest-dom/vitest` import for Vitest.
7. [Vitest: Features](https://vitest.dev/guide/features) *(doc)* — Only the related tests re-running in watch mode.
8. [Vitest: include](https://vitest.dev/config/include) *(doc)* — The default test file pattern: `.test.` and `.spec.`.
9. [Next.js: Testing with Vitest](https://nextjs.org/docs/app/guides/testing/vitest) *(doc)* — `async` Server Components not being supported by Vitest, and the E2E recommendation.
