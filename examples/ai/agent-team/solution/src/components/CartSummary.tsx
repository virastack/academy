import type { CartItem } from "../data";
import { formatPrice, getSubtotal } from "../lib/cart";
import { getDiscount, type Coupon } from "../lib/coupon";

type CartSummaryProps = {
  items: CartItem[];
  coupon: Coupon | null;
};

export function CartSummary({ items, coupon }: CartSummaryProps) {
  const subtotal = getSubtotal(items);
  const discount = getDiscount(subtotal, coupon);

  return (
    <section aria-labelledby="summary-title" className="rounded-lg border border-gray-200 p-4">
      <h2 id="summary-title" className="text-lg font-semibold">
        Order summary
      </h2>
      <dl className="mt-3 space-y-1">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        {coupon && (
          <div className="flex justify-between text-green-700">
            <dt>Discount ({coupon.code})</dt>
            <dd>-{formatPrice(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd data-testid="total">{formatPrice(subtotal - discount)}</dd>
        </div>
      </dl>
    </section>
  );
}
