import { createContext, use, useReducer } from "react";
import type { Product } from "./api.ts";

type CartItem = { id: string; name: string; price: number; quantity: number };
type CartAction = { type: "add"; product: Product } | { type: "remove"; id: string };

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const existing = items.find((item) => item.id === action.product.id);
      if (existing) {
        return items.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      const { id, name, price } = action.product;
      return [...items, { id, name, price, quantity: 1 }];
    }
    case "remove":
      return items.filter((item) => item.id !== action.id);
  }
}

const CartContext = createContext<CartItem[] | null>(null);
const CartDispatchContext = createContext<React.Dispatch<CartAction> | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  return (
    <CartContext value={items}>
      <CartDispatchContext value={dispatch}>{children}</CartDispatchContext>
    </CartContext>
  );
}

export function useCartItems() {
  const items = use(CartContext);
  if (items === null) throw new Error("useCartItems must be used within CartProvider.");
  return items;
}

export function useCartDispatch() {
  const dispatch = use(CartDispatchContext);
  if (dispatch === null) throw new Error("useCartDispatch must be used within CartProvider.");
  return dispatch;
}
