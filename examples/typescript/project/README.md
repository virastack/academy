# Ürün Kataloğu

[TypeScript rehberindeki](https://virastack.com/academy/typescript/project) proje dersinin çalışan hali. Takıldığınızda karşılaştırın.

Vite'ın `react-ts` şablonuyla kurulmuş küçük bir mağaza sayfası: ürünleri `public/products.json`'dan çeker, `isProduct` type guard'ından geçirir, kategoriye göre filtreler ve sepete ekler.

## Çalıştırma

```bash
npm install
npm run dev
```

## Tip kontrolü ve build

```bash
npm run build
```

`npm run build` önce `tsc -b` ile tip kontrolü yapar, sonra Vite ile derler. Kök `tsconfig.json` yalnızca `references` içerdiği için `npx tsc --noEmit` hiçbir dosyayı kontrol etmez; `tsc -b` kullanın.

| Dosya | Ne öğretir |
| :-- | :-- |
| `src/types.ts` | `as const` ile türetilen `Category`, `Product`, `CartItem`, `FetchState<T>` |
| `src/api.ts` | `unknown` veriyi `isProduct` type guard'ıyla daraltmak |
| `src/use-fetch.ts` | Generic `useFetch<T>` hook'u |
| `src/components/` | Props tipleri ve `ChangeEvent` |
| `src/cart-context.ts`, `src/CartProvider.tsx` | Tipli context ve `useReducer` |
| `tsconfig.app.json` | `strict` ve `noUncheckedIndexedAccess` |
