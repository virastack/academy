import { act, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { CartBadge, CartSummary } from "./cart-components";
import { CartProvider, useCart, type CartItem } from "./cart-context";
import { renderWithProviders } from "./test-utils";
import type { Product } from "./types";

const keyboard: Product = {
  id: 2,
  name: "Mekanik Klavye",
  price: 2199,
  inStock: true,
};
const mouse: Product = {
  id: 3,
  name: "Oyuncu Faresi",
  price: 899,
  inStock: true,
};

const filledCart: CartItem[] = [
  { product: keyboard, quantity: 2 },
  { product: mouse, quantity: 1 },
];

test("rozet boş sepette sıfır gösterir", () => {
  renderWithProviders(<CartBadge />);

  expect(screen.getByRole("link", { name: "Sepet (0)" })).toBeInTheDocument();
});

test("rozet toplam ürün adedini gösterir", () => {
  renderWithProviders(<CartBadge />, { initialItems: filledCart });

  expect(screen.getByRole("link", { name: "Sepet (3)" })).toBeInTheDocument();
});

test("özet ürünleri ve toplam tutarı gösterir", () => {
  renderWithProviders(<CartSummary />, { initialItems: filledCart });

  expect(screen.getByText("Mekanik Klavye × 2")).toBeInTheDocument();
  expect(screen.getByText("Toplam: ₺5.297,00")).toBeInTheDocument();
});

test("Çıkar butonu ürünü sepetten kaldırır", async () => {
  const user = userEvent.setup();
  renderWithProviders(<CartSummary />, { initialItems: filledCart });

  await user.click(
    screen.getByRole("button", { name: "Mekanik Klavye ürününü sepetten çıkar" }),
  );

  const summary = screen.getByRole("region", { name: "Sepet özeti" });
  expect(
    within(summary).queryByText("Mekanik Klavye × 2"),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Toplam: ₺899,00")).toBeInTheDocument();
});

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

test("aynı ürünü ekleyince adedi artırır", () => {
  const { result } = renderHook(() => useCart(), { wrapper });

  act(() => {
    result.current.addToCart(keyboard);
    result.current.addToCart(keyboard);
  });

  expect(result.current.totalCount).toBe(2);
  expect(result.current.totalPrice).toBe(4398);
});

test("Provider dışında kullanılırsa hata fırlatır", () => {
  expect(() => renderHook(() => useCart())).toThrow(
    "useCart, CartProvider içinde kullanılmalıdır.",
  );
});
