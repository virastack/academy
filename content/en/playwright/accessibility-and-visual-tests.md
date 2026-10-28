---
title: "Accessibility and visual tests"
description: "axe, the keyboard, aria snapshots and screenshots."
lastVerified: "2026-10-22"
translationKey: "playwright/accessibility-and-visual-tests"
---

## Three different questions

This lesson has three kinds of test, and each answers a different question:

| Test | Its question | Tool |
| :-- | :-- | :-- |
| Accessibility scan | Is there an accessibility error that can be found automatically? | `@axe-core/playwright` |
| Aria snapshot | Is the page's structure *(the roles, names and order)* as expected? | `toMatchAriaSnapshot` |
| Visual comparison | Does the page look pixel for pixel the same as before? | `toHaveScreenshot` |

## Scanning with axe

The axe-core engine and `AxeBuilder` are covered in detail in the [Accessibility testing](/academy/performance-accessibility/accessibility-testing) lesson. On the Playwright side the pattern is short:[^1]

```command
npm install -D @axe-core/playwright
```

```ts
// tests/accessibility.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

test("no accessibility violations on the orders page", async ({ page, ordersPage }) => {
  await ordersPage.goto();
  await expect(ordersPage.rows).toHaveCount(6);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

Wait for the page to be **ready** before scanning. Scan before the list loads and you have only scanned the word "loading".

The colour contrast rule, which does not work in JSDOM, does work in a real browser; that is the biggest gain of an end-to-end scan. Even so, the Playwright documentation's warning is clear: automated tests only find some common problems, and many problems only come out through manual testing and testing with real users.[^1]

## Navigating with the keyboard

One of the things axe cannot see is the flow: can you fill in and submit the form with the keyboard, does the focus go to the right place? Test that like a user:

```ts
test("the sign-in form is usable with the keyboard", async ({ page, loginPage }) => {
  await loginPage.goto();

  await loginPage.email.focus();
  await page.keyboard.type("admin@example.com");
  await page.keyboard.press("Tab");
  await expect(loginPage.password).toBeFocused();

  await page.keyboard.type("password123");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/orders");
});
```

With `toBeFocused` and `keyboard.press` you can also confirm that after an error the focus goes to the first invalid field *(see [Showing errors and accessibility](/academy/forms/errors-and-accessibility))*.

## Aria snapshot

An aria snapshot is an element's accessibility tree written out in YAML: the roles, the accessible names, the states and the hierarchy. It shows at a glance how a screen reader sees the page.[^2]

```ts
test("the table structure is as expected", async ({ ordersPage }) => {
  await ordersPage.goto();
  await ordersPage.filterBy("Delivered");

  await expect(ordersPage.table).toMatchAriaSnapshot(`
    - table "Order list":
      - rowgroup:
        - row "Order Customer Amount Status Action"
      - rowgroup:
        - row /SP-1003 Nina Kowalski/:
          - cell "SP-1003"
          - cell "Nina Kowalski"
          - cell /2,150\\.00/
          - cell "Delivered"
          - cell
  `);
});
```

This single assertion confirms that the table has a caption, the order of the columns, that one row is left and the content of every cell. Writing the same thing with `toHaveText` would take a dozen lines.

The matching rules:[^2]

- The template is a **partial** match: if you write only some items of a list, the others are ignored. For an exact match, `/children: equal` is used.
- Names can be regular expressions between `/…/`. That is ideal for values whose format can change, such as a currency. Because the template is a JavaScript string, write the backslash twice: `/2,150\\.00/`.
- If you do not write a property *(`checked`, `disabled`)*, that property is not checked.

You do not have to write the template by hand. Start with an empty template; Playwright produces it on the first run. To update a structure that changed, use `-u` *(`--update-snapshots`)*; for inline templates an applicable patch file is created:[^2]

```ts
await expect(ordersPage.table).toMatchAriaSnapshot("");
```

```command
npx playwright test --update-snapshots
```

> [!WARNING]
>
> Updating a snapshot without reading it means accepting the very bug the test should catch. The Playwright documentation counts this as snapshot testing's biggest risk: approving a change without understanding it.[^2] Examine the difference before you update.

An aria snapshot and an assertion do not replace each other. The documentation recommends them together: a snapshot for the structure, an assertion for a particular value or behaviour.[^2]

## Visual comparison

`toHaveScreenshot` takes a screenshot of the page or of an element and compares it pixel by pixel with the stored reference image:[^3]

```ts
// tests/orders.visual.ts
import { expect, test } from "./fixtures";

test("order table appearance", async ({ ordersPage }) => {
  await ordersPage.goto();
  await expect(ordersPage.rows).toHaveCount(6);

  await expect(ordersPage.table).toHaveScreenshot("orders-table.png");
});
```

On the first run there is no reference. In the default mode Playwright writes the image but counts the test as **failed**, so a new snapshot is not accepted silently. With Playwright 1.64, `--update-snapshots=missing` writes the missing images and passes the test; it is designed so CI can produce the new images and verify the existing ones in a single run.[^4]

The reference file's name contains the browser and the operating system: `orders-table-visual-linux.png`. Because of font and rendering differences, an image taken on macOS does not match the one from Linux. The documentation says to run the tests in the environment the reference was produced in, for a consistent result.[^3] So produce the references in CI or in Playwright's official [!docker] image; everyone then uses the same environment.[^5]

The settings that reduce fragility:[^3]

| Setting | What it does |
| :-- | :-- |
| `animations` | `"disabled"` by default; finishes the animations and stops them |
| `caret` | `"hide"` by default; hides the blinking caret |
| `mask` | Covers the given locators with a box *(a date, an avatar)* |
| `maxDiffPixels` / `threshold` | The acceptable amount of difference |
| `stylePath` | Applies extra CSS while the screenshot is taken |

```ts
await expect(page).toHaveScreenshot({
  mask: [page.getByText(/Last updated/)],
  maxDiffPixels: 100,
});
```

## Keeping the visual tests in their own project

Visual tests are slow and platform-dependent. They do not have to run on every `npm test`. With `default: false` in Playwright 1.64, keep them in a separate project:[^4]

```ts
// playwright.config.ts
projects: [
  { name: "setup", testMatch: /.*\.setup\.ts/ },
  {
    name: "chromium",
    testIgnore: /.*\.visual\.ts/,
    use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/admin.json" },
    dependencies: ["setup"],
  },
  {
    name: "visual",
    testMatch: /.*\.visual\.ts/,
    use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/admin.json" },
    dependencies: ["setup"],
    default: false,
  },
],
```

```command
npx playwright test --project=visual --update-snapshots=missing
```

```command
npx playwright test --project=visual
```

Having the visual test files end in `.visual.ts` makes it easy to separate them from the normal project with `testIgnore`.

## Which one when?

| Situation | The recommendation |
| :-- | :-- |
| A basic accessibility guarantee for every page | An axe scan |
| A form, a menu and a modal working with the keyboard | A keyboard test |
| Components whose structure matters, such as a table, a list or a menu | An aria snapshot |
| The design system's appearance, the layout of the critical pages | A visual comparison, in its own project |
| A computed value, a behaviour | A normal assertion |

## Try it yourself

- Write an axe test for every page in your project. Delete a button's name and look at what the test reports.
- Add an empty `toMatchAriaSnapshot("")` to a table and read the template Playwright produces. Turn one cell into a regular expression.
- Set up a separate project for the visual test, and create the reference with `--update-snapshots=missing`. Change a colour and examine the difference in the HTML report.
- Write a test that fills in the sign-in form with the keyboard only.

## Going deeper

- **Official docs:** Playwright, "Snapshot testing"; the aria snapshot syntax, partial and exact matching, the update modes.[^2]
- **Official docs:** Playwright, "Visual comparisons"; the reference images, the platform naming and the options.[^3]
- **Official docs:** Playwright, "Accessibility testing"; scanning with axe and the limits of automated testing.[^1]

## Sources

1. [Playwright: Accessibility testing](https://playwright.dev/docs/accessibility-testing) *(doc)* — `AxeBuilder`, scanning a page, and the limits of automated testing.
2. [Playwright: Snapshot testing](https://playwright.dev/docs/aria-snapshots) *(doc)* — The aria snapshot syntax, the matching rules, `--update-snapshots`, and a comparison of snapshots with assertions.
3. [Playwright: Visual comparisons](https://playwright.dev/docs/test-snapshots) *(doc)* — `toHaveScreenshot`, the per-platform file name, `maxDiffPixels`, `threshold` and `stylePath`.
4. [Playwright: Release notes 1.64](https://playwright.dev/docs/release-notes#version-164) *(doc)* — The `--update-snapshots=missing` behaviour and `TestProject.default`.
5. [Playwright: Docker](https://playwright.dev/docs/docker) *(doc)* — Playwright's official Docker image and a consistent test environment.
