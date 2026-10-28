---
title: "API mocking"
description: "page.route, changing the response and the request fixture."
lastVerified: "2026-10-22"
translationKey: "playwright/api-mocking"
---

## Why mock?

The real server usually will not give you the state you want. You do not want to break the database for a server error, an empty list, a very long customer name or a slow response. Playwright can intercept every request the browser makes and return the response you want.[^1]

The Playwright documentation also recommends not testing third-party services you do not control, and guaranteeing their responses with the network API instead.[^2] [Martin Fowler](https://martinfowler.com/) counts remote services among the main sources of flaky tests too, and recommends getting specific responses with test doubles.[^3]

## A fake response with page.route

`page.route` takes a URL pattern and a handler. `route.fulfill` answers the request without ever sending it to the server:[^1]

```ts
test("empty list message", async ({ page, ordersPage }) => {
  await page.route("**/api/orders?*", (route) => route.fulfill({ json: { orders: [] } }));

  await ordersPage.goto();
  await expect(ordersPage.empty).toBeVisible();
});
```

Set the rule up **before** you go to the page. The first request, made while the page loads, is then intercepted too.[^1]

When you pass `json`, the `Content-Type` header is added for you. For an error state, pass `status`:

```ts
await page.route("**/api/orders?*", (route) =>
  route.fulfill({ status: 500, json: { error: "Server error" } }),
);
```

## An error and a retry

The order list in this guide's project is loaded with [!tanstack-query]; on an error it shows "Orders could not be loaded." and a "Try again" button. In the test you produce the error first, then remove the rule and press the button:

```ts
test("error state and retry on a server error", async ({ page, ordersPage }) => {
  await page.route("**/api/orders?*", (route) =>
    route.fulfill({ status: 500, json: { error: "Server error" } }),
  );

  await ordersPage.goto();
  await expect(ordersPage.loadError).toBeVisible();

  await page.unroute("**/api/orders?*");
  await ordersPage.loadError.getByRole("button", { name: "Try again" }).click();

  await expect(ordersPage.rows).toHaveCount(6);
});
```

> [!NOTE]
>
> By default TanStack Query retries a failed query 3 times, at growing intervals. The error screen then appears a few seconds later and can exceed the 5-second assertion time. In the project, `retry: 1` is set for the `QueryClient` *(see [TanStack Query](/academy/tanstack-query))*. Do not turn the retrying off in the application to make a test pass; look at whether the setting suits the real user.

## Changing the real response

Sometimes you want most of the response to stay real and only one field to change. `route.fetch` really makes the request; you change the response and return it with `fulfill`:[^1]

```ts
test("a long customer name does not break the table", async ({ page, ordersPage }) => {
  await page.route("**/api/orders?*", async (route) => {
    const response = await route.fetch();
    const { orders } = await response.json();
    orders[0].customer = "Wilhelmina Fitzgerald-Montgomery Vandersteen Verylongsurname";
    await route.fulfill({ response, json: { orders } });
  });

  await ordersPage.goto();
  await expect(ordersPage.row("SP-1001")).toContainText("Verylongsurname");
});
```

Passing `response` keeps the status code and the headers; only the body changes.

## The loading state

The loading screen is often so brief that an assertion cannot catch it. Instead of adding a delay with `page.waitForTimeout`, hold the response with a promise and let the test itself release it:

```ts
test("the loading state is visible", async ({ page, ordersPage }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));

  await page.route("**/api/orders?*", async (route) => {
    await gate;
    await route.continue();
  });

  await ordersPage.goto();
  await expect(ordersPage.loading).toBeVisible();

  release();
  await expect(ordersPage.rows).toHaveCount(6);
});
```

`route.continue()` sends the request to the server unchanged. Because it depends on an event rather than on a duration, the test behaves the same on every machine.

## The other actions

| Method | What it does |
| :-- | :-- |
| `route.fulfill()` | Answers without going to the server |
| `route.fetch()` | Makes the request and hands you the response |
| `route.continue()` | Sends the request; the headers, the method or the body can be changed |
| `route.abort()` | Cancels the request; imitates a network error |
| `page.unroute()` | Removes the rule |

You can also write rules such as blocking the images to speed a test up: `page.route("**/*.{png,jpg,jpeg}", (route) => route.abort())`.[^4]

## URL patterns

A glob pattern has to match the **whole** URL:[^4]

- `*` matches anything but a slash, `**` anything including slashes.
- `?` does not match any character, only a question mark itself.
- `{png,jpg}` matches one of the options.

The pattern `"**/api/orders"` does **not** match the request `/api/orders?status=all`; the query string is part of the URL too. This is why the project uses `"**/api/orders?*"`. For the complex cases, pass a regular expression: `page.route(/\/api\/orders(\?|$)/, …)`.

## Waiting for a response and checking it

To confirm that an action sent the right request, use `waitForResponse`. Start the waiter **before** the action, then await it:[^4]

```ts
const responsePromise = page.waitForResponse("**/api/orders/SP-1001/cancel");
await ordersPage.cancel("SP-1001");
const response = await responsePromise;
expect(response.status()).toBe(200);
```

In most cases you do not need to do this. Checking the result on screen *(did the row become "Cancelled")* both tests what the user sees and waits for the response indirectly.

## API testing without a browser

The `request` fixture makes an HTTP request without opening a browser. It is ideal for trying authorisation rules quickly, or for preparing data for a test.[^5]

```ts
test("a request without a session returns 401", async ({ request }) => {
  const response = await request.get("/api/orders");
  expect(response.status()).toBe(401);
});
```

`page.request`, on the other hand, shares the page's cookies; it makes the request on behalf of the signed-in user *(see [Auth and fixtures](/academy/playwright/auth-and-fixtures))*. With Playwright 1.63, a type parameter such as `request.get<User>(...)` types what `json()` returns.[^6]

## HAR files

Instead of mocking a large number of requests one by one, you can record the real traffic into a HAR file and replay it from there in the tests. `update: true` records, and without it the file is replayed:[^1]

```ts
await page.routeFromHAR("./hars/orders.har", {
  url: "**/api/orders?*",
  update: true,
});
```

Take the recording once, add the file to the repository, remove `update`. When the data changes, do not forget to refresh the recording.

## A limit in Next.js: server requests

`page.route` only sees the requests **the browser** makes. A `fetch` a Server Component or a Server Action makes on the server does not go through the browser; Playwright cannot intercept it.

In this guide's project the order list can be mocked because it is loaded in the browser with TanStack Query. Had the same list been fetched in a Server Component, the options would be:

- Running the tests against a separate environment filled with test data.
- Pointing the external service's address at a fake server with an environment variable.
- Testing the server-side logic separately with [Vitest](/academy/vitest).

> [!WARNING]
>
> If your application uses a Service Worker-based mocking tool such as Mock Service Worker *(MSW)*, that tool takes the requests over and `page.route` cannot see them. In that case the Playwright documentation recommends using Playwright's own routing in the tests, or turning the Service Workers off with `serviceWorkers: "block"`.[^4]

## Try it yourself

- Return a 500 for the order list and confirm the error message. Remove the `retry` setting and see how long the test takes.
- Take the real response with `route.fetch` and make one order's status "Shipped". Confirm that the table is updated accordingly.
- Write a test to see why the pattern `"**/api/orders"` does not match, then fix it with `"**/api/orders?*"`.
- With the `request` fixture, send a cancel request with no session and as the viewer role, and confirm the status codes.

## Going deeper

- **Official docs:** Playwright, "Mock APIs"; a fake response, changing a response and HAR.[^1]
- **Official docs:** Playwright, "Network"; the request events, the URL patterns and the Service Worker note.[^4]
- **Official docs:** Playwright, "API testing"; browserless testing with the `request` fixture.[^5]

## Sources

1. [Playwright: Mock APIs](https://playwright.dev/docs/mock) *(doc)* — `route.fulfill`, changing a response with `route.fetch`, and `routeFromHAR`.
2. [Playwright: Best Practices](https://playwright.dev/docs/best-practices) *(doc)* — Not testing third-party dependencies, and guaranteeing the response with the network API.
3. [Martin Fowler](https://martinfowler.com/): [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html) *(article)* — April 14, 2011. Remote services, test doubles and contract tests.
4. [Playwright: Network](https://playwright.dev/docs/network) *(doc)* — `route.abort`, `waitForResponse`, the glob patterns and Service Workers.
5. [Playwright: API testing](https://playwright.dev/docs/api-testing) *(doc)* — The `request` fixture and `APIRequestContext`.
6. [Playwright: Release notes 1.63](https://playwright.dev/docs/release-notes#version-163) *(doc)* — A typed `json()` on the request methods.
