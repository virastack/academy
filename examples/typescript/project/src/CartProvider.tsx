import { useReducer } from "react";
import { CartContext } from "./cart-context";
import type { CartItem, Product } from "./types";

type CartAction =
  | { type: "add"; product: Product }
  | { type: "remove"; id: number };

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const { id, name, price } = action.product;
      const existing = items.find((item) => item.id === id);
      if (existing) {
        return items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...items, { id, name, price, quantity: 1 }];
    }
    case "remove":
      return items.filter((item) => item.id !== action.id);
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <CartContext
      value={{
        items,
        totalPrice,
        addToCart: (product) => dispatch({ type: "add", product }),
      }}
    >
      {children}
    </CartContext>
  );
}
