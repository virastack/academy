---
title: "Props and composition"
description: "Passing data, children and slots, and not copying props into state."
lastVerified: "2026-10-21"
translationKey: "react/props-and-composition"
---

## What props are

**Props** are the inputs a parent gives a child. They are an object, the single parameter of the component function; they are usually unpacked with destructuring, and default values are given there:[^1]

```tsx
type PriceProps = {
  amount: number;
  currency?: string;
};

export function Price({ amount, currency = "EUR" }: PriceProps) {
  return (
    <span>
      {amount.toLocaleString("en-US")} {currency}
    </span>
  );
}

<Price amount={1499} />;
```

Props are **read-only**. A component does not change its own props; if a different value is needed, the parent sends new props.[^1] The detail on prop types is in the [Types in React](/academy/typescript/types-in-react) lesson.

Data flows from the top down; when a child wants to tell the parent something, it calls a function the parent gave it. By convention those function props start with `on`, and their counterparts in the parent with `handle`:[^2]

```tsx
<AddToCartButton onAdd={handleAdd} />
```

## children and slots

The JSX written inside a component arrives as the `children` prop. That way a component leaves a **gap** without knowing what goes in it:[^1]

```tsx
function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>;
}

<Card>
  <Price amount={1499} />
</Card>;
```

When you need more than one gap, pass the JSX as a named prop. This pattern is called a **slot**:

```tsx
<Dialog
  title="Clear cart"
  actions={<Button onClick={clearCart}>Clear</Button>}
>
  3 items will be removed from your cart.
</Dialog>
```

`Dialog` does not know what the button does; it only knows where to put it. This is a more flexible route than multiplying boolean and string props such as `showCancel`, `confirmText` and `danger`. The larger-scale version of the pattern *(a compound component)* is in the [Components and code organisation](/academy/architecture/component-organization) guide.

## Don't copy props into state

One of the most common mistakes is making a prop the initial value of `useState` and then using that:

```tsx
function EmailField({ email }: { email: string }) {
  const [value, setValue] = useState(email); // ❌ does not update when email changes
  // ...
}
```

The initial value of `useState` is only read the first time the component appears on screen. When the parent picks another user and sends a new `email`, `value` stays stale.[^3] [Dan Abramov](https://overreacted.io/) calls this *"stopping the data flow"*: copy a prop into state and you ignore every update that arrives for it.[^4]

The fix depends on the case:

| Situation | Fix |
| :-- | :-- |
| The value is only displayed, or can be calculated from the props | No state; use the prop directly[^4] |
| The user will edit it, and the first value comes from a prop | Name the prop `initialEmail` and give the component a `key`[^3][^5] |
| The parent needs to know the current value too | Move the state up to the parent *(a controlled component)*[^3] |

When the `key` changes, React builds the component from scratch and `useState` reads the new initial value:[^3]

```tsx
<EmailField key={user.id} initialEmail={user.email} />
```

The `initial` prefix in the name tells the reader *"later changes to this prop are ignored"*.[^5]

## Prop drilling and the first fix

Carrying a value five levels down as a prop is called **prop drilling**. Two or three levels are no problem; the data flow stays visible. When it gets longer, your first reflex should not be Context. The React documentation suggests trying two things before Context: carry on with props first, then pass `children` to the intermediate components instead of props.[^6]

```tsx
// Before: Layout takes user only to pass it down to Header and Nav
<Layout user={user} />;

// After: the component that uses user is placed directly
<Layout header={<Header><UserMenu user={user} /></Header>}>
  <ProductList />
</Layout>;
```

The layers in between no longer know about `user`. The approach both simplifies the code and reduces needless re-rendering; the [Render performance in React](/academy/performance-accessibility/render-performance) lesson explains why. For data that really is needed deep down and in many places, we move on to the Context lesson.

> [!WARNING]
>
> Forwarding all the props blindly with `{...props}` hides where which data comes from. Per the React documentation, if the spread turns up in every other component, it is time to split the components and pass `children`.[^1]

## Try it yourself

- Add a `discount?: number` prop to `Price`; strike through the old price when there is a discount.
- Add a `footer` slot to `Card` and give it different buttons in two different uses.
- On a page that picks from a list of two users, try `EmailField` first without a `key` and then with `key={user.id}`.
- Find a prop in your own project that goes down more than three levels, and try shortening it with `children`.

## Going deeper

- **Article:** [Dan Abramov](https://overreacted.io/)'s "Writing Resilient Components"; not copying props into state, being ready to render at any moment, and components that are not singletons.[^4]
- **Article:** [TkDodo](https://tkdodo.eu/) comparing the three fixes for putting props into `useState`.[^3]
- **Official docs:** the "Before you use context" section of the "Passing Data Deeply with Context" page.[^6]

## Sources

1. [React: Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component) *(doc)* — Props, default values, `children`, read-only props and the spread warning.
2. [React: Responding to Events](https://react.dev/learn/responding-to-events) *(doc)* — Passing an event handler as a prop, and the `on` and `handle` naming.
3. [TkDodo](https://tkdodo.eu/): [Putting props to useState](https://tkdodo.eu/blog/putting-props-to-use-state) *(article)* — October 25, 2020. The initial value only being read on mount; conditional rendering, lifting state up and the `key` fix.
4. [Dan Abramov](https://overreacted.io/): [Writing Resilient Components](https://overreacted.io/writing-resilient-components/) *(article)* — March 16, 2019. Copying props into state stopping the data flow.
5. [React: Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) *(doc)* — Not mirroring props in state, and the `initial` prefix.
6. [React: Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) *(doc)* — The advice to solve it with props and `children` before reaching for Context.
