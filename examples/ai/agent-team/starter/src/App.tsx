import { CartSummary } from "./components/CartSummary";
import { cartItems } from "./data";
import { formatPrice } from "./lib/cart";

export function App() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">My cart</h1>
      <ul className="divide-y divide-gray-200">
        {cartItems.map((item) => (
          <li key={item.id} className="flex justify-between py-2">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <CartSummary items={cartItems} />
    </main>
  );
}
