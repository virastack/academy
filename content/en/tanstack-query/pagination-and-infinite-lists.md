---
title: "Pagination and infinite lists"
description: "keepPreviousData, preparing the next page and useInfiniteQuery."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/pagination-and-infinite-lists"
---

## Listing page by page

Pagination needs no extra API: you put the page number in the query key.[^1]

```ts
export const productQueries = {
  // ...
  page: (page: number) =>
    queryOptions({
      queryKey: ["products", "list", { page }],
      queryFn: () => fetchProductPage(page), // { items, hasMore }
    }),
};
```

It works like that, but every page is a new query. Press "Next" and the list disappears, a loading screen appears, and then the new page shows up. The screen jumps on every page.[^1]

## keepPreviousData

Pass `placeholderData: keepPreviousData` and the previous page stays on screen until the new one arrives:[^1]

```tsx
import { keepPreviousData, useQuery } from "@tanstack/react-query";

function ProductTable() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, isFetching, isPlaceholderData } = useQuery({
    ...productQueries.page(page),
    placeholderData: keepPreviousData,
  });

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>Error: {error.message}</p>;

  return (
    <>
      <ul style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
        {data.items.map((product) => <li key={product.id}>{product.name}</li>)}
      </ul>
      <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
        Previous
      </button>
      <span>Page {page}</span>
      <button
        onClick={() => setPage((p) => p + 1)}
        disabled={isPlaceholderData || !data.hasMore}
      >
        Next
      </button>
      {isFetching && <span>Updating...</span>}
    </>
  );
}
```

`isPlaceholderData` says that the data on screen is left over from the previous page. Use it to disable "Next" and fade the list until the new page arrives.[^1] `keepPreviousData` is really the function `(previousData) => previousData`; `placeholderData` itself is not written to the cache *(see [Cache and stale time](/academy/tanstack-query/cache-and-stale-time))*.

The user will probably go to the next page. Load it in the background so that it is ready when they click:[^2]

```tsx
const queryClient = useQueryClient();

useEffect(() => {
  if (!isPlaceholderData && data?.hasMore) {
    void queryClient.query(productQueries.page(page + 1)).catch(noop);
  }
}, [data, isPlaceholderData, page, queryClient]);
```

Keep the page number in the URL *(`?page=2`)* rather than in `useState` and the page becomes shareable and the browser's back button works. The key stays the same; all that changes is where the value is read from.[^3] To do that with a typed, `useState`-like API in Next.js, React Router or TanStack Router, there is [nuqs](https://nuqs.dev).[^4]

## Infinite lists

For a "Load more" button, or a list that loads as you scroll, there is `useInfiniteQuery`. Its only difference is that the data is a structure made of pages:[^5]

```ts
import { infiniteQueryOptions } from "@tanstack/react-query";

export const reviewQueries = {
  infinite: (productId: number) =>
    infiniteQueryOptions({
      queryKey: ["reviews", productId, "infinite"],
      queryFn: ({ pageParam }) => fetchReviews(productId, pageParam), // { items, nextCursor }
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
};
```

| Field | What it does |
| :-- | :-- |
| `initialPageParam` | The first page's parameter; required in v5 |
| `getNextPageParam` | Works out the next page's parameter from the last page; the list ends when it returns `undefined` or `null` |
| `data.pages` | The array of pages received |
| `fetchNextPage` | Fetches the next page |
| `hasNextPage` | `true` while `getNextPageParam` returns a value |
| `isFetchingNextPage` | `true` only while the next page is loading, to tell it from a background refetch |

```tsx
function Reviews({ productId }: { productId: number }) {
  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, status } =
    useInfiniteQuery(reviewQueries.infinite(productId));

  if (status === "pending") return <p>Loading...</p>;
  if (status === "error") return <p>Reviews could not be loaded.</p>;

  return (
    <>
      {data.pages.flatMap((page) => page.items).map((review) => (
        <p key={review.id}>{review.text}</p>
      ))}
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetching}
      >
        {isFetchingNextPage ? "Loading..." : hasNextPage ? "Load more" : "That's all"}
      </button>
    </>
  );
}
```

Disabling the button while `isFetching` matters. An infinite list can only have one request in flight at a time; all the pages share a single cache entry. Calling `fetchNextPage` while a background refetch is running can overwrite the data.[^5] When triggering the button with an `IntersectionObserver` to load on scroll, make the same check: `hasNextPage && !isFetching && fetchNextPage()`.[^5]

## How an infinite list is refreshed

An infinite list is **a single query** in the cache; the pages sit there like a linked list. Each page is fetched with the parameter it took from the one before.[^6] So when the list goes stale and is refreshed, the pages are refetched **in order, starting from the first**. That way records added or removed in between do not cause repeated or skipped rows from stale cursors.[^5][^6]

There is a price: if the user has loaded twenty pages, a refresh means twenty requests. `maxPages` limits how many pages are kept in the cache. If you use it, you also have to supply `getPreviousPageParam` so that the list can be navigated in both directions:[^5]

```ts
infiniteQueryOptions({
  // ...
  getPreviousPageParam: (firstPage) => firstPage.prevCursor,
  maxPages: 3,
});
```

When the API returns no cursor, `getNextPageParam` receives the last page's parameter as its third argument, and you work the page number out yourself with `lastPageParam + 1`.[^5]

## Which one

| Situation | Recommendation |
| :-- | :-- |
| A table, an admin panel, the user will go to a particular page | A paginated query + `keepPreviousData` |
| A feed, comments, search results | `useInfiniteQuery` |
| A very long list, thousands of rows | `useInfiniteQuery` + `maxPages` + virtualisation |

Keeping thousands of rows in the DOM is a problem independent of the query; for virtualisation, see the [Render performance](/academy/performance-accessibility/render-performance) lesson.

## Try it yourself

- Write the product table without `keepPreviousData` and move between pages. Then add it, and note the difference.
- Preload the next page and watch in the Network tab when the request goes out.
- Add an infinite list to the reviews. Load three pages, leave the tab and come back; how many requests go out, and in which order?
- Set `maxPages: 2` and try again.

## Going deeper

- **Official docs:** "Infinite Queries"; bidirectional lists, updating the pages by hand, and `maxPages`.[^5]
- **Article:** [TkDodo](https://tkdodo.eu/), "How Infinite Queries work"; the structure of an infinite query in the cache, and the refresh behaviour.[^6]
- **Official docs:** "Paginated / Lagged Queries"; `placeholderData` and `isPlaceholderData`.[^1]

## Sources

1. [TanStack Query: Paginated / Lagged Queries](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries) *(doc)* — Putting the page in the key, `keepPreviousData` and `isPlaceholderData`.
2. [TanStack Query: Prefetching & Router Integration](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching) *(doc)* — Preloading with `queryClient.query`.
3. [TkDodo](https://tkdodo.eu/): [React Query - The Bad Parts](https://tkdodo.eu/blog/react-query-the-bad-parts) *(video)* — React Day Berlin, December 2024. Keeping the filter in the URL and tying it to the key.
4. [nuqs: Type-safe search params state manager for React](https://nuqs.dev/) *(doc)* — URL synchronisation with a `useState`-like API, typed parsers, history handling and the supported frameworks.
5. [TanStack Query: Infinite Queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries) *(doc)* — `useInfiniteQuery`, sequential refreshing, the warning about concurrent requests, and `maxPages`.
6. [TkDodo](https://tkdodo.eu/): [How Infinite Queries work](https://tkdodo.eu/blog/how-infinite-queries-work) *(article)* — September 14, 2024. The structure of an infinite query as a single cache entry, and `QueryBehavior`.
