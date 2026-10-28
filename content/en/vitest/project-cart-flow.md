---
title: "Cart flow"
description: "A full flow test from the product list to the cart."
lastVerified: "2026-10-14"
translationKey: "vitest/project-cart-flow"
---

## Scenario

In this step you bring all the earlier pieces together. The user opens the store page. They see the products, add them to the cart, check the total and remove one product.

| Part | Its job | Where you learned it |
| --- | --- | --- |
| `ProductList` | Loads the products from the API and shows them. | Product List |
| `CartProvider` | Shares the cart state. | Provider and Hook |
| `CartBadge` | Shows the number of items in the cart. | Provider and Hook |
| `CartSummary` | Shows the items and the total. | Provider and Hook |
| MSW | Imitates the API response. | Mock |

The working project is on GitHub: [examples/vitest/project](https://github.com/virastack/academy/tree/main/examples/vitest/project). Compare against it when you get stuck.

## The page

```tsx
import { CartBadge, CartSummary } from "./cart-components";
import { useCart } from "./cart-context";
import { fetchProducts } from "./fetch-products";
import { ProductList } from "./ProductList";

export function ShopPage() {
  const { addToCart } = useCart();

  return (
    <>
      <CartBadge />
      <ProductList loadProducts={fetchProducts} onAddToCart={addToCart} />
      <CartSummary />
    </>
  );
}
```

The page uses the real `fetchProducts` function. In the test, MSW provides the API response. No component is mocked. This is an **integration test**.

## Tests

```tsx
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { server } from "./mocks/server";
import { ShopPage } from "./ShopPage";
import { renderWithProviders } from "./test-utils";
```

In MSW 3, `http` and `HttpResponse` are imported from the `msw/http` path.[^1]

### Step 1: Adding to the cart, and the total

The topics: MSW, `within`,[^2] `findByRole`,[^3] `userEvent`, Context.

```tsx
describe("ShopPage", () => {
  test("the user adds products to the cart and sees the total", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShopPage />);

    const keyboard = await screen.findByRole("article", {
      name: "Mechanical Keyboard",
    });
    await user.click(
      within(keyboard).getByRole("button", { name: "Add to cart" }),
    );
    await user.click(
      within(keyboard).getByRole("button", { name: "Add to cart" }),
    );

    const headphones = screen.getByRole("article", {
      name: "Wireless Headphones",
    });
    await user.click(
      within(headphones).getByRole("button", { name: "Add to cart" }),
    );

    expect(screen.getByRole("link", { name: "Cart (3)" })).toBeInTheDocument();

    const summary = screen.getByRole("region", { name: "Cart summary" });
    expect(within(summary).getByText("Mechanical Keyboard × 2")).toBeInTheDocument();
    expect(
      within(summary).getByText("Wireless Headphones × 1"),
    ).toBeInTheDocument();
    expect(within(summary).getByText("Total: €5,697.00")).toBeInTheDocument();
  });
```

Check the arithmetic: 2 × 2,199 + 1,299 = 5,697. Work the expected value out by hand. Do not compute it with the formula from the code.

> [!TIP]
>
> The accessible name of the `article` and `region` roles comes from the label you give, not from their content. That is why `ProductCard` has to have `aria-labelledby` and `CartSummary` an `aria-label`. Without a label, a query with `name` does not match.[^4]

### Step 2: Removing from the cart

The topics: the accessible name (`aria-label`) and the cart emptying.

```tsx
  test("the user removes a product from the cart", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShopPage />);

    const keyboard = await screen.findByRole("article", {
      name: "Mechanical Keyboard",
    });
    await user.click(
      within(keyboard).getByRole("button", { name: "Add to cart" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Remove Mechanical Keyboard from cart",
      }),
    );

    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cart (0)" })).toBeInTheDocument();
  });
```

### Step 3: An out-of-stock product

The topics: `toBeVisible` and `toBeDisabled`.[^5]

```tsx
  test("an out-of-stock product cannot be added to the cart", async () => {
    renderWithProviders(<ShopPage />);

    const mouse = await screen.findByRole("article", { name: "Gaming Mouse" });

    expect(within(mouse).getByText("Out of stock")).toBeVisible();
    expect(
      within(mouse).getByRole("button", { name: "Add to cart" }),
    ).toBeDisabled();
  });
```

### Step 4: An API error

The topic: a different response for a single test with `server.use`.[^6]

```tsx
  test("the cart keeps working when the API fails", async () => {
    server.use(
      http.get(
        "https://api.shop.test/products",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    renderWithProviders(<ShopPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Products could not be loaded.",
    );
    expect(screen.getByRole("link", { name: "Cart (0)" })).toBeInTheDocument();
    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
  });
});
```

## Why is this a good test?

> [!DO]
>
> - It behaves like a user: it searches, clicks and sees the result.[^7]
> - It knows nothing about the components' internals. It does not break when you refactor the code.
> - Only the network boundary is mocked. The components really do work together.[^8]
> - It covers the successful flow and the error flow together.

## The whole guide in one table

| Topic | The rule |
| --- | --- |
| Queries | Start with `getByRole`.[^3] |
| Absence | Use `queryBy`.[^3] |
| Waiting | Use `findBy`.[^3] |
| Interaction | `userEvent.setup()`, and `await` on every call. |
| Mocking | Mock the boundaries only: the network, analytics, a browser API.[^8] |
| Providers | Write a `renderWithProviders` helper. |
| Errors | Read the message, use `screen.debug()`. |

## Try it yourself

Add a **Decrease** button to the cart. Write the test first:

- Add a `decreaseQuantity(productId)` function to `CartProvider`. When the quantity is 1, it should take the product out of the cart.
- In `CartSummary`, show a button for every product whose accessible name is **"decrease <product name> quantity"**.
- The test: with 2 **Mechanical Keyboard** in the cart, clicking **Decrease** shows **Mechanical Keyboard × 1**. On the second click the product leaves the list and **Your cart is empty.** appears.

## Sources

1. [MSW: Migrating from 2.x to 3.x](https://mswjs.io/docs/migrations/2.x-to-3.x) *(doc)* — The `msw/http` import path for `http` and `HttpResponse`.
2. [Testing Library: within](https://testing-library.com/docs/dom-testing-library/api-within) *(doc)* — Narrowing a query to inside a single element.
3. [Testing Library: About Queries](https://testing-library.com/docs/queries/about) *(doc)* — The priority of `getByRole`, absence with `queryBy` and waiting with `findBy`.
4. [WAI-ARIA 1.2: Roles](https://www.w3.org/TR/wai-aria-1.2/#article) *(doc)* — The name of the `article` and `region` roles comes from the author, and `region` requires one.
5. [jest-dom](https://github.com/testing-library/jest-dom) *(repo)* — The rules of the `toBeVisible` and `toBeDisabled` matchers.
6. [MSW: server.use()](https://mswjs.io/docs/api/setup-server/use) *(doc)* — Adding a handler at runtime.
7. [Testing Library: Guiding Principles](https://testing-library.com/docs/guiding-principles) *(doc)* — The more your tests resemble the way your software is used, the more confidence they give you.
8. [Vitest: Mocking Requests](https://vitest.dev/guide/mocking/requests) *(doc)* — Mocking network requests with MSW.
