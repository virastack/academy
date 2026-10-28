---
title: "The first test and locators"
description: "getByRole, strict mode, filtering and within()."
lastVerified: "2026-10-22"
translationKey: "playwright/first-test-and-locators"
---

## The shape of a test

Every test is a title plus an async function. The function takes the tools it needs as parameters; these are called **fixtures**. The one you use most is `page`: a clean browser tab opened for the test.[^1]

```ts
// tests/login.spec.ts
import { test, expect } from "@playwright/test";

test("a wrong password shows an error message", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Password").fill("wrongpass");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toHaveText("Email or password is incorrect.");
});
```

There are three pieces: go to the page, behave like a user, check the result. `page.goto("/login")` uses the `baseURL` from the configuration *(see [Setup](/academy/playwright/setup))*. Every test runs in its own browser context; cookies, `localStorage` and the session are not shared between tests.[^1][^2]

Put the shared preparation in `test.beforeEach`, and group the related tests with `test.describe`:[^1]

```ts
test.describe("order list", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/orders");
  });

  test("lists all orders", async ({ page }) => {
    // ...
  });
});
```

## What is a locator?

A locator is **a recipe for finding** an element on the page; it is not the element itself. Creating a locator does not touch the page. The element is looked up only during an action *(`click`, `fill`)* or an assertion, and it is looked up again every time. Even if the page re-renders, the locator finds the current element.[^3]

```ts
const submit = page.getByRole("button", { name: "Sign in" }); // no lookup yet
await submit.click(); // now it is looked up, and waited for until visible and clickable
```

## Which locator?

The Playwright documentation recommends preferring what the user sees and the explicit contracts. A user recognises a button by its role and the text on it, not by its class name:[^3][^4]

| Locator | When |
| :-- | :-- |
| `getByRole` | A button, link, heading, table, checkbox; the first choice |
| `getByLabel` | Form fields that have a label |
| `getByPlaceholder` | A field with no label *(adding a label is better)* |
| `getByText` | Non-interactive text: a message, a paragraph |
| `getByAltText` | Images |
| `getByTitle` | Elements with a `title` attribute |
| `getByTestId` | `data-testid`, for the cases with no other way |

`getByRole` uses the element's role in the accessibility tree and its **accessible name**. That is, it sees what a screen reader sees.[^3] When a button cannot be found with `getByRole`, there is usually an accessibility problem *(see [Accessibility testing](/academy/performance-accessibility/accessibility-testing))*.

```ts
page.getByRole("heading", { name: "Orders" });
page.getByRole("link", { name: "Sign out" });
page.getByRole("checkbox", { name: "Remember me" });
page.getByRole("table", { name: "Order list" }); // the <caption> gives the name
```

By default `name` is **case-insensitive and matches a substring**. `"Sign in"` also finds the "Sign in" button. For an exact match, pass `exact: true` or use a regular expression:[^5]

```ts
page.getByRole("button", { name: "Sign in", exact: true });
page.getByRole("button", { name: /^sign in$/i });
```

> [!DONT]
>
> Do not write locators tied to a CSS class or to the DOM structure. When the designer changes the class the test breaks, although nothing changed for the user.[^4]
>
> ```ts
> page.locator("button.btn-primary.mt-4");
> page.locator("//div[2]/form/button");
> ```

> [!DO]
>
> ```ts
> page.getByRole("button", { name: "Sign in" });
> ```

## Strict mode

Locators are strict: an action expects a single element. If the locator matches more than one element, Playwright does not guess; it raises a "strict mode violation" error.[^3]

```ts
// Raises an error if there are two "Cancel" buttons on the page
await page.getByRole("button", { name: "Cancel" }).click();
```

The fix is not `first()` but narrowing the search. `first()` finds the right element today; tomorrow the order changes and it silently clicks the wrong one.

A common trap in [!nextjs] applications: alongside your own `role="alert"` message, Next's route announcer may be on the page too. `page.getByRole("alert")` then finds two elements. Narrow the search to inside the form:

```ts
const form = page.getByRole("form", { name: "Sign in" });
await expect(form.getByRole("alert")).toHaveText("Email or password is incorrect.");
```

A `<form>` only takes the `form` role when it has an accessible name; give it one with `aria-label` or `aria-labelledby`.

## Chaining and filtering

Locators can be chained. Every link narrows the search to inside the previous one:[^3]

```ts
page.getByRole("table", { name: "Order list" }).getByRole("row");
```

`filter` sifts a list by text or by another locator it contains. This is the most readable way to press the button in one particular row of a table:[^3][^4]

```ts
await page
  .getByRole("row")
  .filter({ hasText: "SP-1001" })
  .getByRole("button", { name: "Cancel" })
  .click();
```

| Option | Meaning |
| :-- | :-- |
| `hasText` / `hasNotText` | Containing / not containing this text |
| `has` / `hasNot` | Containing / not containing an element matching this locator |
| `visible` | Only the visible *(or invisible)* ones |

To leave the header row out, take the rows that contain a cell: `getByRole("row").filter({ has: page.getByRole("cell") })`. The header cells' role is `columnheader`.

## Locator.within()

`within()`, which arrived with Playwright 1.64, combines two locators you already have in the natural order: "this button, inside that dialog".[^6]

```ts
const save = page.getByRole("button", { name: "Save" });
const dialog = page.getByRole("dialog");
await save.within(dialog).click();
```

Its real strength is column queries. `nth()` and `first()` are resolved inside each parent separately, so you can write "the fourth cell of every row":[^6]

```ts
const rows = page.getByRole("row").filter({ has: page.getByRole("cell") });
const statusCells = page.getByRole("cell").nth(3).within(rows);

await expect(statusCells).toHaveText(["Shipped", "Shipped"]);
```

> [!WARNING]
>
> The first locator given to `within()` has to be independent. `rows.getByRole("cell").nth(3).within(rows)` looks for rows once more inside the rows and finds nothing. We made exactly this mistake while writing this guide's project.

## Visible elements

`visible()` *(1.63)* returns a locator that matches only the visible elements. It is the recommended replacement for the old `:visible` CSS pseudo-class.[^7] `getByRole` already skips hidden elements; `visible()` is more useful with `locator()` and `getByText`.

```ts
await page.getByText("Saved").visible().click();
```

## Finding locators with codegen

If you are not sure which locator to write, ask Playwright. `codegen` opens a browser; for every element you click it suggests a locator, preferring the role, the text and the test id, and it makes the locator unique if more than one element matches:[^4][^8]

```command
npx playwright codegen localhost:3000
```

With "Pick locator", hover over an element and copy the suggested locator. Do not use the recorded test as it is; make the steps readable and add assertions.

> [!NOTE]
>
> The example test in the [!nextjs] documentation uses `page.click("text=About")` and `page.locator("h1")`. Both work, but they are the old style. Write the same test with `page.getByRole("link", { name: "About" }).click()` and `page.getByRole("heading", { name: "About" })`.[^9]

## Try it yourself

- Write a test for a sign-in form in the project from the [Setup](/academy/playwright/setup) lesson. Find the locators with `codegen` first, then simplify them by hand.
- If you cannot find a button with `getByRole`, work out why: is the button a `<div>`, is its name an icon?
- Try finding the same button with `name: "Sign"` and with `name: "Sign", exact: true`. Which one finds it?
- Leave the same button in two rows of a table and call `click()`. Read the strict mode error, then fix it with `filter`.

## Going deeper

- **Official docs:** Playwright, "Locators"; all the locators, filtering, chaining and strict mode.[^3]
- **Official docs:** Playwright, "Best Practices"; user-facing locators and avoiding CSS.[^4]

## Sources

1. [Playwright: Writing tests](https://playwright.dev/docs/writing-tests) *(doc)* — The shape of a test, the actions, `beforeEach`, `describe` and test isolation.
2. [Playwright: Isolation](https://playwright.dev/docs/browser-contexts) *(doc)* — Every test running in its own browser context.
3. [Playwright: Locators](https://playwright.dev/docs/locators) *(doc)* — The locator kinds, the priority, filtering, chaining and strict mode.
4. [Playwright: Best Practices](https://playwright.dev/docs/best-practices) *(doc)* — Testing what the user sees, chaining and codegen.
5. [Playwright: Page.getByRole](https://playwright.dev/docs/api/class-page#page-get-by-role) *(doc)* — The `name` match, `exact` and the other options.
6. [Playwright: Release notes 1.64](https://playwright.dev/docs/release-notes#version-164) *(doc)* — `Locator.within()` and `nth` being resolved inside the parent.
7. [Playwright: Release notes 1.63](https://playwright.dev/docs/release-notes#version-163) *(doc)* — `Locator.visible()`.
8. [Playwright: Generating tests](https://playwright.dev/docs/codegen-intro) *(doc)* — Recording a test with codegen, and picking locators.
9. [Next.js: How to set up Playwright with Next.js](https://nextjs.org/docs/app/guides/testing/playwright) *(doc)* — A first Playwright test with Next.js.
