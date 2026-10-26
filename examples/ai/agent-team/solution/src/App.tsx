import { useState } from "react";

import { CartSummary } from "./components/CartSummary";
import { CouponForm } from "./components/CouponForm";
import { cartItems } from "./data";
import { formatPrice } from "./lib/cart";
import type { Coupon } from "./lib/coupon";

export function App() {
  const [coupon, setCoupon] = useState<Coupon | null>(null);

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Sepetim</h1>
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
      <CouponForm coupon={coupon} onApply={setCoupon} onRemove={() => setCoupon(null)} />
      <CartSummary items={cartItems} coupon={coupon} />
    </main>
  );
}
