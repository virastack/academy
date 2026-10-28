# Store tests

The working version of the three project lessons in the [Vitest guide](https://virastack.com/academy/vitest): the Product Card, the Product List and the Cart Flow. Compare against it when you get stuck.

A project set up with Vite's `react-ts` template, with Vitest, jsdom, React Testing Library and MSW added as in the [Setup](https://virastack.com/academy/vitest/setup) lesson.

## Running it

```bash
npm install
npm test          # watch mode
npm run test:run  # once, for CI
```

For the demo page, `npm run dev`. The real API (`api.shop.test`) exists only in the tests, through MSW; the demo page loads the same products locally.

## Type checking

```bash
npm run build
```

`tsc -b` checks the test files too.

| File | Lesson |
| :-- | :-- |
| `src/ProductCard.tsx`, `src/ProductCard.test.tsx` | The Product Card |
| `src/ProductList.tsx`, `src/ProductList.test.tsx` | The Product List |
| `src/cart-context.tsx`, `src/cart-components.tsx`, `src/test-utils.tsx`, `src/cart.test.tsx` | Provider and hook |
| `src/fetch-products.ts`, `src/mocks/`, `src/fetch-products.test.tsx` | Mocking |
| `src/ShopPage.tsx`, `src/ShopPage.test.tsx` | The Cart Flow |
| `vite.config.ts`, `src/vitest.setup.ts` | Setup and mocking |

`cart.test.tsx` gathers the component tests and the hook test from the Provider and hook lesson into one file; the hook test uses the same `keyboard` data.
