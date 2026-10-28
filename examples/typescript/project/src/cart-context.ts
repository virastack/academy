import { createContext, useContext } from "react";
import type { CartItem, Product } from "./types";

export type CartContextValue = {
  items: CartItem[];
  totalPrice: number;
  addToCart: (product: Product) => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const cart = useContext(CartContext);
  if (cart === null) {
    throw new Error("useCart must be used within CartProvider.");
  }
  return cart;
}
