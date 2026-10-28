---
title: "Queries"
description: "getBy, queryBy, findBy and query priority."
lastVerified: "2026-10-14"
translationKey: "vitest/queries"
---

## The basic rule

Find elements the way the user finds them. A user finds elements by role, label and text. A user never sees state names or CSS classes.

Tests tied to the internal structure break on a small refactoring. Tests tied to behaviour do not.[^1]

## Query priority

In the list, a query above is better than one below it. Always pick the first query that fits.

| Query | When to use it |
| --- | --- |
| `getByRole` | **First choice.** Every element that has a role, such as a button, heading, link or textbox. |
| `getByLabelText` | Form elements tied to a `<label>`. |
| `getByText` | Non-interactive text: `<p>`, `<span>`, `<div>`. |
| `getByAltText` | An image with an `alt` attribute. |
| `getByTestId` | **Last resort.** When no other query works. |

The full order is: `getByRole`, `getByLabelText`, `getByPlaceholderText`, `getByText`, `getByDisplayValue`, then `getByAltText`, `getByTitle` and `getByTestId` last.[^2]

> [!WARNING]
>
> `getByTestId` is not something the user sees. Try the queries above it first.[^2]

<details>
<summary>The other queries</summary>

- `getByPlaceholderText`: used when there is no label. A placeholder does not replace a label. Add a label first.[^3]
- `getByDisplayValue`: for an input, select or textarea that has a value.
- `getByTitle`: for an element with a `title` attribute. `title` is a problem for people using assistive technology, because browser and screen reader support is inconsistent.[^4]

</details>

## The example page

The tests in this step use the product list. You will see the component's full code in the **Product List** project. The list produces this HTML:

```tsx
<section aria-label="Products">
  <label htmlFor="product-search">Search products</label>
  <input id="product-search" type="search" />
  <ul>
    <li>
      <article aria-labelledby="product-2-title">
        <h2 id="product-2-title">Mechanical Keyboard</h2>
        <p>€2,199.00</p>
        <button type="button">Add to cart</button>
      </article>
    </li>
    {/* ... the other products */}
  </ul>
</section>
```

The list loads its data afterwards. That is why every test's first line is `await screen.findAllByRole("article")`. You will learn about waiting in the **Asynchronous tests** step.

```tsx
import { render, screen } from "@testing-library/react";
import { ProductList } from "./ProductList";

const products = [
  { id: 1, name: "Wireless Headphones", price: 1299, inStock: true },
  { id: 2, name: "Mechanical Keyboard", price: 2199, inStock: true },
  { id: 3, name: "Gaming Mouse", price: 899, inStock: false },
];

async function renderList() {
  render(
    <ProductList
      loadProducts={() => Promise.resolve(products)}
      onAddToCart={vi.fn()}
    />,
  );

  await screen.findAllByRole("article");
}

test("finds the product by role, label and text", async () => {
  await renderList();

  expect(
    screen.getByRole("heading", { name: "Mechanical Keyboard" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Search products")).toBeInTheDocument();
  expect(screen.getByText("€2,199.00")).toBeInTheDocument();
});
```

## Using getByRole

`getByRole` uses the element's ARIA role and its accessible name. HTML elements have an automatic role.[^5][^6]

| HTML | Role |
| --- | --- |
| `<button>` | `button` |
| `<a href>` | `link` |
| `<h1>` – `<h6>` | `heading` |
| `<input type="search">` | `searchbox` |
| `<input type="checkbox">` | `checkbox` |
| `<select>` | `combobox` |
| `<ul>` / `<li>` | `list` / `listitem` |
| `<article aria-labelledby>` | `article` |
| `<section aria-label>` | `region` |

The `name` option states the accessible name. Use it to tell elements with the same role apart:[^5]

```tsx
screen.getByRole("button", { name: "Add to cart" });
screen.getByRole("heading", { name: "Mechanical Keyboard", level: 2 });
screen.getByRole("article", { name: "Mechanical Keyboard" });
screen.getByRole("region", { name: "Products" });
```

By default `getByRole` ignores elements removed from the accessibility tree (`hidden`, `display: none`, `visibility: hidden`, `aria-hidden="true"`). Add `hidden: true` to find those elements.[^5]

> [!NOTE]
>
> A hidden element's name computed from its content can come out empty. In that case, using `name` together with `hidden: true` finds nothing. Query a hidden element without `name`, or give it a name with `aria-label`.

## The query families

Every query has three prefixes. The prefix decides whether the element has to be in the DOM right now.[^2]

| Prefix | If the element is not found | When to use it |
| --- | --- | --- |
| [!getBy] | Throws an error | The element **has to be** in the DOM right now. |
| [!queryBy] | Returns `null` | The element **must not be** in the DOM right now. |
| [!findBy] | Waits. Throws when the time runs out. | The element will arrive **after a while**. |

When you expect more than one element, use the `All` version: `getAllBy`, `queryAllBy`, `findAllBy`. The singular queries throw on more than one match.

```tsx
test("query families", async () => {
  await renderList();

  expect(screen.getAllByRole("article")).toHaveLength(3);

  expect(screen.queryByText("No products found.")).not.toBeInTheDocument();
});
```

> [!CAUTION]
>
> Do not use `getBy` when you check that an element is absent. If the element is missing, `getBy` throws and the `not.toBeInTheDocument` line is never reached. Use `queryBy` for that.

## Text matching

By default, text queries are an **exact match** and **case sensitive**.[^2][^7]

| Code | Result |
| --- | --- |
| `getByText("Mechanical Keyboard")` | Finds only exactly this text. |
| `getByText("keyboard")` | Finds nothing. The match is not exact. |
| `getByText(/keyboard/i)` | Finds it. A regex matches partially and case-insensitively. |

If the text changes often, you can use a regex such as `/add to cart/i`. A regex reduces the breakage that comes from case differences. A regex that is too broad can catch the wrong element as well. Use it together with a role query and narrow it with `name`.

## Narrowing the scope: within

The list has three **Add to cart** buttons. `getByRole("button", { name: "Add to cart" })` throws. Limit the search to one card:[^8]

```tsx
import { screen, within } from "@testing-library/react";

test("finds the button on the keyboard card", async () => {
  await renderList();

  const card = screen.getByRole("article", { name: "Mechanical Keyboard" });

  expect(
    within(card).getByRole("button", { name: "Add to cart" }),
  ).toBeEnabled();
});
```

## Testing playground

This tool suggests the best query for your HTML. The example below is this lesson's product card. Click an element in the preview. Read the suggested query. Change the query and see the result.

```testing-playground
{
  "title": "Testing Playground",
  "src": "https://testing-playground.com/embed?panes=markup,preview,query,result",
  "markup": "<section aria-label=\"Products\">\n  <article aria-labelledby=\"product-2-title\">\n    <h2 id=\"product-2-title\">Mechanical Keyboard</h2>\n    <p>€2,199.00</p>\n    <button type=\"button\">Add to cart</button>\n  </article>\n</section>",
  "query": "screen.getByRole(\"heading\", { name: \"Mechanical Keyboard\" });"
}
```

## Try it yourself

- Find the **Gaming Mouse** card with `getByRole("article", ...)`.
- Use `within` to test that the **Out of stock** text inside that card is visible.
- Use `queryByText` to test that the **Mechanical Keyboard** card has no **Out of stock** text.

## Sources

1. [Kent C. Dodds: Making your UI tests resilient to change](https://kentcdodds.com/blog/making-your-ui-tests-resilient-to-change) *(article)* — Fragile tests tied to implementation details, and querying the way the user finds things.
2. [Testing Library: About Queries](https://testing-library.com/docs/queries/about) *(doc)* — Query priority, the difference between `getBy`/`queryBy`/`findBy`, and the `exact` default.
3. [Testing Library: ByPlaceholderText](https://testing-library.com/docs/queries/byplaceholdertext) *(doc)* — A placeholder does not replace a label; `getByLabelText` is usually preferred.
4. [MDN: title attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title) *(doc)* — The problems `title` causes for people using assistive technology.
5. [Testing Library: ByRole](https://testing-library.com/docs/queries/byrole) *(doc)* — Implicit roles, and the `name`, `level` and `hidden` options.
6. [Matan Borenkraout: Testing Library, everybody uses it, but nobody understands it](https://gitnation.com/contents/testing-library-everybody-uses-it-but-nobody-understands-it) *(video)* — How `getByRole` works with the accessibility tree and implicit roles.
7. [Testing Library: ByText](https://testing-library.com/docs/queries/bytext) *(doc)* — Text matching, using a regex, and the `ignore` option.
8. [Testing Library: within](https://testing-library.com/docs/dom-testing-library/api-within) *(doc)* — Narrowing a query to inside a single element.
