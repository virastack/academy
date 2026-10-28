# Cart coupon

## Goal
Let the user enter a coupon code in the cart and get a discount.

## Acceptance criteria
1. Entering `SALE10` takes 10% off the subtotal. With €1,000 in the cart the total becomes €900.
2. The code is unaffected by case and by leading or trailing spaces: ` sale10 ` is valid too.
3. For an invalid code, "Invalid coupon" appears under the input and the total does not change.
4. When a valid coupon is applied, a "Discount (SALE10)" line appears in the summary.
5. Only one coupon applies at a time. A new valid code replaces the old one.
6. The "Remove" button removes the coupon and the total goes back to the subtotal.

## Files
- `src/lib/coupon.ts` (new): `applyCoupon(subtotal, code)`
- `src/components/CouponForm.tsx` (new)
- `src/components/CartSummary.tsx`
- `src/App.tsx`

## Out of scope
- A coupon management panel, validating coupons on the server, a per-user limit.

## Boundaries
- Always: do the calculations with pure functions under `src/lib/`, and show the price with `formatPrice`.
- Ask first: ask before adding a new package.
- Never: do not change `getSubtotal`'s behaviour.

## Verification
`npm run test:unit` and `npm run test:e2e` pass. Playwright: with `SALE10` the total goes from €1,000.00 to €900.00.
