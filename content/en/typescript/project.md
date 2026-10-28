---
title: "Typed product catalogue"
description: "Building a product list, a filter and a cart with types end to end."
lastVerified: "2026-10-17"
translationKey: "typescript/project"
---

## Scenario

You are going to build a small shop page. The page:

- Loads products from a JSON file, and shows an error if the data is broken.
- Filters the products by category.
- Adds a product to the cart with an **Add to cart** button, and shows how many item types are in the cart and the total.
- Disables the button for a product that is out of stock.

The goal is not the design but the types flowing end to end: the `unknown` data from the JSON passes through a type guard, reaches the components as `Product`, and becomes a `CartItem` in the cart.

| Part | File | Lesson |
| :-- | :-- | :-- |
| `Product`, `CartItem`, `Category` | `types.ts` | Interface, type and union; Utility types |
| The `FetchState<T>` discriminated union | `types.ts` | Narrowing and type guards |
| The `isProduct` type guard | `api.ts` | Narrowing and type guards |
| `useFetch<T>` | `use-fetch.ts` | Generics |
| Props, `ChangeEvent`, context, `useReducer` | `components/*.tsx`, `cart-context.ts`, `CartProvider.tsx` | Types in React |
| `strict`, `noUncheckedIndexedAccess`, `tsc -b` | `tsconfig.app.json` | tsconfig and strict mode |

The working version is on GitHub: [examples/typescript/project](https://github.com/virastack/academy/tree/main/examples/typescript/project). Compare against it when you get stuck.

## Step 1: Set up the project

Start a new project with [!vite]'s `react-ts` template.[^1] Vite needs Node.js 20.19+ or 22.12+.

```command
npm create vite@latest product-catalog -- --template react-ts
```

Go into the `product-catalog` folder and install the dependencies with `npm install`. The template installs the `typescript`, `@types/react` and `@types/react-dom` packages too.

The template comes with a `src/App.css` and an `src/assets` folder; delete both, this project does not use them. You will change the contents of `App.tsx` and `main.tsx` in the steps that follow.

In `tsconfig.app.json`, put a comma on the last line of `compilerOptions` and add two lines:

```json
    "noFallthroughCasesInSwitch": true,
    "strict": true,
    "noUncheckedIndexedAccess": true
  },
```

`strict` has been on by default since TypeScript 6.0; writing it out shows your intent to whoever reads the settings.[^2] `noUncheckedIndexedAccess` is not part of `strict`: it adds `undefined` to the type of array and index signature access.[^3] You will see it earn its place in step 8.

## Step 2: Define the types

All the types live in one file. `Category` is not written by hand but derived from the `CATEGORIES` array; to add a new category, adding an element to the array is enough.

```ts
// src/types.ts
export const CATEGORIES = ["audio", "computer", "accessory"] as const;

export type Category = (typeof CATEGORIES)[number];

export type Product = {
  id: number;
  name: string;
  price: number;
  category: Category;
  inStock: boolean;
};

export type CartItem = Pick<Product, "id" | "name" | "price"> & {
  quantity: number;
};

export type FetchState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };
```

- `CartItem` takes three of `Product`'s fields with `Pick` and adds `quantity`. If the type of `price` changes on `Product`, it changes on `CartItem` too.
- `FetchState<T>` defines a separate shape for each state: `data` exists only in `success`, `message` only in `error`.

## Step 3: Product data and the type guard

Put the products in a `public/products.json` file. Vite serves the files in that folder as they are.

```json
[
  { "id": 1, "name": "Wireless Headphones", "price": 1299, "category": "audio", "inStock": true },
  { "id": 2, "name": "Bluetooth Speaker", "price": 899, "category": "audio", "inStock": false },
  { "id": 3, "name": "Laptop", "price": 32999, "category": "computer", "inStock": true },
  { "id": 4, "name": "USB-C Cable", "price": 149, "category": "accessory", "inStock": true }
]
```

`response.json()` cannot know what it will return. Take the result as `unknown` and pass it through the `isProduct` type guard.[^4]

```ts
// src/api.ts
import { CATEGORIES, type Product } from "./types";

export function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "price" in value &&
    typeof value.price === "number" &&
    "category" in value &&
    CATEGORIES.some((category) => category === value.category) &&
    "inStock" in value &&
    typeof value.inStock === "boolean"
  );
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("/products.json");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isProduct)) {
    throw new Error("Product data is not in the expected shape.");
  }
  return data;
}
```

If `data.every(isProduct)` returns `true`, TypeScript narrows `data` to `Product[]`, which is why `return data` compiles cleanly. Had you written `as Product[]`, the compiler would have gone quiet but broken data would have slipped in silently. In real projects a schema library such as [!zod] is usually used for this check.

## Step 4: A generic useFetch

The hook does not know which data it is loading; `T` is inferred at the call site from the return type of the `load` function.

```ts
// src/use-fetch.ts
import { useEffect, useState } from "react";
import type { FetchState } from "./types";

export function useFetch<T>(load: () => Promise<T>): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ status: "loading" });

  useEffect(() => {
    let ignore = false;
    load()
      .then((data) => {
        if (!ignore) setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (!ignore) setState({ status: "error", message });
      });
    return () => {
      ignore = true;
    };
  }, [load]);

  return state;
}
```

The `ignore` flag stops a response that arrives after the component has been removed from changing the state; it is the same pattern as the data-fetching example on react.dev.[^5]

> [!WARNING]
>
> `load` is a dependency of the effect. An inline function such as `useFetch(() => fetchProducts())` is recreated on every render and sends the request into an endless loop. Pass the module-level `fetchProducts` directly. In real projects a library such as TanStack Query is preferred for this job.[^5]

## Step 5: ProductCard and CategoryFilter

```tsx
// src/components/ProductCard.tsx
import type { Product } from "../types";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <article>
      <h2>{product.name}</h2>
      <p>€{product.price.toLocaleString("en-US")}</p>
      <button
        type="button"
        disabled={!product.inStock}
        onClick={() => onAddToCart(product)}
      >
        {product.inStock ? "Add to cart" : "Out of stock"}
      </button>
    </article>
  );
}
```

A `<select>`'s value is always a `string`. Before it reaches `onChange`, a type guard narrows it to `CategoryFilterValue`.

```tsx
// src/components/CategoryFilter.tsx
import { CATEGORIES, type Category } from "../types";

export type CategoryFilterValue = Category | "all";

const LABELS: Record<CategoryFilterValue, string> = {
  all: "All",
  audio: "Audio",
  computer: "Computers",
  accessory: "Accessories",
};

function isCategoryFilterValue(value: string): value is CategoryFilterValue {
  return value === "all" || CATEGORIES.some((category) => category === value);
}

type CategoryFilterProps = {
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
};

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.currentTarget.value;
    if (isCategoryFilterValue(next)) {
      onChange(next);
    }
  }

  return (
    <label>
      Category{" "}
      <select value={value} onChange={handleChange}>
        {(["all", ...CATEGORIES] as const).map((option) => (
          <option key={option} value={option}>
            {LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
```

Because `LABELS` is a `Record<CategoryFilterValue, string>`, you cannot forget to write a label when you add a category to `CATEGORIES`; TypeScript reports the missing key as an error.

## Step 6: The cart context

The context and the hook that reads it live in one file, and the provider in another; the template's lint rule *(`react/only-export-components`)* flags exporting a component and other things from the same file.

```ts
// src/cart-context.ts
import { createContext, useContext } from "react";
import type { CartItem, Product } from "./types";

export type CartContextValue = {
  items: CartItem[];
  totalPrice: number;
  addToCart: (product: Product) => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const cart = useContext(CartContext);
  if (cart === null) {
    throw new Error("useCart must be used within CartProvider.");
  }
  return cart;
}
```

The context starts as `null`; `useCart` strips that `null` off and returns a `CartContextValue` to its consumers.[^6]

```tsx
// src/CartProvider.tsx
import { useReducer } from "react";
import { CartContext } from "./cart-context";
import type { CartItem, Product } from "./types";

type CartAction =
  | { type: "add"; product: Product }
  | { type: "remove"; id: number };

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const { id, name, price } = action.product;
      const existing = items.find((item) => item.id === id);
      if (existing) {
        return items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...items, { id, name, price, quantity: 1 }];
    }
    case "remove":
      return items.filter((item) => item.id !== action.id);
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <CartContext
      value={{
        items,
        totalPrice,
        addToCart: (product) => dispatch({ type: "add", product }),
      }}
    >
      {children}
    </CartContext>
  );
}
```

In React 19 the provider is written as `<CartContext>` directly, instead of `<CartContext.Provider>`.[^7] No type was written for `addToCart`'s `product` parameter; it is inferred from `CartContextValue`.

## Step 7: Put the pieces together

`App` branches on `state.status`. In each branch `state` narrows: `state.message` is only reachable in the `error` branch, `state.data` only in the `success` branch.

```tsx
// src/App.tsx
import { useState } from "react";
import { fetchProducts } from "./api";
import { useCart } from "./cart-context";
import {
  CategoryFilter,
  type CategoryFilterValue,
} from "./components/CategoryFilter";
import { ProductCard } from "./components/ProductCard";
import { useFetch } from "./use-fetch";

export default function App() {
  const state = useFetch(fetchProducts);
  const [category, setCategory] = useState<CategoryFilterValue>("all");
  const { items, totalPrice, addToCart } = useCart();

  switch (state.status) {
    case "loading":
      return <p>Loading...</p>;
    case "error":
      return <p role="alert">Error: {state.message}</p>;
    case "success": {
      const products =
        category === "all"
          ? state.data
          : state.data.filter((product) => product.category === category);

      return (
        <main>
          <p>
            Cart: {items.length} item types,{" "}
            €{totalPrice.toLocaleString("en-US")}
          </p>
          <CategoryFilter value={category} onChange={setCategory} />
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
            />
          ))}
        </main>
      );
    }
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
```

The `never` assignment in the `default` branch is an exhaustiveness check: add a new state to `FetchState` without handling it here and compilation fails.[^4]

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { CartProvider } from "./CartProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </StrictMode>,
);
```

Open the page with `npm run dev`; change the filter and add a few products to the cart.

## Step 8: Let tsc catch the error

Vite only turns `.ts` files into JavaScript and does no type checking; it leaves that to your editor and to the build step.[^8] `tsc` does the checking. Make two mistakes first:

1. In `App.tsx`, show the featured product in the `success` branch: `const featured = state.data[0];` and `<h1>Featured: {featured.name}</h1>` in the JSX.
2. In `CategoryFilter.tsx`, skip the type guard: make the body of `handleChange` just `onChange(event.currentTarget.value);`.

Then run the type check:

```command
npx tsc -b
```

```
src/App.tsx(31,27): error TS18048: 'featured' is possibly 'undefined'.
src/components/CategoryFilter.tsx(12,10): error TS6133: 'isCategoryFilterValue' is declared but its value is never read.
src/components/CategoryFilter.tsx(23,14): error TS2345: Argument of type 'string' is not assignable to parameter of type 'CategoryFilterValue'.
```

- The first error comes from `noUncheckedIndexedAccess`: if the list is empty, `state.data[0]` is `undefined`. The fix: `{featured && <h1>Featured: {featured.name}</h1>}`.
- The third error stops any old `string` from the `<select>` reaching the filter. Put the type guard back.

> [!CAUTION]
>
> In the Vite template the root `tsconfig.json` contains only `references` (`"files": []`). That is why `npx tsc --noEmit` in the root succeeds without checking a single file. Use `tsc -b` with this template; `npm run build` runs `tsc -b` first too.

Fix the errors and confirm the project compiles with `npm run build`.

## Try it yourself

- Add a **Remove from cart** button: add `removeFromCart: (id: number) => void` to `CartContextValue` and use the reducer's `remove` action.
- Change one product's `price` to `"1299"` in `products.json`; see the page show its error state.
- Add `{ status: "idle" }` to `FetchState` and read the error `npx tsc -b` gives on the `never` line in `App.tsx`.
- With the type `ProductUpdate = Partial<Omit<Product, "id">>`, write an `updateProduct(product: Product, changes: ProductUpdate): Product` function that updates a product's price.

## Sources

1. [Vite: Getting Started](https://vite.dev/guide/) *(doc)* — The `npm create vite@latest` command, the `react-ts` template and the Node.js version requirement.
2. [TypeScript Blog: Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) *(article)* — Daniel Rosenwasser, March 23, 2026; `strict` defaulting to `true`.
3. [TSConfig Reference: noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess) *(doc)* — `undefined` being added to the type of index access.
4. [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) *(doc)* — Narrowing with `in`, `value is Type` type predicates and exhaustiveness checks with `never`.
5. [React: useEffect, Fetching data with Effects](https://react.dev/reference/react/useEffect) *(doc)* — Guarding against a race condition with an `ignore` flag, and the recommendation to use a library for data fetching.
6. [React: Using TypeScript](https://react.dev/learn/typescript) *(doc)* — `createContext<T | null>(null)` and a custom hook that strips the `null`.
7. [React v19](https://react.dev/blog/2024/12/05/react-19) *(doc)* — `<Context>` being used as the provider.
8. [Vite: Features, TypeScript](https://vite.dev/guide/features) *(doc)* — Vite only transpiling `.ts` files and doing no type checking.
