---
title: "Components and JSX"
description: "Splitting up the interface, JSX rules, lists and keys, pure components."
lastVerified: "2026-10-21"
translationKey: "react/components-and-jsx"
---

## Split the interface into boxes

In React an interface is made of **components** nested inside one another. The "Thinking in React" page of the React documentation starts every job with the same step: draw a box around each piece of the design and give each box a name. If a box does more than one job, split it into smaller boxes.[^1]

```text
ProductPage
├── SearchBar
└── ProductList
    ├── ProductCard
    └── ProductCard
```

A component is a JavaScript function that starts with a capital letter and returns JSX:[^2]

```tsx
export function ProductCard() {
  return (
    <article className="product-card">
      <img src="/headphones.jpg" alt="Wireless headphones" />
      <h2>Wireless headphones</h2>
    </article>
  );
}
```

If the name starts with a lowercase letter, React takes it for an HTML tag called `<productCard>`. How far to split is a design decision; the criteria are in the [Components and code organisation](/academy/architecture/component-organization) guide.

## JSX rules

JSX is a syntax inside JavaScript that looks like HTML; it is turned into function calls at build time. It differs from HTML in three ways:[^3]

| Rule | Example |
| :-- | :-- |
| It returns a single root element | `<>...</>` *(a Fragment)* when no wrapper is wanted |
| Every tag closes | `<img />`, `<br />`, `<input />` |
| Attributes are camelCase | `className`, `htmlFor`, `onClick`; `aria-*` and `data-*` keep their dashes |

Any JavaScript **expression** can go inside curly braces `{}`: a variable, a function call, a ternary. **Statements** such as `if` or `for` cannot.[^3]

```tsx
const product = { name: "Headphones", price: 1499, inStock: true };

<p className={product.inStock ? "price" : "price muted"}>
  {product.name}: €{product.price.toLocaleString("en-US")}
</p>;
```

## Conditional rendering

There are three ways: an early `return` with `if`, a ternary `? :`, and `&&`.[^4]

```tsx
{cartCount > 0 && <Badge count={cartCount} />}
{product.inStock ? <AddToCartButton /> : <p>Out of stock</p>}
```

> [!WARNING]
>
> Do not put a number on the left of `&&`. `{items.length && <List />}` prints `0` on the screen when the list is empty, because React renders `0`. Write `items.length > 0 &&`, or use a ternary.[^5][^4]

When a component shows different states such as *loading*, *empty*, *error* and *full*, do not pile conditions into the JSX. [TkDodo](https://tkdodo.eu/) *(Dominik Dorfmeister)* suggests writing each state as its own early `return`: every `if` stands for a screen the user sees, and adding a new state does not break the others.[^6]

```tsx
function ProductListView({ status, products }: ProductListViewProps) {
  if (status === "pending") return <ProductListSkeleton />;
  if (status === "error") return <ErrorMessage />;
  if (products.length === 0) return <EmptyState />;

  return <ProductList products={products} />;
}
```

## Lists and keys

You turn an array into JSX with `map`. Every item is given a `key`:[^7]

```tsx
<ul>
  {products.map((product) => (
    <li key={product.id}>{product.name}</li>
  ))}
</ul>
```

A `key` is how React works out which item is which on the next render. The rules:[^7]

- **It should come from the data.** A database id or a unique slug is best.
- **It should be unique among siblings.** The same key in another list is no problem.
- **It should not change.** `key={Math.random()}` recreates the item from scratch on every render and loses its state.

> [!DONT]
>
> - Using the array `index` as the key in lists that get sorted, filtered or added to. When the order changes, React attaches the state to the wrong row; text you typed into an input, for instance, ends up on another product's row.[^7][^5]

A `key` is not only for lists. Give a component a different key and React builds it from scratch, which is the cleanest way of resetting its state. You will see it again in the State lesson.

## Components have to be pure

React's most important rule: given the same props, state and context, a component has to return the same JSX every time. It must not change anything outside itself during render.[^8][^9]

```tsx
let renderCount = 0;

function ProductCard({ product }: ProductCardProps) {
  renderCount++; // ❌ changing a variable outside
  product.viewed = true; // ❌ changing a prop
  return <h2>{product.name}</h2>;
}
```

Why does it matter? React decides for itself when and how many times to render a component. It may interrupt a render and start it again, or prepare a tree that is not on screen yet. An impure component gives inconsistent results in those situations.[^8] That is the reason Strict Mode renders components twice.

Side effects *(sending a request, changing `document.title`, analytics)* belong in **event handlers**, not in render. If it cannot be attached to any event, an Effect is the last resort.[^8]

> [!TIP]
>
> You are free to change an array or an object you **created during this render**. The problem is changing something that existed before the render.[^8]

For the same reason, do not define a component inside another component. A new component type is created on every render, React rebuilds the subtree from scratch and the state is lost. `eslint-plugin-react-hooks`'s `static-components` rule catches this.[^10]

## Try it yourself

- Open a product page design *(any e-commerce site)*, draw the boxes and write out the component tree.
- Pass an empty `products` array and see what `{products.length && <ProductList />}` prints; then fix it.
- Add an `<input>` to each row of the product list, make the key the `index` and reverse the list. Where did the text in the input go?
- Generate a price with `Math.random()` in a component. With Strict Mode on, watch two different results in the console.

## Going deeper

- **Official docs:** "Thinking in React"; it splits a search table into components step by step and places the state.[^1]
- **Article:** [Josh W. Comeau](https://www.joshwcomeau.com/) on the nine mistakes beginners make most often in React, the rendered `0`, keys and state mutation among them.[^5]
- **Article:** [TkDodo](https://tkdodo.eu/) on composition and the early `return`.[^6]
- **Official docs:** "Keeping Components Pure"; pure components and examples of local mutation.[^8]

## Sources

1. [React: Thinking in React](https://react.dev/learn/thinking-in-react) *(doc)* — Splitting an interface into a component hierarchy and finding the minimum state.
2. [React: Your First Component](https://react.dev/learn/your-first-component) *(doc)* — Defining a component, the capital-letter rule and exporting.
3. [React: Writing Markup with JSX](https://react.dev/learn/writing-markup-with-jsx) *(doc)* — A single root, closed tags and the camelCase attribute rules.
4. [React: Conditional Rendering](https://react.dev/learn/conditional-rendering) *(doc)* — `if`, the ternary, `&&`, and the warning about a number on the left of `&&`.
5. [Josh W. Comeau](https://www.joshwcomeau.com/): [Common Beginner Mistakes with React](https://www.joshwcomeau.com/react/common-beginner-mistakes/) *(article)* — 2023, updated October 2024. The rendered `0`, state mutation and key mistakes.
6. [TkDodo](https://tkdodo.eu/): [Component Composition is great btw](https://tkdodo.eu/blog/component-composition-is-great-btw) *(article)* — September 21, 2024. Writing states as early `return`s instead of conditional JSX.
7. [React: Rendering Lists](https://react.dev/learn/rendering-lists) *(doc)* — `map`, the `key` rules, and the index and `Math.random()` traps.
8. [React: Keeping Components Pure](https://react.dev/learn/keeping-components-pure) *(doc)* — Pure components, moving side effects into event handlers, and local mutation.
9. [React: Components and Hooks must be pure](https://react.dev/reference/rules/components-and-hooks-must-be-pure) *(doc)* — Idempotent render, and not changing props or state.
10. [React: static-components lint](https://react.dev/reference/eslint-plugin-react-hooks/lints/static-components) *(doc)* — Defining a component during render resetting its state.
