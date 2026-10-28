---
title: "When you need a store"
description: "The kinds of state, local state, and where Context is not enough."
lastVerified: "2026-10-21"
translationKey: "zustand/when-you-need-a-store"
---

## Classify the state first

Before opening a global store, look at which kind the data belongs to. Most data needs no store at all:[^1][^2]

| Kind | Example | Where |
| :-- | :-- | :-- |
| Local state | Is the dropdown open, an input value | `useState` |
| Server state | The product list, an order | [TanStack Query](/academy/tanstack-query) |
| URL state | A filter, the sort order, the page, the tab | The router's search params, or [nuqs](https://nuqs.dev) |
| Shared client state | The cart, the theme, is the sidebar open | Context or [!zustand] |

[TkDodo](https://tkdodo.eu/) describes this from his own experience: most of the state in an application is either server state or URL state. He says he has combined a store with `useQuery` or `useParams` far more often than he has combined two Zustand stores.[^3] The TanStack Query documentation makes the same observation: once server data has moved to its own tool, all that is usually left in the global store is a handful of values such as the theme and the sidebar.[^4]

State that has to be shareable, or that the back button should return to, belongs in the URL: share the link and the same view opens, and a bookmark and the browser history return to the earlier state.[^5] In Next.js, `useSearchParams` only reads the URL.[^6] For a typed read-and-write API similar to `useState`, you can use [nuqs](https://nuqs.dev).[^7] TanStack Router, meanwhile, treats search params as validated, typed application state.[^8] There is a price too: a long URL is impractical, and browsers rate-limit URL updates.[^5]

## When local state is enough

If two sibling components need the same value, move the state to the **nearest common parent** first *(see [State](/academy/react/state))*.[^9] If the value goes down a few levels, the React documentation suggests two things before Context: carrying on with props, or passing `children` to the components in between.[^10]

A store makes sense when these signs are there:

- Places **far apart** in the tree read and change the same client state *(the cart count in the header, "Add to cart" on the product card, the cart list in the side panel)*.
- The value **changes often** and only some of the components reading it should render on each change.
- You want to read or change the state from outside React too *(a WebSocket listener, a test)*.

## Why Context is not always enough

Context carries a value; it does not manage state. When a provider's `value` changes, **every** component reading it renders, even one that only cares about part of the value.[^11] For a theme or session information that changes rarely, that is no problem. For a cart that changes on every click, or a multi-select list, it can make things slow.

TkDodo recommends using Context not for a value itself but to share **an instance that does not change**, such as a store. The store's selectors then do the picking.[^12] That pattern is in the [A store with Context](/academy/zustand/store-with-context) lesson.

## What Zustand is

[!zustand] is a small, hook-based client state library. Your store is a hook; no provider is needed. A component reads only the part of the store it needs with a selector, and renders only when that part changes:[^13]

```ts
import { create } from "zustand";

type CartState = {
  count: number;
  increase: () => void;
};

export const useCartStore = create<CartState>()((set) => ({
  count: 0,
  increase: () => set((state) => ({ count: state.count + 1 })),
}));

// In a component:
const count = useCartStore((state) => state.count);
```

The library is a project of the Poimandres *(pmndrs)* community. Its current maintainer, [Daishi Kato](https://blog.axlight.com/), took it over in 2020 during a period when it had been left unmaintained. He sums its design principle up like this: global state sits **outside** React Context, and when Context is needed it only carries the store; the application stays simple and the bundle small.[^14]

The current version is v5. It brought no new features; it removed the APIs deprecated in v4, required at least React 18 and TypeScript 4.5, and moved to React's built-in `useSyncExternalStore`.[^15][^16] If you see `import create from "zustand"` *(a default export)*, or `shallow` next to a selector, in an older article, that is v4 code.

## How it differs from the other libraries

The Zustand documentation compares itself with similar libraries. The difference runs along two axes:[^17]

| Library | State model | Render optimisation | Provider |
| :-- | :-- | :-- | :-- |
| [!zustand] | A single store, immutable | You write the selector | Not needed |
| Redux Toolkit | A single store, immutable | You write the selector | Needed |
| Jotai | Small composable atoms | Automatic, by atom dependency | Not needed |
| Valtio | A mutable proxy | Automatic, by the property read | Not needed |

Zustand is the closest to Redux conceptually, with less code and no provider. TkDodo explains his own preference like this: Zustand is not "magic" and does not track which field you used; you subscribe explicitly with a selector. That keeps the dependencies visible as the application grows.[^3]

> [!DONT]
>
> - Copying a list that came from the server into a Zustand store. You end up writing the caching, refetching and error states by hand; that is [TanStack Query](/academy/tanstack-query)'s job.[^4]
> - Putting a filter that belongs in the URL into the store. The page cannot be shared and the back button does not work.

## Try it yourself

- Split the state of an application you are working on into the four kinds above. How many values are left as shared client state?
- Write a cart counter first with `useState` in a common parent and then with Context. Watch which components render as you add a product to the cart, using React DevTools' "Highlight updates" option.

## Going deeper

- **Article:** [TkDodo](https://tkdodo.eu/), "Working with Zustand"; why he chose Zustand, and the advice to keep the store small.[^3]
- **Article:** [Daishi Kato](https://blog.axlight.com/), "How Zustand was born"; the project's history and the idea of global state outside Context.[^14]
- **Official docs:** "Comparison"; a code comparison with Redux, Valtio, Jotai and Recoil.[^17]

## Sources

1. [React: Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) *(doc)* — Avoiding redundant and derivable state.
2. [Kent C. Dodds](https://kentcdodds.com/): [Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react) *(article)* — From 2020. Separating the server cache from UI state, and colocation.
3. [TkDodo](https://tkdodo.eu/): [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) *(article)* — November 20, 2022. Explicit subscription with a selector, small stores, and combining the store with queries.
4. [TanStack Query: Does TanStack Query replace Redux, MobX or other global state managers?](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) *(doc)* — The client state left in the global store once server state has moved out.
5. [InfoQ: React Advanced 2025: Type Safe URL State Management Takes Center Stage with Nuqs](https://www.infoq.com/news/2025/12/nuqs-react-advanced) *(article)* — François Best's talk: the sharing and history benefits of URL state, URL length and the browser rate limit. Daniel Curtis, December 12, 2025.
6. [Next.js: useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params) *(doc)* — A read-only `URLSearchParams`, the Suspense boundary, and the page's `searchParams` prop.
7. [nuqs: Type-safe search params state manager for React](https://nuqs.dev/) *(doc)* — URL synchronisation with a `useState`-like API, typed parsers, history handling and the supported frameworks.
8. [TanStack Router: Search Params](https://tanstack.com/router/latest/docs/framework/react/guide/search-params) *(doc)* — Treating search params as application state, with types and validation through `validateSearch`.
9. [React: Sharing State Between Components](https://react.dev/learn/sharing-state-between-components) *(doc)* — Lifting state to the nearest common parent.
10. [React: Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) *(doc)* — What to try before Context.
11. [React: useContext](https://react.dev/reference/react/useContext) *(doc)* — Every reading component rendering when the value changes.
12. [TkDodo](https://tkdodo.eu/): [Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context) *(article)* — April 14, 2024. Sharing a store instance with Context rather than a value.
13. [Zustand: Introduction](https://zustand.docs.pmnd.rs/learn/getting-started/introduction) *(doc)* — Installation, the store as a hook, and subscribing with a selector.
14. [Daishi Kato](https://blog.axlight.com/): [How Zustand was born](https://blog.axlight.com/posts/how-zustand-was-born/) *(article)* — July 14, 2024. Taking the project over, and keeping global state outside Context.
15. [Daishi Kato](https://blog.axlight.com/): [Announcing Zustand v5](https://pmnd.rs/blog/announcing-zustand-v5) *(article)* — October 20, 2024. No new features, the React 18 requirement and `useSyncExternalStore`.
16. [Zustand: How to Migrate to v5 from v4](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) *(doc)* — The default export going away, and the React 18 and TypeScript 4.5 requirements.
17. [Zustand: Comparison](https://zustand.docs.pmnd.rs/learn/getting-started/comparison) *(doc)* — The state model and render optimisation differences against Redux, Valtio, Jotai and Recoil.
