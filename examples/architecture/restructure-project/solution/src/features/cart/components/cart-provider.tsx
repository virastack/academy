"use client";

import { createContext, use, useState } from "react";

import type { CartItem } from "@/features/cart/types/cart-item";

type CartContextValue = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  function add(item: Omit<CartItem, "quantity">) {
    setItems((current) => {
      const existing = current.find((cartItem) => cartItem.slug === item.slug);

      if (existing) {
        return current.map((cartItem) =>
          cartItem.slug === item.slug ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
        );
      }

      return [...current, { ...item, quantity: 1 }];
    });
  }

  return <CartContext value={{ items, add }}>{children}</CartContext>;
}

export function useCart() {
  const context = use(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
