# Mağaza Testleri

[Vitest rehberindeki](https://virastack.com/academy/vitest) üç proje dersinin çalışan hali: Ürün Kartı, Ürün Listesi ve Sepet Akışı. Takıldığınızda karşılaştırın.

Vite'ın `react-ts` şablonuyla kurulmuş, [Kurulum](https://virastack.com/academy/vitest/setup) dersindeki gibi Vitest, jsdom, React Testing Library ve MSW eklenmiş bir proje.

## Çalıştırma

```bash
npm install
npm test          # watch mode
npm run test:run  # bir kez, CI için
```

Demo sayfası için `npm run dev`. Gerçek API (`api.magaza.test`) yalnızca testlerde MSW ile var; demo sayfası aynı ürünleri yerelden yükler.

## Tip kontrolü

```bash
npm run build
```

`tsc -b` test dosyalarını da kontrol eder.

| Dosya | Ders |
| :-- | :-- |
| `src/ProductCard.tsx`, `src/ProductCard.test.tsx` | Ürün Kartı |
| `src/ProductList.tsx`, `src/ProductList.test.tsx` | Ürün Listesi |
| `src/cart-context.tsx`, `src/cart-components.tsx`, `src/test-utils.tsx`, `src/cart.test.tsx` | Provider ve Hook |
| `src/fetch-products.ts`, `src/mocks/`, `src/fetch-products.test.tsx` | Mock |
| `src/ShopPage.tsx`, `src/ShopPage.test.tsx` | Sepet Akışı |
| `vite.config.ts`, `src/vitest.setup.ts` | Kurulum ve Mock |

`cart.test.tsx`, Provider ve Hook dersindeki component testleriyle hook testini tek dosyada toplar; hook testi aynı `keyboard` verisini kullanır.
