---
title: "Assertions and waiting"
description: "Auto-waiting, web-first assertions and hydration."
lastVerified: "2026-10-22"
translationKey: "playwright/assertions-and-waiting"
---

## Why don't we write waits?

A web page is asynchronous. You click the button; a request goes out, the response arrives, the list is redrawn. In the older test tools this is why people wrote waits such as `sleep(2000)`. [Martin Fowler](https://martinfowler.com/) explains that this loses both ways: a long wait slows the test suite down, and a short wait fails the test at random on a slow machine. His advice is clear: do not use a fixed wait; wait for a signal, or look again at short intervals until the condition holds.[^1]

Playwright does that second thing for you. Before an action it waits for the element to be ready, and in an assertion it waits for the expected state to appear.

## Automatic waiting before actions

When you call `click()`, Playwright checks the following before clicking, and waits until all of them hold:[^2]

- The locator matches exactly **one** element.
- The element is **visible**.
- The element is **stable**; the animation has finished.
- The element **receives events**; nothing else sits on top of it.
- The element is **enabled**; it is not `disabled`.
- The element is **not inert**; it is not behind an open modal.

For `fill()` it is enough to be visible, enabled and editable. If the checks do not hold before the timeout, the action fails with a `TimeoutError`.[^2]

> [!WARNING]
>
> `click({ force: true })` turns some of these checks off. The test passes, but you may have clicked a button the user cannot click. Find out why the element was not clickable first.[^2]

## Web-first assertions

The assertions that start with `expect(locator)` find the element and check it again and again until the condition holds. The default wait is 5 seconds.[^3]

```ts
await page.getByRole("button", { name: "Cancel" }).click();
await expect(page.getByRole("status")).toHaveText("SP-1001 cancelled.");
```

Even if the message arrives half a second later, the test passes. Because these assertions are asynchronous, `await` is **required**.

> [!DONT]
>
> ```ts
> expect(await page.getByText("Saved").isVisible()).toBe(true);
> ```
>
> `isVisible()` returns the current state and does not wait. If the message arrives 100 milliseconds later, the test fails.[^4]

> [!DO]
>
> ```ts
> await expect(page.getByText("Saved")).toBeVisible();
> ```

The web-first assertions you'll use often:[^3]

| Assertion | What it confirms |
| :-- | :-- |
| `toBeVisible()` / `toBeHidden()` | The element is visible / invisible or absent |
| `toHaveText()` | The text matches exactly; with an array, every element in order |
| `toContainText()` | The text appears inside it |
| `toHaveCount(n)` | The locator matches exactly `n` elements |
| `toHaveValue()` | The input's value |
| `toBeEnabled()` / `toBeDisabled()` | Enabled / disabled |
| `toBeFocused()` | The focus is on this element |
| `toHaveAccessibleName()` | The accessible name |
| `toHaveURL()` | The page's address; can also be written relative to `baseURL` |
| `toHaveTitle()` | The page title |

When `toHaveText` takes an array, the number and the order of the elements the locator matches have to match too. It is ideal for list tests:

```ts
await expect(page.getByRole("cell").nth(3).within(rows)).toHaveText(["Shipped", "Shipped"]);
```

To negate, use `not`. `not` waits too; it waits for the condition **to go away**:[^3]

```ts
await expect(page.getByText("Loading orders...")).not.toBeVisible();
```

The general assertions that start with `expect(value)` *(`toBe`, `toEqual`, `toContain`)* do not wait; they check a value you already hold.[^3]

```ts
const response = await page.request.post("/api/orders/SP-1001/cancel");
expect(response.status()).toBe(403);
```

## Timeouts

| Timeout | Default | Its setting |
| :-- | :-- | :-- |
| Test | 30 seconds | `timeout` or `test.setTimeout()` |
| Assertion | 5 seconds | `expect: { timeout }`, or `{ timeout }` on the assertion |
| Action and navigation | No limit, bounded by the test's time | `use: { actionTimeout, navigationTimeout }` |

The test's time includes `beforeEach` and the fixture setup.[^5] Extending an assertion's time usually hides the problem. Look at why it is slow first.

## Soft assertions

Normally the first failing assertion stops the test. `expect.soft` marks the test as failed but carries on; in cases such as checking five fields of a form in one go, you see all the errors at once:[^3]

```ts
await expect.soft(page.getByLabel("Email")).toHaveValue("admin@example.com");
await expect.soft(page.getByLabel("Password")).toHaveValue("");
```

## expect.poll and toPass

For conditions that depend on a function's result rather than on a locator, there are two tools.[^3]

`expect.poll` calls the function again until the result reaches the expected value:

```ts
await expect
  .poll(async () => (await page.request.get("/api/orders?status=cancelled")).status())
  .toBe(200);
```

`toPass` runs a block of code again until all the assertions inside it pass:

```ts
await expect(async () => {
  const response = await page.request.get("/api/orders?status=all");
  expect(response.status()).toBe(200);
}).toPass({ timeout: 10_000 });
```

> [!NOTE]
>
> `toPass`'s default timeout is 0, and it does not use the time from the `expect` setting. Give the time yourself; otherwise only the test's time limits it.[^3]

## No fixed waits

> [!DONT]
>
> ```ts
> await page.waitForTimeout(2000);
> ```
>
> The Playwright documentation marks this method as "discouraged": waiting for a duration is fragile by its nature and should only be used while debugging.[^6]

`page.waitForLoadState("networkidle")` is in the same category. The documentation explicitly does not recommend `networkidle` and says to confirm readiness with web-first assertions.[^7] Wait for whatever is the precondition of the next step: if a list is going to load, the row count; if a message is going to arrive, the message.

## The hydration trap

On a server-side rendered [!nextjs] page, the HTML arrives before the JavaScript. Playwright sees the button and clicks it, because it is visible and enabled. But if React has not attached to the page yet *(hydration)*, `onClick` or `onSubmit` does not run.

The result depends on the application:

- In a form managed with `onSubmit`, the browser submits the form itself; the page reloads and the fields are cleared.
- In a select that works with `onChange`, the selection is lost.

The tests of this guide's [Forms](/academy/forms/project) project were failing now and then for exactly this reason. There are three fixes:

1. **Make the form work without JavaScript too.** A form given a Server Action in its `action` prop is submitted before hydration as well *(see [Forms with Server Actions](/academy/forms/forms-with-server-actions))*. The test becomes stable and the user on a slow connection gains as well.
2. **Wait for something that only appears once the client code has run.** For example a list loaded in the browser with TanStack Query. If the rows have appeared, React is running.
3. **`networkidle` as a last resort.** It works, but it is slow and the documentation does not recommend it.

In this guide's project the sign-in form uses a Server Action, and the order tests wait for the rows to load before touching the filter.

## Layout shift

Auto-waiting waits for the element to be **stable**, but it cannot know about a shift that happens after your click. If an error message appears when you leave a field and pushes the button below it down, Playwright can click the button's old place and hit empty space. The user hits the same problem.

The fix is not in the test but in the interface: reserve the space for the error message up front *(something like `min-h-5`)*. In the forms project, that fix both made the tests stable and removed the shift.

## Try it yourself

- Write an assertion with `isVisible()` and add a 500-millisecond delay to the API response. Does the test fail? Then turn it into `toBeVisible()`.
- Confirm all the items of a list in order with `toHaveText`. When one item is missing, what does the error message show?
- In one test, check three fields with `expect.soft` and get two of them wrong on purpose. How many errors do you see in the report?
- Run the test of a form that works with `onSubmit` with `--repeat-each=20`. Does it fail now and then? Turn the form into a Server Action and try again.

## Going deeper

- **Official docs:** Playwright, "Auto-waiting"; the full table of which action waits for which checks.[^2]
- **Official docs:** Playwright, "Assertions"; all the assertions, soft, poll and toPass.[^3]
- **Article:** [Martin Fowler](https://martinfowler.com/), "Eradicating Non-Determinism in Tests"; fixed waits, isolation and quarantining flaky tests.[^1]

## Sources

1. [Martin Fowler](https://martinfowler.com/): [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html) *(article)* — April 14, 2011. A signal or polling instead of a fixed wait, isolation and quarantine.
2. [Playwright: Auto-waiting](https://playwright.dev/docs/actionability) *(doc)* — The checks before an action, the `force` option and `TimeoutError`.
3. [Playwright: Assertions](https://playwright.dev/docs/test-assertions) *(doc)* — Web-first and general assertions, `not`, soft, `expect.poll` and `toPass`.
4. [Playwright: Best Practices](https://playwright.dev/docs/best-practices) *(doc)* — Using web-first assertions, and not writing manual ones.
5. [Playwright: Timeouts](https://playwright.dev/docs/test-timeouts) *(doc)* — The test, assertion, action and navigation timeouts.
6. [Playwright: Page.waitForTimeout](https://playwright.dev/docs/api/class-page#page-wait-for-timeout) *(doc)* — The discouraged fixed wait, and what to use instead.
7. [Playwright: Page.waitForLoadState](https://playwright.dev/docs/api/class-page#page-wait-for-load-state) *(doc)* — The `networkidle` state not being recommended.
