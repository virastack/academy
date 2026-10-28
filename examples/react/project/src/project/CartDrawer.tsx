import { startTransition, useState, ViewTransition } from "react";
import { useCartDispatch, useCartItems } from "./cart.tsx";

export function CartButton() {
  const items = useCartItems();
  const [isOpen, setIsOpen] = useState(false);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <button type="button" onClick={() => startTransition(() => setIsOpen(!isOpen))}>
        Cart ({count})
      </button>
      {isOpen && (
        <ViewTransition enter="slide-in" exit="slide-out">
          <CartDrawer />
        </ViewTransition>
      )}
    </>
  );
}

function CartDrawer() {
  const items = useCartItems();
  const dispatch = useCartDispatch();
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <aside className="cart-drawer" aria-label="Cart">
      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              {item.name} × {item.quantity}
              <button type="button" onClick={() => dispatch({ type: "remove", id: item.id })}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <p>Total: {total.toLocaleString("tr-TR")} TL</p>
    </aside>
  );
}
