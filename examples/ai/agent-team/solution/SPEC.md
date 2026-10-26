# Cart coupon

## Goal
Kullanıcı sepette kupon kodu girip indirim alabilsin.

## Acceptance criteria
1. `SALE10` girildiğinde ara toplamdan %10 düşülür. Sepette 1.000 TL varsa toplam 900 TL olur.
2. Kod büyük/küçük harf ve baştaki/sondaki boşluklardan etkilenmez: ` sale10 ` de geçerlidir.
3. Geçersiz kodda input altında "Kupon geçersiz" yazar, toplam değişmez.
4. Geçerli kupon uygulanınca özette "İndirim (SALE10)" satırı görünür.
5. Aynı anda tek kupon uygulanır. Yeni geçerli kod eskisinin yerine geçer.
6. "Kaldır" butonu kuponu kaldırır, toplam ara toplama döner.

## Files
- `src/lib/coupon.ts` (new): `applyCoupon(subtotal, code)`
- `src/components/CouponForm.tsx` (new)
- `src/components/CartSummary.tsx`
- `src/App.tsx`

## Out of scope
- Kupon yönetim paneli, sunucudan kupon doğrulama, kullanıcı başına limit.

## Boundaries
- Always: hesapları `src/lib/` altında saf fonksiyonla yap, fiyatı `formatPrice` ile göster.
- Ask first: yeni paket eklemeden önce sor.
- Never: `getSubtotal`'ın davranışını değiştirme.

## Verification
`npm run test:unit` ve `npm run test:e2e` geçer. Playwright: `SALE10` ile toplam ₺1.000,00'dan ₺900,00'a düşer.
