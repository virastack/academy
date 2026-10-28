---
title: "Effects and when you don't need one"
description: "Synchronising with an external system, cleanup, useEffectEvent and Effect-free solutions."
lastVerified: "2026-10-21"
translationKey: "react/effects"
---

## What an Effect is for

Most code in React runs in one of two places: **render** *(which works out the JSX and has to be pure)* and an **event handler** *(which responds to an interaction such as a click)*. An **Effect** is the third place: it runs after the render and **synchronises** the component with a system outside React. A browser API, a WebSocket, a map library or a third-party widget are examples of those external systems.[^1]

```tsx
useEffect(() => {
  // setup: connect to the external system
  return () => {
    // cleanup: disconnect
  };
}, [dependency]);
```

The central idea in [Dan Abramov](https://overreacted.io/)'s long `useEffect` guide: instead of *"when does this Effect run?"*, ask *"which state is this Effect in sync with?"*. Every render sees its own props and state, and the Effect works with that render's values.[^2]

## When you don't need an Effect

According to the React documentation, the most common mistake is writing an Effect for work that involves no external system.[^3] [David Khourshid](https://github.com/davidkpiano) made the same point in his React Advanced 2022 talk: most Effects should really be the result of an event.[^4]

| Done with an Effect | Instead |
| :-- | :-- |
| Calculating a value from props or state | Calculate it during render |
| Resetting all the state when a prop changes | Give the component a `key` |
| Sending a request when the user does something | Do it in the event handler |
| Telling the parent when state changes | Call the parent's function in the same event handler |
| Updating one state when another changes *(a chain of Effects)* | Work it all out in one event handler |
| Code that should run once when the app starts | At module level, outside the component |
| Fetching data | The framework, [TanStack Query](/academy/tanstack-query), or `use` + Suspense |

```tsx
// ❌ Buying is an event, not an Effect
useEffect(() => {
  if (submitted) {
    post("/api/orders", cart);
  }
}, [submitted, cart]);

// ✅
function handleCheckout() {
  post("/api/orders", cart);
}
```

> [!TIP]
>
> Ask yourself: *"should this code run **because the component appeared on screen**, or **because the user did something**?"* If it is the second, it belongs in an event handler.[^5]

`eslint-plugin-react-hooks`'s `set-state-in-effect` rule catches a synchronous `setState` inside an Effect. That pattern means an extra render, and it is usually a sign of derived state.[^6]

## Cleanup

If an Effect starts something *(a subscription, a timer, an event listener, a connection)*, it stops it in the cleanup. React calls the cleanup before the Effect runs again and when the component is removed.[^1]

```tsx
function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onEscape();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEscape]);
}
```

In development, Strict Mode runs every Effect in the order *setup → cleanup → setup*. If the user cannot feel the difference, the cleanup is right. If the connection is opened twice, the problem is not Strict Mode but a missing cleanup.[^1]

## Dependencies

Every reactive value used inside the Effect *(props, state, and variables and functions defined in the component)* goes into the dependency array. The `exhaustive-deps` rule points out what is missing.[^7]

> [!DONT]
>
> - "Lying" about the dependency array: silencing the linter, or writing `[]` with values missing. The Effect works with stale values, and the bug only appears when things are clicked in a particular order.[^2]
> - Piling `useCallback` and `useMemo` onto the dependencies to stop the Effect running again. Move the function inside the Effect, or outside the component, first.[^2][^7]

[TkDodo](https://tkdodo.eu/) has three more practical suggestions: let each Effect do one job *(split updating the title and sending analytics into separate Effects)*, give the Effect a name as in `useEffect(function syncTitle() {...})`, and move repeated Effects into a custom hook with a name of its own.[^8]

## useEffectEvent

Sometimes you want to **read** a value inside an Effect without the Effect **re-synchronising** when that value changes. `useEffectEvent`, which became stable in React 19.2, is for exactly that.[^9][^10]

```tsx
import { useEffect, useEffectEvent } from "react";

function ProductPage({ productId, cartCount }: ProductPageProps) {
  const onVisit = useEffectEvent((visitedId: string) => {
    logVisit(visitedId, cartCount); // always the current cartCount
  });

  useEffect(() => {
    onVisit(productId);
  }, [productId]); // only when the product changes
}
```

When the cart count changes the visit is not logged again; when the product changes it is logged, and it sees the cart count as it is at that moment.

> [!WARNING]
>
> Do not use `useEffectEvent` as a shortcut for shortening the dependency array. Use it only for logic that is triggered from an Effect and really behaves like an event. Effect Events are only called from inside an Effect and are not passed to another component.[^10]

## Fetching data inside an Effect

If you have to, watch out for two things: a **race condition** *(an old response overwriting a newer one for a fast typist)* and the cleanup. Use an `AbortController` to cancel the request:[^3]

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/products?q=${query}`, { signal: controller.signal })
    .then((response) => response.json())
    .then((data: Product[]) => setResults(data))
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setError(error);
    });
  return () => controller.abort();
}, [query]);
```

This code still has no cache, no retry, no loading state and no answer to the waterfall problem. That is why the React documentation recommends the framework's own data fetching, or a library.[^3] [TkDodo](https://tkdodo.eu/)'s rule is short: for asynchronous work, neither an Effect nor a ref but TanStack Query.[^11] Reading data with Suspense and `use` comes in a later lesson.

## Try it yourself

- Add `useEscapeKey` to a modal; delete the cleanup, open and close the modal a few times and see what happens when you press Escape.
- Search your project for `useEffect`. For each one, ask the question from the table: is there an external system?
- Write `setFiltered(products.filter(...))` inside an Effect and read the `set-state-in-effect` warning; then calculate it during render.
- Remove the `AbortController` from a search box, set the network to "Slow 4G" in DevTools, and watch the result as you type quickly.

## Going deeper

- **Official docs:** "You Might Not Need an Effect"; the common situations that need no Effect, and what to do instead. One of the React pages most worth reading.[^3]
- **Article:** [Dan Abramov](https://overreacted.io/)'s "A Complete Guide to useEffect"; from 2019 and long, but the best source on the idea that every render has its own values.[^2]
- **Video:** [David Khourshid](https://github.com/davidkpiano)'s "Using useEffect Effectively" *(React Advanced 2022, 30 min)*.[^4]
- **Article:** [TkDodo](https://tkdodo.eu/)'s "Simplifying useEffect"; single responsibility, naming and custom hooks.[^8]

## Sources

1. [React: Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) *(doc)* — How an Effect differs from render and from an event, cleanup, and running twice in Strict Mode.
2. [Dan Abramov](https://overreacted.io/): [A Complete Guide to useEffect](https://overreacted.io/a-complete-guide-to-useeffect/) *(article)* — March 9, 2019. Every render having its own props and state, and not lying about dependencies.
3. [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) *(doc)* — Needless Effect patterns, chains of Effects, and data fetching with a race condition.
4. [David Khourshid](https://github.com/davidkpiano): [Using useEffect Effectively (React Advanced 2022)](https://gitnation.com/contents/using-useeffect-effectively) *(video)* — 30 minutes. Moving Effects into events, and not using an Effect to fetch data.
5. [React: Separating Events from Effects](https://react.dev/learn/separating-events-from-effects) *(doc)* — Choosing between an event handler and an Effect, and reactive logic.
6. [React: set-state-in-effect lint](https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect) *(doc)* — A synchronous `setState` inside an Effect causing an extra render.
7. [React: Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies) *(doc)* — Reducing dependencies without silencing the linter; moving functions and objects inside the Effect.
8. [TkDodo](https://tkdodo.eu/): [Simplifying useEffect](https://tkdodo.eu/blog/simplifying-use-effect) *(article)* — January 23, 2021. Fewer Effects, single responsibility, custom hooks and named Effects.
9. [React Blog: React 19.2](https://react.dev/blog/2025/10/01/react-19-2) *(doc)* — October 1, 2025. The stable release of `useEffectEvent` and `<Activity>`.
10. [React: useEffectEvent](https://react.dev/reference/react/useEffectEvent) *(doc)* — An Effect Event reading the current value, and the limits on using it.
11. [TkDodo](https://tkdodo.eu/): [Ref Callbacks, React 19 and the Compiler](https://tkdodo.eu/blog/ref-callbacks-react-19-and-the-compiler) *(article)* — December 8, 2024. Choosing between a ref callback and an Effect; TanStack Query for asynchronous work.
