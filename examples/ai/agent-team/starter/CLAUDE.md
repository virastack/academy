# Sepet

- React 19, TypeScript, Tailwind CSS v4. Başka kütüphane ekleme.
- Para hesapları `src/lib/` altında saf fonksiyonlardır. Bileşenler hesap yapmaz, bu fonksiyonları çağırır.
- Fiyatları her zaman `formatPrice` ile göster.
- Birim testleri `src/**/*.test.ts(x)` (Vitest), uçtan uca testler `e2e/` (Playwright).
- Komutlar: `npm run test:unit`, `npm run test:e2e`, `npm run build`.
- Yeni özellik `SPEC.md` olmadan başlamaz. Ekip akışı için `/feature-team` skill'ini kullan.
