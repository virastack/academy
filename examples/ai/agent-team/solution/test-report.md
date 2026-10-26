# Test report

| # | Kriter | Test | Sonuç |
| --- | --- | --- | --- |
| 1 | SALE10 %10 indirim | `coupon.test.ts`, `e2e/coupon.spec.ts` | geçti |
| 2 | Büyük/küçük harf ve boşluk | `coupon.test.ts`, `e2e/coupon.spec.ts` | geçti |
| 3 | Geçersiz kodda hata | `e2e/coupon.spec.ts` | geçti |
| 4 | İndirim satırı | `e2e/coupon.spec.ts` | geçti |
| 5 | Tek kupon | Ayrı test yok: tek geçerli kod var, state tek `Coupon` tutuyor | elle kontrol edildi |
| 6 | Kaldır | `e2e/coupon.spec.ts` | geçti |

Unit: 8 passed. E2E: 4 passed.

STATUS: PASS
