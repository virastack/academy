---
title: "Basics"
description: "The first test, render, expect and matchers."
lastVerified: "2026-10-14"
translationKey: "vitest/basics"
---

## The shape of a test

A test has three steps. This shape is called **Arrange – Act – Assert (AAA)**.

| Step | What you do | Example |
| --- | --- | --- |
| Arrange | Prepare the component and render it. | `render(<ProductCard ... />)` |
| Act | Perform the user action. | `await user.click(button)` |
| Assert | Check the result. | `expect(...).toHaveBeenCalledWith(...)` |

In this step, add an **Add to cart** button to the `ProductCard` component:

```tsx
import { formatPrice } from "./format-price";
import type { Product } from "./types";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <article>
      <h2>{product.name}</h2>
      <p>{formatPrice(product.price)}</p>
      {product.inStock ? null : <p>Out of stock</p>}
      <button
        type="button"
        disabled={!product.inStock}
        onClick={() => onAddToCart(product)}
      >
        Add to cart
      </button>
    </article>
  );
}
```

Test that the `onAddToCart` function is called when the button is clicked:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "./ProductCard";

test("reports the product when Add to cart is clicked", async () => {
  // Arrange
  const user = userEvent.setup();
  const product = { id: 1, name: "Wireless Headphones", price: 1299, inStock: true };
  const onAddToCart = vi.fn();
  render(<ProductCard product={product} onAddToCart={onAddToCart} />);

  // Act
  await user.click(screen.getByRole("button", { name: "Add to cart" }));

  // Assert
  expect(onAddToCart).toHaveBeenCalledWith(product);
});
```

> [!CAUTION]
>
> `user.click` returns a Promise. Without `await`, the assertion runs before the click finishes and the test fails.

## test and describe

- `test` and `it` do the same job.[^1] **Pick one** and use it throughout the project.
- `describe` groups the tests of the same component.

```tsx
const headphones = { id: 1, name: "Wireless Headphones", price: 1299, inStock: true };

describe("ProductCard", () => {
  test("shows the product name and price", () => {
    render(<ProductCard product={headphones} onAddToCart={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Wireless Headphones" }),
    ).toBeInTheDocument();
    expect(screen.getByText("€1,299.00")).toBeInTheDocument();
  });
});
```

Write the test name as a *behaviour*. For example: `"disables the button for an out-of-stock product"`. Do not use names such as `"test 1"`.

## render and screen

`render` draws the component into the `document.body` area inside jsdom. React Testing Library cleans that area automatically after every test. Reach the elements after rendering with `screen`.[^2]

With `screen` you find elements through three query families: [!getBy], [!queryBy] and [!findBy]. You will learn the difference between them in the **Queries** step. For now, just recognise the three prefixes.

> [!TIP]
>
> The three prefixes use the same colour throughout the guide. Hover over a badge for a short reminder. You can turn the hints off with the switch at the top of the page.

<details>
<summary>What render returns</summary>

- `rerender(ui)` renders the same component again with new props.[^2]
- `unmount()` removes the component from the DOM. Use it to test cleanup behaviour.[^2]
- `container` gives you the rendered root element. Do not look for elements through `container`. Use the `screen` queries instead.[^2]

</details>

## The matchers you'll use most

After `expect(value)` you call a matcher. The DOM matchers come from jest-dom,[^3] and the general and mock matchers from Vitest.[^4] Most component tests are written with these matchers:

| Matcher | What it checks |
| --- | --- |
| `toBeInTheDocument()` | The element is in the DOM. |
| `toBeVisible()` | The element is visible to the user. `display: none` and `hidden` elements are not visible. |
| `toBeDisabled()` / `toBeEnabled()` | The form element is disabled / enabled. |
| `toHaveTextContent("x")` | The element's text contains `x`. |
| `toHaveValue("x")` | The input, select or textarea value is `x`. |
| `toHaveAttribute("href", "/x")` | The element has this attribute value. |
| `toBe(x)` / `toEqual(x)` | General value equality. |
| `toHaveBeenCalledWith(...)` | The mock function was called with these arguments. |

> [!TIP]
>
> `toBeInTheDocument` and `toBeVisible` are different. An element with the `hidden` attribute is in the DOM but not visible. Use `toBeVisible` for elements the user has to see.

<details>
<summary>Other matchers</summary>

- **jest-dom:** `toBeChecked()`, `toHaveFocus()`, `toHaveClass("x")`, `toHaveAccessibleName("x")`. See the [jest-dom documentation](https://github.com/testing-library/jest-dom) for the full list.[^3]
- **Vitest:** `toHaveLength(n)`, `toThrow()`, `toHaveBeenCalled()`, `toHaveBeenCalledTimes(n)`.[^4]

</details>

## Running the same test with different data

For pure functions, use `test.each`. Every data row becomes its own test:[^1]

```ts
import { formatPrice } from "./format-price";

test.each([
  [0, "€0.00"],
  [899, "€899.00"],
  [1299, "€1,299.00"],
  [1299.5, "€1,299.50"],
])("formats %s as '%s'", (price, expected) => {
  expect(formatPrice(price)).toBe(expected);
});
```

## Keep the tests independent

Every test has to work *on its own*. Render the component again in every test. Do not share variables between tests.

> [!WARNING]
>
> Do not commit `test.only`. Locally the other tests do not run and you end up trusting an incomplete result. In CI, Vitest fails on `.only` by default, but delete the `.only` before it ever gets that far.[^5]

<details>
<summary>beforeEach and test.skip</summary>

- `beforeEach` is for shared setup. Prefer it only for setup that repeats in every test. While reading what a test does, you want to see its setup too.
- `test.skip(...)` skips the test. `test.todo("...")` notes a test you have not written yet.[^1]

</details>

## Try it yourself

Write a test for `ProductCard`. When the product is out of stock, the user should see:

- The text **Out of stock**.
- The **Add to cart** button disabled.

## Sources

1. [Vitest: Test API](https://vitest.dev/api/test) *(doc)* — The `test` and `it` aliases, `test.each`, `test.only`, `test.skip`, `test.todo` and `describe`.
2. [React Testing Library: API](https://testing-library.com/docs/react-testing-library/api) *(doc)* — The `render` result, drawing into `document.body`, the automatic cleanup and the `container` warning.
3. [jest-dom: Custom matchers](https://github.com/testing-library/jest-dom) *(repo)* — `toBeInTheDocument`, `toBeVisible`, `toBeDisabled`, `toHaveTextContent` and the other DOM matchers.
4. [Vitest: expect API](https://vitest.dev/api/expect) *(doc)* — `toBe`, `toEqual`, `toHaveLength`, `toThrow` and the mock matchers.
5. [Vitest: allowOnly](https://vitest.dev/config/allowonly) *(doc)* — `.only` being forbidden by default in CI.
