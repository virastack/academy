---
title: "Clean Code and the basic principles"
description: "DRY, KISS and YAGNI: when they help and when they are overdone."
lastVerified: "2026-10-23"
translationKey: "principles/clean-code"
---

This guide was written for frontend developers. The examples are in [!react] and [!typescript], but the ideas hold in any language. You will learn three short principles: DRY, KISS and YAGNI. Each answers one question.

## What Clean Code aims at

Working code is not enough. The starting point of [Robert C. Martin](https://blog.cleancoder.com)'s *Clean Code* is this: code that is not clean can bring a development team down even while it works.[^1] The book teaches how to tell good code from bad, and how to write understandable names and functions.[^1]

The three principles in this lesson are parts of that aim. They all come down to the same question: when this code has to be changed tomorrow, will it be easy?

## DRY: keep the same knowledge in one place

The definition from *The Pragmatic Programmer*: every piece of knowledge must have a single, unambiguous, authoritative representation within a system.[^2] The key word there is **knowledge**. DRY does not mean merging lines that look alike.

```ts
// ❌ The same rule in three files
const free = total >= 500 // CartPage.tsx
const isFree = price > 499 // CartSummary.tsx
const shippingFree = sum >= 500 // Checkout.tsx

// ✅ The rule in one place
export const FREE_SHIPPING_THRESHOLD = 500
export const hasFreeShipping = (total: number) => total >= FREE_SHIPPING_THRESHOLD
```

When the threshold changes you change one file. The three files, on the other hand, behave inconsistently once one of them is forgotten.

The reverse happens too: if two pieces of code look the same today but will change for different reasons, merging them causes trouble. [Kent C. Dodds](https://kentcdodds.com)'s AHA principle says this: hold the abstraction back until the duplication is really there and you understand what is changing.[^3] We covered how the wrong abstraction comes about in the [Folder structure and naming](/academy/architecture/folder-structure) guide.

## KISS: keep it simple

Pick the simplest solution that does the job. The last of [Kent Beck](https://newsletter.kentbeck.com)'s simple design rules, as [Martin Fowler](https://martinfowler.com) relates them, says exactly that: remove everything that does not serve the first three rules.[^4] *The Pragmatic Programmer* goes the same way: in simple code there are fewer places for a bug to hide.[^2]

In the frontend the most commonly seen complexity is unnecessary state and Effects:

```tsx
// ❌ Extra state and an Effect
const [fullName, setFullName] = useState('')
useEffect(() => {
  setFullName(firstName + ' ' + lastName)
}, [firstName, lastName])

// ✅ Calculate it during the render
const fullName = firstName + ' ' + lastName
```

According to the React documentation, removing unnecessary Effects makes the code faster, easier to follow and less error-prone.[^5] Simple does not mean short: one line of clever code is harder to read than three lines of clear code. Beck's second rule is about showing the intent clearly too.[^4]

## YAGNI: don't build it before you need it

*You Aren't Gonna Need It*: do not add a capability that is not needed yet because it may be needed later. Fowler lists four costs: the cost of building, the cost of the real work it delays, the cost of carrying the code, and the cost of repair if it was built wrong.[^6]

```tsx
// ❌ A generic DataTable with 15 props for a single table
<DataTable columns={columns} sortable filterable paginated groupBy="status" />

// ✅ What is needed today
<ProductTable products={products} />
```

You extract the generic component once a second table really arrives. Then you know what is shared.

YAGNI does not mean "do not make the code easier to change". Fowler says so explicitly: this principle only covers the capabilities added for a feature that is not needed yet, and refactoring does not go against it.[^6]

## When you don't need it

> [!CAUTION]
>
> These principles are not rules but aids to a decision. Overdone, they do harm.
>
> - **Do not force DRY.** If the code you merged starts needing a parameter and a condition for every new use, repeating it is cheaper.[^3]
> - **Do not mistake KISS for "fewer lines".** What is simple is what the reader understands easily.[^4]
> - **YAGNI does not forbid every preparation.** If preparing for a future need adds no complexity, YAGNI does not come into play.[^6]
> - **Beck's rules work in priority order.** The "the tests pass" rule comes before the "no duplication" rule.[^4]

## Sources

1. [Clean Code: A Handbook of Agile Software Craftsmanship](https://www.pearson.com/en-us/subject-catalog/p/clean-code-a-handbook-of-agile-software-craftsmanship/P200000009044/9780132350884) *(book)* — Robert C. Martin, 2008. Code that is not clean slowing a team down, and writing understandable names and functions.
2. [The Pragmatic Programmer: Tips](https://pragprog.com/tips/) *(doc)* — The DRY definition (a single, authoritative representation of knowledge) and simple code narrowing the space for bugs.
3. [Kent C. Dodds: AHA Programming](https://kentcdodds.com/blog/aha-programming) *(article)* — Avoiding a hasty abstraction: waiting until the duplication is understood. June 22, 2020.
4. [Martin Fowler: Beck Design Rules](https://martinfowler.com/bliki/BeckDesignRules.html) *(article)* — Kent Beck's four simple design rules, their priority order and "Once and Only Once". March 2, 2015.
5. [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) *(doc)* — Calculating a derived value during the render, and the cost of an unnecessary Effect.
6. [Martin Fowler: Yagni](https://martinfowler.com/bliki/Yagni.html) *(article)* — The four costs of a capability that is not needed yet. Refactoring and keeping the code changeable do not go against Yagni. May 26, 2015.
