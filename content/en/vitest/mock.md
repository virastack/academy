---
title: "Mock"
description: "vi.fn, vi.mock and mocking an API with MSW."
lastVerified: "2026-10-14"
translationKey: "vitest/mock"
---

## What is a mock?

A mock is a test copy standing in for a real dependency. It puts the test under your control. You do not use a real network request, a real analytics service or a real timer.

### What should you mock?

> [!DO]
>
> - Network requests (API calls).
> - Analytics and logging services.
> - APIs that are missing in the browser or have a side effect (`window.open`, `navigator.sendBeacon`).
> - Time (`setTimeout`, `Date`).

> [!DONT]
>
> - Your own child components. The user sees them on screen as they really are.
> - The component under test itself.
> - React or Testing Library functions.

## vi.fn: a fake function

`vi.fn()` produces a function that records its calls. It is used to test callback props. You used it for `onAddToCart` and `onApply` in the earlier steps.

| Code | Meaning |
| --- | --- |
| `vi.fn()` | An empty fake function. Returns `undefined`. |
| `vi.fn().mockReturnValue(5)` | Returns `5` on every call. |
| `vi.fn().mockResolvedValue(data)` | Returns `Promise.resolve(data)`. For async functions. |
| `vi.fn().mockRejectedValue(new Error("error"))` | Returns a rejected Promise. |

For the return values in this table, see the Vitest documentation.[^1]

```tsx
const loadProducts = vi.fn().mockResolvedValue(products);

render(<ProductList loadProducts={loadProducts} onAddToCart={vi.fn()} />);
await screen.findAllByRole("article");

expect(loadProducts).toHaveBeenCalledTimes(1);
```

| Check | Meaning |
| --- | --- |
| `toHaveBeenCalled()` | It was called at least once. |
| `toHaveBeenCalledTimes(n)` | It was called exactly `n` times. |
| `toHaveBeenCalledWith(...)` | It was called with these arguments at least once. |
| `not.toHaveBeenCalled()` | It was never called. |

## vi.mock: mocking a module

The product button sends an analytics event on every click:

```tsx
import { trackEvent } from "./analytics";
import type { Product } from "./types";

type AddToCartButtonProps = {
  product: Product;
  onAdd: (product: Product) => void;
};

export function AddToCartButton({ product, onAdd }: AddToCartButtonProps) {
  function handleClick() {
    onAdd(product);
    trackEvent("add_to_cart", { productId: product.id });
  }

  return (
    <button type="button" onClick={handleClick}>
      Add to cart
    </button>
  );
}
```

The `trackEvent` function calls `navigator.sendBeacon`. jsdom does not provide that API, so without a mock the test fails. Mock the module:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddToCartButton } from "./AddToCartButton";
import { trackEvent } from "./analytics";
import type { Product } from "./types";

vi.mock(import("./analytics"));

const keyboard: Product = {
  id: 2,
  name: "Mechanical Keyboard",
  price: 2199,
  inStock: true,
};

test("adds the product and sends the analytics event", async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(<AddToCartButton product={keyboard} onAdd={onAdd} />);

  await user.click(screen.getByRole("button", { name: "Add to cart" }));

  expect(onAdd).toHaveBeenCalledWith(keyboard);
  expect(trackEvent).toHaveBeenCalledWith("add_to_cart", { productId: 2 });
});
```

If you do not pass a factory function, Vitest loads the original module and mocks everything it exports automatically. The methods return `undefined`.[^2] The `import("./analytics")` form has TypeScript check the path for typos. If the file moves, the path and the types are updated together.[^2]

> [!WARNING]
>
> Vitest moves the `vi.mock` call to the top of the file (hoisting). Wherever you write the call, it runs before the imports. That is why you write it at the file's **top level**. Inside the mock's `factory` function you cannot use the other variables in the file.[^2]

> [!TIP]
>
> By default Vitest clears the mock call history before every test (`clearMocks`), so a call count in one test does not affect another.[^3]

<details>
<summary>spyOn and restoreAllMocks</summary>

- `vi.spyOn(object, "method")` watches an existing method. For example: `vi.spyOn(window, "open").mockImplementation(() => null)`. That lets you test that the "Share" button opens a new window.
- `vi.restoreAllMocks()` restores only the spies created with `vi.spyOn`. It does not affect automatically mocked modules.[^4]
- To undo the spy after every test, write `afterEach(() => vi.restoreAllMocks())`.

</details>

## MSW: mocking the network request

The products come from an API. Instead of mocking the `fetch` function by hand, use MSW ([Mock Service Worker](https://mswjs.io)).[^5] MSW intercepts the network request and returns a fake response.[^6][^7] Your application code keeps using the real `fetch`.

Write the API call first:

```ts
import type { Product } from "./types";

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("https://api.shop.test/products");

  if (!response.ok) {
    throw new Error("Products could not be loaded.");
  }

  return response.json();
}
```

> [!WARNING]
>
> Do not use a relative URL such as `fetch("/products")` in a test. In the Node environment a relative URL cannot be resolved and the request fails. Use the full URL.

Install the package:[^8]

```command
npm install -D msw
```

Define the default responses in `src/mocks/handlers.ts`. In MSW 3, `http` and `HttpResponse` come from the `msw/http` path:[^9]

```ts
import { http, HttpResponse } from "msw/http";
import type { Product } from "../types";

export const products: Product[] = [
  { id: 1, name: "Wireless Headphones", price: 1299, oldPrice: 1499, inStock: true },
  { id: 2, name: "Mechanical Keyboard", price: 2199, inStock: true },
  { id: 3, name: "Gaming Mouse", price: 899, inStock: false },
];

export const handlers = [
  http.get("https://api.shop.test/products", () =>
    HttpResponse.json(products),
  ),
];
```

Create the server in `src/mocks/server.ts`:

```ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

Start the server in `src/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

| Line | Its job |
| --- | --- |
| `onUnhandledFrame: "error"` | A request with no handler fails. You never hit the real API by accident.[^10] |
| `resetHandlers()` | Deletes the temporary handlers added in a test. The tests do not affect each other. |

> [!NOTE]
>
> If you use MSW 2.x, the option is called `onUnhandledRequest`, and `http` and `HttpResponse` are imported from the `msw` package directly.[^9]

Now use the `fetchProducts` function itself:

```tsx
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { fetchProducts } from "./fetch-products";
import { server } from "./mocks/server";
import { ProductList } from "./ProductList";

test("shows the products from the API", async () => {
  render(<ProductList loadProducts={fetchProducts} onAddToCart={vi.fn()} />);

  expect(await screen.findAllByRole("article")).toHaveLength(3);
});

test("shows the empty state when the API returns an empty list", async () => {
  server.use(
    http.get("https://api.shop.test/products", () => HttpResponse.json([])),
  );

  render(<ProductList loadProducts={fetchProducts} onAddToCart={vi.fn()} />);

  expect(await screen.findByText("No products found.")).toBeInTheDocument();
});
```

`server.use` adds the new handler in front of the existing ones. That handler stays until `resetHandlers` is called.[^11] This is why the `resetHandlers` call in `afterEach` is needed.

> [!TIP]
>
> You can use the same handlers in the browser for the development environment too. That topic is outside this guide's scope.

## Which one should I use?

| Situation | Tool |
| --- | --- |
| A callback prop | `vi.fn()` |
| Analytics, a logger, a browser API | `vi.mock` or `vi.spyOn` |
| An API call | MSW |
| `setTimeout`, `Date` | Fake timers.[^12] |

## Try it yourself

What happens when the API returns a 500? Test that:

- With `server.use`, add a handler for `https://api.shop.test/products` that returns `new HttpResponse(null, { status: 500 })`.
- Render the `ProductList` component with `fetchProducts`.
- Confirm the **Products could not be loaded.** message with `findByRole("alert")`.

## Sources

1. [Vitest: Mock Functions](https://vitest.dev/api/mock) *(doc)* — The behaviour of `mockReturnValue`, `mockResolvedValue` and `mockRejectedValue`.
2. [Vitest: Mocking Modules](https://vitest.dev/guide/mocking/modules) *(doc)* — `vi.mock` hoisting, the automatic mocking rules and the `import()` form.
3. [Vitest: clearMocks](https://vitest.dev/config/clearmocks) *(doc)* — The `vi.clearAllMocks()` call before every test, and the default value.
4. [Vitest: vi](https://vitest.dev/api/vi) *(doc)* — The behaviour of `vi.spyOn`, `vi.restoreAllMocks` and `mockImplementation`.
5. [Kent C. Dodds: Stop mocking fetch](https://kentcdodds.com/blog/stop-mocking-fetch) *(article)* — The code samples use MSW v1 and Jest. The idea of mocking at the network boundary is the same as this lesson's.
6. [Vitest: Mocking Requests](https://vitest.dev/guide/mocking/requests) *(doc)* — Setting MSW up, `onUnhandledRequest` and the server lifecycle.
7. [Artem Zakharchenko: Mock Service Worker 2.0](https://gitnation.com/contents/a-sneak-peek-into-mock-service-worker-20) *(video)* — How MSW intercepts the request and returns a fake response. The talk covers version 2.0.
8. [MSW: Quick start](https://mswjs.io/docs/quick-start) *(doc)* — Installation, defining handlers, `setupServer` and the Vitest setup file.
9. [MSW: Migrating from 2.x to 3.x](https://mswjs.io/docs/migrations/2.x-to-3.x) *(doc)* — The `msw/http` import path, the `onUnhandledFrame` name and the Node 22 requirement.
10. [MSW: server.listen()](https://mswjs.io/docs/api/setup-server/listen) *(doc)* — The `onUnhandledFrame` option and the `"error"` strategy.
11. [MSW: server.use()](https://mswjs.io/docs/api/setup-server/use) *(doc)* — Adding a handler at runtime, and how long it lasts.
12. [Vitest: Mocking](https://vitest.dev/guide/mocking) *(doc)* — Mocking time, and `Date` changing with `vi.useFakeTimers`.
