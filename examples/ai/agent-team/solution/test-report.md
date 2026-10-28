# Test report

| # | Criterion | Test | Result |
| --- | --- | --- | --- |
| 1 | SALE10 gives 10% off | `coupon.test.ts`, `e2e/coupon.spec.ts` | passed |
| 2 | Case and spaces | `coupon.test.ts`, `e2e/coupon.spec.ts` | passed |
| 3 | An error for an invalid code | `e2e/coupon.spec.ts` | passed |
| 4 | The discount line | `e2e/coupon.spec.ts` | passed |
| 5 | A single coupon | No separate test: there is one valid code and the state holds a single `Coupon` | checked by hand |
| 6 | Remove | `e2e/coupon.spec.ts` | passed |

Unit: 8 passed. E2E: 4 passed.

STATUS: PASS
