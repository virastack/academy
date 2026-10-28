---
title: "Auth and fixtures"
description: "Writing fixtures, storageState, roles and isolation."
lastVerified: "2026-10-22"
translationKey: "playwright/auth-and-fixtures"
---

## What is a fixture?

Since the first test you have been writing `async ({ page }) => …`. `page` is a **fixture**: a tool prepared before the test starts and cleaned up when it ends. The test only writes its name; Playwright prepares it.[^1]

The fixtures that come ready:[^1]

| Fixture | What it gives you |
| :-- | :-- |
| `page` | A clean tab, specific to this test |
| `context` | The browser context `page` belongs to *(cookies, permissions)* |
| `browser` | The browser shared between the tests |
| `browserName` | `chromium`, `firefox` or `webkit` |
| `request` | An `APIRequestContext` for HTTP requests without a browser |

Fixtures are better than `beforeEach` because they are only set up for the test that asks for them, the setup and the cleanup live in the same place, and they can depend on each other.[^1]

## Your own fixture

`test.extend` produces a new `test` function. Every fixture is a function: it prepares, hands the value to the test with `use`, and cleans up once `use` returns.[^1]

```ts
// tests/fixtures.ts
import { test as base } from "@playwright/test";
import { LoginPage } from "./pages/login-page";
import { OrdersPage } from "./pages/orders-page";

type Pages = {
  loginPage: LoginPage;
  ordersPage: OrdersPage;
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  ordersPage: async ({ page }, use) => {
    await use(new OrdersPage(page));
  },
});

export { expect } from "@playwright/test";
```

The tests now take `test` from this file, and the Page Objects arrive ready in the parameters *(see [Page Object](/academy/playwright/page-objects))*:

```ts
import { test, expect } from "./fixtures";

test("wrong password", async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login("admin@example.com", "wrongpass");
  await expect(loginPage.error).toHaveText("Email or password is incorrect.");
});
```

> [!WARNING]
>
> The ESLint setup of [!nextjs] projects mistakes the `use(...)` call in a fixture for React's `use` hook and raises a `react-hooks/rules-of-hooks` error. Turn the rule off for the tests folder:
>
> ```js
> // eslint.config.mjs
> {
>   files: ["tests/**"],
>   rules: { "react-hooks/rules-of-hooks": "off" },
> },
> ```

The code after `use` is the cleanup. It runs even when the test fails. In an application with an API that creates and deletes orders:

```ts
tempOrder: async ({ request }, use) => {
  const response = await request.post("/api/orders", { data: { customer: "Test" } });
  const order = await response.json();
  await use(order);
  await request.delete(`/api/orders/${order.id}`);
},
```

To set a fixture up once for the whole worker process, pass `{ scope: "worker" }`. For example, to open a separate test account for every worker. For fixtures that have to run even though the test never asks for them, there is `{ auto: true }`.[^1]

## Not signing in in every test

If every test that needs a session fills in the sign-in form, the test suite gets slow and a bug on the sign-in page fails all of them. The way Playwright recommends: sign in once in a **setup project**, save the browser state *(the cookies and `localStorage`)* to a file, and start the other tests with that state.[^2]

```ts
// tests/auth.setup.ts
import { expect, test as setup } from "./fixtures";

setup("sign in as an admin", async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login("admin@example.com");
  await expect(page).toHaveURL("/orders");
  await page.context().storageState({ path: "playwright/.auth/admin.json" });
});
```

`toHaveURL` matters. After signing in, the cookie is written together with the redirect; save before the address changes and you store an empty state.[^2]

```ts
// playwright.config.ts
projects: [
  { name: "setup", testMatch: /.*\.setup\.ts/ },
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/admin.json" },
    dependencies: ["setup"],
  },
],
```

`dependencies: ["setup"]` makes sure the setup project always runs first. Every test in the `chromium` project starts signed in.[^2][^3]

> [!CAUTION]
>
> The files inside `playwright/.auth/` carry real session cookies. The documentation's warning is clear: do not push these files to any repository, private or public. Add the folder to `.gitignore`; `npm init playwright` does that for you.[^2]

## More than one role

If your application has roles such as admin and viewer, the setup writes a separate file for each:[^2]

```ts
// tests/auth.setup.ts
const accounts = [
  { email: "admin@example.com", file: "playwright/.auth/admin.json" },
  { email: "viewer@example.com", file: "playwright/.auth/viewer.json" },
];

for (const { email, file } of accounts) {
  setup(`sign in as ${email}`, async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(email);
    await expect(page).toHaveURL("/orders");
    await page.context().storageState({ path: file });
  });
}
```

The default role stays in the configuration; a file that wants another role changes it with `test.use`:

```ts
// tests/viewer.spec.ts
import { expect, test } from "./fixtures";

test.use({ storageState: "playwright/.auth/viewer.json" });

test("a viewer does not see the cancel button", async ({ ordersPage }) => {
  await ordersPage.goto();
  await expect(ordersPage.table.getByRole("button", { name: "Cancel" })).toHaveCount(0);
});
```

Hiding the button in the interface is not an authorisation check. In the same test, confirm that the server refuses too. `page.request` uses the page's cookies:

```ts
test("a viewer cannot cancel through the API either", async ({ page }) => {
  const response = await page.request.post("/api/orders/SP-1001/cancel");
  expect(response.status()).toBe(403);
});
```

## Tests with no session

The file that tests the sign-in page should not start with a session. Give it an empty state:[^2]

```ts
test.use({ storageState: { cookies: [], origins: [] } });
```

If you are going to use this often, export it from `fixtures.ts` under the name `signedOut`.

## Tests that change data

The setup project gives **the same account** to all the tests. The documentation recommends this route for the cases where the tests can run with the same account at the same time without affecting each other.[^2] If one test is cancelling an order while another counts the "orders being prepared" at the same moment, the result depends on which finishes first.

[Martin Fowler](https://martinfowler.com/) describes this as a lack of isolation: every test should start from a known initial state and pass whatever order it runs in.[^4] The options:

1. **The test that changes data opens its own session.** In this guide's project the demo server gives every session its own copy of the orders; the cancel test signs in itself and the other tests are unaffected.
2. **An account per worker.** A worker-scoped fixture opens its own account for every worker with `workerInfo.workerIndex`.[^2]
3. **The test creates its own data.** Create a new order through the API before the test and cancel that one; do not touch anyone else's data.

```ts
// tests/cancel-order.spec.ts
import { expect, signedOut, test } from "./fixtures";

test.use({ storageState: signedOut });

test("an admin cancels an order being prepared", async ({ loginPage, ordersPage }) => {
  await loginPage.goto();
  await loginPage.login("admin@example.com");

  await ordersPage.cancel("SP-1001");
  await expect(ordersPage.row("SP-1001")).toContainText("Cancelled");
});
```

## Test locks

Some resources really are shared: a single external service, an account-wide setting. With Playwright 1.63 you can give tests a named **lock**. Tests carrying the same lock never run at the same time, whatever their file, worker or project; the other tests carry on in parallel.[^5]

```ts
test("turns the notification setting off", { lock: "account-settings" }, async ({ page }) => {
  // ...
});
```

A lock does not replace isolation. Try making the test independent first; use a lock when the shared resource really is a single one.

## Try it yourself

- Turn your Page Objects into fixtures with `test.extend`. Delete the `new` lines from the tests.
- Add a setup project and save the admin session. Open the `playwright/.auth/admin.json` file and look at what is inside.
- Add a second role, and for that role test not only the interface but the API too.
- Leave a test that changes data on the shared session and run it with `--repeat-each=5`. Is another test failing?

## Going deeper

- **Official docs:** Playwright, "Fixtures"; worker scope, automatic fixtures, option fixtures and the ordering.[^1]
- **Official docs:** Playwright, "Authentication"; a shared account, an account per worker, signing in through the API and several roles.[^2]
- **Article:** [Martin Fowler](https://martinfowler.com/), "Eradicating Non-Determinism in Tests"; isolation between tests.[^4]

## Sources

1. [Playwright: Fixtures](https://playwright.dev/docs/test-fixtures) *(doc)* — The built-in fixtures, `test.extend`, the cleanup, worker scope and automatic fixtures.
2. [Playwright: Authentication](https://playwright.dev/docs/auth) *(doc)* — The setup project, `storageState`, the security warning, roles and tests with no session.
3. [Playwright: Projects](https://playwright.dev/docs/test-projects) *(doc)* — Project dependencies and the setup project.
4. [Martin Fowler](https://martinfowler.com/): [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html) *(article)* — April 14, 2011. The lack of isolation, and a test setting up its own initial state.
5. [Playwright: Parallelism](https://playwright.dev/docs/test-parallel) *(doc)* — The worker processes and test locks.
