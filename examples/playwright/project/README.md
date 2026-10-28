# An orders panel

The working version of the project lesson in the [Playwright guide](https://virastack.com/academy/playwright/project). The lesson has this application's tests written step by step; compare against it when you get stuck.

A small Next.js application: a sign-in page, a session cookie, an orders table loaded and filtered with TanStack Query, and an admin cancelling an order. The tests are written with Playwright.

There is no real database. The orders are kept in the server's memory and every session starts with its own copy. Restart the server and everything resets.

The demo accounts, with the password `password123`:

| Email | Role |
| :-- | :-- |
| admin@example.com | Admin, can cancel an order that is being prepared |
| viewer@example.com | Viewer, can only look |

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## The tests

```bash
npx playwright install chromium
npm test
```

`npm test` takes a production build first, starts the server and runs the tests. For the report, `npx playwright show-report`.

| File | What it teaches |
| :-- | :-- |
| `tests/auth.setup.ts` | Signing in once with a setup project and saving the session under `playwright/.auth/` |
| `tests/pages/` | The Page Object Model |
| `tests/fixtures.ts` | Handing page objects over as fixtures |
| `tests/login.spec.ts` | Tests with no session, the redirect, a form error |
| `tests/orders.spec.ts` | Listing, filtering, `Locator.within()`, an aria snapshot |
| `tests/cancel-order.spec.ts` | Running a test that changes data in its own session |
| `tests/viewer.spec.ts` | A second role, and a permission check through an API request |
| `tests/mocking.spec.ts` | An error, an empty list, changing a response and a loading state with `page.route` |
| `tests/accessibility.spec.ts` | An accessibility scan with axe |
| `tests/orders.visual.ts` | A screenshot comparison *(it does not run by default)* |

The visual test sits in a separate project with `default: false`. Create the reference image on the first run, then compare:

```bash
npx playwright test --project=visual --update-snapshots=missing
npx playwright test --project=visual
```

Reference images are written to separate files per operating system. That is why there is no ready-made image in the folder.

`.github/workflows/playwright.yml` is a GitHub Actions workflow you can use as it is. Copy the project into your own repository and it runs the tests on every push.
