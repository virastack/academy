---
title: "What server state is"
description: "How it differs from client state, the mistakes in fetching with useEffect, and when you don't need it."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/what-is-server-state"
---

## What this guide covers

The [!tanstack-query] documentation is thorough. This guide does not repeat it. Each lesson summarises the topic briefly and gathers the library maintainers' advice along with the common mistakes. Version: TanStack Query v5.104 *(October 2026)*. It works with React 18 and later.[^1][^2]

The prerequisites are the [State](/academy/react/state) and [Effects](/academy/react/effects) lessons from the [React](/academy/react) guide. The examples run in a React project set up with Vite; the part specific to Next.js is in the [Prefetching with Next.js](/academy/tanstack-query/prefetch-with-nextjs) lesson.

> [!NOTE]
>
> The library's old name is **React Query**. Both names turn up in blog posts and talks; they are the same library.[^1]

## What server state is

The data a component shows on screen can come from two places. **Client state** only lives in the browser: is the modal open, which tab is selected. **Server state** is kept somewhere else and you only ever see a copy of it. The documentation defines server state by four properties:[^1]

- It is stored somewhere you do not control.
- Reading and writing it needs an asynchronous API.
- Other people can change it, and you are not told.
- Unless you are careful, your application's copy goes stale.

The number of items in the cart is client state. A product's stock level is server state: while you look at the page, another customer can buy the last one.

## Why fetching with useEffect is not enough

The first solution that comes to mind is a `fetch` inside `useEffect`:

```tsx
function ProductList({ category }: { category: string }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch(`/api/products?category=${category}`)
      .then((response) => response.json())
      .then((data) => setProducts(data));
  }, [category]);

  return <ul>{products.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

TanStack Query's lead maintainer [Dominik Dorfmeister](https://tkdodo.eu/) *(TkDodo)* counts five mistakes in those ten lines:[^3]

| Mistake | What happens |
| :-- | :-- |
| A race condition | When the category changes quickly, a late old response overwrites the new one |
| No loading state | The user sees nothing while the request is in flight |
| An ambiguous empty state | Starting with `[]` does not distinguish "no data yet" from "no products at all" |
| Stale data and errors remain | When the category changes, the previous category's error or data stays on screen |
| Two requests in Strict Mode | In development the Effect runs twice |

Fixing all of them takes an `ignore` flag in the cleanup, separate `isLoading` and `error` states, and a reset when the category changes. That is why the React documentation, while describing fetching inside an Effect, recommends a framework or a data library.[^4] TkDodo sums the result up in one sentence: *"Data fetching is simple. Async state management is not."*[^3]

## What TanStack Query does

TanStack Query is not a data-fetching library; you still write the `fetch` yourself. What the library does is cache that `fetch`'s result under a **key** and share it consistently across the application:[^1][^3]

```tsx
import { useQuery } from "@tanstack/react-query";

function ProductList({ category }: { category: string }) {
  const { data, isPending, error } = useQuery({
    queryKey: ["products", category],
    queryFn: async () => {
      const response = await fetch(`/api/products?category=${category}`);
      if (!response.ok) throw new Error("Products could not be loaded");
      return response.json() as Promise<Product[]>;
    },
  });

  if (isPending) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

None of the five mistakes above is here. Because the data is kept per key *(`category`)*, there is no race condition; the loading and error states come ready; and requests to the same key, Strict Mode's included, are reduced to one.[^3] On top of that, the library also takes on:[^1]

- Reducing several components that want the same data to one request.
- Refreshing stale data in the background *(on returning to the tab, when the connection comes back)*.
- Removing unused data from memory after a while.
- Patterns such as pagination, infinite lists and optimistic updates.

## Where client state stays

TanStack Query is a **server state** library. It does not replace client state libraries such as Redux or [!zustand]; it works alongside them. The documentation shows it with an example: once `projects`, `teams`, `tasks` and `users` move out of the global store into TanStack Query, often all that is left is `themeMode` and `sidebarStatus`.[^5]

| Data | Example | Where |
| :-- | :-- | :-- |
| Server state | The product list, an order, a user profile | TanStack Query |
| Shared client state | The theme, is the cart drawer open | Context or [Zustand](/academy/zustand) |
| Local UI state | An input value, an open menu | `useState` |
| URL state | A filter, the sort order, the page, the tab | The router's search params, or [nuqs](https://nuqs.dev)[^6] |

TkDodo's rule: do not copy data that came from the server into client state. The moment you copy it, you miss the background updates and start trying to keep two truths in sync.[^7] TanStack's creator [Tanner Linsley](https://github.com/tannerlinsley) starts from the same point in his React Summit 2020 talk: most of what is in a global store is really a cache of server data.[^8]

## When you don't need it

In a framework with Server Components, such as the Next.js App Router, the data is mostly read on the server. TkDodo is plain about that case: if you are starting out with a framework that has a mature answer for data fetching and mutations, you probably do not need TanStack Query.[^9] The documentation gives the same advice: start with what the framework offers and do not add it until you need it.[^10]

The library is still valuable in these situations:[^9]

- An SPA that only runs in the browser *(a dashboard, an internal tool)*.
- Infinite lists whose first page loads on the server and whose later pages load on the client.
- Screens that want constantly current data: polling, refetching on focus, working offline.
- React Native, or projects that do not use Server Components.

For the size question, TkDodo's measurement: under 10 kB with `QueryClient`, `QueryClientProvider`, `useQuery` and `useMutation` *(minified and gzipped)*. The size you see on the npm page includes the source code and the source maps, which never reach the browser.[^11]

## Try it yourself

- Change the category quickly in the `useEffect` example above and watch the order of the responses in the DevTools Network tab. Which category is left on screen?
- Write the same component with `useQuery` and repeat the experiment.
- Open the global store in your own project. Which fields are really a copy of server data?

## Going deeper

- **Article:** [TkDodo](https://tkdodo.eu/), "Why You Want React Query"; the five mistakes in fetching with `useEffect` and their TanStack Query counterparts.[^3]
- **Video:** [Tanner Linsley](https://github.com/tannerlinsley), "React Query: It's Time to Break up with your Global State!"; the React Summit 2020 talk that introduced the library.[^8]
- **Video:** [TkDodo](https://tkdodo.eu/), "React Query - The Bad Parts"; an honest assessment of the size, the lack of a normalised cache and the learning curve.[^11]
- **Article:** [TkDodo](https://tkdodo.eu/), "You Might Not Need React Query"; where the library stands after Server Components.[^9]

## Sources

1. [TanStack Query: Overview](https://tanstack.com/query/latest/docs/framework/react/overview) *(doc)* — The properties of server state and the problems the library solves.
2. [TanStack Query: Installation](https://tanstack.com/query/latest/docs/framework/react/installation) *(doc)* — Installing the package, React 18+ compatibility and browser support.
3. [TkDodo](https://tkdodo.eu/): [Why You Want React Query](https://tkdodo.eu/blog/why-you-want-react-query) *(article)* — November 7, 2023. The five mistakes in fetching with `useEffect`, and the "async state manager" definition.
4. [React: useEffect](https://react.dev/reference/react/useEffect#fetching-data-with-effects) *(doc)* — Fetching inside an Effect, the race condition, and the recommendation of a framework or a library.
5. [TanStack Query: Does TanStack Query replace Redux, MobX or other global state managers?](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) *(doc)* — What is left in the global store once server state has moved out.
6. [nuqs: Type-safe search params state manager for React](https://nuqs.dev/) *(doc)* — URL synchronisation with a `useState`-like API, typed parsers, history handling and the supported frameworks.
7. [TkDodo](https://tkdodo.eu/): [Practical React Query](https://tkdodo.eu/blog/practical-react-query) *(article)* — November 16, 2020. Keeping client state and server state apart, and the defaults.
8. [Tanner Linsley](https://github.com/tannerlinsley): [React Query: It's Time to Break up with your Global State!](https://gitnation.com/contents/react-query-its-time-to-break-up-with-your-global-state) *(video)* — React Summit Remote Edition, April 2020.
9. [TkDodo](https://tkdodo.eu/): [You Might Not Need React Query](https://tkdodo.eu/blog/you-might-not-need-react-query) *(article)* — May 20, 2023. Server Components and hybrid use.
10. [TanStack Query: Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr) *(doc)* — The advice to start with the framework's own tools in a new project with Server Components.
11. [TkDodo](https://tkdodo.eu/): [React Query - The Bad Parts](https://tkdodo.eu/blog/react-query-the-bad-parts) *(video)* — React Day Berlin, December 2024. The size, the normalised cache and the learning curve.
