---
title: "Custom hooks"
description: "The rules of hooks, moving logic into a hook, and useSyncExternalStore."
lastVerified: "2026-10-21"
translationKey: "react/custom-hooks"
---

## The rules of hooks

Every function whose name starts with `use` is a **hook**. There are two rules:[^1]

1. **Call them only at the top level.** Not inside an `if`, a loop, a nested function, or after an early `return`.
2. **Call them only from React functions.** From components or from other hooks, never from an ordinary function.

Why? React identifies hooks not by name but by **the order in which they are called**. The first `useState` has to be first on every render; if a condition changes the order, the states get mixed up. [Dan Abramov](https://overreacted.io/) sets out the trade-offs behind this design in a long article.[^2] The exception is `use`, which can be called inside a condition.[^3] The `rules-of-hooks` lint rule catches violations.

## What a custom hook is

A custom hook is an ordinary function that calls other hooks inside it and whose name starts with `use`. It shares the repeated **logic** between components.[^4]

```tsx
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

```tsx
function ProductSearch() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  // search with debouncedQuery
}
```

> [!WARNING]
>
> A hook shares logic; it does **not share state**. Call `useDebouncedValue` in two components and you get two separate pieces of state. When you need shared state, lift it to the parent or use Context.[^4]

## A good hook

- **Its purpose should be concrete.** Do not write lifecycle hooks such as `useMount` or `useEffectOnce`; give them names that say what they do, such as `useOnlineStatus`, `useProduct(id)` and `useDebouncedValue`.[^4]
- **Its surface should be small.** In [TkDodo](https://tkdodo.eu/)'s example, a hook that only shows a title in `document.title` never exposes the value at all; it returns the setter alone. Everything that belongs to the hook stays inside it.[^5]
- **Wrap your Effects.** Every Effect in a component is a candidate for moving into a hook with a name. The component then describes *what*, not *how*.[^4][^5]
- **Do not extract needlessly.** A hook that wraps a single `useState`, or a function such as `useFormatPrice` that calls no hooks at all, is pointless. If it calls no hooks, it should be called `formatPrice`.[^4]

Where to put a hook, and when to move it to a shared folder, is in the [Components and code organisation](/academy/architecture/component-organization) guide.

## Subscribing to an external source

To read data held outside React, such as the browser's connection status, `localStorage`, the screen width or a store, use `useSyncExternalStore` rather than an Effect plus `useState`. The React documentation recommends this hook for the job over a hand-written Effect.[^6][^7]

```tsx
import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine, // the value in the browser
    () => true, // the value on the server
  );
}
```

`subscribe` is defined outside the component; pass a new function on every render and React subscribes again.[^6] The third argument is the value to use while rendering on the server. [TkDodo](https://tkdodo.eu/) shows that this argument can also be used to avoid a hydration mismatch during SSR.[^8]

```tsx
function CheckoutButton() {
  const isOnline = useOnlineStatus();
  return <button disabled={!isOnline}>{isOnline ? "Go to checkout" : "No connection"}</button>;
}
```

## Testing a hook

Testing through a component that uses the custom hook is usually enough. When a hook is used on its own, like a library, it is tested with React Testing Library's `renderHook`; the [Provider and hook](/academy/vitest/provider-and-hook) lesson covers that.

## Try it yourself

- Use `useDebouncedValue` in a search box; print `query` and `debouncedQuery` side by side and watch the difference.
- Use `useOnlineStatus` in two different components. Pick "Offline" in the DevTools Network tab; do both of them update?
- Move `subscribe` inside the component and look at what changes in the React DevTools Profiler.
- Move two Effects from one component in your project into two hooks whose names say what they do.

## Going deeper

- **Official docs:** "Reusing Logic with Custom Hooks"; extracting hooks step by step, from `useOnlineStatus` to `useChatRoom`.[^4]
- **Article:** [Dan Abramov](https://overreacted.io/)'s "Why Do Hooks Rely on Call Order?"; it compares the reasoning behind the rules with alternative designs.[^2]
- **Article:** the custom hook section of [TkDodo](https://tkdodo.eu/)'s "Simplifying useEffect".[^5]

## Sources

1. [React: Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) *(doc)* — The rule that hooks are called only at the top level and only from React functions.
2. [Dan Abramov](https://overreacted.io/): [Why Do Hooks Rely on Call Order?](https://overreacted.io/why-do-hooks-rely-on-call-order/) *(article)* — December 13, 2018. The design that rests on call order, and the problems with the alternatives.
3. [React: use](https://react.dev/reference/react/use) *(doc)* — `use`, which can be called inside a condition.
4. [React: Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) *(doc)* — Sharing logic rather than state, naming, and avoiding lifecycle hooks.
5. [TkDodo](https://tkdodo.eu/): [Simplifying useEffect](https://tkdodo.eu/blog/simplifying-use-effect) *(article)* — January 23, 2021. Moving Effects into named hooks, and a small surface.
6. [React: useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) *(doc)* — Subscribing to an external store, defining `subscribe` outside, and the server value.
7. [React: You Might Not Need an Effect, Subscribing to an external store](https://react.dev/learn/you-might-not-need-an-effect#subscribing-to-an-external-store) *(doc)* — The recommendation of `useSyncExternalStore` over an Effect plus state.
8. [TkDodo](https://tkdodo.eu/): [Avoiding Hydration Mismatches with useSyncExternalStore](https://tkdodo.eu/blog/avoiding-hydration-mismatches-with-use-sync-external-store) *(article)* — February 21, 2024. Separating the server and client value with `getServerSnapshot`.
