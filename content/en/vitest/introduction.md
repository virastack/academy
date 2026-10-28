---
title: "Introduction"
description: "What is frontend testing? Which tools are used?"
lastVerified: "2026-10-14"
translationKey: "vitest/introduction"
---

## What is frontend testing?

Frontend testing checks **automatically** that your code works correctly in the user interface. A test runs the code and compares the result with the expected one. If the result differs, the test *fails*.

A test confirms that:

- The component renders correctly.
- User interactions produce the right result.
- The error, empty and loading states look right.

## Why write tests?

- **Safe refactoring.** When you change the code, the existing features keep working.
- **Fast feedback.** You find the bug before it reaches production.
- **A guarantee for the critical flows.** Flows such as adding to the cart or signing in always work.
- **A hint about accessibility.** Tests find elements by role and label. An element the test cannot find may be a sign of an accessibility problem. This does not replace an accessibility test.

## Kinds of tests

| Kind | What it tests | Speed | Tool |
| --- | --- | --- | --- |
| Unit test | A single function or hook | Very fast | [!vitest] |
| Component test | A component, or a small group of components | Fast | [!vitest] + React Testing Library |
| E2E test | The whole application in a real browser | Slow | [!playwright] |

This guide covers **component testing**. The Testing Trophy approach suggests putting most of the investment into integration tests, where several pieces work together. Component testing fits that approach.[^1][^2]

> [!TIP]
>
> A component test does not run in a real browser. Use an E2E test for layout, CSS and browser-specific behaviour.

## Which tools do you use?

In this guide you will test [!react] components with [!vitest] and React Testing Library. Each tool does one job.[^3]

| Tool | Role | What it does |
| --- | --- | --- |
| [!vitest] | Test runner | Finds and runs the test files. Provides `describe`, `it`, `expect` and the mocking tools. |
| **jsdom** | Test environment | Simulates the browser DOM inside Node.js. |
| **React Testing Library** | Rendering and queries | Renders the component (`render`). Finds the elements on screen the way a user would (`screen`). |
| **user-event** | Interaction | Simulates user actions such as clicking and typing. |
| **jest-dom** | Matchers | Adds DOM matchers such as `toBeInTheDocument` and `toBeDisabled`. |

<details>
<summary>jsdom, happy-dom and Vitest Browser Mode</summary>

- jsdom is not a real browser. It is a DOM simulation running inside Node.js. `happy-dom` is an alternative environment doing the same job. This guide uses jsdom.[^4]
- Vitest Browser Mode runs the tests in a real browser.[^5] For React you use the `vitest-browser-react` package. You write the queries with `page.getByRole` and the assertions with `expect.element`.[^6][^7] Consider this mode if you need to test layout and CSS behaviour.

</details>

## What should you test?

### Do test

> [!DO]
>
> - What the user sees on screen.
> - What the user does (clicking, typing, submitting).
> - The error, empty and loading states.

### Don't test

> [!DONT]
>
> - The component's internal state names and internal functions.
> - The behaviour of third-party libraries.
> - How the CSS looks.

The more your tests resemble the way your software is used, the more confidence they give you.[^8]

## What you'll do in this guide

Every example comes from one e-commerce page. You start with a small component. The page grows with each group.

| Group | The piece under test |
| --- | --- |
| Getting Started | The product card |
| Component Testing | The product list: loading, search, the coupon form |
| Advanced Use | The cart: the API, the Provider and the hook |

Each group ends with a **project**. The project repeats that group's topics in a real scenario.

## Try it yourself

Pick a product card or a similar component from your own project. Write these down on paper:

- 2 things the user sees in this component.
- 1 action the user can take, and its expected result.
- 1 thing you will **not** test.

## Sources

1. [Kent C. Dodds: The Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) *(article)* — The static, unit, integration and E2E layers, and the investment shifting towards integration.
2. [Kent C. Dodds: Write tests. Not too many. Mostly integration.](https://www.youtube.com/watch?v=Fha2bVoC8SE) *(video)* — The strategy is the same as this lesson's. The tools shown belong to the Jest and Cypress era.
3. [Vitest: Getting Started](https://vitest.dev/guide/) *(doc)* — The Vite-based test framework, watch mode and a single run.
4. [Vitest: environment](https://vitest.dev/config/environment) *(doc)* — The default `node` environment; jsdom and happy-dom as browser-like alternatives.
5. [Vitest: Browser Mode](https://vitest.dev/guide/browser/) *(doc)* — Running the tests in a real browser, and the providers.
6. [Vitest: Locators](https://vitest.dev/api/browser/locators) *(doc)* — `page.getByRole` and the `vitest/browser` import.
7. [Vitest: Component Testing](https://vitest.dev/guide/browser/component-testing) *(doc)* — `vitest-browser-react`, `render` and `expect.element`.
8. [Testing Library: Guiding Principles](https://testing-library.com/docs/guiding-principles) *(doc)* — The more your tests resemble the way your software is used, the more confidence they give you.
