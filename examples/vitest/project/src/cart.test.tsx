import { act, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { CartBadge, CartSummary } from "./cart-components";
import { CartProvider, useCart, type CartItem } from "./cart-context";
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
