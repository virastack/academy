import { useState } from "react";

import { findCoupon, type Coupon } from "../lib/coupon";

type CouponFormProps = {
  coupon: Coupon | null;
  onApply: (coupon: Coupon) => void;
  onRemove: () => void;
};

export function CouponForm({ coupon, onApply, onRemove }: CouponFormProps) {
  const [error, setError] = useState(false);

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const found = findCoupon(String(new FormData(form).get("coupon") ?? ""));
        setError(!found);
        if (found) {
          onApply(found);
          form.reset();
        }
      }}
    >
      <label htmlFor="coupon" className="block text-sm font-medium">
        Kupon kodu
      </label>
      <div className="flex gap-2">
        <input
          id="coupon"
          name="coupon"
          aria-invalid={error}
          aria-describedby={error ? "coupon-error" : undefined}
          className="flex-1 rounded border border-gray-300 px-2 py-1"
        />
        <button type="submit" className="rounded bg-gray-900 px-3 py-1 text-white">
          Uygula
        </button>
      </div>
      {error && (
        <p id="coupon-error" role="alert" className="text-sm text-red-700">Invalid coupon</p>
      )}
      {coupon && (
        <p className="flex items-center justify-between text-sm">
          <span>{coupon.code} uygulandı</span>
          <button type="button" onClick={onRemove} className="underline">Remove</button>
        </p>
      )}
    </form>
  );
}
