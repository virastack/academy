import type { CartItem } from "../data";
import { formatPrice, getSubtotal } from "../lib/cart";

type CartSummaryProps = {
  items: CartItem[];
};

export function CartSummary({ items }: CartSummaryProps) {
  const subtotal = getSubtotal(items);

  return (
    <section aria-labelledby="summary-title" className="rounded-lg border border-gray-200 p-4">
      <h2 id="summary-title" className="text-lg font-semibold">
        Sipariş özeti
      </h2>
      <dl className="mt-3 space-y-1">
        <div className="flex justify-between">
          <dt>Ara toplam</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Toplam</dt>
          <dd data-testid="total">{formatPrice(subtotal)}</dd>
        </div>
      </dl>
    </section>
  );
}
