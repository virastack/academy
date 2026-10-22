# Proje Yapısını Düzenleme

[Mimari rehberindeki](https://virastack.com/academy/architecture/restructure-project) proje dersinin dosyaları. Anlatım rehberde.

- `starter/`: Buradan başlayın. Türe göre dizilmiş bir mağaza: `components/`, `hooks/`, `utils/utils.ts`, `types/types.ts`, `../` import'ları ve `export *` barrel'ı.
- `solution/`: Aynı uygulamanın feature-based hali. `src/features/products` ve `src/features/cart`, `@/` alias'ı ve sınırları zorlayan ESLint kuralları.

İki klasörde de aynı Playwright testi var. Taşıma bitince test yine geçmeli; davranış değişmemeli.

```bash
cd starter
npm install
npx playwright install chromium
npm run test:e2e   # 2 test geçer
npm run lint       # başta temiz; kuralları ekleyince 22 hata
```

`solution/` içinde `npm run lint`, `npm run typecheck` ve `npm run test:e2e` hatasız geçer.
