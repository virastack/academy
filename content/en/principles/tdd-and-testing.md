---
title: "TDD and testing approaches"
description: "The Red-Green-Refactor cycle and the Testing Trophy."
lastVerified: "2026-10-24"
translationKey: "principles/tdd-and-testing"
---

**TDD** (*Test-Driven Development*) is the method of writing the test before the code. The examples are built on a pure function, but the cycle is the same for any code. This guide covers the cycle, a small example and how to decide which test to write.

## Red-Green-Refactor

In [Martin Fowler](https://martinfowler.com)'s account, TDD has three steps:[^1]

1. **Red:** write a failing test for a function that does not exist yet.
2. **Green:** write just enough code to make the test pass.
3. **Refactor:** tidy the new and the old code up, so the structure stays clean.

Fowler names skipping the refactor step as TDD's most common mistake. The result is a pile of scattered pieces of code.[^1] Writing the test first has one more benefit: you are forced to think about the code's interface before its implementation.[^1]

Refactoring itself is in the [Refactoring](/academy/principles/refactoring) guide.

## Canon TDD

[Kent Beck](https://newsletter.kentbeck.com) collected TDD's steps into five in his *Canon TDD* article:[^2]

| Step | What you do |
| --- | --- |
| 1 | Write the list of scenarios you want to cover |
| 2 | Turn **only one** of them from the list into a working test |
| 3 | Make this test and all the previous ones pass. If a new scenario comes to mind, add it to the list |
| 4 | Improve the implementation's design if you want (refactor) |
| 5 | Repeat from step 2 until the list is done |

## A small example

The scenario list: a price with no discount does not change, and a 50% discount halves the price.

```ts
// discount.test.ts
import { expect, test } from 'vitest'
import { applyDiscount } from './discount'

test('keeps the price without a discount', () => {
  expect(applyDiscount(100, 0)).toBe(100)
})
```

**Red:** `applyDiscount` does not exist yet, so the test fails. **Green:** the smallest code that makes the test pass:

```ts
// discount.ts
export const applyDiscount = (price: number, percent: number) => price
```

Turn the second scenario into a test:

```ts
test('halves the price with a 50% discount', () => {
  expect(applyDiscount(100, 50)).toBe(50)
})
```

The test is red again. Now write the real logic:

```ts
export const applyDiscount = (price: number, percent: number) =>
  price * (1 - percent / 100)
```

Both tests pass. There is nothing to refactor, and that step is optional.[^2] To run the tests:

```command
npx vitest run
```

[!vitest] `vitest run` runs the tests once without entering watch mode. The test files' names have to contain `.test.` or `.spec.`.[^3] For the setup, see the [Vitest setup](/academy/vitest/setup) guide.

## Which test should you write?

We have answered TDD's "how". For the "which test" question there is [Kent C. Dodds](https://kentcdodds.com)'s **Testing Trophy** model: the static, unit, integration and end-to-end (E2E) layers. What you expect from tests is *confidence*, the value they return for the time spent.[^4] For Dodds, most of the investment should go into integration tests, because the balance of confidence, speed and cost is best there.[^5]

The principle is this: the more your tests resemble the way your software is used, the more confidence they give you.[^4] Testing Library rests on the same idea: it works with DOM nodes and does not reach into component instances' internals.[^6] The Testing Trophy's details are in the [Vitest](/academy/vitest/introduction) guide.

## Common mistakes

A selection from the mistakes Beck warns about:[^2]

- **Writing a test with no assertion.** It only raises the coverage percentage and confirms nothing.
- **Turning every scenario into a test up front.** Instead of writing them all before any of them passes, write one and make it pass.
- **Deleting an assertion to make the test pass.** Really make the test pass.
- **Copying the expected value from the value the code produced.** The test then stops being a second check on the code.
- **Refactoring while making the test pass.** The two are separate steps.
- **Abstracting early.** Duplication is a hint, not an order.

## When you don't need it

> [!CAUTION]
>
> TDD and the number of tests are not the goal but a tool.
>
> - **Do not chase 100% coverage.** For Dodds, after a certain point the return falls and you start testing code that has no logic.[^5]
> - **Do not test internal details.** Tests written only to cover a hard-to-reach line give no confidence and make refactoring harder.[^5]
> - **Do not require TDD on every piece of code.** This guide's advice: start with the pure functions that hold business rules. Because their input and output are clear, writing the first test is easy.

## Sources

1. [Martin Fowler: Test Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html) *(article)* — The Red-Green-Refactor cycle, the test list, thinking about the interface first, and skipping the refactor step being the common mistake. December 11, 2023.
2. [Kent Beck: Canon TDD](https://newsletter.kentbeck.com/p/canon-tdd) *(article)* — TDD's five steps and the common mistakes. December 11, 2023.
3. [Vitest: Getting Started](https://vitest.dev/guide/) *(doc)* — `test` and `expect`, the `.test.` file name, and `vitest run`.
4. [Kent C. Dodds: The Testing Trophy and Testing Classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) *(article)* — The static, unit, integration and E2E layers, the balance of confidence and cost, and "the more it resembles the way it is used, the more confidence". June 3, 2021.
5. [Kent C. Dodds: Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests) *(article)* — Weighting towards integration tests, the falling return of 100% coverage, and the drawback of testing internal details. July 13, 2019.
6. [Testing Library: Guiding Principles](https://testing-library.com/docs/guiding-principles/) *(doc)* — Tests that resemble real use, and the principle of working with DOM nodes.
