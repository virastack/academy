export type Coupon = {
  code: string;
  percentOff: number;
};

const COUPONS: Coupon[] = [{ code: "SALE10", percentOff: 10 }];

export function findCoupon(input: string): Coupon | null {
  const code = input.trim().toUpperCase();
  return COUPONS.find((coupon) => coupon.code === code) ?? null;
}

export function getDiscount(subtotal: number, coupon: Coupon | null): number {
  if (!coupon) return 0;
  return Math.round(subtotal * coupon.percentOff) / 100;
}
