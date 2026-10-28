---
title: "Provider and hook"
description: "The cart Provider, renderWithProviders and renderHook."
lastVerified: "2026-10-14"
translationKey: "vitest/provider-and-hook"
---

## Why do you need a provider?

The store's cart is shared through a Context. The badge in the header, the product list and the cart summary all read the same cart. Those components run inside `CartProvider`. Render them without the provider and you get an error.

## The cart context

Pay attention to the `initialItems` prop. It lets you start the cart full in a test, with no need to add products one click at a time.

```tsx
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Product } from "./types";

export type CartItem = { product: Product; quantity: number };

type CartContextValue = {
  items: CartItem[];
  totalCount: number;
  totalPrice: number;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

type CartProviderProps = {
  children: ReactNode;
  initialItems?: CartItem[];
};

export function CartProvider({ children, initialItems = [] }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(initialItems);

  function addToCart(product: Product) {
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);

      if (!existing) {
        return [...current, { product, quantity: 1 }];
      }

      return current.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  }

  function removeFromCart(productId: number) {
    setItems((current) =>
      current.filter((item) => item.product.id !== productId),
    );
  }

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{ items, totalCount, totalPrice, addToCart, removeFromCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider.");
  }

  return context;
}
```

Two components read the cart. Write both into the `cart-components.tsx` file:

```tsx
import { useCart } from "./cart-context";
import { formatPrice } from "./format-price";

export function CartBadge() {
  const { totalCount } = useCart();

  return <a href="/cart">Cart ({totalCount})</a>;
}

export function CartSummary() {
  const { items, totalPrice, removeFromCart } = useCart();

  if (items.length === 0) {
    return <p>Your cart is empty.</p>;
  }

  return (
    <section aria-label="Cart summary">
      <ul>
        {items.map(({ product, quantity }) => (
          <li key={product.id}>
            <span>
              {product.name} × {quantity}
            </span>
            <button
              type="button"
              aria-label={`Remove ${product.name} from cart`}
              onClick={() => removeFromCart(product.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <p>Total: {formatPrice(totalPrice)}</p>
    </section>
  );
}
```

## renderWithProviders

Writing the Provider in every test creates repetition. Write a helper function. React Testing Library offers the `wrapper` option for this.[^1]

```tsx
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { CartProvider, type CartItem } from "./cart-context";

type RenderWithProvidersOptions = Omit<RenderOptions, "wrapper"> & {
  initialItems?: CartItem[];
};

export function renderWithProviders(
  ui: ReactElement,
  { initialItems, ...options }: RenderWithProvidersOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <CartProvider initialItems={initialItems}>{children}</CartProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
```

Save the file as `src/test-utils.tsx`. Use this function instead of `render` in every test.

> [!TIP]
>
> When you add a new Provider (a theme, a router, a query client), you only update the `Wrapper` function. The existing tests do not change.

## The component tests

```tsx
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartBadge, CartSummary } from "./cart-components";
import type { CartItem } from "./cart-context";
import { renderWithProviders } from "./test-utils";
import type { Product } from "./types";

const keyboard: Product = {
  id: 2,
  name: "Mechanical Keyboard",
  price: 2199,
  inStock: true,
};
const mouse: Product = {
  id: 3,
  name: "Gaming Mouse",
  price: 899,
  inStock: true,
};

const filledCart: CartItem[] = [
  { product: keyboard, quantity: 2 },
  { product: mouse, quantity: 1 },
];

test("the badge shows zero for an empty cart", () => {
  renderWithProviders(<CartBadge />);

  expect(screen.getByRole("link", { name: "Cart (0)" })).toBeInTheDocument();
});

test("the badge shows the total item count", () => {
  renderWithProviders(<CartBadge />, { initialItems: filledCart });

  expect(screen.getByRole("link", { name: "Cart (3)" })).toBeInTheDocument();
});

test("the summary shows the items and the total", () => {
  renderWithProviders(<CartSummary />, { initialItems: filledCart });

  expect(screen.getByText("Mechanical Keyboard × 2")).toBeInTheDocument();
  expect(screen.getByText("Total: €5,297.00")).toBeInTheDocument();
});

test("the Remove button takes the product out of the cart", async () => {
  const user = userEvent.setup();
  renderWithProviders(<CartSummary />, { initialItems: filledCart });

  await user.click(
    screen.getByRole("button", { name: "Remove Mechanical Keyboard from cart" }),
  );

  const summary = screen.getByRole("region", { name: "Cart summary" });
  expect(
    within(summary).queryByText("Mechanical Keyboard × 2"),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Total: €899.00")).toBeInTheDocument();
});
```

Thanks to `initialItems`, every test tests one thing. The badge test does not depend on the add-to-cart flow.

## Testing a hook

Testing a hook through a component is best.[^2] That approach confirms the behaviour the user sees. If you want to test the hook independently of a component, use `renderHook`. Wrap the calls that change state in `act`.[^3]

```tsx
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { CartProvider, useCart } from "./cart-context";

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

test("increments the quantity when the same product is added", () => {
  const { result } = renderHook(() => useCart(), { wrapper });

  act(() => {
    result.current.addToCart(keyboard);
    result.current.addToCart(keyboard);
  });

  expect(result.current.totalCount).toBe(2);
  expect(result.current.totalPrice).toBe(4398);
});

test("throws when used outside the provider", () => {
  expect(() => renderHook(() => useCart())).toThrow(
    "useCart must be used within CartProvider.",
  );
});
```

> [!TIP]
>
> A test whose render throws can write an error to the console, depending on the React version. If you see a red error in the console, the test still passes. That is normal.

<details>
<summary>The other kinds of Provider</summary>

- **Router:** if you use React Router, render a component that needs the router context with `createRoutesStub`.[^4]
- **TanStack Query:** create a new `QueryClient` for every test. Set `retry: false` in tests. A failed request that is retried makes the test take a long time.[^5]
- As the number of providers grows, add options to the `renderWithProviders` function. For example: `initialItems`.

</details>

## Try it yourself

`CartSummary` and `CartBadge` share the same cart. Confirm that in a single test:

- Render both in the same `renderWithProviders` call: `<><CartBadge /><CartSummary /></>`. Pass `filledCart` as `initialItems`.
- Click the **Remove** button for **Mechanical Keyboard**.
- Confirm that the badge reads **Cart (1)**.

## Sources

1. [React Testing Library: Setup (wrapper)](https://testing-library.com/docs/react-testing-library/setup) *(doc)* — A custom `render` function that wraps the providers with `wrapper`.
2. [Kent C. Dodds: How to test custom React hooks](https://kentcdodds.com/blog/how-to-test-custom-react-hooks) *(article)* — The advice to test a hook through an example component, and the cases where `renderHook` fits.
3. [React Testing Library: API](https://testing-library.com/docs/react-testing-library/api) *(doc)* — `renderHook`, the `wrapper` option, `result.current` and `act`.
4. [React Router: Testing](https://reactrouter.com/start/framework/testing) *(doc)* — Testing components that need the router context with `createRoutesStub`.
5. [TkDodo: Testing React Query](https://tkdodo.eu/blog/testing-react-query) *(article)* — A new `QueryClient` for every test, and the `retry: false` setting.
