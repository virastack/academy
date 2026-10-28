---
title: "Setup"
description: "Adding Playwright, the configuration and webServer."
lastVerified: "2026-10-22"
translationKey: "playwright/setup"
---

## What is an end-to-end test?

The [Vitest](/academy/vitest) lessons test a component or a hook on its own, inside JSDOM. An end-to-end *(E2E)* test runs the whole application in a real browser: the page opens, it is clicked and typed into like a user would, and the result on screen is checked. The server, the database, the routing and the cookies are all part of it.

| | Component test *(Vitest)* | End-to-end test *(Playwright)* |
| :-- | :-- | :-- |
| Environment | JSDOM, a single component | A real browser, the whole application |
| Speed | Milliseconds | Seconds |
| The bugs it catches | Component logic | The pieces working together, routing, the session |
| How many | Many | Few, for the critical flows |

[Martin Fowler](https://martinfowler.com/) puts end-to-end tests at the top of the test pyramid: they give the most valuable confidence but are the slowest and the most fragile. That is why they are kept few in number; every detail is checked by the faster tests below.[^1]

[!playwright] is an open-source test tool developed by Microsoft. It drives Chromium, Firefox and WebKit through a single API, and runs the tests in parallel and, by default, in an invisible *(headless)* browser.[^2]

## Setup

The Node.js versions Playwright supports are 22, 24 and 26.[^2] In the root folder of an existing [!nextjs] project, run this command:

```command
npm init playwright@latest
```

The command asks a few questions: TypeScript or JavaScript, the tests' folder *(`tests` by default)*, whether to add a GitHub Actions workflow, whether to download the browsers. Running the command again later does not delete your existing tests.[^2]

The files it creates:

```bash
playwright.config.ts         # The configuration
tests/
  example.spec.ts            # An example test
.github/workflows/playwright.yml   # The CI workflow, if you asked for it
```

`@playwright/test` is added to `package.json`. The test outputs are written into `.gitignore`: `test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/` and `playwright/.auth/`.

> [!NOTE]
>
> The [!nextjs] documentation also offers a ready-made start: `npx create-next-app@latest --example with-playwright`. In this guide we are learning how to add it to an existing project.[^3]

To download the browsers later, or to install only one of them:

```command
npx playwright install chromium
```

## playwright.config.ts

A trimmed-down version of the generated file, and what each field does:[^4]

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
```

| Field | What it does |
| :-- | :-- |
| `testDir` | The folder the test files are looked for in |
| `fullyParallel` | Runs the tests within one file in parallel too |
| `forbidOnly` | Stops the run in CI if a forgotten `test.only` is there |
| `retries` | How many times a failed test is retried; 0 locally, 2 in CI |
| `workers` | How many worker processes run at the same time |
| `reporter` | The result's format; `html` produces a clickable report |
| `use.baseURL` | The root address, so you can write `page.goto("/login")` |
| `use.trace` | Which run records a trace *(see [Debugging with a trace](/academy/playwright/debugging-with-trace))* |
| `projects` | Running the same tests with different browsers or settings |

By default every test waits 30 seconds, and every web-first assertion 5 seconds.[^5]

## Projects and `default: false`

Every project runs the same tests with a different setting. With Playwright 1.64 you can keep a project in the configuration and leave it out of the default run. Locally only Chromium runs; in CI all of them do:[^6]

```ts
projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] }, default: false },
  { name: "webkit", use: { ...devices["Desktop Safari"] }, default: false },
],
```

```command
npx playwright test --project="*"
```

## webServer: let Playwright start the app

The tests need a running application. The `webServer` field starts the server before the tests and waits until the address responds.[^7] The [!nextjs] documentation recommends running the tests against a production build; the application is tested the way it will really run.[^3]

```ts
webServer: {
  command: "npm run build && npm run start",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
  timeout: 180_000,
},
```

`reuseExistingServer` uses a server that is already running locally; in CI it always starts a new one. Because a build can take a few minutes, keep the `timeout` above the default 60 seconds.[^7]

> [!TIP]
>
> Waiting for a build every time while writing tests is slow. Keep `npm run dev` open in a terminal; thanks to `reuseExistingServer`, Playwright uses it. Before you push, close the dev server and run once against a production build.

## Running the tests

```command
npx playwright test
```

The options you'll use often:[^2][^8]

| Command | What it does |
| :-- | :-- |
| `npx playwright test tests/login.spec.ts` | A single file |
| `npx playwright test -g "sign in"` | The tests whose title contains "sign in" |
| `npx playwright test --project=chromium` | A single project |
| `npx playwright test --headed` | Opens the browser visibly |
| `npx playwright test --ui` | UI Mode: watching, and step-by-step time travel |
| `npx playwright show-report` | Opens the last HTML report |

The HTML report only opens by itself when a test fails.[^2]

If you use [!vscode], the Playwright extension lets you run the tests from the editor, set breakpoints and pick locators.[^9]

## Try it yourself

- Add Playwright to a [!nextjs] project. Run `tests/example.spec.ts`, then open the report with `npx playwright show-report`.
- Add `default: false` to the Firefox and WebKit projects. Compare the number of tests in the output of `npx playwright test` and `npx playwright test --project="*"`.
- Add `webServer` and set `baseURL`. Change the address in the example test to `page.goto("/")`.
- Open UI Mode with `npx playwright test --ui` and watch a test step by step.

## Going deeper

- **Official docs:** Playwright, "Installation"; the setup, the generated files and the first run.[^2]
- **Official docs:** Next.js, "How to set up Playwright with Next.js"; the recommendation to test against a production build.[^3]
- **Article:** [Martin Fowler](https://martinfowler.com/), "Test Pyramid"; why end-to-end tests are kept few.[^1]

## Sources

1. [Martin Fowler](https://martinfowler.com/): [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html) *(article)* — May 1, 2012. The cost of end-to-end tests and the pyramid's layers.
2. [Playwright: Installation](https://playwright.dev/docs/intro) *(doc)* — `npm init playwright`, the generated files, the Node.js versions, the report and UI Mode.
3. [Next.js: How to set up Playwright with Next.js](https://nextjs.org/docs/app/guides/testing/playwright) *(doc)* — The `with-playwright` example and the recommendation to test against a production build.
4. [Playwright: Configuration](https://playwright.dev/docs/test-configuration) *(doc)* — The `defineConfig` fields and the `use` options.
5. [Playwright: Timeouts](https://playwright.dev/docs/test-timeouts) *(doc)* — The 30-second default for a test and the 5-second one for an assertion.
6. [Playwright: Release notes 1.64](https://playwright.dev/docs/release-notes#version-164) *(doc)* — `TestProject.default`, `--project="*"` and `--shuffle`.
7. [Playwright: Web server](https://playwright.dev/docs/test-webserver) *(doc)* — `webServer`, `reuseExistingServer` and `timeout`.
8. [Playwright: Running and debugging tests](https://playwright.dev/docs/running-tests) *(doc)* — The file, title and project filters.
9. [Playwright: VS Code](https://playwright.dev/docs/getting-started-vscode) *(doc)* — Running and debugging tests with the extension.
