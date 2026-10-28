---
title: "Asynchronous tests"
description: "findBy, waitFor and fake timers."
lastVerified: "2026-10-14"
translationKey: "vitest/async"
---

## What is an asynchronous interface?

Some changes do not happen immediately. For example:

- The product list appears once the API responds.
- A notification shows when a product is added to the cart, and closes 3 seconds later.

Your test has to **wait** for that change. Without waiting, the test checks before the interface updates, and fails.[^1]

## Which tool should I use?

| Situation | Tool |
| --- | --- |
| The element **will appear** later | `await screen.findBy...`[^1] |
| The element **will disappear** later | `await waitFor(() => expect(queryBy...).not.toBeInTheDocument())`[^1] |
| The code waits real time (`setTimeout`) and you do not want to wait | Fake timers[^2] |

## findBy: an element that will appear later

[!findBy] waits until it finds the element. It throws when the time runs out. The default is **1000 ms**.[^3]

```tsx
test("shows a status message while loading, then the products", async () => {
  render(
    <ProductList
      loadProducts={() => Promise.resolve(products)}
      onAddToCart={vi.fn()}
    />,
  );

  expect(screen.getByText("Loading products...")).toBeInTheDocument();
  expect(await screen.findAllByRole("article")).toHaveLength(3);
});
```

The first line uses [!getBy]. The loading message is on screen in the very first render, so no waiting is needed.[^3]

## waitFor: waiting for a condition to hold

`waitFor` runs the function you give it again and again until it stops throwing. The default is **1000 ms**.[^1]

Use [!queryBy] when you wait for an element to **disappear**:[^3]

```tsx
await waitFor(() =>
  expect(screen.queryByText("Loading products...")).not.toBeInTheDocument(),
);
```

> [!DO]
>
> - Put only `expect` checks inside `waitFor`.[^4]
> - Use `findBy` instead of `waitFor` for an element you expect to appear.[^4]

> [!DONT]
>
> - Do not perform actions such as `user.click` inside `waitFor`. When the function runs again, so does the action.[^4]
> - Do not use `findBy` inside `waitFor`. `findBy` already uses `waitFor`.[^1]

> [!CAUTION]
>
> `findBy` returns a Promise. If you write `expect(screen.findByText(...)).not.toBeInTheDocument()`, you have given `expect` a Promise instead of an element, and jest-dom rejects it with an error because it is not an HTMLElement.[^5] Use `queryBy` to assert that an element is absent.[^3]

<details>
<summary>waitForElementToBeRemoved</summary>

- `waitForElementToBeRemoved(() => screen.queryByText("..."))` waits for an element to disappear. The element **has to be** in the DOM to begin with. If it is already gone, the function throws.[^1]
- When you are not sure, use the `waitFor` and `queryBy` combination. That works even if the element disappears very quickly.[^1]

</details>

## Fake timers: controlling time

A notification appears when a product is added to the cart. The notification closes after 3 seconds. A test that waits 3 seconds is slow. Advance the time yourself.[^2]

```tsx
import { useEffect, useState } from "react";

export function AddedToast({ productName }: { productName: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 3000);

    return () => clearTimeout(id);
  }, []);

  return visible ? <div role="status">{productName} added to cart.</div> : null;
}
```

```tsx
import { act, render, screen } from "@testing-library/react";
import { AddedToast } from "./AddedToast";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

test("the notification disappears after 3 seconds", async () => {
  render(<AddedToast productName="Wireless Headphones" />);

  expect(await screen.findByRole("status")).toHaveTextContent(
    "Wireless Headphones added to cart.",
  );

  act(() => {
    vi.advanceTimersByTime(3000);
  });

  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
```

Watch out for three rules:

- Call `vi.useFakeTimers` before `render`. The component's `setTimeout` call has to be the fake one.[^6]
- Wrap the `vi.advanceTimersByTime` call in `act`. The timer updates a React state.[^7]
- Call `vi.useRealTimers` in `afterEach`.[^8] `afterEach` runs even when the test fails.

> [!CAUTION]
>
> A plain `vi.useFakeTimers()` call makes `findBy` and `userEvent` calls hang, and the test ends with a timeout error.[^8][^9] The fix: `vi.useFakeTimers({ shouldAdvanceTime: true })`.[^10] If you use `userEvent`, also write `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`.[^11]

<details>
<summary>Fake timers commands</summary>

- `vi.advanceTimersByTime(ms)`: advances the time by `ms`. `vi.advanceTimersByTimeAsync(ms)`: does the same and also runs the timers set up asynchronously.[^6]
- `vi.runOnlyPendingTimers()`: runs the pending timers right away. `vi.setSystemTime(date)`: sets the value of `Date.now()` and `new Date()`.[^6]
- Do not use fake timers for a short wait (300 ms, say). Wait with `findBy`.

</details>

## Try it yourself

What shows up when the API call fails? Test that:

- The `loadProducts` function returns `Promise.reject(new Error("network error"))`.
- Find the **Products could not be loaded.** message with `findByRole("alert")`.
- Confirm with [!queryBy] that the **Loading products...** message is gone.

## Sources

1. [Testing Library: Async Methods](https://testing-library.com/docs/dom-testing-library/api-async) *(doc)* — `findBy`, `waitFor` and `waitForElementToBeRemoved`.
2. [Vitest: Timers](https://vitest.dev/guide/mocking/timers) *(doc)* — The fake timers guide.
3. [Testing Library: About Queries](https://testing-library.com/docs/queries/about) *(doc)* — The difference between `getBy`, `queryBy` and `findBy`.
4. [Kent C. Dodds: Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) *(article)* — Side effects inside `waitFor`, and using `waitFor` instead of `find*`.
5. [jest-dom: toBeInTheDocument source](https://github.com/testing-library/jest-dom/blob/main/src/to-be-in-the-document.js) *(repo)* — The value given is checked for being an HTMLElement.
6. [Vitest: vi API](https://vitest.dev/api/vi) *(doc)* — The fake timers commands.
7. [React: act](https://react.dev/reference/react/act) *(doc)* — Applying the updates before the assertion.
8. [Testing Library: Using Fake Timers](https://testing-library.com/docs/using-fake-timers) *(doc)* — Setting fake timers up and cleaning them up.
9. [dom-testing-library #1218: useFakeTimers and findBy](https://github.com/testing-library/dom-testing-library/issues/1218) *(repo)* — `findBy` running into a timeout in Vitest.
10. [Vitest: fakeTimers config](https://vitest.dev/config/faketimers) *(doc)* — The `shouldAdvanceTime` option.
11. [user-event: Options](https://testing-library.com/docs/user-event/options) *(doc)* — The `advanceTimers` option.
