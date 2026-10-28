---
title: "Page Object"
description: "Collecting locators and flows in page objects."
lastVerified: "2026-10-22"
translationKey: "playwright/page-objects"
---

## The problem: repeated locators

Picture ten tests covering the sign-in flow. Each one finds the email field, the password field and the button for itself. When the button text changes from "Sign in" to "Log in", you fix ten files.

A **Page Object** collects that repetition in a class. The Playwright documentation lists two benefits: it makes the test **easier to write**, with a high-level API that fits your application; and it makes it **easier to maintain**, by keeping the locators in one place.[^1]

[Martin Fowler](https://martinfowler.com/) describes the pattern's purpose like this: a Page Object offers the test code everything a person can do and see on the page, and hides the HTML detail underneath. The test says "type into the email field"; it does not know how that field is found.[^2]

## The first Page Object

```ts
// tests/pages/login-page.ts
import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    const form = page.getByRole("form", { name: "Sign in" });
    this.email = form.getByLabel("Email");
    this.password = form.getByLabel("Password");
    this.submit = form.getByRole("button", { name: "Sign in" });
    this.error = form.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password = "password123") {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
```

There are two kinds of member:

- **Locator fields** *(`email`, `error`)*: the elements the test will assert on or use on their own. Because creating a locator does not touch the page, defining them in the constructor is safe *(see [The first test and locators](/academy/playwright/first-test-and-locators))*.
- **Action methods** *(`goto`, `login`)*: flows made of several steps, named in the user's language.

The test now reads as intent:

```ts
// tests/login.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login-page";

test("a wrong password shows an error and keeps the email", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("admin@example.com", "wrongpass");

  await expect(loginPage.error).toHaveText("Email or password is incorrect.");
  await expect(loginPage.email).toHaveValue("admin@example.com");
});
```

## A method for a row and a list

For parameterised elements, such as a particular row in a table, write a method that returns a locator:

```ts
// tests/pages/orders-page.ts
export class OrdersPage {
  readonly table: Locator;
  readonly rows: Locator;
  readonly statusFilter: Locator;

  constructor(private readonly page: Page) {
    this.table = page.getByRole("table", { name: "Order list" });
    this.rows = this.table.getByRole("row").filter({ has: page.getByRole("cell") });
    this.statusFilter = page.getByLabel("Status");
  }

  row(orderId: string) {
    return this.rows.filter({ hasText: orderId });
  }

  async filterBy(label: string) {
    await this.statusFilter.selectOption({ label });
  }

  async cancel(orderId: string) {
    await this.row(orderId).getByRole("button", { name: "Cancel" }).click();
  }
}
```

`row("SP-1001")` is used both in an action *(`cancel`)* and in an assertion:

```ts
await expect(ordersPage.row("SP-1001")).toContainText("Cancelled");
```

## Do assertions belong in a Page Object?

There are two views.

[Martin Fowler](https://martinfowler.com/) argues that a Page Object should not assert. Its job is to offer the page's state; the checking is the test's work. The one exception is checking an invariant the page always has to satisfy.[^2] In the Playwright documentation's example, on the other hand, an action method uses `expect` to confirm that the next page opened.[^1]

A practical split:

| In the Page Object | In the test |
| :-- | :-- |
| Waiting for an action to finish *(did the next page arrive)* | The test's real claim *(is the message right, was the row cancelled)* |
| Locators and actions | The expected values specific to the scenario |

Someone reading the test should be able to see what is being checked without opening the Page Object. The rule "the real claim lives in the test" is what gives you that.

## Not a page but a meaningful piece

Despite its name, a Page Object does not have to map one to one onto a page. [Martin Fowler](https://martinfowler.com/) suggests writing an object for the **meaningful pieces** on a page: an album list page can hold several album objects, a header object and a footer object.[^2] A navigation menu or a date picker that repeats on every page earns its own object:

```ts
export class DatePicker {
  constructor(private readonly root: Locator) {}

  async pick(day: number) {
    await this.root.getByRole("button", { name: "Open the calendar" }).click();
    await this.root.getByRole("gridcell", { name: String(day), exact: true }).click();
  }
}
```

An object that takes a root `Locator` works wherever on the page it is: `new DatePicker(page.getByRole("group", { name: "Delivery date" }))`.

## Avoid over-abstracting

A Page Object is a tool, not a goal. The common mistakes:

- **A method for every element:** `clickSubmitButton()`, `getEmailInput()`. Expose the locator field; `loginPage.submit.click()` is readable enough.
- **Single-use flows:** moving a step that appears in only one test into the Page Object does not reduce repetition, it only makes the test harder to read.
- **Hiding the locator and returning a boolean:** `isErrorVisible(): Promise<boolean>` loses the web-first assertion's waiting *(see [Assertions and waiting](/academy/playwright/assertions-and-waiting))*. Return the locator and check it with `expect` in the test.

The Playwright documentation also says that a little repetition is acceptable in simple tests, and can be preferable when it improves readability.[^3]

> [!NOTE]
>
> The Page Object example in the Playwright documentation writes its locators with `page.locator("a", { hasText: "Get started" })` and CSS selectors. Learn the pattern from there, and write the locators with `getByRole` and `getByLabel` as this guide does.[^1]

## Not writing `new` in every test

Writing `new LoginPage(page)` at the start of every test is repetition too. In the next lesson we will give the Page Objects as **fixtures**; they will arrive ready in the test's parameters:

```ts
test("wrong password", async ({ loginPage }) => {
  await loginPage.goto();
});
```

## Try it yourself

- Move the locators from your sign-in tests into a `LoginPage` class. Change the button text and see how many files you have to fix.
- Write a `row(id)` method for a table and use it both in an action and in an assertion.
- Find a repeating piece on your page *(a menu, a search box)* and write a component object that takes a root `Locator`.
- Find the methods in your Page Objects that return `Promise<boolean>` and change them to return a locator.

## Going deeper

- **Official docs:** Playwright, "Page object models"; how the pattern is applied in Playwright.[^1]
- **Article:** [Martin Fowler](https://martinfowler.com/), "Page Object"; the pattern's purpose, the assertion debate and splitting into pieces.[^2]

## Sources

1. [Playwright: Page object models](https://playwright.dev/docs/pom) *(doc)* — The Page Object class, the locator fields and using it in a test.
2. [Martin Fowler](https://martinfowler.com/): [Page Object](https://martinfowler.com/bliki/PageObject.html) *(article)* — September 10, 2013. The pattern's purpose, where assertions belong, splitting into pieces and returning another Page Object.
3. [Playwright: Best Practices](https://playwright.dev/docs/best-practices) *(doc)* — Test isolation, and repetition being acceptable in simple tests.
