---
title: "Product admin panel"
description: "A panel with pagination, prefetching, Suspense, mutations and optimistic updates."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/project"
---

## Scenario

You are going to build a shop's product admin panel. The panel:

- Lists the products five at a time; while the page changes the previous page stays on screen faded, and the next page is prepared in the background.
- Puts the search text in the query key.
- Preloads a product's detail when the pointer moves over it; a click opens the detail instantly.
- Reads the detail with `useSuspenseQuery`, and shows "Try again" on an error.
- Updates the stock; the detail is refreshed from the response and the list by invalidation.
- Changes the favourite button without waiting for the server, and rolls back on an error.
- Loads reviews three at a time with "Load more"; a new review appears faded while it is sent.
- Reports refetches that failed in the background with a toast.

The goal is not the design but the pieces from the lessons working together. Where each piece comes from:

| Part | File | Lesson |
| :-- | :-- | :-- |
| `QueryClient`, `staleTime`, the Devtools | `query-client.ts`, `main.tsx` | Setup and devtools, Cache and stale time |
| A toast through `QueryCache`'s `onError` | `query-client.ts`, `toast.ts` | Suspense and error handling |
| The query factory, `queryOptions`, `infiniteQueryOptions` | `queries.ts` | queryOptions and select |
| The search and page in the key, `keepPreviousData`, the next page | `ProductTable.tsx` | useQuery and query keys, Pagination and infinite lists |
| Prefetching on hover with `queryClient.query` | `ProductTable.tsx` | Dependent and parallel queries |
| `useSuspenseQuery`, `QueryErrorResetBoundary`, `useTransition` | `ProductDetail.tsx`, `App.tsx` | Suspense and error handling |
| `setQueryData` + `invalidateQueries` | `StockForm.tsx` | Mutations and invalidation |
| An optimistic update through the cache, `isMutating` | `FavoriteButton.tsx` | Optimistic updates |
| `useInfiniteQuery`, an optimistic update with `variables` | `Reviews.tsx` | Pagination and infinite lists, Optimistic updates |

The working version is on GitHub: [examples/tanstack-query/project](https://github.com/virastack/academy/tree/main/examples/tanstack-query/project). The Playwright tests that exercise the flows in a browser are there too; compare against them when you get stuck.

## Step 1: Set up the project

Create a [!vite] project as in the [Setup and devtools](/academy/tanstack-query/setup-and-devtools) lesson and add the packages:[^1]

```command
npm create vite@latest product-admin -- --template react-ts
```

```command
npm install @tanstack/react-query @tanstack/react-query-devtools react-error-boundary
```

```command
npm install -D @tanstack/eslint-plugin-query
```

Delete `src/App.tsx`, `src/App.css` and `src/index.css`. You will write every file under `src/project/`. Add the `jsPlugins` and `@tanstack/query/*` rules from the [Setup and devtools](/academy/tanstack-query/setup-and-devtools) lesson to `.oxlintrc.json`.

## Step 2: The fake API

Use delayed functions instead of a real server. The data lives in memory, so stock and favourite changes survive until the page is reloaded. `toggleFavorite` fails on roughly one request in four, so that you can see the optimistic update being rolled back.

```ts
// src/project/api.ts
export type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  isFavorite: boolean;
};

export type ProductPage = { items: Product[]; hasMore: boolean };

export type Review = { id: number; productId: number; text: string };

export type ReviewPage = { items: Review[]; nextCursor: number | null };

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const PAGE_SIZE = 5;
const REVIEW_PAGE_SIZE = 3;

const names = [
  "Canvas Sneaker", "Linen Shirt", "Wool Beanie", "Leather Belt", "Denim Jacket",
  "Running Shoe", "Cotton Tee", "Rain Coat", "Silk Scarf", "Hiking Boot",
  "Chino Pants", "Knit Sweater", "Sun Hat",
];

const products: Product[] = names.map((name, index) => ({
  id: index + 1,
  name,
  price: 250 + index * 75,
  stock: (index * 7) % 12,
  isFavorite: false,
}));

const reviews: Review[] = products.flatMap((product) =>
  Array.from({ length: 7 }, (_, index) => ({
    id: product.id * 100 + index,
    productId: product.id,
    text: `Review ${index + 1} for ${product.name}`,
  })),
);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchProductPage(page: number, search: string): Promise<ProductPage> {
  await delay(500);
  const matches = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const start = (page - 1) * PAGE_SIZE;
  return {
    items: matches.slice(start, start + PAGE_SIZE).map((p) => ({ ...p })),
    hasMore: start + PAGE_SIZE < matches.length,
  };
}

export async function fetchProduct(id: number): Promise<Product> {
  await delay(400);
  const product = products.find((p) => p.id === id);
  if (!product) throw new HttpError(404, "Product not found");
  return { ...product };
}

export async function updateStock({ id, stock }: { id: number; stock: number }): Promise<Product> {
  await delay(600);
  if (stock < 0) throw new HttpError(422, "Stock cannot be negative");
  const product = products.find((p) => p.id === id);
  if (!product) throw new HttpError(404, "Product not found");
  product.stock = stock;
  return { ...product };
}

export async function toggleFavorite(id: number): Promise<Product> {
  await delay(800);
  // Let roughly one request in four fail, to see the rollback
  if (Math.random() < 0.25) throw new HttpError(500, "Favorite could not be saved");
  const product = products.find((p) => p.id === id);
  if (!product) throw new HttpError(404, "Product not found");
  product.isFavorite = !product.isFavorite;
  return { ...product };
}

export async function fetchReviews(productId: number, cursor: number): Promise<ReviewPage> {
  await delay(500);
  const all = reviews.filter((r) => r.productId === productId);
  const items = all.slice(cursor, cursor + REVIEW_PAGE_SIZE);
  const next = cursor + REVIEW_PAGE_SIZE;
  return { items, nextCursor: next < all.length ? next : null };
}

export async function addReview({ productId, text }: { productId: number; text: string }): Promise<Review> {
  await delay(700);
  const review = { id: Date.now(), productId, text };
  reviews.unshift(review);
  return review;
}
```

`HttpError` carries the status code, which lets you separate errors by code as in the `throwOnError` function from the [Suspense and error handling](/academy/tanstack-query/suspense-and-error-handling) lesson.

## Step 3: The query factory

Gather the key hierarchy and the query settings into one file. The entries that return only a key *(`all`, `lists`, `details`)* are for invalidation, and the ones that return `queryOptions` are for the query:[^2]

```ts
// src/project/queries.ts
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { fetchProduct, fetchProductPage, fetchReviews } from "./api";

export const productQueries = {
  all: () => ["products"] as const,
  lists: () => [...productQueries.all(), "list"] as const,
  list: (page: number, search: string) =>
    queryOptions({
      queryKey: [...productQueries.lists(), { page, search }],
      queryFn: () => fetchProductPage(page, search),
    }),
  details: () => [...productQueries.all(), "detail"] as const,
  detail: (id: number) =>
    queryOptions({
      queryKey: [...productQueries.details(), id],
      queryFn: () => fetchProduct(id),
    }),
};

export const reviewQueries = {
  all: (productId: number) => ["reviews", productId] as const,
  infinite: (productId: number) =>
    infiniteQueryOptions({
      queryKey: [...reviewQueries.all(productId), "infinite"],
      queryFn: ({ pageParam }) => fetchReviews(productId, pageParam),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
};
```

The list key becomes `["products", "list", { page, search }]`. When the search or the page changes a new cache entry opens, and going back to an earlier search brings the data up instantly.

## Step 4: The QueryClient and the toast

A small external store is enough for the toast; it is read with `useSyncExternalStore` *(see [Custom hooks](/academy/react/custom-hooks))*:

```ts
// src/project/toast.ts
import { useSyncExternalStore } from "react";

let message: string | null = null;
const listeners = new Set<() => void>();

export function showToast(text: string) {
  message = text;
  listeners.forEach((listener) => listener());
  setTimeout(() => {
    message = null;
    listeners.forEach((listener) => listener());
  }, 3000);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToast() {
  return useSyncExternalStore(subscribe, () => message);
}
```

The `QueryClient` reports refetches that fail while there is data on screen with a toast. An error on the first load is shown in the component, so no error produces two messages:[^3]

```ts
// src/project/query-client.ts
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { showToast } from "./toast";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000 },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // A background refetch that failed while there is data on screen
      if (query.state.data !== undefined) {
        showToast(`Data could not be updated: ${error.message}`);
      }
    },
  }),
});
```

Thanks to `staleTime: 30 * 1000`, returning to the same page within 30 seconds, or opening a detail that was prefetched on hover, sends no new request.

## Step 5: The product table

```tsx
// src/project/ProductTable.tsx
import { useEffect, useState } from "react";
import { keepPreviousData, noop, useQuery, useQueryClient } from "@tanstack/react-query";
import { productQueries } from "./queries";

type ProductTableProps = {
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function ProductTable({ selectedId, onSelect }: ProductTableProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isPending, isError, error, isFetching, isPlaceholderData } = useQuery({
    ...productQueries.list(page, search),
    placeholderData: keepPreviousData,
  });

  // Prepare the next page in the background
  useEffect(() => {
    if (!isPlaceholderData && data?.hasMore) {
      void queryClient.query(productQueries.list(page + 1, search)).catch(noop);
    }
  }, [data, isPlaceholderData, page, search, queryClient]);

  const prefetchDetail = (id: number) => {
    void queryClient.query(productQueries.detail(id)).catch(noop);
  };

  return (
    <section>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(String(new FormData(event.currentTarget).get("search")));
          setPage(1);
        }}
      >
        <input name="search" placeholder="Search products" defaultValue={search} />
        <button>Search</button>
      </form>

      {isPending ? (
        <p>Loading...</p>
      ) : isError ? (
        <p>Error: {error.message}</p>
      ) : (
        <table style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
          <tbody>
            {data.items.map((product) => (
              <tr key={product.id} aria-selected={product.id === selectedId}>
                <td>
                  <button
                    onClick={() => onSelect(product.id)}
                    onMouseEnter={() => prefetchDetail(product.id)}
                    onFocus={() => prefetchDetail(product.id)}
                  >
                    {product.name}
                  </button>
                </td>
                <td>€{product.price}</td>
                <td>{product.stock} in stock</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
        Previous
      </button>
      <span> Page {page} </span>
      <button
        onClick={() => setPage((p) => p + 1)}
        disabled={isPlaceholderData || !data?.hasMore}
      >
        Next
      </button>
      {isFetching && <span>Updating...</span>}
    </section>
  );
}
```

Three details:[^4][^5]

- `keepPreviousData` holds the old page until the new one arrives. While `isPlaceholderData` is true, "Next" is disabled; the user cannot go past a page that has not arrived yet.
- The `useEffect` loads the next page in the background with `queryClient.query` while the page on screen is real data. `void` and `.catch(noop)` swallow a prefetch error; the real query retries it anyway.
- The search form is uncontrolled; the value only moves into state, and from there into the key, when "Search" is pressed.

## Step 6: The stock form

The server returns the updated product. Write the response into the detail query and refetch the lists:[^6]

```tsx
// src/project/StockForm.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStock, type Product } from "./api";
import { productQueries } from "./queries";
import { showToast } from "./toast";

export function StockForm({ product }: { product: Product }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateStock,
    onSuccess: (updated) => {
      // The detail: write the response straight into the cache
      queryClient.setQueryData(productQueries.detail(updated.id).queryKey, updated);
      // The lists: refetch them, and return the promise so the button waits
      return queryClient.invalidateQueries({ queryKey: productQueries.lists() });
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const stock = Number(new FormData(event.currentTarget).get("stock"));
        mutation.mutate(
          { id: product.id, stock },
          { onSuccess: () => showToast("Stock updated") },
        );
      }}
    >
      <label>
        Stock <input name="stock" type="number" defaultValue={product.stock} />
      </label>
      <button disabled={mutation.isPending}>
        {mutation.isPending ? "Saving..." : "Save"}
      </button>
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
    </form>
  );
}
```

`onSuccess` returns the invalidation's promise, so the button stays on "Saving..." until the list has been refreshed. The toast is in `mutate`'s callback: it is not shown if the user has moved to another product, but the invalidation still runs.

## Step 7: The favourite button

The favourite is a value that may appear in more than one place on screen, so do the optimistic update through the cache:[^7][^8]

```tsx
// src/project/FavoriteButton.tsx
import { useMutation } from "@tanstack/react-query";
import { toggleFavorite, type Product } from "./api";
import { productQueries } from "./queries";
import { showToast } from "./toast";

const favoriteKey = ["toggle-favorite"];

export function FavoriteButton({ product }: { product: Product }) {
  const mutation = useMutation({
    mutationKey: favoriteKey,
    mutationFn: toggleFavorite,
    onMutate: async (id: number, context) => {
      const queryKey = productQueries.detail(id).queryKey;
      await context.client.cancelQueries({ queryKey });
      const previous = context.client.getQueryData(queryKey);
      context.client.setQueryData(queryKey, (old) =>
        old ? { ...old, isFavorite: !old.isFavorite } : old,
      );
      return { previous, queryKey };
    },
    onError: (error, _id, onMutateResult, context) => {
      if (onMutateResult) {
        context.client.setQueryData(onMutateResult.queryKey, onMutateResult.previous);
      }
      showToast(error.message);
    },
    onSettled: (_data, _error, id, _onMutateResult, context) => {
      // Let only the last favourite request sync with the server
      if (context.client.isMutating({ mutationKey: favoriteKey }) === 1) {
        return context.client.invalidateQueries({
          queryKey: productQueries.detail(id).queryKey,
        });
      }
    },
  });

  return (
    <button onClick={() => mutation.mutate(product.id)} aria-pressed={product.isFavorite}>
      {product.isFavorite ? "★ Favorited" : "☆ Add to favorites"}
    </button>
  );
}
```

`onMutate` cancels the in-flight detail request, keeps the old value and writes the new one. On an error, `onError` rolls it back. When the button is pressed repeatedly, only the last mutation invalidates, so the interface does not flip back to the old value for a moment.

## Step 8: Reviews

The reviews are an infinite list; a new review appears only in this component, so it is shown with `variables` and the cache is left alone:[^5][^7]

```tsx
// src/project/Reviews.tsx
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addReview } from "./api";
import { reviewQueries } from "./queries";

export function Reviews({ productId }: { productId: number }) {
  const queryClient = useQueryClient();
  const { data, status, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteQuery(reviewQueries.infinite(productId));

  const mutation = useMutation({
    mutationFn: addReview,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: reviewQueries.all(productId) }),
  });

  return (
    <section>
      <h3>Reviews</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const text = String(new FormData(form).get("text")).trim();
          if (!text) return;
          mutation.mutate({ productId, text }, { onSuccess: () => form.reset() });
        }}
      >
        <input name="text" placeholder="Your review" />
        <button disabled={mutation.isPending}>Submit</button>
      </form>

      {mutation.isPending && <p style={{ opacity: 0.5 }}>{mutation.variables.text}</p>}
      {mutation.isError && (
        <p>
          {mutation.variables.text} could not be sent.{" "}
          <button onClick={() => mutation.mutate(mutation.variables)}>Try again</button>
        </p>
      )}

      {status === "pending" ? (
        <p>Loading reviews...</p>
      ) : status === "error" ? (
        <p>Reviews could not be loaded.</p>
      ) : (
        <>
          {data.pages.flatMap((page) => page.items).map((review) => (
            <p key={review.id}>{review.text}</p>
          ))}
          <button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetching}>
            {isFetchingNextPage ? "Loading..." : hasNextPage ? "Load more" : "That's all"}
          </button>
        </>
      )}
    </section>
  );
}
```

`onSettled` invalidates the `["reviews", productId]` prefix. The infinite list is refetched starting from the first page and the new review appears at the top; until then the faded row stays in place.

## Step 9: The product detail

```tsx
// src/project/ProductDetail.tsx
import { useSuspenseQuery } from "@tanstack/react-query";
import { productQueries } from "./queries";
import { FavoriteButton } from "./FavoriteButton";
import { StockForm } from "./StockForm";
import { Reviews } from "./Reviews";

export function ProductDetail({ id }: { id: number }) {
  const { data: product } = useSuspenseQuery(productQueries.detail(id));

  return (
    <article>
      <h2>{product.name}</h2>
      <p>€{product.price}</p>
      <FavoriteButton product={product} />
      <StockForm key={product.id} product={product} />
      <Reviews productId={product.id} />
    </article>
  );
}
```

With `useSuspenseQuery`, `product` is always defined. The `key` given to `StockForm` resets the form's default value when you move to another product *(see [State](/academy/react/state))*.

## Step 10: Put the pieces together

```tsx
// src/project/App.tsx
import { Suspense, useState, useTransition } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { ProductTable } from "./ProductTable";
import { ProductDetail } from "./ProductDetail";
import { useToast } from "./toast";

export function App() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isSwitching, startTransition] = useTransition();
  const toast = useToast();

  return (
    <main style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      <ProductTable
        selectedId={selectedId}
        onSelect={(id) => startTransition(() => setSelectedId(id))}
      />

      <div style={{ opacity: isSwitching ? 0.5 : 1 }}>
        {selectedId === null ? (
          <p>Select a product.</p>
        ) : (
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary
                onReset={reset}
                resetKeys={[selectedId]}
                fallbackRender={({ resetErrorBoundary }) => (
                  <div>
                    <p>Product could not be loaded.</p>
                    <button onClick={() => resetErrorBoundary()}>Try again</button>
                  </div>
                )}
              >
                <Suspense fallback={<p>Loading product...</p>}>
                  <ProductDetail id={selectedId} />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        )}
      </div>

      {toast && <div role="status">{toast}</div>}
    </main>
  );
}
```

The product selection is inside `startTransition`. If the selected product is not in the cache yet, React keeps the old detail on screen faded rather than falling back to the fallback.[^9] `QueryErrorResetBoundary` also resets the query's error state on "Try again"; `resetKeys` clears the boundary by itself when you move to another product.[^3][^10]

Change `src/main.tsx`:

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./project/query-client";
import { App } from "./project/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
);
```

Open it with `npm run dev` and try this sequence: the first load, "Next", moving the pointer over a product and clicking it *(the detail should open instantly)*, "Load more", updating the stock, pressing favourite repeatedly, submitting a review, searching for "shirt". In the Devtools panel, watch which query is `fetching`, `stale` or `inactive` at each step.

Finally, check:

```bash
npm run lint
npm run build
```

## Try it yourself

- Change `fetchProduct` so that it throws on the first call. Does "Try again" work? Delete `onReset={reset}` and try again.
- Set the probability in `toggleFavorite` to `1`. What does the star do, and what does the toast say?
- Give `productQueries.detail` a `staleTime: Infinity` and update the stock. Why is the detail still right?
- Add a badge to the table with `select` that shows only the number of products in stock.
- Add a `MutationCache` `onSuccess` to the `QueryClient` that invalidates everything after every mutation, and delete the invalidations in `StockForm` and `Reviews`. What changed in the Network tab?
- Give the review list `maxPages: 2`, load four pages, then leave the tab and come back.

## Sources

1. [TanStack Query: Installation](https://tanstack.com/query/latest/docs/framework/react/installation) *(doc)* — Installing the packages and the ESLint plugin.
2. [TkDodo](https://tkdodo.eu/): [The Query Options API](https://tkdodo.eu/blog/the-query-options-api) *(article)* — January 17, 2024. The query factory and `queryOptions`.
3. [TkDodo](https://tkdodo.eu/): [React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling) *(article)* — September 10, 2021. A toast for background errors through the `QueryCache` callback.
4. [TanStack Query: Paginated / Lagged Queries](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries) *(doc)* — `keepPreviousData` and `isPlaceholderData`.
5. [TanStack Query: Prefetching & Router Integration](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching) *(doc)* — Prefetching with `queryClient.query`, and `noop`.
6. [TanStack Query: Updates from Mutation Responses](https://tanstack.com/query/latest/docs/framework/react/guides/updates-from-mutation-responses) *(doc)* — Writing the response into the cache with `setQueryData`.
7. [TanStack Query: Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) *(doc)* — Optimistic updates through the cache and through `variables`.
8. [TkDodo](https://tkdodo.eu/): [Concurrent Optimistic Updates in React Query](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) *(article)* — April 28, 2025. Limited invalidation with `isMutating`.
9. [React: useTransition](https://react.dev/reference/react/useTransition) *(doc)* — Keeping the old content on screen during a transition.
10. [react-error-boundary](https://github.com/bvaughn/react-error-boundary) *(repo)* — `fallbackRender`, `onReset` and `resetKeys`.
