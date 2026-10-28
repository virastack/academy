---
title: "Setup and devtools"
description: "The QueryClient, the defaults that surprise people, Devtools and the ESLint plugin."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/setup-and-devtools"
---

## Setup

Create a [!vite] project as in the [React](/academy/react/setup-and-tooling) guide and add the package:[^1]

```command
npm install @tanstack/react-query
```

The package works with React 18 and later. On the TypeScript side it supports the versions released in the last two years, which at the moment means TypeScript 5.7 and later.[^1][^2]

## The QueryClient and the provider

The cache lives inside a `QueryClient` instance. You provide that instance at the top of the application with `QueryClientProvider`, and every component below it reaches the same cache:[^1]

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

Create the `QueryClient` outside the component. Write `new QueryClient()` inside one and the cache is reset on every render. When you do have to create it inside a component *(in tests, or on the server)*, use `useState(() => new QueryClient())`.[^3]

> [!DONT]
>
> - Thinking of the provider as a Context and putting a separate `QueryClientProvider` on every page. There is one `QueryClient` per application, and every page shares the cache.[^3]

## The defaults that surprise people

TanStack Query works with no configuration at all, but its defaults are chosen to **keep data current**, not to reduce the number of requests.[^4][^5] Most of the behaviour that surprises people at first comes from these:[^4]

| Default | Value | What it means |
| :-- | :-- | :-- |
| `staleTime` | `0` | Data in the cache counts as "stale" immediately |
| Automatic refetching | On mount, on returning to the tab, when the connection comes back | Stale data is refreshed in the background at these moments |
| `gcTime` | 5 minutes | Data no component is using is removed after 5 minutes |
| `retry` | 3, with increasing delay | The request is tried 3 more times before the error screen appears |
| Structural sharing | On | If the data has not changed, the same reference is kept |

The first thing [TkDodo](https://tkdodo.eu/) reminds people of: even with `staleTime: 0`, `queryFn` does not run on every render. If you saw a request you did not expect, you most likely came back to the tab.[^5] Moving between the DevTools and the application while developing counts as a tab change too. Since v5 only the `visibilitychange` event is listened to, so this happens less often than it used to.[^5]

The second: the error screen does not appear until the three retries are over. That is the answer to "why does the error take so long to show up" in development.[^4] For the `retry: false` setting in tests, see the [Provider and hook testing](/academy/vitest/provider-and-hook) lesson.

You change the defaults for the whole application with `defaultOptions`. The one changed most often is `staleTime`:[^4][^6]

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // send no request for a minute
    },
  },
});
```

The difference between `staleTime` and `gcTime` is the subject of the [Cache and stale time](/academy/tanstack-query/cache-and-stale-time) lesson.

## Devtools

The Devtools are a separate package. They show every query in the cache with its key, its state and its data, and they track mutations too:[^7]

```command
npm install @tanstack/react-query-devtools
```

```tsx
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>;
```

A TanStack logo appears in the corner of the screen, and clicking it opens the panel. The panel only goes into the bundle when `NODE_ENV === "development"`; it drops out of a production build by itself.[^7] There are also extensions that add the same panel to the browser's own DevTools in Chrome, Firefox and Edge.[^7]

TkDodo recommends the Devtools as the fastest way to learn: you watch live when a query is `fresh`, when it is `stale` and when it is `inactive`.[^6] From the panel you can refetch a query by hand, invalidate it, or push it into an error state.

## The ESLint plugin

The documentation recommends the official lint plugin along with the installation. It catches most of the mistakes that slip past, while you write:[^1][^8]

```command
npm install -D @tanstack/eslint-plugin-query
```

```js
// eslint.config.js
import pluginQuery from "@tanstack/eslint-plugin-query";

export default [
  ...pluginQuery.configs["flat/recommended"],
  // the other settings
];
```

The rules in the `recommended` set:[^8][^9]

| Rule | What it catches |
| :-- | :-- |
| `exhaustive-deps` | A variable the `queryFn` uses that is not in the `queryKey` |
| `stable-query-client` | A `QueryClient` recreated on every render |
| `no-rest-destructuring` | `const { data, ...rest } = useQuery()`, which breaks the render optimisation |
| `no-unstable-deps` | Putting a `useQuery` result straight into a hook's dependency array |
| `no-void-query-fn` | A `queryFn` that returns no value |
| `infinite-query-property-order`, `mutation-property-order` | An option order that breaks type inference |

`flat/recommended-strict` adds the `prefer-query-options` rule to that, which makes you write the query settings with `queryOptions`.[^8]

The Vite template comes with [Oxlint](https://oxc.rs) and an `.oxlintrc.json` rather than ESLint. The plugin also works with Oxlint's JS plugin support, which is currently in alpha. The JSON file cannot import the plugin's ready-made set, so you write the rules out one by one:[^8]

```json
// .oxlintrc.json
{
  "plugins": ["react", "typescript", "oxc"],
  "jsPlugins": ["@tanstack/eslint-plugin-query"],
  "rules": {
    "react/rules-of-hooks": "error",
    "@tanstack/query/exhaustive-deps": "error",
    "@tanstack/query/stable-query-client": "error",
    "@tanstack/query/no-rest-destructuring": "warn",
    "@tanstack/query/no-unstable-deps": "error",
    "@tanstack/query/infinite-query-property-order": "error",
    "@tanstack/query/mutation-property-order": "error"
  }
}
```

`no-void-query-fn` needs type information, and Oxlint does not give that to JS plugins yet, so it is not on the list.[^8]

## Pinning the version

Type fixes arrive in **patch** releases; the documentation does not count them as breaking changes. It therefore recommends pinning the package to a particular patch version and expecting the types to change when you upgrade.[^2] If the lock file *(`package-lock.json`, `pnpm-lock.yaml`)* is committed, that is already taken care of.

## Try it yourself

- Move the `QueryClient` inside the `App` component. Which rule does ESLint or Oxlint warn with?
- Write a query and open the Devtools. Switch to another tab and come back; how does the query's state change?
- Turn the `queryFn` into a function that always throws. How many seconds before the error screen appears? Try again with `retry: false`.

## Going deeper

- **Official docs:** "Important Defaults"; how to change each default, and the difference between `staleTime: 'static'` and `Infinity`.[^4]
- **Article:** [TkDodo](https://tkdodo.eu/), "Practical React Query"; the defaults explained, the Devtools and the custom hook recommendation.[^6]
- **Official docs:** "ESLint Plugin Query"; the right and wrong examples for every rule.[^8]

## Sources

1. [TanStack Query: Installation](https://tanstack.com/query/latest/docs/framework/react/installation) *(doc)* — Installing the package, React 18+ compatibility and the ESLint plugin recommendation.
2. [TanStack Query: TypeScript](https://tanstack.com/query/latest/docs/framework/react/typescript) *(doc)* — The supported TypeScript versions and the advice to pin at the patch level.
3. [TanStack Query: stable-query-client](https://tanstack.com/query/latest/docs/eslint/stable-query-client) *(doc)* — Creating the `QueryClient` outside render, or with `useState`.
4. [TanStack Query: Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults) *(doc)* — `staleTime`, `gcTime`, `retry`, automatic refetching and structural sharing.
5. [TkDodo](https://tkdodo.eu/): [React Query as a State Manager](https://tkdodo.eu/blog/react-query-as-a-state-manager) *(article)* — August 20, 2021. Stale-while-revalidate and the moments that trigger a refetch.
6. [TkDodo](https://tkdodo.eu/): [Practical React Query](https://tkdodo.eu/blog/practical-react-query) *(article)* — November 16, 2020. The defaults explained, the difference between `staleTime` and `gcTime`, and the Devtools.
7. [TanStack Query: Devtools](https://tanstack.com/query/latest/docs/framework/react/devtools) *(doc)* — Installation, the floating and embedded modes, loading it in production, and the browser extensions.
8. [TanStack Query: ESLint Plugin Query](https://tanstack.com/query/latest/docs/eslint/eslint-plugin-query) *(doc)* — Flat config, the strict set and the Oxlint setup.
9. [TanStack Query: no-rest-destructuring](https://tanstack.com/query/latest/docs/eslint/no-rest-destructuring) *(doc)* — Rest destructuring breaking the tracked-property optimisation.
