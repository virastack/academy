# Çok Dilli Sayfa ve CI Hattı

[Mimari rehberindeki](https://virastack.com/academy/architecture/multilingual-ci-project) proje dersinin dosyaları. Anlatım rehberde.

- `starter/`: Buradan başlayın. Tek dilli, metinleri koda gömülü bir ürün sayfası.
- `solution/`: Aynı sayfanın next-intl ile Türkçe ve İngilizce hali. ESLint, Prettier, tip kontrolü, çeviri anahtarı testi (Vitest), Playwright testleri ve `.github/workflows/ci.yml`.

```bash
cd solution
pnpm install
pnpm exec playwright install chromium
pnpm lint && pnpm format:check && pnpm check-types && pnpm test && pnpm test:e2e
```

`ci.yml` bu klasörde çalışmaz; GitHub yalnızca deponun kökündeki `.github/workflows` klasörünü okur. Kendi deponuzun köküne kopyalayın.
