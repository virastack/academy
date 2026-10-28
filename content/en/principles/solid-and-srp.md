---
title: "SOLID and SRP"
description: "Separating responsibilities and managing dependencies, with React examples."
lastVerified: "2026-10-23"
translationKey: "principles/solid-and-srp"
---

SOLID is five principles coming from object-oriented design. As a frontend developer you may not be writing classes, but the ideas suit [!react] components and hooks too. This guide focuses on the two that help the most: SRP and DIP.

## SOLID at a glance

[Robert C. Martin](https://blog.cleancoder.com) argues that these principles still hold today.[^1] The table below sums each one up in a single sentence.

| Letter | Principle | In short |
| --- | --- | --- |
| **S** | Single Responsibility | A function, a class or a component should have only one responsibility, that is, only one reason to change[^2] |
| **O** | Open-Closed | New behaviour should be addable without changing the existing code. For Martin, simple code is both open and closed[^3][^1] |
| **L** | Liskov Substitution | A subtype should be usable in place of its supertype. An implementation that surprises the user of an interface multiplies `if`/`switch`[^1] |
| **I** | Interface Segregation | A client should not depend on what it does not use. For Martin it matters most in compiled languages[^1] |
| **D** | Dependency Inversion | High-level rules should not depend on low-level details[^1] |

This guide opens SRP and DIP up. For the others the table is enough.

## SRP: one reason to change

For Martin, a module should have only one reason to change. And the "reason" comes from people: a module should take change requests from a single person, or from a single group serving one business function.[^2] In his example an `Employee` class serves three managers: the salary calculation depends on requests from finance, the hours report on operations, and the database record on technology. When one of them touches the code for their own request, the method another one depends on can break.[^2]

This does not mean "a function does one thing". Bug fixes and refactoring do not count as a "reason", because they are the developer's business, not the program's.[^2]

## SRP in React

If a component fetches the data, formats the price and renders the list, it has three reasons to change: the API changes, the price format changes, the design changes.

```tsx
// ❌ Three responsibilities in one place
function ProductList() {
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then((res) => res.json()),
  })
  return products.map((p) => (
    <li key={p.id}>{p.name}: €{p.price.toFixed(2)}</li>
  ))
}
```

```tsx
// ✅ Every piece has one reason

// products.api.ts: knows only the API
export async function getProducts(): Promise<Product[]> {
  const res = await fetch('/api/products')
  if (!res.ok) throw new Error(`Products request failed: ${res.status}`)
  return res.json()
}

// format-price.ts: knows only the price format
export const formatPrice = (price: number) => `€${price.toFixed(2)}`

// use-products.ts: offers the data to the component
export function useProducts() {
  return useQuery({ queryKey: ['products'], queryFn: getProducts })
}

// ProductList.tsx: only renders
function ProductList() {
  const { data: products = [] } = useProducts()
  return products.map((p) => (
    <li key={p.id}>{p.name}: {formatPrice(p.price)}</li>
  ))
}
```

We did not fetch the data with a raw `useEffect` and `fetch`. According to the React documentation, in an Effect with no cleanup logic the responses can arrive out of order and an old response can overwrite a newer one. The documentation recommends the framework's built-in data fetching first. If there is no framework, it says to write a custom hook with cleanup logic, or to use the ready-made solutions in the ecosystem.[^4] In this academy, [TanStack Query](/academy/tanstack-query) is covered as a ready-made solution.

A custom hook shares logic, not state: every call gets its own state.[^5] According to the documentation, when you write an Effect, wrapping it in a hook named for its purpose shows the intent and the data flow clearly. The same place carries this warning too: you do not have to extract every repetition into a hook, and wrapping a single `useState` is usually unnecessary.[^5]

When to split a component is in the [Component and code organisation](/academy/architecture/component-organization) guide, and we are not repeating it.

## Managing dependencies: DIP

For Martin, high-level business rules should not depend on low-level details, and the dependencies should flow towards the abstractions.[^1] In Brett Schuchert's account, DIP is not the same thing as *dependency injection* and *inversion of control*. The question is which level of abstraction the messages your code depends on sit at.[^6]

In the frontend: if a component calls `fetch('/api/products')`, it depends on the URL, on HTTP and on the response's shape. If it calls `useProducts()`, it depends only on the concept of "products". The component does not change even if the data source does.

In Schuchert's example the data is hidden behind a *repository* that speaks the domain's language. The storage can be an in-memory structure, NoSQL or a REST service, because the interface says nothing about SQL.[^6] The `useProducts` above plays the same role.

> [!TIP]
>
> You will notice it while writing tests: if the component depends on a hook, in the test you only have to replace that hook.

## When you don't need it

> [!CAUTION]
>
> SOLID is not a checklist but a way of asking questions.
>
> - **Do not split every function into one line.** In SRP the measure is not the line count but the number of reasons to change.[^2] Two things that change for the same reason can stay in the same place.
> - **Do not write a single-use hook.** According to the documentation, a little repetition is not a problem.[^5]
> - **Do not abstract a dependency that will never change.** If you have a single backend and it is not going to change, adding another layer only increases the number of files. This guide's advice: add the abstraction once a second source really arrives.

## Sources

1. [Robert C. Martin: Solid Relevance](https://blog.cleancoder.com/uncle-bob/2020/10/18/Solid-Relevance.html) *(article)* — The five principles' relevance today: SRP, OCP, LSP, ISP and DIP. October 18, 2020.
2. [Robert C. Martin: The Single Responsibility Principle](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html) *(article)* — One reason to change, the reason coming from people (a business function), the `Employee` example, and bug fixes not counting as a "reason". May 8, 2014.
3. [Robert C. Martin: The Open-Closed Principle](https://blog.cleancoder.com/uncle-bob/2014/05/12/TheOpenClosedPrinciple.html) *(article)* — Adding behaviour without changing the existing code, and the dependencies flowing inwards. May 12, 2014.
4. [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) *(doc)* — The "Fetching data" section: the race condition in an Effect with no cleanup logic, the framework's built-in data fetching, and a custom hook.
5. [React: Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) *(doc)* — Hooks sharing logic and not state, wrapping an Effect in a hook, and the warning against extracting every repetition.
6. [Brett L. Schuchert: The Dependency Inversion Principle in the Wild](https://martinfowler.com/articles/dipInTheWild.html) *(article)* — DIP's difference from dependency injection and inversion of control, depending on a domain concept, and the repository example. May 2013.
