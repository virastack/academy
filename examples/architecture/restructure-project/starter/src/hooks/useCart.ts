import { use } from "react";

import { CartContext } from "../components";

export function useCart() {
  const context = use(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
