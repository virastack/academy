---
title: "Product card"
description: "A step-by-step test for an e-commerce product card."
lastVerified: "2026-10-14"
translationKey: "vitest/project-product-card"
---

## Scenario

On the store page every product appears in a card. The card:

- Shows the product's name and price.
- Reports the product when the **Add to cart** button is clicked.
- Writes **Out of stock** and disables the button when the product is out of stock.
- Shows the old price struck through when the product is discounted.

The working project is on GitHub: [examples/vitest/project](https://github.com/virastack/academy/tree/main/examples/vitest/project). Compare against it when you get stuck.

## The component

This is the final `ProductCard` version you will use throughout this project. `oldPrice` and `aria-labelledby` were added to the previous version.[^1] Those two additions come in handy in the later lessons.

```tsx
import { formatPrice } from "./format-price";
import type { Product } from "./types";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const titleId = `product-${product.id}-title`;

  return (
    <article aria-labelledby={titleId}>
      <h2 id={titleId}>{product.name}</h2>
      {product.oldPrice ? <s>{formatPrice(product.oldPrice)}</s> : null}
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

Add an optional `oldPrice` field to the `Product` type:

```ts
export type Product = {
  id: number;
  name: string;
  price: number;
  oldPrice?: number;
  inStock: boolean;
};
```

## Tests

Write the tests in a single file, step by step. Define the shared data first:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "./ProductCard";
import type { Product } from "./types";

const headphones: Product = {
  id: 1,
  name: "Wireless Headphones",
  price: 1299,
  inStock: true,
};
```

### Step 1: The product details

```tsx
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

Add the next three tests inside the same `describe` block.

### Step 2: Adding to the cart

```tsx
test("reports the product when Add to cart is clicked", async () => {
  const user = userEvent.setup();
  const onAddToCart = vi.fn();
  render(<ProductCard product={headphones} onAddToCart={onAddToCart} />);

  await user.click(screen.getByRole("button", { name: "Add to cart" }));

  expect(onAddToCart).toHaveBeenCalledWith(headphones);
});
```

### Step 3: An out-of-stock product

```tsx
test("disables the button for an out-of-stock product", async () => {
  const user = userEvent.setup();
  const onAddToCart = vi.fn();
  render(
    <ProductCard
      product={{ ...headphones, inStock: false }}
      onAddToCart={onAddToCart}
    />,
  );

  expect(screen.getByText("Out of stock")).toBeVisible();
  expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled();

  await user.click(screen.getByRole("button", { name: "Add to cart" }));

  expect(onAddToCart).not.toHaveBeenCalled();
});
```

### Step 4: A discounted price

```tsx
test("shows the old price for a discounted product", () => {
  render(
    <ProductCard
      product={{ ...headphones, oldPrice: 1499 }}
      onAddToCart={vi.fn()}
    />,
  );

  expect(screen.getByText("€1,499.00")).toBeInTheDocument();
  expect(screen.getByText("€1,299.00")).toBeInTheDocument();
});
```

> [!TIP]
>
> `userEvent` behaves like the browser. Clicking a disabled button does not call the `onAddToCart` function.[^2]

## Which topics did you practise?

| Step | The topic practised |
| --- | --- |
| 1 | `render`, `screen`, `getByRole`, `toBeInTheDocument`[^3] |
| 2 | `userEvent`, `vi.fn`, `toHaveBeenCalledWith`[^2] |
| 3 | `toBeVisible`, `toBeDisabled`, `not.toHaveBeenCalled`[^4] |
| 4 | `getByText` and shared test data |

<details>
<summary>Why is the price text hard-coded?</summary>

- Do not produce the price text with `formatPrice`. Write fixed text such as `"€1,299.00"` in the test. If the format breaks, the test fails and shows you the error.
- The price format depends on the ICU data `Intl` uses. That data can differ between Node.js builds and systems. If your team uses different environments, verify it by running once in CI.[^5]

</details>

## Try it yourself

Write the test first, then change the component (TDD). A percentage is going to be added for a discounted product.

- The test: a product card with `price` 1299 and `oldPrice` 1499 shows the text **13% off**.
- Watch the test fail.
- Calculate the percentage inside `ProductCard` and show it.
- Watch the test pass.

## Sources

1. [WAI-ARIA 1.2: Roles](https://www.w3.org/TR/wai-aria-1.2/#article) *(doc)* — The `article` role's name comes from the author, not from the content, which is why `aria-labelledby` is needed.
2. [user-event: Introduction](https://testing-library.com/docs/user-event/intro) *(doc)* — `userEvent` does not perform an interaction the browser would not allow, such as one on a disabled field.
3. [React Testing Library: Example](https://testing-library.com/docs/react-testing-library/example-intro) *(doc)* — An example test with `render`, `screen` and role queries.
4. [jest-dom](https://github.com/testing-library/jest-dom) *(repo)* — The rules of the `toBeVisible` and `toBeDisabled` matchers.
5. [Node.js: Internationalization support](https://nodejs.org/api/intl.html) *(doc)* — `Intl` output depending on the ICU data and the Node.js build.
