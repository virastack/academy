---
title: "Types in React"
description: "Props, children, event, hook and context types."
lastVerified: "2026-10-17"
translationKey: "typescript/types-in-react"
---

## React and TypeScript

Using [!typescript] with [!react] takes two things: every file containing JSX has to have the `.tsx` extension, and React's type definitions have to be installed.[^1] React does not carry its types in its own package; the definitions come from `@types/react` and `@types/react-dom`. Vite's `react-ts` template installs them already. To add them to an existing project by hand:

```command
npm install -D @types/react @types/react-dom
```

The types in this lesson are written with the `React.` prefix, as in `React.ReactNode`; you can also pull them in with `import type { ReactNode } from "react"` if you prefer.

## Props

Props are an object, and their type is an object type defined with `type` or `interface`.[^1] They are unpacked with destructuring in the component's parameter:

```tsx
import type { Product } from "./types";

type ProductCardProps = {
  product: Product;
  showPrice?: boolean;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({
  product,
  showPrice = true,
  onAddToCart,
}: ProductCardProps) {
  return (
    <article>
      <h2>{product.name}</h2>
      {showPrice && <p>€{product.price}</p>}
      <button type="button" onClick={() => onAddToCart(product)}>
        Add to cart
      </button>
    </article>
  );
}
```

- `showPrice?` is optional; its default is given in the destructuring, and inside the component its type is `boolean`.
- `onAddToCart` is a function prop; you write the parameter and return types, and never the `Function` type.
- You do not need to write the return type; TypeScript infers it from the JSX.

If a required prop is forgotten, the error appears where you used the component: `<ProductCard product={headphones} />` gives `Property 'onAddToCart' is missing in type '{ product: Product; }' but required in type 'ProductCardProps'.`

### Should you use React.FC?

In older code you see `const ProductCard: React.FC<ProductCardProps> = ...`. According to the React TypeScript Cheatsheet, the consensus today is that `React.FC` is not necessary; with current types, using it is mostly a matter of style.[^2] [Kent C. Dodds](https://kentcdodds.com/) also recommends a plain function with a props type; `React.FC` makes generic components awkward and ties you to an arrow function instead of `function`.[^3] `React.FC` used to add `children` to every component silently; that was removed with the React 18 types.[^4] This lesson and the project use a plain `function`.

## children

A component that wraps other content takes `children`. Its broadest and most common type is `React.ReactNode`: JSX, text, numbers, `null` and arrays of those.[^1][^5]

```tsx
type CardProps = { title: string; children: React.ReactNode };

export function Card({ title, children }: CardProps) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

To accept only a JSX element, `React.ReactElement` is used. TypeScript cannot express that `children` has to be a particular element *(only `<li>`, say)*.[^1]

## Components that wrap an HTML element

Your own `Button` component should accept all of a real `<button>`'s props *(`type`, `disabled`, `onClick`, `aria-*`…)*. Rather than listing them one by one, you take them with `React.ComponentProps`.[^6]

```tsx
type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "primary" | "secondary";
};

export function Button({ variant = "primary", ...rest }: ButtonProps) {
  return <button className={`btn btn-${variant}`} {...rest} />;
}

<Button type="submit" onClick={() => console.log("click")}>
  Place order
</Button>;
```

In React 19 `ref` is an ordinary prop too; new components do not need `forwardRef`.[^7] Because `React.ComponentProps<"input">` includes `ref`, it is passed on to the `<input>` with `{...props}`. In a component that should not take a `ref`, use `React.ComponentPropsWithoutRef<"button">`.[^5] With `typeof` you can also derive your own component's props: `React.ComponentProps<typeof ProductCard>`.[^6]

## Events

If the handler is written inside the JSX you do not need to write a type: in `onChange={(event) => setQuery(event.currentTarget.value)}`, TypeScript infers `event`'s type from `onChange`.[^8]

When you pull the handler out into its own function, you type the parameter yourself. The type's name follows the pattern `React.<Event>Event<Element>`:

```tsx
function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
  setQuery(event.currentTarget.value);
}

function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
  event.preventDefault();
  onSearch(query);
}

<form onSubmit={handleSubmit}>
  <input value={query} onChange={handleChange} />
</form>;
```

The others follow the same pattern: `React.MouseEvent<HTMLButtonElement>`, `React.KeyboardEvent<HTMLInputElement>`, and `React.ChangeEvent<HTMLSelectElement>` for a `select`.

> [!WARNING]
>
> Plenty of older examples use `React.FormEvent` for `onSubmit`. Since version 19.2.10 of `@types/react`, `FormEvent` and `FormEventHandler` are deprecated in favour of `SubmitEvent`, `ChangeEvent` or `InputEvent`.[^8][^9] The old type still works; the editor strikes it through.

The shortest way to find the right type: write the handler inside the JSX first, hover over `event` in an editor such as [!vscode], and copy the type it shows you.[^1]

## Hooks

### useState

The initial value sets the type: `useState(0)` → `number`, `useState("")` → `string`. When the value starts out empty, or is a union, you pass the generic yourself.[^1][^10]

```tsx
const [count, setCount] = useState(0);
const [selected, setSelected] = useState<Product | null>(null);
const [products, setProducts] = useState<Product[]>([]);
```

Write `useState(null)` and the type is only `null`, after which no product can be assigned. For an empty array, write `useState<Product[]>([])` as well.

### useReducer

Define the actions as a discriminated union. Annotate the reducer's parameters and return type and `useReducer` works out the rest.[^1][^10]

```tsx
type CartAction =
  | { type: "add"; product: Product }
  | { type: "remove"; id: number };

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const { id, name, price } = action.product;
      return [...items, { id, name, price, quantity: 1 }];
    }
    case "remove":
      return items.filter((item) => item.id !== action.id);
  }
}

const [items, dispatch] = useReducer(cartReducer, []);
dispatch({ type: "remove" });
// Error: Property 'id' is missing in type '{ type: "remove"; }' but required in type '{ type: "remove"; id: number; }'.
```

Inside each `case`, `action` narrows by its `type` field; the `remove` branch has `action.id` and the `add` branch does not. That narrowing is the same subject as the Narrowing and type guards lesson.

### useRef

A ref for a DOM element is created with the element type and `null`. In the React 19 types, `useRef` requires an argument and the ref it returns is always writable.[^11]

```tsx
const inputRef = useRef<HTMLInputElement>(null);

function focusInput() {
  inputRef.current?.focus(); // current: HTMLInputElement | null
}

<input ref={inputRef} placeholder="Search products" />;
```

`current` is `null` on the first render, which is why it is reached with `?.`.[^10] To pass a ref down to a child component, the `ref` prop above is all you need.

## Context

Most of the time a context has no meaningful default value. React's documentation and the Cheatsheet give the same advice: add `| null` to the type and put the `null` check in a custom hook.[^1][^12]

```tsx
type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const cart = useContext(CartContext);
  if (cart === null) {
    throw new Error("useCart must be used within CartProvider.");
  }
  return cart; // type: CartContextValue, no null
}
```

Every component that uses `useCart` reaches `items` without a `null` check. If the provider is forgotten, the error does not slip past quietly; it shows up immediately.[^13] In React 19 the provider is written as `<CartContext value={...}>` directly, instead of `<CartContext.Provider>`.[^7] You will build a full cart provider in the project.

> [!DONT]
>
> - Silencing the compiler with `createContext<CartContextValue>(null!)` or `{} as CartContextValue`. When the provider is forgotten, the error moves to runtime.[^12]

## Generic components

The `<T>` from the Generics lesson works in components too. The `List` below passes whatever type of array it is given through to `renderItem`.[^14]

```tsx
type ListProps<T> = {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T) => React.ReactNode;
};

export function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

<List
  items={products}
  getKey={(product) => product.id}
  renderItem={(product) => product.title}
/>;
// Error: Property 'title' does not exist on type 'Product'.
```

`T` is inferred as `Product` from `items={products}`. In a `.tsx` file, writing a generic component with `function` is the smoothest route; in an arrow function the `<T>` gets confused with a JSX tag.[^14]

## Try it yourself

- Add an optional `badge?: "new" | "sale"` prop to `ProductCard` and try passing `"discount"`.
- Give `Button` an `aria-label` and a `disabled`; see them accepted without writing any extra types.
- Add a `{ type: "clear" }` action to `cartReducer`; before writing the `case`, read the `Function lacks ending return statement...` error.
- Use `List` with a `CartItem[]` and watch `item.quantity` autocomplete inside `renderItem`.

## Going deeper

- **Official docs:** react.dev's "Using TypeScript" page; props, hook and event types in short examples.[^1]
- **Article:** the community-maintained React TypeScript Cheatsheet; separate pages for props, events, hooks and context.[^2]
- **Full course:** [Matt Pocock](https://www.mattpocock.com/)'s free "React with TypeScript" exercises; props, children, events and hooks.[^15]
- **Talk:** [Matt Pocock](https://www.mattpocock.com/)'s "React's Most Useful Types"; `ReactNode`, `ComponentProps`, `ElementType` *(React Day Berlin 2023, 21 min)*.[^16]
- **Article:** [Kent C. Dodds](https://kentcdodds.com/) on using context with a custom hook and a provider.[^13]

## Sources

1. [React: Using TypeScript](https://react.dev/learn/typescript) *(doc)* — Installing `@types/react`, props, `ReactNode`, `useState`, `useReducer`, context and `ChangeEvent` examples.
2. [React TypeScript Cheatsheet: Function Components](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/function_components) *(doc)* — `React.FC` no longer being considered necessary, and being a style choice with current types.
3. [Kent C. Dodds](https://kentcdodds.com/): [How to write a React Component in TypeScript](https://kentcdodds.com/blog/how-to-write-a-react-component-in-typescript) *(article)* — From 2021; annotating the parameter with the props type and avoiding `React.FC`.
4. [React 18 Upgrade Guide](https://react.dev/blog/2022/03/08/react-18-upgrade-guide) *(doc)* — `children` having to be declared in props explicitly with the new types.
5. [React TypeScript Cheatsheet: Typing Component Props](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/basic_type_example) *(doc)* — The difference between `ReactNode` and `JSX.Element`, and using `ComponentPropsWithoutRef`.
6. [Matt Pocock](https://www.mattpocock.com/): [ComponentProps: React's Most Useful Type Helper](https://www.totaltypescript.com/react-component-props-type-helper) *(article)* — Deriving a props type with `ComponentProps<"button">` and `ComponentProps<typeof Component>`.
7. [React v19](https://react.dev/blog/2024/12/05/react-19) *(doc)* — `ref` being taken as a prop, and `<Context>` being used as the provider.
8. [React TypeScript Cheatsheet: Forms and Events](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/forms_and_events) *(doc)* — Type inference in an inline handler, `ChangeEventHandler`, and `FormEvent` being deprecated in 19.2.10.
9. [DefinitelyTyped: types/react/index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts) *(repo)* — The source of the `@types/react` definitions; the deprecation note on `SubmitEvent` and `FormEvent`.
10. [React TypeScript Cheatsheet: Hooks](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/hooks) *(doc)* — `useState<User | null>(null)`, `useReducer` with a union action, and `useRef` for the DOM.
11. [React 19 Upgrade Guide: TypeScript changes](https://react.dev/blog/2024/04/25/react-19-upgrade-guide) *(doc)* — `useRef` requiring an argument, the single `RefObject` type, and `types-react-codemod`.
12. [React TypeScript Cheatsheet: Context](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/context) *(doc)* — A `null` default, a custom hook that throws, and a runtime check instead of a type assertion.
13. [Kent C. Dodds](https://kentcdodds.com/): [How to use React Context effectively](https://kentcdodds.com/blog/how-to-use-react-context-effectively) *(article)* — From 2021; a context hook that throws when used outside the provider.
14. [Matt Pocock](https://www.mattpocock.com/): [Use generics in React to make dynamic and flexible components](https://www.totaltypescript.com/tips/use-generics-in-react-to-make-dynamic-and-flexible-components) *(video)* — A tip of about a minute; a generic `Table` component, and writing it with `function` in `.tsx`.
15. [Matt Pocock](https://www.mattpocock.com/): [React with TypeScript](https://www.totaltypescript.com/tutorials/react-with-typescript) *(doc)* — A free tutorial with exercises; props, children, events and hooks.
16. [Matt Pocock](https://www.mattpocock.com/): [React's Most Useful Types (React Day Berlin 2023)](https://gitnation.com/contents/typescript-tricks-for-building-better-react-apps/video) *(video)* — 21 minutes. `ReactNode`, `ComponentProps`, `ElementType` and the ref types.
