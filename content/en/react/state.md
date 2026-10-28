---
title: "State"
description: "Snapshots and updaters, immutable updates, and structuring state well."
lastVerified: "2026-10-21"
translationKey: "react/state"
---

## What state is

**State** is the data a component remembers between renders. `useState` returns two things: the current value and a function that updates it. When the update function is called, React renders the component again.[^1]

```tsx
import { useState } from "react";

export function QuantityPicker() {
  const [quantity, setQuantity] = useState(1);

  return (
    <div>
      <button onClick={() => setQuantity(quantity - 1)}>-</button>
      <span>{quantity}</span>
      <button onClick={() => setQuantity(quantity + 1)}>+</button>
    </div>
  );
}
```

An ordinary `let` variable cannot do this job: every render runs the function from the top and resets the variable, and changing a variable does not trigger a render.[^1]

## State is a snapshot

`setQuantity` does not change the value right away; it leaves a request for the next render. Within that render, `quantity` stays fixed.[^2]

```tsx
function handleAddThree() {
  setQuantity(quantity + 1);
  setQuantity(quantity + 1);
  setQuantity(quantity + 1);
  console.log(quantity); // still 1; result: 2
}
```

All three calls work out `1 + 1`. React processes the updates in one event **together** *(batching)* and does a single render. When you update based on the previous value, pass an **updater function**:[^2]

```tsx
setQuantity((q) => q + 1); // result: 4
setQuantity((q) => q + 1);
setQuantity((q) => q + 1);
```

[Josh W. Comeau](https://www.joshwcomeau.com/) counts this "I set it but I still see the old value" situation among the mistakes beginners get stuck on most often.[^3]

## Don't change it, hand over a new one

Do not change state that holds an object or an array directly. React notices a change by comparing references; change the same object and hand it back, and no render may happen.[^4]

```tsx
// ❌ mutation
cart.push(product);
setCart(cart);

// ✅ a new array
setCart([...cart, product]);
setCart(cart.filter((item) => item.id !== id));
setCart(cart.map((item) =>
  item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
));
```

`push`, `splice`, `sort` and `reverse` change the array in place; use their copying counterparts such as `toSorted` and `toReversed`, or a spread.[^4] `eslint-plugin-react-hooks`'s `immutability` rule catches props and state mutation.[^5]

## Setting state up properly

Most bugs come not from state itself but from structuring it badly. The React documentation's five principles:[^6]

| Principle | Example |
| :-- | :-- |
| Group what changes together | `position` instead of `x` and `y` |
| Do not allow contradictions | `status: "idle" \| "loading" \| "error"` instead of `isLoading` + `isError` |
| Do not hold what can be calculated | `fullName` is not state; it is `firstName + lastName` |
| Do not duplicate | `selectedId` rather than the selected product itself |
| Avoid deeply nested structures | A flat list with ids instead of a tree |

The third principle is the one broken most often. [TkDodo](https://tkdodo.eu/) describes seeing the same pattern over and over in code review: code that pulls a category list out of the data, puts it in a separate state and keeps it in sync with an Effect. Then somebody calls `setCategories` from elsewhere and the categories come loose from the data. His rule is short: if a state setter is only called synchronously inside an Effect, delete that state.[^7] [Kent C. Dodds](https://kentcdodds.com/) says the same thing in one sentence: *"Don't sync state. Derive it!"*[^8]

```tsx
// ❌ Two states and an Effect
const [products, setProducts] = useState<Product[]>([]);
const [inStock, setInStock] = useState<Product[]>([]);
useEffect(() => {
  setInStock(products.filter((p) => p.stock > 0));
}, [products]);

// ✅ One state and a calculation
const [products, setProducts] = useState<Product[]>([]);
const inStock = products.filter((p) => p.stock > 0);
```

Even when the calculation is expensive, measure first; the React Compiler or `useMemo` handles the memoization.

## Where state lives and when it resets

State goes in the **nearest common parent** of the components that use it. If two siblings need the same value, the state moves up to the parent and comes down as props.[^9] The decision table and *colocation* are in the [Components and code organisation](/academy/architecture/component-organization) guide.

React ties state not to the component but to its **position in the tree**. As long as the same type of component is rendered in the same place, the state is kept; it is discarded when the component is removed or its type changes.[^10] To reset state while showing a different record in the same place, give it a `key`: `<ReviewForm key={product.id} />`.[^10]

## useState or useReducer?

When updates come from many places and depend on one another *(a multi-step form, a cart)*, `useReducer` gathers the logic into a single pure function and makes it easier to test.[^11] [TkDodo](https://tkdodo.eu/)'s measure: separate `useState`s for values that change independently, `useReducer` for pieces that change together and depend on each other.[^12] A typed `cartReducer` example is in the [Types in React](/academy/typescript/types-in-react) lesson.

## Not all data is the same state

[Kent C. Dodds](https://kentcdodds.com/) suggests splitting application state into at least two kinds: data that comes from the server *(a server cache)* and data that only drives the interface *(UI state)*. Keeping the two in the same place is the biggest source of mess.[^13]

| Kind | Example | Where |
| :-- | :-- | :-- |
| UI state | Is the modal open, the selected tab | `useState`, Context if needed |
| Server state | The product list, an order | [TanStack Query](/academy/tanstack-query) or the framework |
| URL state | The search text, a filter, the page | The router's search params |
| Form state | Input that has not been submitted yet | The form; the [Forms](/academy/forms) guide |
| Shared client state | The theme, the cart | Context or [Zustand](/academy/zustand) |

## Try it yourself

- Add a "+3" button to `QuantityPicker`. Write it first with `quantity + 1`, then with an updater.
- Try raising the quantity of a cart item with `item.quantity++` and explain why the screen does not update.
- Turn a component that holds `isLoading`, `isError` and `data` into one with a single `status` field.
- Take `filteredProducts` out of state in a product list and calculate it during render.

## Going deeper

- **Official docs:** the "Managing State" section; state structure, lifting state up, and preserving and resetting state.[^6][^10]
- **Article:** [TkDodo](https://tkdodo.eu/)'s "useState pitfalls" series; derived state and putting props into state.[^7]
- **Article:** [Kent C. Dodds](https://kentcdodds.com/)'s "Application State Management with React"; the split between a server cache and UI state.[^13]

## Sources

1. [React: State: A Component's Memory](https://react.dev/learn/state-a-components-memory) *(doc)* — `useState`, and why a local variable is not enough.
2. [React: State as a Snapshot](https://react.dev/learn/state-as-a-snapshot) *(doc)* — State staying fixed within a render; the "Queueing a Series of State Updates" page for batching and updaters.
3. [Josh W. Comeau](https://www.joshwcomeau.com/): [Common Beginner Mistakes with React](https://www.joshwcomeau.com/react/common-beginner-mistakes/) *(article)* — Reading state right after setting it, and mutation mistakes.
4. [React: Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state) *(doc)* — A table of the methods that mutate and the ones that return a new array.
5. [React: immutability lint](https://react.dev/reference/eslint-plugin-react-hooks/lints/immutability) *(doc)* — The rule that catches props and state mutation.
6. [React: Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) *(doc)* — The grouping, contradiction, redundant state, duplication and nesting principles.
7. [TkDodo](https://tkdodo.eu/): [Don't over useState](https://tkdodo.eu/blog/dont-over-use-state) *(article)* — August 29, 2020. Derived state, and the risk of syncing with an Effect.
8. [Kent C. Dodds](https://kentcdodds.com/): [Don't Sync State. Derive It!](https://kentcdodds.com/blog/dont-sync-state-derive-it) *(article)* — September 30, 2019. Not holding a calculable value in state, with a tic-tac-toe example.
9. [React: Sharing State Between Components](https://react.dev/learn/sharing-state-between-components) *(doc)* — Lifting state to the nearest common parent.
10. [React: Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state) *(doc)* — State depending on the position in the tree, and resetting it with `key`.
11. [React: Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer) *(doc)* — Moving to `useReducer`, and a comparison with `useState`.
12. [TkDodo](https://tkdodo.eu/): [useState vs useReducer](https://tkdodo.eu/blog/use-state-vs-use-reducer) *(article)* — 2021, updated April 2022. State that changes together, and using a reducer.
13. [Kent C. Dodds](https://kentcdodds.com/): [Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react) *(article)* — From 2020. Separating the server cache from UI state, and colocation.
