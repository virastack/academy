import { findCoupon, getDiscount } from "./coupon";

test("SALE10 takes 10 percent off", () => {
  const coupon = findCoupon("SALE10");
  expect(getDiscount(1000, coupon)).toBe(100);
});

test("ignores case and surrounding spaces", () => {
  expect(findCoupon(" sale10 ")?.code).toBe("SALE10");
});

test("returns null for an unknown code", () => {
  expect(findCoupon("FREE")).toBeNull();
});

test("no coupon means no discount", () => {
  expect(getDiscount(1000, null)).toBe(0);
});

test("rounds the discount to kuruş", () => {
  expect(getDiscount(99.99, findCoupon("SALE10"))).toBe(10);
});
