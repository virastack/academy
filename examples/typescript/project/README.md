# A product catalogue

The working version of the project lesson in the [TypeScript guide](https://virastack.com/academy/typescript/project). Compare against it when you get stuck.

A small store page set up with Vite's `react-ts` template: it fetches the products from `public/products.json`, puts them through the `isProduct` type guard, filters them by category and adds them to the cart.

## Running it

```bash
npm install
npm run dev
```

## Type checking and the build

```bash
npm run build
```

`npm run build` type-checks with `tsc -b` first and then builds with Vite. Because the root `tsconfig.json` holds nothing but `references`, `npx tsc --noEmit` checks no files at all; use `tsc -b`.

| File | What it teaches |
| :-- | :-- |
| `src/types.ts` | `Category` derived with `as const`, `Product`, `CartItem`, `FetchState<T>` |
| `src/api.ts` | Narrowing `unknown` data with the `isProduct` type guard |
| `src/use-fetch.ts` | The generic `useFetch<T>` hook |
| `src/components/` | Prop types and `ChangeEvent` |
| `src/cart-context.ts`, `src/CartProvider.tsx` | A typed context and `useReducer` |
| `tsconfig.app.json` | `strict` and `noUncheckedIndexedAccess` |
