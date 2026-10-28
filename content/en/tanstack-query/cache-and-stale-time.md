---
title: "Cache and stale time"
description: "staleTime against gcTime, the refetch moments, polling and initialData."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/cache-and-stale-time"
---

## Stale-While-Revalidate

TanStack Query's cache model rests on the **stale-while-revalidate** idea from HTTP: if you have data, show it at once even when it is old; fetch the new version in the background and swap it in when it arrives.[^1] Instead of a loading screen, the user sees the last known data, and the screen updates by itself a few hundred milliseconds later.

Two settings govern this: `staleTime`, which says when data goes stale, and `gcTime`, which says when unused data is removed.

## staleTime and gcTime

| Setting | Default | When it starts | Result |
| :-- | :-- | :-- | :-- |
| `staleTime` | `0` | After the data arrives | Until the time is up the data is **fresh**; afterwards it is **stale** |
| `gcTime` | 5 minutes | After the last component is removed | When the time is up the data is removed from memory |

[TkDodo](https://tkdodo.eu/)'s summary: while data is fresh it comes **only from the cache, always**, and no request goes to the network. While it is stale it still comes from the cache, but is refreshed in the background at certain moments.[^1][^2] You rarely touch `gcTime`; what you almost always want to change is `staleTime`.[^2] Before v5, `gcTime` was called `cacheTime`; you will see that name in older writing.[^2]

The life of a query, in a shortened form of the documentation's example:[^3]

1. A component using `["products"]` opens. The cache is empty, so a loading state is shown, the request goes out and the result is written to the cache.
2. A second component using the same key opens. The data comes from the cache **instantly**. Because `staleTime: 0`, one more request goes out in the background.
3. Both components close. The query becomes **inactive** and the 5-minute `gcTime` timer starts.
4. If a component opens again before the 5 minutes are up, the data comes from the cache and is refreshed in the background.
5. If nobody uses it within 5 minutes, the data is removed. The next opening starts with a loading screen.

## Choosing a staleTime

The `staleTime: 0` default is chosen to keep data current, not to keep the request count down. That is the question everybody asks the first time: *"I fetched the data two seconds ago, why is there another request?"*[^1] The answer is a second component that opened conditionally; the library sees it as a new mount and refreshes the stale data.

The answer is not to turn off the automatic refetching or to carry the data down as props, but to say how long the data counts as valid:[^1]

```ts
// For the whole application
new QueryClient({
  defaultOptions: { queries: { staleTime: 30 * 1000 } },
});

// For one query
queryOptions({
  queryKey: ["categories"],
  queryFn: fetchCategories,
  staleTime: 10 * 60 * 1000, // categories rarely change
});
```

A rough guide:

| Data | Example `staleTime` |
| :-- | :-- |
| Changes within seconds *(stock, a chat)* | `0` or a few seconds |
| Changes within minutes *(a product list)* | 30 seconds to a few minutes |
| Almost never changes *(categories, a list of countries)* | `Infinity` |
| Never changes while the app is open *(feature flags loaded at startup, permissions)* | `'static'` |

There is a difference between `Infinity` and `'static'`: a query set to `Infinity` is still refreshed by `invalidateQueries`, while a `'static'` one is not.[^4]

## When the refetch happens

A stale query is refreshed in the background at three moments:[^4]

| Trigger | Setting | What it means |
| :-- | :-- | :-- |
| A new component starts using the query | `refetchOnMount` | Data arriving on screen should be current |
| The user comes back to the tab | `refetchOnWindowFocus` | A user returning from their e-mail should see current data |
| The connection comes back | `refetchOnReconnect` | Catch whatever changed while it was down |

TkDodo's favourite trigger is the return to the tab. It looks like "too much" while developing, because you keep switching tabs; in production it is a user coming back after a long time in another tab.[^1] Tuning these with `staleTime` rather than turning the flags off is the recommended route.[^4]

To refresh data at regular intervals, use `refetchInterval`. The setting works independently of `staleTime`:[^4][^5]

```ts
useQuery({
  ...orderQueries.status(orderId),
  // every 5 seconds until the order is delivered
  refetchInterval: (query) =>
    query.state.data?.status === "delivered" ? false : 5000,
});
```

Returning `false` stops the polling. Polling also stops by default when the tab goes into the background; to keep it running there, pass `refetchIntervalInBackground: true`.[^5]

## initialData and placeholderData

Sometimes you have something to show when a query opens. The two options behave differently:[^6][^7]

| | `initialData` | `placeholderData` |
| :-- | :-- | :-- |
| Written to the cache | Yes; it counts as real data | No; only that component sees it |
| Respects `staleTime` | Yes; no request if it is fresh | No; the real data is always requested |
| On a background error | The data stays and `error` is filled | The data disappears and `data` becomes `undefined` |
| What it is for | Real data from another query | A skeleton or the previous result, shown until the real data arrives |

TkDodo's preference: `initialData` when filling one query from another, and `placeholderData` for everything else.[^7] Using the list data as a starting point when moving from the product list to a detail page is the typical example:[^6]

```ts
const queryClient = useQueryClient();

useQuery({
  ...productQueries.detail(id),
  initialData: () =>
    queryClient
      .getQueryData(productQueries.list(category).queryKey)
      ?.find((product) => product.id === id),
  initialDataUpdatedAt: () =>
    queryClient.getQueryState(productQueries.list(category).queryKey)?.dataUpdatedAt,
});
```

`initialDataUpdatedAt` says when the initial data was fetched. If the list is older than the `staleTime`, the detail is refreshed in the background; if not, no request goes out.[^6] Using `placeholderData` for pagination is in the [Pagination and infinite lists](/academy/tanstack-query/pagination-and-infinite-lists) lesson.

## Try it yourself

- Open a list with `staleTime: 0`, go to another page and come back. Which states does the query pass through in the Devtools?
- Repeat the same experiment with `staleTime: 60 * 1000`. What is the difference in the Network tab?
- Close a component and watch the query become `inactive` in the Devtools. Set `gcTime: 5000` and see what happens after 5 seconds.
- Add a `refetchInterval` to an order status screen. Have the fake API return `delivered` on the third request; does the polling stop?

## Going deeper

- **Article:** [TkDodo](https://tkdodo.eu/), "React Query as a State Manager"; stale-while-revalidate, the smart refetches and tuning `staleTime`.[^1]
- **Official docs:** "Caching Examples"; the mount, inactive and garbage collection steps of a query.[^3]
- **Article:** [TkDodo](https://tkdodo.eu/), "Placeholder and Initial Data in React Query"; how the two options differ at the cache and observer level.[^7]

## Sources

1. [TkDodo](https://tkdodo.eu/): [React Query as a State Manager](https://tkdodo.eu/blog/react-query-as-a-state-manager) *(article)* — August 20, 2021. Stale-while-revalidate, the refetch triggers and `staleTime`.
2. [TkDodo](https://tkdodo.eu/): [Practical React Query](https://tkdodo.eu/blog/practical-react-query) *(article)* — November 16, 2020. The difference between `staleTime` and `gcTime`, and the new name for `cacheTime`.
3. [TanStack Query: Caching Examples](https://tanstack.com/query/latest/docs/framework/react/guides/caching) *(doc)* — A query's cache lifecycle, step by step.
4. [TanStack Query: Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults) *(doc)* — The default values, the difference between `'static'` and `Infinity`, and `refetchInterval`.
5. [TanStack Query: Polling](https://tanstack.com/query/latest/docs/framework/react/guides/polling) *(doc)* — `refetchInterval` and refreshing in the background.
6. [TanStack Query: Initial Query Data](https://tanstack.com/query/latest/docs/framework/react/guides/initial-query-data) *(doc)* — `initialData`, `staleTime`, and initial data from the cache with `initialDataUpdatedAt`.
7. [TkDodo](https://tkdodo.eu/): [Placeholder and Initial Data in React Query](https://tkdodo.eu/blog/placeholder-and-initial-data-in-react-query) *(article)* — August 9, 2021. The cache and observer level, background errors, and which one to use when.
