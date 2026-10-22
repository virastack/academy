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
