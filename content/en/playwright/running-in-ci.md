---
title: "Running in CI"
description: "GitHub Actions, sharding and flaky tests."
lastVerified: "2026-10-22"
translationKey: "playwright/running-in-ci"
---

## Why CI?

End-to-end tests that are run locally now and then get forgotten. Tests that run automatically on every push and every pull request catch a broken flow before it is merged. In this lesson we use [!github] Actions; the steps are the same on the other CI services.[^1]

## The workflow

If you picked GitHub Actions while running `npm init playwright`, the file is ready. This is how it looks in this guide's project:[^1][^2]

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      - name: Run Playwright tests
        run: npm test
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

Step by step:

- `npm ci` installs exactly what the lock file says.
- `npx playwright install --with-deps chromium` installs the browser and the Linux system dependencies. Installing only the browser you use shortens the run.[^2]
- `npm test` runs `playwright test`. `webServer` builds and starts the application *(see [Setup](/academy/playwright/setup))*.
- `if: ${{ !cancelled() }}` makes sure the report is uploaded even when the tests fail. The moment you really need it is the moment they failed.[^1]
- `timeout-minutes` stops a stuck job from running for many minutes.

## The configuration for CI

The generated configuration behaves differently in CI through `process.env.CI`. GitHub Actions defines that variable itself.[^3]

```ts
// playwright.config.ts
export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

| Setting | Why in CI |
| :-- | :-- |
| `forbidOnly` | So a forgotten `test.only` does not silently skip the other tests |
| `retries: 2` | A failing test is retried; the trace is recorded on that retry |
| `workers: 1` | The Playwright documentation recommends a single worker in CI for stability and repeatability |
| The `github` reporter | Writes the errors as annotations next to the relevant line in the pull request |
| `reuseExistingServer: false` | A clean server always starts in CI |

If a single worker feels slow, you can raise the worker count on a powerful CI machine, or split the tests across several machines.[^3]

## Examining the report and the trace

When a test fails, download `playwright-report` from the **Artifacts** section on the Actions run's summary page, then open and run it:[^1]

```command
npx playwright show-report playwright-report
```

Thanks to `retries: 2` and `trace: "on-first-retry"`, the trace of the failing test's retry is in the report. Without trying to reproduce the test on your own machine, you see exactly what happened in CI *(see [Debugging with a trace](/academy/playwright/debugging-with-trace))*.

> [!TIP]
>
> You can also look without downloading the report. Drag a single `trace.zip` onto [trace.playwright.dev](https://trace.playwright.dev); the file opens in your browser and is not sent anywhere.

## Should you cache the browser?

The first optimisation that comes to mind is caching the browsers. The Playwright documentation does not recommend it: restoring the cache takes as long as downloading, and on Linux the system dependencies cannot be cached anyway.[^3] The `cache: npm` setting of `actions/setup-node`, on the other hand, caches the npm packages and is worth it.

## Sharding: splitting the tests across machines

Once the test suite grows, one machine is not enough. `--shard` splits the tests into pieces; every piece runs in its own job:[^4]

```yaml
jobs:
  playwright-tests:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      # checkout, setup-node, npm ci, playwright install
      - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: blob-report
          retention-days: 1
```

Every piece produces its own report. To merge them into a single HTML report, use the `blob` reporter in CI and merge them in a separate job:[^4]

```ts
reporter: process.env.CI ? "blob" : "html",
```

```command
npx playwright merge-reports --reporter html ./all-blob-reports
```

In the documentation's full example, the `merge-reports` job waits for the pieces with `needs: [playwright-tests]`, downloads the blob reports into one folder with `actions/download-artifact` and uploads the merged report.[^4] `fail-fast: false` lets the other pieces finish even when one of them fails.

## More than one browser

If you want only Chromium locally and all the browsers in CI, give the other projects `default: false` and select them all in CI:[^5]

```yaml
- run: npx playwright install --with-deps
- run: npx playwright test --project="*"
```

## Flaky tests

A test that sometimes passes and sometimes fails is flaky. In the data Google's testing team shared in 2016, they write that about 1.5 percent of test runs give a flaky result, and about 16 percent of their tests have some flakiness. About 84 percent of the observed "was passing, then failed" transitions come from a flaky test.[^6] In other words, a red CI usually not being a real bug means the team learns not to trust red.

`retries` does not hide flakiness, it reports it. If a test fails on the first attempt and passes on the retry, the report marks it as **flaky**.[^7] Do not ignore that mark:

- Open the trace and find the reason. Usually it is a timing assumption, shared data, or state left behind by an earlier test *(see [Assertions and waiting](/academy/playwright/assertions-and-waiting), [Auth and fixtures](/academy/playwright/auth-and-fixtures))*.
- Reproduce it locally with `--repeat-each` and `--shuffle`.
- If you want no tolerance for flakiness at all, count flaky tests as failures with `--fail-on-flaky-tests`.[^8]

[Martin Fowler](https://martinfowler.com/) recommends putting flaky tests into a **quarantine**: take them off the main line so the confidence in the solid tests is not spoiled, but keep the quarantine small and fix the tests quickly; a test in quarantine catches no bugs.[^9] In Playwright you can do that with a tag and `--grep-invert`:

```ts
test("an occasionally failing test", { tag: "@quarantine" }, async ({ page }) => {
  // ...
});
```

```command
npx playwright test --grep-invert @quarantine
```

> [!CAUTION]
>
> A quarantine is not a car park but a waiting room. Open a work item for every test in quarantine, and give it a deadline.

## Try it yourself

- Add the workflow to your project and open a pull request. Break a test on purpose and find the annotation the `github` reporter writes on the line.
- Download the failing run's report and open its trace.
- Run the tests locally in two pieces, with `--shard=1/2` and `--shard=2/2`. Does the total test count add up?
- Tag a test with `@quarantine` and exclude it with `--grep-invert`.

## Going deeper

- **Official docs:** Playwright, "Setting up CI"; the GitHub Actions workflow and examining the report.[^1]
- **Official docs:** Playwright, "Sharding"; splitting into pieces and merging the reports.[^4]
- **Article:** Google Testing Blog, "Flaky Tests at Google and How We Mitigate Them"; the scale of flaky tests and Google's measures.[^6]
- **Article:** [Martin Fowler](https://martinfowler.com/), "Eradicating Non-Determinism in Tests"; quarantine and the causes of flakiness.[^9]

## Sources

1. [Playwright: Setting up CI](https://playwright.dev/docs/ci-intro) *(doc)* — The GitHub Actions workflow, uploading the report as an artifact and examining it.
2. [Playwright: Browsers](https://playwright.dev/docs/browsers) *(doc)* — Installing a single browser, and the system dependencies with `--with-deps`.
3. [Playwright: Continuous Integration](https://playwright.dev/docs/ci) *(doc)* — The worker count in CI, the `CI` variable and not caching the browsers.
4. [Playwright: Sharding](https://playwright.dev/docs/test-sharding) *(doc)* — `--shard`, the blob reporter, `merge-reports` and the GitHub Actions example.
5. [Playwright: Release notes 1.64](https://playwright.dev/docs/release-notes#version-164) *(doc)* — `TestProject.default` and `--project="*"`.
6. [Google](https://testing.googleblog.com/): [Testing Blog: Flaky Tests at Google and How We Mitigate Them](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html) *(article)* — May 27, 2016, John Micco. The proportion of flaky tests and the ways to reduce them.
7. [Playwright: Retries](https://playwright.dev/docs/test-retries) *(doc)* — Retrying and the flaky mark.
8. [Playwright: Command line](https://playwright.dev/docs/test-cli) *(doc)* — `--fail-on-flaky-tests`, `--grep-invert` and `--shard`.
9. [Martin Fowler](https://martinfowler.com/): [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html) *(article)* — April 14, 2011. Quarantining flaky tests, and the causes.
