---
title: "User interaction"
description: "userEvent, a search box and a coupon form."
lastVerified: "2026-10-14"
translationKey: "vitest/user-interaction"
---

## Use userEvent

There are two tools for simulating user actions.

| Tool | What it does | When to use it |
| --- | --- | --- |
| `fireEvent` | Dispatches a single DOM event.[^1] | Rarely. For events `userEvent` does not support.[^1] |
| `userEvent` | Simulates a real user's chain of events. It checks whether the element is visible and interactive.[^1] | **The default choice.** |

## Setting userEvent up

Call `userEvent.setup()` in every test. Make that call **before** the `render` call.[^1] Use the `user` object it returns:[^2]

```tsx
const user = userEvent.setup();
render(<CouponForm onApply={vi.fn()} />);

await user.click(screen.getByRole("button", { name: "Apply" }));
```

Every `user.*` method returns a Promise. Write `await` on every call.[^3]

## The methods you'll use most

| Method | What it does |
| --- | --- |
| `user.click(el)` | Clicks the element. Used for checkboxes and radios too.[^3] |
| `user.type(el, "text")` | Clicks the element and types character by character.[^4] |
| `user.clear(el)` | Deletes the field's content.[^4] |
| `user.selectOptions(el, "value")` | Picks an option from a `<select>`.[^4] |
| `user.tab()` | Moves the focus to the next element.[^3] |
| `user.keyboard("{Enter}")` | Sends a keyboard key to the focused element.[^5] |

<details>
<summary>The other methods</summary>

- `user.dblClick(el)`: a double click. `user.hover(el)` and `user.unhover(el)`: moves the pointer onto the element or away from it.[^3]
- `user.upload(el, file)`: uploads a file.[^4] `user.paste("text")`: pastes text into the focused element.[^6]
- `user.type` does not delete the existing text. It appends the new characters. To change a field that already has a value, call `user.clear` first.[^4]

</details>

## Testing the search box

When the user types into the search box, the list is filtered. Clearing the field brings all the products back:

```tsx
test("filters the products by search", async () => {
  const user = userEvent.setup();
  render(
    <ProductList
      loadProducts={() => Promise.resolve(products)}
      onAddToCart={vi.fn()}
    />,
  );

  const search = await screen.findByLabelText("Search products");
  await user.type(search, "keyboard");

  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(
    screen.queryByRole("heading", { name: "Gaming Mouse" }),
  ).not.toBeInTheDocument();

  await user.clear(search);

  expect(screen.getAllByRole("article")).toHaveLength(3);
});
```

## Testing keyboard access

Some of your users never touch a mouse.[^7] Do the same action with the keyboard. The first `Tab` goes to the search box, the second to the first product's button:[^3]

```tsx
test("adds the product to the cart with the keyboard", async () => {
  const user = userEvent.setup();
  const onAddToCart = vi.fn();
  render(
    <ProductList
      loadProducts={() => Promise.resolve(products)}
      onAddToCart={onAddToCart}
    />,
  );

  await screen.findAllByRole("article");
  await user.tab();
  await user.tab();
  await user.keyboard("{Enter}");

  expect(onAddToCart).toHaveBeenCalledWith(products[0]);
});
```

## Testing a form: the coupon code

On the cart page the user enters a coupon code. An empty code shows an error. The code is submitted with the leading and trailing spaces removed.

```tsx
import { useState, type FormEvent } from "react";

type CouponFormProps = {
  onApply: (code: string) => void;
};

export function CouponForm({ onApply }: CouponFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setError("A coupon code is required.");
      return;
    }

    setError(null);
    onApply(trimmedCode);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="coupon">Coupon code</label>
      <input
        id="coupon"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "coupon-error" : undefined}
      />
      {error ? (
        <p id="coupon-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Apply</button>
    </form>
  );
}
```

Test the successful submission with a click and with `Enter`:

```tsx
test("the user types a code and submits", async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(<CouponForm onApply={onApply} />);

  await user.type(screen.getByLabelText("Coupon code"), "SUMMER2026");
  await user.click(screen.getByRole("button", { name: "Apply" }));

  expect(onApply).toHaveBeenCalledWith("SUMMER2026");
});

test("the Enter key submits the form", async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(<CouponForm onApply={onApply} />);

  await user.type(screen.getByLabelText("Coupon code"), "SUMMER2026{Enter}");

  expect(onApply).toHaveBeenCalledWith("SUMMER2026");
});
```

> [!TIP]
>
> In a text field, `Enter` clicks the form's first submit button. If that button is disabled, the form is not submitted. When the form has no submit button, `Enter` submits only if the form has a single text field. This behaviour is defined in the HTML standard.[^8]

Test the error state, and the error going away:

```tsx
test("shows an error for an empty code and does not submit", async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(<CouponForm onApply={onApply} />);

  await user.click(screen.getByRole("button", { name: "Apply" }));

  expect(screen.getByRole("alert")).toHaveTextContent("A coupon code is required.");
  expect(screen.getByLabelText("Coupon code")).toBeInvalid();
  expect(onApply).not.toHaveBeenCalled();
});

test("the error disappears once a valid code is entered", async () => {
  const user = userEvent.setup();
  render(<CouponForm onApply={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: "Apply" }));
  await user.type(screen.getByLabelText("Coupon code"), "SUMMER2026");
  await user.click(screen.getByRole("button", { name: "Apply" }));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
```

`toBeInvalid()` treats an element as invalid when it has `aria-invalid="true"` or when `checkValidity()` returns `false`. This field has no constraint such as `required`, so `checkValidity()` returns `true` and the test passes thanks to `aria-invalid`.[^9]

## Check the result

Check the result the user sees.[^10]

> [!DO]
>
> - `expect(screen.getByRole("alert")).toHaveTextContent(...)`[^9]
> - `expect(input).toHaveValue("abc")`[^9]
> - `expect(button).toBeDisabled()`[^9]

> [!DONT]
>
> - Reading the component's internal state value.[^10]
> - Looking at internal variables such as `isDisabled`.[^10]

## Try it yourself

`CouponForm` removes the spaces. Test that:

- The user types `"  SUMMER2026  "` and submits.
- The `onApply` function is called with `"SUMMER2026"`.

## Sources

1. [user-event: Introduction](https://testing-library.com/docs/user-event/intro) *(doc)* — The difference from `fireEvent`, and the order of `userEvent.setup()` and `render`.
2. [user-event: Setup](https://testing-library.com/docs/user-event/setup) *(doc)* — The instance created by `setup()`, and how it differs from the direct APIs.
3. [user-event: Convenience APIs](https://testing-library.com/docs/user-event/convenience) *(doc)* — `click`, `dblClick`, `hover`, `unhover` and `tab`.
4. [user-event: Utility APIs](https://testing-library.com/docs/user-event/utility) *(doc)* — `type`, `clear`, `selectOptions` and `upload`.
5. [user-event: Keyboard](https://testing-library.com/docs/user-event/keyboard) *(doc)* — `keyboard` and the key syntax.
6. [user-event: Clipboard](https://testing-library.com/docs/user-event/clipboard) *(doc)* — `paste`.
7. [W3C: Understanding SC 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) *(doc)* — Every function being operable by keyboard, and who that helps.
8. [HTML Standard: Implicit submission](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#implicit-submission) *(doc)* — The rules for implicit form submission with `Enter`.
9. [jest-dom](https://github.com/testing-library/jest-dom) *(repo)* — `toBeInvalid`, `toHaveTextContent`, `toHaveValue` and `toBeDisabled`.
10. [Kent C. Dodds: Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details) *(article)* — The problems with testing internal state the user never sees.
