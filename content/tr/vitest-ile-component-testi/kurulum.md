---
title: "Kurulum"
description: "Vitest, jsdom ve React Testing Library kurulumu."
lastVerified: "2026-10-14"
translationKey: "vitest-ile-component-testi/kurulum"
---

## Gereksinimler

- Node.js 22.12 veya üstü.
- Vite 6.4 veya üstü.
- React 18 veya 19.

Bu gereksinimler Vitest 5 içindir. Projeniz Vite ile oluşturulduysa ek bir ayar gerekmez.

## Paketleri kurun

```command
npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```

| Paket | Ne için |
| --- | --- |
| `vitest` | Test runner |
| `jsdom` | DOM ortamı |
| `@testing-library/react` | `render`, `screen` ve `renderHook` |
| `@testing-library/dom` | React Testing Library'nin peer dependency paketi |
| `@testing-library/jest-dom` | DOM matcher'ları |
| `@testing-library/user-event` | Kullanıcı etkileşimi |

> [!WARNING]
>
> `@testing-library/dom` paketini ayrıca kurun. React Testing Library bu paketi kendisi kurmaz.

## Vitest ayarı

`vite.config.ts` dosyasına bir `test` bloğu ekleyin. `defineConfig` fonksiyonunu `vitest/config` paketinden alın.

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/vitest.setup.ts"],
  },
});
```

| Ayar | Anlamı |
| --- | --- |
| `environment: "jsdom"` | Testler jsdom ortamında çalışır. Bu ayar olmadan `document` tanımsız olur. |
| `globals: true` | `describe`, `test`, `expect` ve `vi` fonksiyonlarını import etmeden kullanırsınız. |
| `setupFiles` | Her test dosyasından önce çalışan dosya. |

## Setup dosyası

`src/vitest.setup.ts` dosyasını oluşturun:

```ts
import "@testing-library/jest-dom/vitest";
```

Bu satır `toBeInTheDocument` gibi matcher'ları Vitest'e ekler.

## TypeScript tipleri

`tsconfig.app.json` dosyasındaki `types` listesine iki paket ekleyin. Projenizde tek bir `tsconfig.json` varsa o dosyayı kullanın.

```json
{
  "compilerOptions": {
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  }
}
```

## Script'ler

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

| Komut | Davranış |
| --- | --- |
| `npm test` | Watch mode. Dosya değişince ilgili testler tekrar çalışır. |
| `npm run test:run` | Testleri bir kez çalıştırır. CI ortamında bunu kullanın. |

Vitest, rapor dosyalarını `.vitest` klasörüne yazar. Bu klasörü `.gitignore` dosyasına ekleyin:

```bash
.vitest/
```

## İlk test

E-ticaret örneğimiz için önce `Product` tipini oluşturun. Dosya: `src/types.ts`.

```ts
export type Product = {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
};
```

Fiyatı Türk lirası olarak biçimlendiren bir fonksiyon yazın. Dosya: `src/format-price.ts`.

```ts
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(price);
}
```

Ürün adını ve fiyatını gösteren bir component yazın. Dosya: `src/ProductCard.tsx`.

```tsx
import { formatPrice } from "./format-price";
import type { Product } from "./types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article>
      <h2>{product.name}</h2>
      <p>{formatPrice(product.price)}</p>
    </article>
  );
}
```

Şimdi testi yazın. Dosya: `src/ProductCard.test.tsx`.

```tsx
import { render, screen } from "@testing-library/react";
import { ProductCard } from "./ProductCard";

test("ürün adını ve fiyatını gösterir", () => {
  render(
    <ProductCard
      product={{ id: 1, name: "Kablosuz Kulaklık", price: 1299, inStock: true }}
    />,
  );

  expect(
    screen.getByRole("heading", { name: "Kablosuz Kulaklık" }),
  ).toBeInTheDocument();
  expect(screen.getByText("₺1.299,00")).toBeInTheDocument();
});
```

Testi çalıştırın:

```bash
npm run test:run
```

Test geçerse kurulum tamamdır. Vitest, adında `.test.` veya `.spec.` geçen dosyaları çalıştırır. Test dosyasını, test ettiğiniz dosyanın yanına koyun.

<details>
<summary>Sık kurulum hataları</summary>

<ul>
<li>`document is not defined`: Test ortamı `node` olarak kalmış. `environment: "jsdom"` ayarını ekleyin.</li>
<li>`Invalid Chai property: toBeInTheDocument`: Setup dosyası yüklenmemiş. `setupFiles` yolunu kontrol edin.</li>
<li>TypeScript `toBeInTheDocument` için hata verir: `types` listesine `@testing-library/jest-dom` ekleyin.</li>
<li>`Cannot find module '@testing-library/dom'`: Peer dependency eksik. Paketi kurun.</li>
</ul>

</details>

<details>
<summary>globals: false ve Next.js</summary>

<ul>
<li>`globals: false` kullanırsanız her test dosyasında `test`, `expect` ve `vi` fonksiyonlarını `vitest` paketinden import edin. React Testing Library'nin otomatik temizliği global `afterEach` fonksiyonuna bağlıdır. Bu durumda setup dosyasında `afterEach(() => cleanup())` çağırın.</li>
<li>Next.js projelerinde Vitest, Client Component ve senkron Server Component testleri için çalışır. `async` Server Component'ler için E2E test kullanın.</li>
</ul>

</details>

## Kendin dene

- `src/format-price.test.ts` dosyası oluşturun.
- `formatPrice(0)` ifadesinin `₺0,00` döndürdüğünü test edin.
- Beklenen değeri bilerek bozun. Testin başarısız olduğunu görün.
- Beklenen değeri düzeltin. Testin geçtiğini görün.

- [Vitest: Başlangıç](https://vitest.dev/guide/)
- [React Testing Library: Giriş](https://testing-library.com/docs/react-testing-library/intro)
