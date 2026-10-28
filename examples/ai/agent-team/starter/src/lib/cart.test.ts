import { cartItems } from "../data";
import { formatPrice, getSubtotal } from "./cart";

test("sums price times quantity", () => {
  expect(getSubtotal(cartItems)).toBe(1000);
});

test("returns 0 for an empty cart", () => {
  expect(getSubtotal([])).toBe(0);
});

test("formats prices in euros", () => {
  expect(formatPrice(1000)).toBe("€1,000.00");
});
