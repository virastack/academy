---
title: "Debugging"
description: "screen.debug, the common errors and coverage."
lastVerified: "2026-10-14"
translationKey: "vitest/debugging"
---

## What to do when a test breaks

Read the error message. When a query fails, Testing Library prints the current DOM along with the error.[^1] This order solves most problems:

- Read the first line of the error message.
- Look at the DOM with `screen.debug()`.
- Look at the query list. The **accessible roles** section of the message shows you the real roles.[^2]
- Fix the query or the test.

## screen.debug: look at the DOM

`screen.debug()` prints the current DOM to the console.[^1] You see what is on screen at the point where the test passes or breaks.

```tsx
test("product list", async () => {
  render(<ProductList loadProducts={loadProducts} onAddToCart={vi.fn()} />);

  screen.debug();

  await screen.findAllByRole("article");

  screen.debug(screen.getByRole("article", { name: "Mechanical Keyboard" }));
});
```

Called with no argument it prints the whole page; with an argument it prints only the element you give it.[^1]

> [!TIP]
>
> Delete the `screen.debug()` lines once you have solved the problem.

<details>
<summary>The other debug tools</summary>

- `logRoles(container)`: prints every implicit ARIA role inside an element and the elements carrying each role. It is also exported from the `@testing-library/react` package.[^1][^3]
- `screen.logTestingPlaygroundURL()`: prints a Testing Playground link for the current DOM. On that link you can pick the best query.[^1]
- The debug output is cut off at 7000 characters by default. For long DOMs, raise the `DEBUG_PRINT_LIMIT` environment variable: `DEBUG_PRINT_LIMIT=20000 pnpm vitest run` (macOS and Linux; on Windows use `cross-env`).[^1]

</details>

## The 4 most common errors

### 1. found multiple elements

```bash
TestingLibraryElementError: Found multiple elements with the role "button" and name "Add to cart"
```

**The cause:** more than one element on the page matches the same query. Every product card has an **Add to cart** button.[^4]

**The fix:** narrow the search to one card with `within`.[^5] If you need all the elements, use `getAllByRole`.[^4]

```tsx
const card = screen.getByRole("article", { name: "Mechanical Keyboard" });

within(card).getByRole("button", { name: "Add to cart" });
```

### 2. unable to find an accessible element

```bash
TestingLibraryElementError: Unable to find an accessible element with the role "heading" and name "Keyboard"
Here are the accessible roles:
  region:
  searchbox:
  article:
  heading:
  button:
```

**The cause:** the query found no element. The role, the name or the spelling may be wrong. Or the element is not on screen yet.

- Look at the role list in the message. Is the role you are looking for in the list?[^2]
- Check the `name` value. It has to be an exact match: `"Mechanical Keyboard"`, not `"Keyboard"`. For a partial match, use a regex: `/keyboard/i`.[^4][^6]
- If the element arrives later, use `findBy`.[^4]

### 3. the element is not on screen yet

```bash
TestingLibraryElementError: Unable to find an accessible element with the role "article"
Here are the accessible roles:
  status:
```

**The cause:** the products arrive after the API responds. The test checked before loading finished. Only `status` (the loading message) appears in the role list.

**The fix:** use `await screen.findBy` instead of `getBy`.[^7]

### 4. not wrapped in act(...)

```bash
An update to ProductList inside a test was not wrapped in act(...).
```

**The cause:** the component updated its state after the test finished, or while the test had stopped waiting. Usually the test ends before an asynchronous operation completes.[^8]

- At the end of the test, wait for the result you expect with `await findBy` or `await waitFor`.[^8]
- If you use timers, wrap the `vi.advanceTimersByTime` call in `act`.[^8]

> [!WARNING]
>
> Do not hide the `act` warning by silencing `console.error`. The warning tells you the test is not waiting for everything.[^8]

## Common mistakes

| Mistake | The right way |
| --- | --- |
| Checking absence with `getBy` | Use `queryBy`.[^4] |
| Not writing `await` on a `userEvent` call | Write `await` on every `user.*` call.[^9] |
| Getting stuck on `findBy` after `vi.useFakeTimers()` | `vi.useFakeTimers({ shouldAdvanceTime: true })`[^10][^11] |
| Calling `fetch` with a relative URL | Use the full URL: `https://api.shop.test/products`. Depending on the test environment, a relative URL can raise `Failed to parse URL`.[^12][^13] |
| A test depending on data left over from an earlier one | Let every test set up its own data.[^14] |

## Running a single test

Do not run all the tests. Pick the one you are working on:

```bash
pnpm vitest run src/ProductList.test.tsx

pnpm vitest run src/ProductList.test.tsx -t "by search"
```

The `-t` option runs the tests whose name matches the expression you give (the expression is read as a regex). While developing, use `pnpm vitest` (watch mode). When a file changes, the tests run again.[^15]

## Coverage

Coverage shows how much of the code your tests run. Use it to find the parts of the code that are not tested.[^16]

```bash
pnpm add -D @vitest/coverage-v8
pnpm vitest run --coverage
```

To include the files that have no test in the report too, add `include` to `vitest.config.ts`:[^17]

```ts
test: {
  coverage: {
    provider: "v8",
    include: ["src/**/*.{ts,tsx}"],
  },
},
```

> [!WARNING]
>
> Do not aim for 100% coverage. Coverage does not show that a test is **correct**. It only shows that the code ran. Focus on the important flows (adding to the cart, checkout, form validation).[^16]

## Try it yourself

The test below is breaking. Fix it by reading the error message:

```tsx
test("adds the product to the cart", async () => {
  const user = userEvent.setup();
  const onAddToCart = vi.fn();
  render(
    <ProductList
      loadProducts={() => Promise.resolve(products)}
      onAddToCart={onAddToCart}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Add to cart" }));

  expect(onAddToCart).toHaveBeenCalledTimes(1);
});
```

- Run the test and read the first error message.
- Look at the role list in the error message.
- Wait for the loading first. Then find the button on the **Mechanical Keyboard** card with `within`.

## Sources

1. [Testing Library: Debugging](https://testing-library.com/docs/dom-testing-library/api-debugging) *(doc)* — The automatic DOM output, `screen.debug`, `logRoles`, `logTestingPlaygroundURL` and `DEBUG_PRINT_LIMIT`.
2. [Kent C. Dodds: Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) *(article)* — The "accessible roles" output and the wrong query patterns. The principles hold; the `userEvent` examples are from before `setup()`.
3. [React Testing Library: API](https://testing-library.com/docs/react-testing-library/api) *(doc)* — All of DOM Testing Library is re-exported.
4. [Testing Library: About Queries](https://testing-library.com/docs/queries/about) *(doc)* — The difference between `getBy`, `queryBy` and `findBy`, and `TextMatch`.
5. [Testing Library: Querying Within Elements](https://testing-library.com/docs/dom-testing-library/api-within) *(doc)* — Narrowing a query to one element with `within`.
6. [Testing Library: ByRole](https://testing-library.com/docs/queries/byrole) *(doc)* — The `name` option.
7. [Testing Library: Async Methods](https://testing-library.com/docs/dom-testing-library/api-async) *(doc)* — The `findBy` queries.
8. [Kent C. Dodds: Fix the "not wrapped in act(...)" warning](https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning) *(article)* — The reason for the warning and the fixes. The examples are written with Jest.
9. [user-event: Introduction](https://testing-library.com/docs/user-event/intro) *(doc)* — `userEvent.setup()` and `await user.click(...)`.
10. [dom-testing-library #1218: useFakeTimers and findBy](https://github.com/testing-library/dom-testing-library/issues/1218) *(repo)* — `findBy` running into a timeout in Vitest.
11. [Vitest: fakeTimers config](https://vitest.dev/config/faketimers) *(doc)* — The `shouldAdvanceTime` option.
12. [The New Stack: When JSDOM and Fetch Collide](https://thenewstack.io/when-jsdom-and-fetch-collide-cross-environment-lessons/) *(article)* — Relative URLs being able to raise `Failed to parse URL` in a test environment.
13. [MSW #1999: resolve relative fetch URLs in jsdom](https://github.com/mswjs/msw/pull/1999) *(repo)* — Relative `fetch` URLs being resolved in jsdom, fixed in MSW 2.1.5.
14. [Kent C. Dodds: Test Isolation with React](https://kentcdodds.com/blog/test-isolation-with-react) *(article)* — The problems with state shared between tests.
15. [Vitest: Command Line Interface](https://vitest.dev/guide/cli) *(doc)* — `vitest run`, `-t` and watch mode.
16. [Martin Fowler: Test Coverage](https://martinfowler.com/bliki/TestCoverage.html) *(article)* — Coverage is not a target but a tool for finding what is not tested.
17. [Vitest: Coverage](https://vitest.dev/guide/coverage) *(doc)* — Setting it up, and `coverage.include`.
