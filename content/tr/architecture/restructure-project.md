---
title: "Proje Yapısını Düzenleme"
description: "Dağınık bir e-ticaret projesini feature-based yapıya taşıma."
lastVerified: "2026-10-22"
translationKey: "architecture/restructure-project"
---

## Senaryo

Elinizde küçük bir mağaza var. Ürünler listeleniyor, sepete ekleniyor, detay sayfası açılıyor. Uygulama çalışıyor ama yapısı dağınık:

| Sorun | Nerede |
| :-- | :-- |
| Dosyalar türe göre dizilmiş | `components/`, `hooks/`, `utils/`, `types/` |
| Genel dosya adları | `utils/utils.ts`, `types/types.ts` |
| `PascalCase` dosya adları | `ProductCard.tsx`, `useCart.ts` |
| `../../../` import'ları | `app/products/[slug]/page.tsx` |
| `export *` barrel'ı ve döngü | `components/index.ts` ile `hooks/useCart.ts` |
| Ürün kartı sepeti biliyor | `ProductCard` içinde `AddToCartButton` |

Göreviniz bu projeyi [Klasör Yapısı ve İsimlendirme](/academy/architecture/folder-structure) ile [Component ve Kod Organizasyonu](/academy/architecture/component-organization) derslerindeki yapıya taşımak. Tek kural var: kullanıcı hiçbir farkı görmemeli.

Başlangıç ve çözüm GitHub'da: [examples/architecture/restructure-project](https://github.com/virastack/academy/tree/main/examples/architecture/restructure-project). `starter/` klasöründen başlayın, takıldığınızda `solution/` ile karşılaştırın.

> [!NOTE]
>
> Proje `next@16.4.2`, `eslint@9.39.5` ve `@playwright/test@1.64.1` ile yazıldı. Testler Chromium'da production build üzerinde çalıştırıldı.

## Adım 1: Önce Testi Çalıştırın

[Martin Fowler](https://martinfowler.com)'ın tanımıyla refactoring, kodun iç yapısını *gözlemlenebilir davranışını değiştirmeden* düzenlemektir.[^1] Davranışın değişmediğini bilmenin yolu bir testtir.

Projede bir Playwright testi hazır. Ürünleri sepete ekliyor ve başlıktaki özeti kontrol ediyor:

```ts
// e2e/cart.spec.ts
await page.getByRole("button", { name: "Mekanik Klavye sepete ekle" }).click();
await page.getByRole("button", { name: "Kablosuz Mouse sepete ekle" }).click();
await expect(summary).toHaveText("Sepet: 2 ürün, ₺3.398,00");
```

```command
cd starter
npm install
npx playwright install chromium
npm run test:e2e
```

İki test geçmeli. Test dosya yollarını, bileşen adlarını ya da state'i bilmiyor; yalnızca kullanıcının gördüğüne bakıyor. [Kent C. Dodds](https://kentcdodds.com), iç ayrıntıya bağlı testlerin refactoring sırasında kod sağlamken kırıldığını yazar.[^2] Bu test ise taşıma boyunca hiç değişmeyecek.

## Adım 2: Kuralları Ekleyin

Kuralları en başta açın. Lint hataları yapılacak işlerin listesi olur.

```js
// eslint.config.mjs
{
  files: ["src/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{ regex: "^\\.\\./", message: "Use the `@/` alias instead of `../`." }],
    }],
    "import/no-cycle": "error",
    "import/no-restricted-paths": ["error", {
      zones: [
        { target: "./src/features/cart", from: "./src/features", except: ["./cart"] },
        { target: "./src/features/products", from: "./src/features", except: ["./products"] },
        { target: "./src/features", from: "./src/app" },
        { target: ["./src/components", "./src/helpers"], from: ["./src/features", "./src/app"] },
      ],
    }],
  },
},
```

`import` eklentisini `eslint-config-next` zaten kaydediyor, ayrıca kurmanız gerekmez.

- `no-restricted-imports` yalnızca `../` ile başlayan import'ları yasaklar.[^3]
- `import/no-cycle` döngüsel import'u bulur.[^4]
- `import/no-restricted-paths` özelliklerin birbirini import etmesini ve akışın tersine dönmesini engeller.[^5]

> [!WARNING]
>
> `../` yasağı için `import/no-relative-parent-imports` kuralını kullanmayın. Kural çözümlenen dosya yoluna bakıyor. Denemede `@/components/ui/button` gibi alias'lı import'ları da hata saydı.

```command
npm run lint
```

```text
src/components/CartSummary.tsx
  3:1  error  '../hooks/useCart' import is restricted from being used by a pattern. Use the `@/` alias instead of `../`  no-restricted-imports
  3:1  error  Dependency cycle via ../components:3  import/no-cycle

✖ 22 problems (22 errors, 0 warnings)
```

Zone hataları henüz çıkmıyor, çünkü `features/` klasörü yok. Onlar taşıma sırasında görünecek.

## Adım 3: Ortak Kodu Ayırın

`utils/utils.ts` üç farklı işi bir arada tutuyor. Her fonksiyonu kullanıldığı yere taşıyın:

| Fonksiyon | Yeni yeri | Neden |
| :-- | :-- | :-- |
| `formatPrice` | `helpers/format-price.ts` | Hem ürün hem sepet kullanıyor |
| `getCartTotal` | `features/cart/helpers/cart-total.ts` | Yalnızca sepet kullanıyor |
| `getProductBySlug` | `features/products/data/products.ts` | Ürün verisiyle birlikte durmalı |

`Button` de iki özelliğin ortak parçası; `components/ui/button.tsx`'e gider. `types/types.ts` ikiye bölünür: `Product` ürüne, `CartItem` sepete.

Ortak katmana yalnızca iki özelliğin gerçekten paylaştığı kod çıkar.[^6] Gerisi özelliğin içinde kalır; [Kent C. Dodds](https://kentcdodds.com)'ın dediği gibi kod, ilgili olduğu yere yakın durur.[^7]

## Adım 4: Özellikleri Taşıyın

```text
src/
├── app/
├── components/ui/button.tsx
├── helpers/format-price.ts
└── features/
    ├── products/
    │   ├── components/product-card.tsx
    │   ├── data/products.ts
    │   ├── types/product.ts
    │   └── index.ts
    └── cart/
        ├── components/{cart-provider,cart-summary,add-to-cart-button}.tsx
        ├── helpers/cart-total.ts
        ├── types/cart-item.ts
        └── index.ts
```

Dosya adlarını `kebab-case` yapın. Linux'ta çalışan CI büyük/küçük harfi ayırır; tek bir yazım seçmek canlıda *"Module not found"* sürprizini önler.[^8] Import'ları `@/` ile yazın; `create-next-app` bu alias'ı kendisi kurar.[^9]

## Adım 5: Döngüyü Kırın

Başlangıçta döngü şöyle kuruluyor: `CartSummary` → `hooks/useCart` → `components/index.ts` → `CartSummary`. `export *` barrel'ı her şeyi her şeye bağlıyor.

İki değişiklik yeter:

1. `useCart`'ı `cart-provider.tsx`'e taşıyın. Context ve hook aynı dosyada durur.
2. Özelliğin kökündeki `index.ts`'i ince tutun: yalnızca dışarının kullandığı parçalar, adlandırılmış re-export ile.[^10]

```ts
// features/cart/index.ts
export { AddToCartButton } from "./components/add-to-cart-button";
export { CartProvider } from "./components/cart-provider";
export { CartSummary } from "./components/cart-summary";
export type { CartItem } from "./types/cart-item";
```

Özelliğin kendi dosyaları birbirini `index.ts` üzerinden değil, doğrudan dosya yoluyla import eder. [TkDodo](https://tkdodo.eu), barrel'ların döngüsel import'a ne kadar kolay yol açtığını anlatır.[^11]

## Adım 6: Özellikleri Ayırın

`ProductCard` dosyasını `features/products`'a taşıdığınızda lint şunu söyler:

```text
src/features/products/components/product-card.tsx
  2:33  error  Unexpected path "@/features/cart" imported in restricted zone  import/no-restricted-paths
```

Ürün kartı sepeti bilmemeli. Butonu kartın dışından, bir prop ile verin:

```tsx
// features/products/components/product-card.tsx
export function ProductCard({ product, action }: { product: Product; action?: React.ReactNode }) {
  return (
    <article className="card">
      <h2><Link href={`/products/${product.slug}`}>{product.name}</Link></h2>
      <p>{formatPrice(product.price)}</p>
      {action}
    </article>
  );
}
```

```tsx
// app/page.tsx
<ProductCard product={product} action={<AddToCartButton {...product} />} />
```

İki özelliği birleştirmek sayfanın işi. Akış tek yönlü kalır: ortak kod → özellikler → uygulama.[^6]

## Adım 7: Son Kontrol

```command
npm run lint && npm run typecheck && npm run test:e2e
```

Üçü de hatasız geçmeli. Test dosyası tek satır değişmeden geçiyorsa taşıma davranışı korumuş demektir.

> [!TIP]
>
> Bu işi bir kodlama ajanına verecekseniz önce Adım 1 ve 2'yi siz yapın. Test ve lint, ajanın işini kendi kontrol edebileceği bir hedef olur.

## Kendin Dene

- `features/products` içinden `@/features/cart/components/cart-provider` import edin ve hatayı görün.
- Bir `checkout` özelliği ekleyin. Zone listesine kendi satırını yazın; sepet toplamına ihtiyaç duyarsa `cartTotal`'ı nereye taşımanız gerektiğine karar verin.
- `features/cart/index.ts`'i `export *` ile yazın, sonra `useCart`'ı oradan import edip `import/no-cycle` çıktısına bakın.

## Kaynaklar

1. [Martin Fowler: Definition Of Refactoring](https://martinfowler.com/bliki/DefinitionOfRefactoring.html) *(article)* — Refactoring'in tanımı: gözlemlenebilir davranışı değiştirmeden iç yapıyı düzenlemek. 1 Eylül 2004.
2. [Kent C. Dodds: Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details) *(article)* — İç ayrıntıya bağlı testlerin refactoring'de yanlış alarm vermesi. 17 Ağustos 2020.
3. [ESLint: no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports) *(doc)* — `patterns` içinde `regex` ile import yolu kısıtlama.
4. [eslint-plugin-import: no-cycle](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-cycle.md) *(repo)* — Döngüsel import tespiti ve `maxDepth`.
5. [eslint-plugin-import: no-restricted-paths](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md) *(repo)* — `target`, `from` ve `except` ile klasörler arası import yasağı.
6. [bulletproof-react: Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) *(repo)* — Feature klasörleri, özellikler arası import yasağı ve tek yönlü akış.
7. [Kent C. Dodds: Colocation](https://kentcdodds.com/blog/colocation) *(article)* — Kodu ilgili olduğu yere yakın koyma ilkesi. 17 Haziran 2019.
8. [joulev/nextjs-faq: "Module not found" on deployment](https://github.com/joulev/nextjs-faq/blob/main/content/module-not-found-due-to-case-sensitivity.mdx) *(article)* — Büyük/küçük harf duyarlılığı yüzünden canlıda kırılan import'lar.
9. [Next.js: Installation](https://nextjs.org/docs/app/getting-started/installation) *(doc)* — `@/*` alias'ı ve mutlak import'lar.
10. [Feature-Sliced Design: Public API](https://feature-sliced.design/docs/reference/public-api) *(doc)* — Özelliğin dışa açık sözleşmesi olarak `index.ts` ve `export *` sorunu.
11. [TkDodo: Please Stop Using Barrel Files](https://tkdodo.eu/blog/please-stop-using-barrel-files) *(article)* — Barrel dosyalarının döngüsel import'a ve yavaşlığa etkisi. 26 Temmuz 2024.
