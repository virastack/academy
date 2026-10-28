---
title: "Product catalogue and cart"
description: "A filter store, a persistent cart built from slices, and a derived stock warning."
lastVerified: "2026-10-21"
translationKey: "zustand/project"
---

## Scenario

You are going to build a shop's product catalogue and cart. The application:

- Keeps the category and search filters in a Zustand store; when a filter changes, the product query runs again by itself.
- Fetches the products with [!tanstack-query]; while the filter changes, the old list stays on screen faded.
- Keeps the cart and the cart drawer in a single store made of slices. "Add to cart" both adds the product and opens the drawer.
- Writes the cart to `localStorage`; the cart comes back when the page is reloaded, and the drawer opens closed.
- Sends every change to Redux DevTools with a name.
- Draws the cart list by reading only the product `id`s; when one product's quantity changes, only that row renders.
- Shows a warning when the quantity in the cart exceeds the current stock. It produces the warning not by updating the store but by deriving it from the server data.

The goal is not the design but the pieces from the lessons working together. Where each piece comes from:

| Part | File | Lesson |
| :-- | :-- | :-- |
| `create<T>()`, `set`, resetting with `getInitialState` | `filter-store.ts` | Your first store, Actions and updates |
| The `actions` object, exporting only custom hooks | `filter-store.ts`, `shop-store.ts` | Actions and updates, Selectors and re-renders |
| Driving the query from the filter | `filter-store.ts`, `queries.ts` | Using it with TanStack Query |
| The cart, interface and shared slices | `shop-store.ts` | The slice pattern |
| `persist`, `partialize`, `version`, `devtools` | `shop-store.ts` | Persist and devtools |
| Atomic selectors, an `id` list with `useShallow` | `shop-store.ts`, `CartDrawer.tsx` | Selectors and re-renders |
| Deriving the stock warning | `CartDrawer.tsx` | Using it with TanStack Query |

The working version is on GitHub: [examples/zustand/project](https://github.com/virastack/academy/tree/main/examples/zustand/project). The Playwright tests that exercise the flows in a browser are there too; compare against them when you get stuck.

## Step 1: Set up the project

Create a [!vite] project as in the [Your first store](/academy/zustand/first-store) lesson and add the packages:[^1][^2]

```command
npm create vite@latest shop-catalog -- --template react-ts
```

```command
npm install zustand @tanstack/react-query
```

```command
npm install -D @redux-devtools/extension
```

Delete `src/App.tsx`, `src/App.css` and `src/index.css`. You will write every file under `src/project/`.

## Step 2: The fake API and the query

Use a delayed function instead of a real server. One product's stock is `0`, so that you can see the "Add to cart" button being disabled.

```ts
// src/project/api.ts
export type Category = "shoes" | "clothing" | "accessories";

export type Product = {
  id: number;
  name: string;
  category: Category;
  price: number;
  stock: number;
};

export type ProductFilters = { category: Category | "all"; search: string };

const products: Product[] = [
  { id: 1, name: "Canvas Sneaker", category: "shoes", price: 1200, stock: 5 },
  { id: 2, name: "Running Shoe", category: "shoes", price: 2100, stock: 3 },
  { id: 3, name: "Hiking Boot", category: "shoes", price: 2800, stock: 0 },
  { id: 4, name: "Linen Shirt", category: "clothing", price: 850, stock: 8 },
  { id: 5, name: "Denim Jacket", category: "clothing", price: 1650, stock: 2 },
  { id: 6, name: "Knit Sweater", category: "clothing", price: 1100, stock: 6 },
  { id: 7, name: "Wool Beanie", category: "accessories", price: 300, stock: 10 },
  { id: 8, name: "Leather Belt", category: "accessories", price: 450, stock: 4 },
  { id: 9, name: "Silk Scarf", category: "accessories", price: 600, stock: 1 },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchProducts({ category, search }: ProductFilters): Promise<Product[]> {
  await delay(300);
  return products
    .filter((p) => category === "all" || p.category === category)
    .filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    .map((p) => ({ ...p }));
}
```

Gather the query settings in a factory as in the [queryOptions and select](/academy/tanstack-query/query-options-and-select) lesson. The filters are part of the key:

```ts
// src/project/queries.ts
import { queryOptions } from "@tanstack/react-query";
import { fetchProducts, type ProductFilters } from "./api";

export const productQueries = {
  all: () => ["products"] as const,
  list: (filters: ProductFilters) =>
    queryOptions({
      queryKey: [...productQueries.all(), "list", filters],
      queryFn: () => fetchProducts(filters),
    }),
};
```

## Step 3: The filter store

The filters are a small, independent store. The store itself is not exported; only custom hooks are exposed *(see [Selectors and re-renders](/academy/zustand/selectors-and-rerenders))*. The actions are in a single `actions` object, and `reset` goes back to the beginning with `getInitialState()` *(see [Actions and updates](/academy/zustand/actions-and-updates))*.[^3]

`useFilteredProducts` joins the two worlds: it reads the filter from the store and puts it in the query key. When the filter changes the query runs again, and nobody calls `refetch` *(see [Using it with TanStack Query](/academy/zustand/with-tanstack-query))*.[^3]

```ts
// src/project/filter-store.ts
import { create } from "zustand";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ProductFilters } from "./api";
import { productQueries } from "./queries";

type FilterState = ProductFilters & {
  actions: {
    setCategory: (category: ProductFilters["category"]) => void;
    setSearch: (search: string) => void;
    reset: () => void;
  };
};

const useFilterStore = create<FilterState>()((set, _get, store) => ({
  category: "all",
  search: "",
  actions: {
    setCategory: (category) => set({ category }),
    setSearch: (search) => set({ search }),
    reset: () => set(store.getInitialState()),
  },
}));

export const useCategory = () => useFilterStore((state) => state.category);
export const useSearch = () => useFilterStore((state) => state.search);
export const useFilterActions = () => useFilterStore((state) => state.actions);

export function useFilteredProducts() {
  const category = useCategory();
  const search = useSearch();
  return useQuery({
    ...productQueries.list({ category, search }),
    placeholderData: keepPreviousData,
  });
}
```

## Step 4: The cart store

The cart and the drawer affect each other: adding a product opens the drawer. So they sit in a single store as three slices, as in the [slice pattern](/academy/zustand/slice-pattern) lesson.[^4]

- `items` is an object keyed by product `id`. Finding or updating a product does not mean scanning an array.
- `setQuantity` removes the product from the cart when the quantity drops below `1`.
- `persist` stores only `items`; the drawer being open is not persistent.[^5]
- `devtools` is on the outside; every `set` call appears in the panel under a name such as `cart/addItem`.[^6]
- Because middleware is used, the slice types take the `Mutators` list.[^4]

```ts
// src/project/shop-store.ts
import { create, type StateCreator } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { Product } from "./api";

export type CartItem = Pick<Product, "id" | "name" | "price"> & { quantity: number };

type CartSlice = {
  items: Record<number, CartItem>;
  addItem: (product: Product) => void;
  setQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
};

type UiSlice = {
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

type SharedSlice = {
  addToCart: (product: Product) => void;
};

type ShopState = CartSlice & UiSlice & SharedSlice;

type Mutators = [["zustand/devtools", never], ["zustand/persist", unknown]];

const createCartSlice: StateCreator<ShopState, Mutators, [], CartSlice> = (set) => ({
  items: {},
  addItem: (product) =>
    set(
      (state) => {
        const quantity = (state.items[product.id]?.quantity ?? 0) + 1;
        const { id, name, price } = product;
        return { items: { ...state.items, [id]: { id, name, price, quantity } } };
      },
      undefined,
      "cart/addItem",
    ),
  setQuantity: (id, quantity) =>
    set(
      (state) => {
        const item = state.items[id];
        if (!item) return {};
        if (quantity < 1) {
          const { [id]: _removed, ...rest } = state.items;
          return { items: rest };
        }
        return { items: { ...state.items, [id]: { ...item, quantity } } };
      },
      undefined,
      "cart/setQuantity",
    ),
  removeItem: (id) =>
    set(
      (state) => {
        const { [id]: _removed, ...rest } = state.items;
        return { items: rest };
      },
      undefined,
      "cart/removeItem",
    ),
  clearCart: () => set({ items: {} }, undefined, "cart/clearCart"),
});

const createUiSlice: StateCreator<ShopState, Mutators, [], UiSlice> = (set) => ({
  isCartOpen: false,
  openCart: () => set({ isCartOpen: true }, undefined, "ui/openCart"),
  closeCart: () => set({ isCartOpen: false }, undefined, "ui/closeCart"),
});

const createSharedSlice: StateCreator<ShopState, Mutators, [], SharedSlice> = (_set, get) => ({
  addToCart: (product) => {
    get().addItem(product);
    get().openCart();
  },
});

const useShopStore = create<ShopState>()(
  devtools(
    persist(
      (...a) => ({
        ...createCartSlice(...a),
        ...createUiSlice(...a),
        ...createSharedSlice(...a),
      }),
      {
        name: "shop-cart",
        version: 1,
        partialize: (state) => ({ items: state.items }),
      },
    ),
    { name: "ShopStore" },
  ),
);

export const useCartItemIds = () =>
  useShopStore(useShallow((state) => Object.keys(state.items).map(Number)));
export const useCartItem = (id: number) => useShopStore((state) => state.items[id]);
export const useCartQuantity = (id: number) =>
  useShopStore((state) => state.items[id]?.quantity ?? 0);
export const useCartCount = () =>
  useShopStore((state) =>
    Object.values(state.items).reduce((sum, item) => sum + item.quantity, 0),
  );
export const useCartTotal = () =>
  useShopStore((state) =>
    Object.values(state.items).reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
export const useIsCartOpen = () => useShopStore((state) => state.isCartOpen);

export const useShopActions = () =>
  useShopStore(
    useShallow((state) => ({
      addToCart: state.addToCart,
      setQuantity: state.setQuantity,
      removeItem: state.removeItem,
      clearCart: state.clearCart,
      openCart: state.openCart,
      closeCart: state.closeCart,
    })),
  );
```

`useCartItemIds` is wrapped in `useShallow` because it returns a new array. Without it, v5 would stop the page with a "Maximum update depth exceeded" error.[^7] `useShopActions` also returns a new object; because the actions never change, `useShallow` always gives back the same reference.

`useCartQuantity` returns `0` for a product that is not in the cart. That is safe because it is a constant number; `[]` or `{}` would have produced a new reference.

## Step 5: Filters and products

A small helper that formats the price:

```ts
// src/project/format.ts
export const formatPrice = (value: number) => `€${value.toLocaleString("en-US")}`;
```

The filter panel knows only the filter store:

```tsx
// src/project/Filters.tsx
import type { ProductFilters } from "./api";
import { useCategory, useFilterActions, useSearch } from "./filter-store";

const categories: { value: ProductFilters["category"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "shoes", label: "Shoes" },
  { value: "clothing", label: "Clothing" },
  { value: "accessories", label: "Accessories" },
];

export function Filters() {
  const category = useCategory();
  const search = useSearch();
  const { setCategory, setSearch, reset } = useFilterActions();

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input
        aria-label="Search products"
        placeholder="Search products"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <select
        aria-label="Category"
        value={category}
        onChange={(event) => setCategory(event.target.value as ProductFilters["category"])}
      >
        {categories.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <button onClick={reset}>Clear filters</button>
    </div>
  );
}
```

The product card subscribes to that product's quantity in the cart. Adding another product to the cart does not render this card. When the stock limit is reached, the button is disabled.

```tsx
// src/project/ProductGrid.tsx
import type { Product } from "./api";
import { useFilteredProducts } from "./filter-store";
import { formatPrice } from "./format";
import { useCartQuantity, useShopActions } from "./shop-store";

function ProductCard({ product }: { product: Product }) {
  const inCart = useCartQuantity(product.id);
  const { addToCart } = useShopActions();
  const soldOut = product.stock === 0;
  const limitReached = inCart >= product.stock;

  return (
    <li style={{ border: "1px solid #ccc", padding: 12 }}>
      <h3>{product.name}</h3>
      <p>{formatPrice(product.price)}</p>
      <p>{soldOut ? "Sold out" : `Stock: ${product.stock}`}</p>
      <button
        onClick={() => addToCart(product)}
        disabled={limitReached}
        aria-label={`add ${product.name} to cart`}
      >
        Add to cart
      </button>
    </li>
  );
}

export function ProductGrid() {
  const { data: products, isPending, isError, isPlaceholderData } = useFilteredProducts();

  if (isPending) return <p>Loading products...</p>;
  if (isError) return <p>Products could not be loaded.</p>;
  if (products.length === 0) return <p>No products found.</p>;

  return (
    <ul
      aria-label="Products"
      style={{
        listStyle: "none",
        padding: 0,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
        opacity: isPlaceholderData ? 0.5 : 1,
      }}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ul>
  );
}
```

## Step 6: The cart button and the drawer

The cart button reads only the total quantity:

```tsx
// src/project/CartButton.tsx
import { useCartCount, useShopActions } from "./shop-store";

export function CartButton() {
  const count = useCartCount();
  const { openCart } = useShopActions();

  return <button onClick={openCart}>Cart ({count})</button>;
}
```

There are two details in the drawer:

- `CartDrawer` reads only the list of `id`s; each `CartLine` selects its own record. When one product's quantity changes, only that row renders, not the list.
- `CartLine` reads the quantity from Zustand and the current stock from TanStack Query, and **derives** the warning from the two. No "over stock" field is written into the store; when the stock changes or the quantity drops, the warning disappears by itself.[^8]

```tsx
// src/project/CartDrawer.tsx
import { useQuery } from "@tanstack/react-query";
import { formatPrice } from "./format";
import { productQueries } from "./queries";
import {
  useCartItem,
  useCartItemIds,
  useCartTotal,
  useIsCartOpen,
  useShopActions,
} from "./shop-store";

function useStock(id: number) {
  const { data: products } = useQuery(productQueries.list({ category: "all", search: "" }));
  return products?.find((p) => p.id === id)?.stock;
}

function CartLine({ id }: { id: number }) {
  const item = useCartItem(id);
  const stock = useStock(id);
  const { setQuantity, removeItem } = useShopActions();

  if (!item) return null;
  const overStock = stock !== undefined && item.quantity > stock;

  return (
    <li>
      <span>{item.name}</span> <span>{formatPrice(item.price * item.quantity)}</span>
      <div>
        <button
          onClick={() => setQuantity(id, item.quantity - 1)}
          aria-label={`decrease ${item.name}`}
        >
          −
        </button>
        <span aria-label={`${item.name} quantity`}> {item.quantity} </span>
        <button
          onClick={() => setQuantity(id, item.quantity + 1)}
          disabled={stock !== undefined && item.quantity >= stock}
          aria-label={`increase ${item.name}`}
        >
          +
        </button>
        <button onClick={() => removeItem(id)} aria-label={`remove ${item.name}`}>
          Remove
        </button>
      </div>
      {overStock && <p role="alert">Only {stock} left in stock.</p>}
    </li>
  );
}

export function CartDrawer() {
  const isOpen = useIsCartOpen();
  const ids = useCartItemIds();
  const total = useCartTotal();
  const { clearCart, closeCart } = useShopActions();

  if (!isOpen) return null;

  return (
    <aside aria-label="Cart" style={{ borderLeft: "1px solid #ccc", padding: 16 }}>
      <h2>Cart</h2>
      {ids.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {ids.map((id) => (
            <CartLine key={id} id={id} />
          ))}
        </ul>
      )}
      <p>Total: {formatPrice(total)}</p>
      <button onClick={clearCart} disabled={ids.length === 0}>
        Clear cart
      </button>
      <button onClick={closeCart}>Close</button>
    </aside>
  );
}
```

## Step 7: Put the pieces together

```ts
// src/project/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000 } },
});
```

```tsx
// src/project/App.tsx
import { CartButton } from "./CartButton";
import { CartDrawer } from "./CartDrawer";
import { Filters } from "./Filters";
import { ProductGrid } from "./ProductGrid";

export function App() {
  return (
    <div style={{ display: "flex", gap: 24, padding: 24, fontFamily: "sans-serif" }}>
      <main style={{ flex: 1 }}>
        <header style={{ display: "flex", justifyContent: "space-between" }}>
          <h1>Store</h1>
          <CartButton />
        </header>
        <Filters />
        <ProductGrid />
      </main>
      <CartDrawer />
    </div>
  );
}
```

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./project/query-client";
import { App } from "./project/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

Open it with `npm run dev` and try these flows:

1. Set the category to "Shoes" and type "run" into the search. The list updates on every change, and "Clear filters" resets all of it.
2. Add a product to the cart. The drawer opens and the button becomes "Cart (1)".
3. Add the Silk Scarf. Because its stock is `1`, the button is disabled.
4. Reload the page. The cart is still there and the drawer is closed.
5. Open Redux DevTools and change a product's quantity. `cart/setQuantity` appears in the panel.
6. In the DevTools Application tab, set the Denim Jacket quantity in the `shop-cart` entry to `4` and reload the page. The stock warning appears in the drawer, and it disappears when you lower the quantity to `2`.

## Try it yourself

- Remove the `useShallow` from `useCartItemIds`. What do you see in the console?
- Delete the `partialize`, open the drawer and reload the page.
- Add a `size` field to `CartItem`, set `version` to `2`, and migrate the old entries to `size: "M"` with `migrate`.
- Keep the filters in the URL *(`?category=shoes&search=run`)* rather than the store. Which files change?
- Put a `console.log("render")` in `CartLine` and change one product's quantity. How many rows are logged?

## Sources

1. [Zustand: Introduction](https://zustand.docs.pmnd.rs/learn/getting-started/introduction) *(doc)* — Installation and the first store.
2. [Zustand: devtools](https://zustand.docs.pmnd.rs/reference/middlewares/devtools) *(doc)* — The Redux DevTools connection and the `@redux-devtools/extension` package.
3. [TkDodo](https://tkdodo.eu/): [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) *(article)* — November 20, 2022. Custom hooks, the `actions` object, and combining the store with `useQuery`.
4. [Zustand: Advanced TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript#slices-pattern) *(doc)* — Typed slices with `StateCreator`, and the mutator list.
5. [Zustand: Persisting store data](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) *(doc)* — `partialize`, `version` and the entry format.
6. [Zustand: Advanced TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript#using-middlewares) *(doc)* — Putting `devtools` on the outside.
7. [Zustand: How to Migrate to v5 from v4](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) *(doc)* — A stable selector result, and `useShallow`.
8. [TkDodo](https://tkdodo.eu/): [Deriving Client State from Server State](https://tkdodo.eu/blog/deriving-client-state-from-server-state) *(article)* — September 1, 2025. Deriving client state from server data rather than syncing it.
