"use client";

import { createContext, useState } from "react";

import { CartItem, Product } from "../types/types";

type CartContextValue = {
  items: CartItem[];
  add: (product: Product) => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  function add(product: Product) {
    setItems((current) => {
      const existing = current.find((item) => item.slug === product.slug);

      if (existing) {
        return current.map((item) =>
          item.slug === product.slug ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
  }

  return <CartContext value={{ items, add }}>{children}</CartContext>;
}
