---
title: "Product list"
description: "The loading, search and add-to-cart flow."
lastVerified: "2026-10-14"
translationKey: "vitest/project-product-list"
---

## Scenario

The store's home page loads the products from an API. The list:

- Shows the message **Loading products...** while loading.
- Shows the message **Products could not be loaded.** when loading fails.
- Filters the products by the text typed into the search box.
- Shows the message **No products found.** when nothing matches.
- Offers an **Add to cart** button for every product.

The working project is on GitHub: [examples/vitest/project](https://github.com/virastack/academy/tree/main/examples/vitest/project). Compare against it when you get stuck.

## The component

The `loadProducts` function is passed in from outside. In a test you pass your own function instead of the real API.

```tsx
import { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";
import type { Product } from "./types";

type ProductListProps = {
  loadProducts: () => Promise<Product[]>;
  onAddToCart: (product: Product) => void;
};

type Status = "loading" | "error" | "ready";

export function ProductList({ loadProducts, onAddToCart }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let ignore = false;

    loadProducts()
      .then((loaded) => {
        if (ignore) return;
        setProducts(loaded);
        setStatus("ready");
      })
      .catch(() => {
        if (ignore) return;
        setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [loadProducts]);

  if (status === "loading") {
    return <p role="status">Loading products...</p>;
  }

  if (status === "error") {
    return <p role="alert">Products could not be loaded.</p>;
  }

  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
  const visibleProducts = products.filter((product) =>
    product.name.toLocaleLowerCase("tr-TR").includes(normalizedQuery),
  );

  return (
    <section aria-label="Products">
      <label htmlFor="product-search">Search products</label>
      <input
        id="product-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {visibleProducts.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <ul>
          {visibleProducts.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} onAddToCart={onAddToCart} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

The `ignore` flag inside the effect stops a stale response from updating the state when `loadProducts` changes or the component is removed.[^1] The search uses `toLocaleLowerCase("tr-TR")`. In languages such as Turkish, the case mapping can differ from the default.[^2]

## Tests

Write the shared data and a helper function first:

```tsx
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductList } from "./ProductList";
import type { Product } from "./types";

const products: Product[] = [
  { id: 1, name: "Wireless Headphones", price: 1299, inStock: true },
  { id: 2, name: "Mechanical Keyboard", price: 2199, inStock: true },
  { id: 3, name: "Gaming Mouse", price: 899, inStock: false },
];

function renderList(
  loadProducts: () => Promise<Product[]> = () => Promise.resolve(products),
  onAddToCart = vi.fn(),
) {
  render(<ProductList loadProducts={loadProducts} onAddToCart={onAddToCart} />);

  return { onAddToCart };
}
```

### Step 1: Loading

The topic: [!getBy], [!findBy] and [!queryBy].[^3]

```tsx
test("shows a status message while loading, then the products", async () => {
  renderList();

  expect(screen.getByText("Loading products...")).toBeInTheDocument();
  expect(await screen.findAllByRole("article")).toHaveLength(3);
  expect(screen.queryByText("Loading products...")).not.toBeInTheDocument();
});
```

### Step 2: The error state

The topic: `Promise.reject` and `findByRole("alert")`.

```tsx
test("shows an error message when loading fails", async () => {
  renderList(() => Promise.reject(new Error("network error")));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Products could not be loaded.",
  );
});
```

### Step 3: Search and the empty state

The topic: `userEvent.type` and `userEvent.clear`.

```tsx
test("filters the products by search", async () => {
  const user = userEvent.setup();
  renderList();

  await user.type(await screen.findByLabelText("Search products"), "keyboard");

  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(
    screen.getByRole("heading", { name: "Mechanical Keyboard" }),
  ).toBeInTheDocument();
});

test("shows the empty state when nothing matches", async () => {
  const user = userEvent.setup();
  renderList();

  await user.type(await screen.findByLabelText("Search products"), "monitor");

  expect(screen.getByText("No products found.")).toBeInTheDocument();
});
```

### Step 4: Adding to the cart

The topic: searching inside a card with `within`.[^4]

```tsx
test("adds the selected product to the cart", async () => {
  const user = userEvent.setup();
  const { onAddToCart } = renderList();

  const card = await screen.findByRole("article", { name: "Mechanical Keyboard" });
  await user.click(within(card).getByRole("button", { name: "Add to cart" }));

  expect(onAddToCart).toHaveBeenCalledWith(products[1]);
});

test("the button of an out-of-stock product is disabled", async () => {
  renderList();

  const card = await screen.findByRole("article", { name: "Gaming Mouse" });

  expect(
    within(card).getByRole("button", { name: "Add to cart" }),
  ).toBeDisabled();
});
```

### Step 5: The loading message disappearing

The topic: `waitFor` and `queryByRole`.[^5]

```tsx
test("the status message disappears once loading finishes", async () => {
  renderList();

  await waitFor(() =>
    expect(screen.queryByRole("status")).not.toBeInTheDocument(),
  );
});
```

## Which topics did you practise?

| Step | The topic practised |
| --- | --- |
| 1 | The query families and `findAllByRole`[^3] |
| 2 | An asynchronous error state |
| 3 | `userEvent.type`, the empty state |
| 4 | `within`, `toBeDisabled`[^4] |
| 5 | A disappearing element with `waitFor`[^5] |

> [!TIP]
>
> In every test you passed your own `loadProducts` function instead of the real API. No mocking library was needed. You will learn how to mock the API in the **Mock** step.

## Try it yourself

Add price sorting to the list, and test it:

- Add a `<select>` labelled **Sort** to `ProductList`. The options: **Recommended** and **Price: ascending**.
- Pick the **Price: ascending** option with `user.selectOptions`.
- Test that the first card is the cheapest product (**Gaming Mouse**). A hint: `getAllByRole("article")[0]`.

## Sources

1. [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) *(doc)* — The race condition while fetching data, and the `ignore` flag that discards stale responses.
2. [MDN: String.prototype.toLocaleLowerCase()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLocaleLowerCase) *(doc)* — Locale-aware case mapping in languages such as Turkish.
3. [Testing Library: About Queries](https://testing-library.com/docs/queries/about) *(doc)* — The difference between `getBy`, `queryBy` and `findBy`, and which one to use for absence and for waiting.
4. [Testing Library: within](https://testing-library.com/docs/dom-testing-library/api-within) *(doc)* — Narrowing a query to inside a single element.
5. [Testing Library: Async Methods](https://testing-library.com/docs/dom-testing-library/api-async) *(doc)* — How `findBy` relates to `waitFor`, the 1000 ms timeout, and retrying depending on a thrown error.
