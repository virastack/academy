---
title: "Refactoring"
description: "Improving code in small steps while preserving its behaviour."
lastVerified: "2026-10-24"
translationKey: "principles/refactoring"
---

You want to add a new feature to a working component but the code does not suit it. Either you force the code as it is, or you tidy it up first. This guide covers the second: refactoring. The examples are frontend code, but the ideas hold in any language.

## What refactoring is

For [Martin Fowler](https://martinfowler.com), refactoring is restructuring existing code's internals without changing its externally visible behaviour. It is made of small, low-risk steps, and the system stays working after every step. Chaining those steps can bring about a large restructuring too.[^1]

Two consequences follow:

- Refactoring is **not rewriting**. You do not tear the code down in one go; you change it step by step.
- A step that changes the behaviour does not count as refactoring.[^1]

The definition and securing it with a test are covered in practice in the [Restructuring a project](/academy/architecture/restructure-project) guide. We are not repeating it here.

## Three basic steps

Fowler's refactoring catalogue names and lists the steps one by one.[^2] The three you will use most often in the frontend:

| Step | What it does |
| --- | --- |
| **Rename Variable** | Gives the variable a name that says its purpose better[^2] |
| **Extract Function** | Moves a piece of code into a function with a name of its own. Its reverse is **Inline Function**[^2] |
| **Decompose Conditional** | Splits a complex condition and its branches into separate, well-named functions[^2] |

```ts
// Before
let a = height * width

// After: Rename Variable
let area = height * width
```

```ts
// Before
const charge = isBetween(date, plan.summerStart, plan.summerEnd)
  ? quantity * plan.summerRate
  : quantity * plan.regularRate + plan.regularServiceCharge

// After: Decompose Conditional
const charge = isSummer(date, plan)
  ? summerCharge(quantity, plan)
  : regularCharge(quantity, plan)
```

In the second example the code no longer says *how* it calculates but *what* it checks and *what* it does. After every step, run the application or the tests; the behaviour has to stay the same.

## When should you refactor?

**When you see a smell.** For Fowler, a *code smell* is a sign on the code's surface: it usually corresponds to a deeper problem. But a smell is not bad on its own. Some long methods are fine.[^3] So "this component is long" is not on its own a sufficient reason to refactor. Look at why it is a problem.

**Before a new feature.** In [Kent Beck](https://newsletter.kentbeck.com)'s words: make the change easy, then make the easy change. Fowler describes that as *preparatory refactoring*: if the existing structure makes adding the new feature hard, you prepare the structure first.[^4]

```tsx
// The goal: adding a discount badge to ProductCard.
// The price calculation is scattered inside the JSX.

// 1. Refactor first: move the calculation into a function; the tests still have to pass
function getPrice(product: Product) {
  return product.price * (1 - product.discountPercent / 100)
}

// 2. Then the feature: the badge is now easy to add
{product.discountPercent > 0 && <Badge>{product.discountPercent}% off</Badge>}
```

## Together with the tests

During a refactoring, the tests are how you know the behaviour stayed the same. For [Kent C. Dodds](https://kentcdodds.com), you should very rarely have to change a test when you refactor the code. Tests that test a component's internal details break during a refactoring even when the code is healthy, and make the job harder.[^5] Write tests that look at what the user sees. How that is done is in the [Vitest](/academy/vitest/introduction) guide.

## When you don't need it

> [!CAUTION]
>
> Refactoring is not always the job to do.
>
> - **Not every smell is a problem.** A structure that is long but understandable can stay as it is.[^3]
> - **Do not mix a new feature with refactoring.** A step that changes the behaviour is not refactoring.[^1] This guide's advice: do the two in separate steps, and in separate commits where you can.
> - **Do not touch code you do not have to touch.** Tidying up a working file that is not going to change, just because you do not like it, adds risk. That too is this guide's advice.

## Sources

1. [refactoring.com](https://refactoring.com/) *(doc)* — Fowler's site: the definition of refactoring (restructuring the internals while preserving the behaviour), the small steps and an introduction to the catalogue.
2. [Refactoring Catalog](https://refactoring.com/catalog/) *(doc)* — The definitions of the Rename Variable, Extract Function, Inline Function and Decompose Conditional steps.
3. [Martin Fowler: Code Smell](https://martinfowler.com/bliki/CodeSmell.html) *(article)* — A smell being a surface sign of a deeper problem, and not being bad on its own. February 9, 2006.
4. [Martin Fowler: Preparatory Refactoring](https://martinfowler.com/articles/preparatory-refactoring-example.html) *(article)* — Preparing the structure before a new feature, and Kent Beck's "make the change easy" line. January 5, 2015.
5. [Kent C. Dodds: Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests) *(article)* — Testing internal details making refactoring harder, and the principle of rarely changing a test while refactoring. July 13, 2019.
