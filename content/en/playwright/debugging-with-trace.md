---
title: "Debugging with a trace"
description: "UI Mode, the Inspector, traces and flaky tests."
lastVerified: "2026-10-22"
translationKey: "playwright/debugging-with-trace"
---

## Read the error message first

The output of a failing test usually tells you the problem. This is the error from getting the order count wrong on purpose in this guide's project:

```bash
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('table', { name: 'Order list' }).getByRole('row').filter({ has: getByRole('cell') })
Expected: 7
Received: 6
Timeout:  2000ms

Call log:
  - waiting for getByRole('table', { name: 'Order list' }).getByRole('row')...
    6 × locator resolved to 0 elements
    14 × locator resolved to 6 elements
```

The call log tells the story: the table was empty at first *(the list was loading)*, then 6 rows arrived and it never became 7. The locator is right, the expectation is wrong. If the "0 elements" line had never ended, you would be questioning the locator.

The error also produces an **error-context** file: `test-results/<test>/error-context.md`. It holds the test's name, the error and the page's aria snapshot at that moment. The file is written so it can be handed to an AI assistant with "why did this fail, what is the fix"; reading it yourself, it also shows you quickly what was on the page.

## UI Mode

While writing tests, the most productive tool is UI Mode:[^1]

```command
npx playwright test --ui
```

- You pick tests from a list and run them; there is a watch mode that re-runs them when a file changes.
- Every step appears on a timeline. Click a step and you see the page as it was at that moment.
- With "Pick locator" you get the locator of an element on the page.
- The console, the network requests and the error are all on the same screen.

## Step by step with the Inspector

`--debug` starts the test in a visible browser and opens the Playwright Inspector. It pauses before every action; you step forward, edit the locator live and see which elements it matches.[^2]

```command
npx playwright test tests/orders.spec.ts:13 --debug
```

The `:13` after the file name runs only the test on that line. To pause at a particular point in the test, add `await page.pause()` to the code. The [!vscode] extension does the same with breakpoints.[^2]

The **actionability log** in the Inspector tells you why an action is waiting: things like "element is not visible", "element is not enabled", "another element would receive the click" *(see [Assertions and waiting](/academy/playwright/assertions-and-waiting))*.[^2]

## What is a trace?

A trace is the full recording of a test run: every action, the DOM before and after it, the network requests, the console messages, the source code line. It lets you examine a test that failed in CI **without running it again** on your own machine. The Playwright documentation recommends a trace over video and screenshots for CI failures.[^3]

## Recording a trace

`use.trace` decides which run records a trace:[^4]

| Mode | Records | Keeps |
| :-- | :-- | :-- |
| `"off"` | Never | — |
| `"on"` | On every run | Always |
| `"retain-on-failure"` | On every run | If the run failed |
| `"retain-on-first-failure"` | Only on the first run | If the first run failed |
| `"on-first-retry"` | Only on the first retry | Always |
| `"on-all-retries"` | On every retry | Always |

The generated configuration uses `"on-first-retry"`. Because CI has `retries: 2`, a failing test runs once more and that run is recorded. The documentation does not recommend `"on"` for every test; recording a trace slows the tests down.[^3]

> [!NOTE]
>
> Locally, `retries: 0` means `"on-first-retry"` never produces a trace. If you want a trace locally, turn it on from the command line:
>
> ```command
> npx playwright test --trace on
> ```

Traces are opened from the HTML report, or directly:[^5]

```command
npx playwright show-trace test-results/orders-filters-by-status-chromium/trace.zip
```

[trace.playwright.dev](https://trace.playwright.dev) is the web version of the same viewer. You drag and drop the file; the trace opens entirely in your browser and is not sent anywhere.[^5]

## What to look at in the trace viewer

| Tab | What it shows |
| :-- | :-- |
| Actions | Every action, its locator and its duration; the page on hover |
| Snapshots | Before, during and after the action; the clicked point is marked |
| Source | The action's line in the test file |
| Call / Log | The action's parameters and the actionability steps |
| Errors | The error message and where it is |
| Console | The browser and test console |
| Network | Every request, its status code and its response body |

The snapshots are not screenshots but DOM copies. You can inspect them with the developer tools and try locators on them.[^5]

With Playwright 1.63 an aria snapshot and a screenshot can be added to the trace too. "Display Aria" mode shows the screenshot and the accessibility tree side by side:[^6]

```ts
use: {
  trace: {
    mode: "retain-on-failure",
    snapshots: { dom: true, aria: true, screen: true },
  },
},
```

## Your own steps

In long tests, `test.step` makes the report and the trace readable. The steps appear with their titles in the report and in the Trace Viewer.[^7]

```ts
test("an admin cancels the order", async ({ loginPage, ordersPage }) => {
  await test.step("sign in", async () => {
    await loginPage.goto();
    await loginPage.login("admin@example.com");
  });

  await test.step("Cancel SP-1001", async () => {
    await ordersPage.cancel("SP-1001");
  });
});
```

## Catching a flaky test

A test that sometimes fails and sometimes passes is called **flaky**. One run does not catch it. Two options help:[^8][^9]

```command
npx playwright test --repeat-each=10
```

```command
npx playwright test --shuffle
```

`--repeat-each` runs every test N times; timing-dependent bugs come out. `--shuffle` *(1.64)* runs the tests in a random order and finds tests that secretly depend on each other. You can reproduce the same order by passing the seed from the output, as in `--shuffle 271828182`.[^9]

In this guide's project, `--shuffle --repeat-each=3 --workers=4` failed one test: an earlier `beforeEach` was navigating the page to `/orders` while the test went to `/login`, and the two navigations collided. The error only appeared in a particular order. The fix was to move the test that changes the data into its own file, with no shared `beforeEach`.

To run the last failing tests again:[^8]

```command
npx playwright test --last-failed
```

## Try it yourself

- Get an assertion wrong on purpose. Read the call log, then open the `error-context.md` file.
- Run with `npx playwright test --trace on`, open the report and go into a test's trace. Find the response of the `/api/orders` request in the Network tab.
- Add `await page.pause()` to a test and run it with `--headed`. Change the locator in the Inspector and look at which elements it matches.
- Run your test suite with `--shuffle --repeat-each=5`. Is any test failing?

## Going deeper

- **Official docs:** Playwright, "Trace viewer"; recording a trace, opening it and all the tabs.[^5]
- **Official docs:** Playwright, "Debugging Tests"; the Inspector, VS Code and the verbose API logs.[^2]
- **Official docs:** Playwright, "UI Mode"; watch mode and the timeline.[^1]

## Sources

1. [Playwright: UI Mode](https://playwright.dev/docs/test-ui-mode) *(doc)* — Watch mode, the timeline, picking locators and the network tab.
2. [Playwright: Debugging Tests](https://playwright.dev/docs/debug) *(doc)* — `--debug`, the Inspector, `page.pause()`, the actionability logs and VS Code.
3. [Playwright: Best Practices](https://playwright.dev/docs/best-practices) *(doc)* — The trace recommendation for CI failures, and the cost of the `on` mode.
4. [Playwright: Configuration (use)](https://playwright.dev/docs/test-use-options) *(doc)* — The table of trace and video modes.
5. [Playwright: Trace viewer](https://playwright.dev/docs/trace-viewer) *(doc)* — `show-trace`, trace.playwright.dev and the viewer's tabs.
6. [Playwright: Release notes 1.63](https://playwright.dev/docs/release-notes#version-163) *(doc)* — Aria and screen snapshots in a trace, and Display Aria mode.
7. [Playwright: Test.step](https://playwright.dev/docs/api/class-test#test-step) *(doc)* — Grouping the steps in the report and in the trace.
8. [Playwright: Command line](https://playwright.dev/docs/test-cli) *(doc)* — `--repeat-each`, `--last-failed` and the other options.
9. [Playwright: Release notes 1.64](https://playwright.dev/docs/release-notes#version-164) *(doc)* — `--shuffle` and reproducing the order with a seed.
