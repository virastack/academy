---
title: "Context"
description: "Sharing without prop drilling, using it with a reducer, and its limits."
lastVerified: "2026-10-21"
translationKey: "react/context"
---

## What Context solves

**Context** gets a value deep into the tree without passing it as a prop through the components in between. One component **provides** the value, and any component below it **reads** it.[^1]

The typical uses: the theme, the signed-in user, the language, the cart — data a wide part of the application needs and that changes rarely.[^1]

> [!TIP]
>
> Before reaching for Context, try the two steps from the [Props and composition](/academy/react/props-and-composition) lesson: carry on with props, or pass `children` to the intermediate components. The React documentation only recommends Context when those are not enough.[^1]

## Three steps

```tsx
import { createContext, use, useState } from "react";

type Theme = "light" | "dark";

// 1. Create
const ThemeContext = createContext<Theme>("light");

// 2. Provide
export function App() {
  const [theme, setTheme] = useState<Theme>("light");
  return (
    <ThemeContext value={theme}>
      <ProductPage />
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        Change theme
      </button>
    </ThemeContext>
  );
}

// 3. Read
function PriceTag({ amount }: { amount: number }) {
  const theme = use(ThemeContext);
  return <span className={`price price-${theme}`}>€{amount}</span>;
}
```

Two current details:

- Since React 19 the provider is written as `<ThemeContext value={...}>` directly; `<ThemeContext.Provider>` still works but will be deprecated in future.[^2]
- You can read a context with either `useContext` or `use`. `use` can also be called inside an `if` or after an early `return`; `useContext` cannot.[^3]

The component doing the reading gets the value of the **nearest** provider above it in the tree. With no provider, it sees the default value given to `createContext`.[^1]

## Wrapping the provider in a custom hook

Most of the time a context has no meaningful default value. [Kent C. Dodds](https://kentcdodds.com/)'s pattern: make the default `null`, do not expose the context, and export a hook for reading it that throws when there is no provider.[^4]

```tsx
const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const cart = use(CartContext);
  if (cart === null) {
    throw new Error("useCart must be used within CartProvider.");
  }
  return cart;
}
```

The typing side is in the [Types in React](/academy/typescript/types-in-react) lesson.

## Together with a reducer

Context **carries**; it does not **hold** state. For data that is shared and changes, you combine Context with `useState` or `useReducer`. The React documentation recommends putting the state and the `dispatch` in two separate contexts.[^5]

```tsx
const CartContext = createContext<CartItem[] | null>(null);
const CartDispatchContext = createContext<React.Dispatch<CartAction> | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  return (
    <CartContext value={items}>
      <CartDispatchContext value={dispatch}>{children}</CartDispatchContext>
    </CartContext>
  );
}
```

`dispatch` never changes. Components that only need `dispatch`, such as an "Add to cart" button, then do not render when the cart changes.[^5][^6]

## Performance and limits

When a provider's `value` changes, **every** component reading it renders. So:[^6][^7]

- **Put data in it that changes rarely.** The theme, the user and the language are good candidates. The mouse position, or a form value that changes on every keystroke, are bad ones.
- **Separate unrelated values.** `ThemeContext`, `UserContext` and `CartContext` rather than one giant `AppContext`.
- **Do not rebuild the value on every render.** `value={{ items, addItem }}` produces a new object each time. The React Compiler memoises this itself; without the compiler, use `useMemo`.[^7]

Context is not a state management library. [TkDodo](https://tkdodo.eu/) recommends using Context not for a value itself but to share **an instance that does not change**, such as a Zustand store or a React Query client; the library's selectors then do the picking.[^8] For global client state that changes often see the [Zustand](/academy/zustand) guide, and for server data the [TanStack Query](/academy/tanstack-query) guide.

In a framework that uses Server Components, such as [!nextjs], a Server Component **cannot create** a Context, but since React 19.3 it can render a Context imported from a `'use client'` module directly; no separate `Provider` wrapper is needed.[^9]

## Try it yourself

- Set up `ThemeContext` and then delete the provider. Which theme does `PriceTag` show?
- Call `useCart` outside the provider and see the error message.
- Put a `console.log("render")` in the add-to-cart button. Hold the state and `dispatch` in one context first, then in two separate contexts, and count the logs as you add products to the cart.
- Call `use(ThemeContext)` after an `if (!isOpen) return null;` line; try the same with `useContext` and see what the linter says.

## Going deeper

- **Official docs:** "Passing Data Deeply with Context" and "Scaling Up with Reducer and Context"; the second builds a cart-like task list step by step.[^1][^5]
- **Article:** [Kent C. Dodds](https://kentcdodds.com/)'s "How to use React Context effectively".[^4]
- **Article:** [TkDodo](https://tkdodo.eu/) on limiting a Zustand store to a subtree with Context.[^8]

## Sources

1. [React: Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) *(doc)* — The three steps of Context, the nearest provider, where it is used, and what to try before it.
2. [React v19](https://react.dev/blog/2024/12/05/react-19) *(doc)* — `<Context>` being used as the provider, and `<Context.Provider>` being deprecated in future.
3. [React: use](https://react.dev/reference/react/use) *(doc)* — `use`, which can read a context conditionally, and how it differs from `useContext`.
4. [Kent C. Dodds](https://kentcdodds.com/): [How to use React Context effectively](https://kentcdodds.com/blog/how-to-use-react-context-effectively) *(article)* — June 5, 2021. A custom hook that throws outside the provider, and not exposing the context.
5. [React: Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context) *(doc)* — Putting the state and `dispatch` in separate contexts, and the provider component.
6. [React: useContext](https://react.dev/reference/react/useContext) *(doc)* — Reading components rendering when the value changes, and memoising the value.
7. [Kent C. Dodds](https://kentcdodds.com/): [How to optimize your context value](https://kentcdodds.com/blog/how-to-optimize-your-context-value) *(article)* — March 8, 2021. Memoising the context value, and separating state from dispatch.
8. [TkDodo](https://tkdodo.eu/): [Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context) *(article)* — April 14, 2024. Sharing a store instance with Context rather than a value.
9. [React Blog: React 19.3](https://react.dev/blog/2026/09/09/react-19-3) *(doc)* — September 9, 2026. Server Components being able to render a Context directly.
