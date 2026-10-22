---
title: "Ürün Kartı"
description: "E-ticaret ürün kartı için adım adım test."
lastVerified: "2026-10-14"
translationKey: "vitest/project-product-card"
---

## Senaryo

Mağaza sayfasında her ürün bir kartta görünür. Kart şunları yapar:

- Ürün adını ve fiyatını gösterir.
- **Sepete ekle** butonuna tıklanınca ürünü bildirir.
- Ürün stokta yoksa **Stokta yok** yazar ve butonu devre dışı bırakır.
- Ürün indirimliyse eski fiyatı üstü çizili gösterir.

Projenin çalışan hali GitHub'da: [examples/vitest/project](https://github.com/virastack/academy/tree/main/examples/vitest/project). Takıldığınızda karşılaştırın.

## Component

Bu proje boyunca kullanacağınız son `ProductCard` sürümü. Önceki sürüme `oldPrice` ve `aria-labelledby` eklendi.[^1] Bu iki ekleme sonraki derslerde işe yarar.

```tsx
import { formatPrice } from "./format-price";
import type { Product } from "./types";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const titleId = `product-${product.id}-title`;

  return (
    <article aria-labelledby={titleId}>
      <h2 id={titleId}>{product.name}</h2>
      {product.oldPrice ? <s>{formatPrice(product.oldPrice)}</s> : null}
      <p>{formatPrice(product.price)}</p>
      {product.inStock ? null : <p>Stokta yok</p>}
      <button
        type="button"
        disabled={!product.inStock}
        onClick={() => onAddToCart(product)}
      >
        Sepete ekle
      </button>
    </article>
  );
}
```

`Product` tipine isteğe bağlı bir `oldPrice` alanı ekleyin:

```ts
export type Product = {
  id: number;
  name: string;
  price: number;
  oldPrice?: number;
  inStock: boolean;
};
```

## Testler

Testleri tek bir dosyada, adım adım yazın. Önce ortak veriyi tanımlayın:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "./ProductCard";
import type { Product } from "./types";

const headphones: Product = {
  id: 1,
  name: "Kablosuz Kulaklık",
  price: 1299,
  inStock: true,
};
```

### Adım 1: Ürün bilgisi

```tsx
describe("ProductCard", () => {
  test("ürün adını ve fiyatını gösterir", () => {
    render(<ProductCard product={headphones} onAddToCart={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Kablosuz Kulaklık" }),
    ).toBeInTheDocument();
    expect(screen.getByText("₺1.299,00")).toBeInTheDocument();
  });
});
```

Sonraki üç testi aynı `describe` bloğunun içine ekleyin.

### Adım 2: Sepete ekleme

```tsx
test("Sepete ekle butonuna tıklayınca ürünü bildirir", async () => {
  const user = userEvent.setup();
  const onAddToCart = vi.fn();
  render(<ProductCard product={headphones} onAddToCart={onAddToCart} />);

  await user.click(screen.getByRole("button", { name: "Sepete ekle" }));

  expect(onAddToCart).toHaveBeenCalledWith(headphones);
});
```

### Adım 3: Stokta olmayan ürün

```tsx
test("stokta olmayan ürün için butonu devre dışı bırakır", async () => {
  const user = userEvent.setup();
  const onAddToCart = vi.fn();
  render(
    <ProductCard
      product={{ ...headphones, inStock: false }}
      onAddToCart={onAddToCart}
    />,
  );

  expect(screen.getByText("Stokta yok")).toBeVisible();
  expect(screen.getByRole("button", { name: "Sepete ekle" })).toBeDisabled();

  await user.click(screen.getByRole("button", { name: "Sepete ekle" }));

  expect(onAddToCart).not.toHaveBeenCalled();
});
```

### Adım 4: İndirimli fiyat

```tsx
test("indirimli üründe eski fiyatı gösterir", () => {
  render(
    <ProductCard
      product={{ ...headphones, oldPrice: 1499 }}
      onAddToCart={vi.fn()}
    />,
  );

  expect(screen.getByText("₺1.499,00")).toBeInTheDocument();
  expect(screen.getByText("₺1.299,00")).toBeInTheDocument();
});
```

> [!TIP]
>
> `userEvent` tarayıcı gibi davranır. Devre dışı butona tıklamak `onAddToCart` fonksiyonunu çağırmaz.[^2]

## Hangi konuyu tekrar ettiniz?

| Adım | Tekrar edilen konu |
| --- | --- |
| 1 | `render`, `screen`, `getByRole`, `toBeInTheDocument`[^3] |
| 2 | `userEvent`, `vi.fn`, `toHaveBeenCalledWith`[^2] |
| 3 | `toBeVisible`, `toBeDisabled`, `not.toHaveBeenCalled`[^4] |
| 4 | `getByText` ve ortak test verisi |

<details>
<summary>Fiyat metni neden sabit yazılır?</summary>

- Fiyat metnini `formatPrice` ile üretmeyin. Testte `"₺1.299,00"` gibi sabit metin yazın. Biçim bozulursa test başarısız olur ve hatayı gösterir.
- Fiyat biçimi `Intl` için kullanılan ICU verisine bağlıdır. Bu veri Node.js derlemesine ve sisteme göre değişebilir. Takımınız farklı ortamlar kullanıyorsa CI ortamında bir kez çalıştırarak doğrulayın.[^5]

</details>

## Kendin dene

Önce testi yazın, sonra component'i değiştirin (TDD). İndirimli ürün için yüzde bilgisi eklenecek.

- Test: `price` 1299, `oldPrice` 1499 olan ürün kartında **%13 indirim** yazısı görünür.
- Testin başarısız olduğunu görün.
- `ProductCard` içine yüzdeyi hesaplayıp gösterin.
- Testin geçtiğini görün.

## Kaynaklar

1. [WAI-ARIA 1.2: Roles](https://www.w3.org/TR/wai-aria-1.2/#article) *(doc)* — `article` rolünün adı içerikten değil yazardan gelir, bu yüzden `aria-labelledby` gerekir.
2. [user-event: Giriş](https://testing-library.com/docs/user-event/intro) *(doc)* — `userEvent` tarayıcının izin vermediği etkileşimi, örneğin devre dışı alanı, yapmaz.
3. [React Testing Library: Örnek](https://testing-library.com/docs/react-testing-library/example-intro) *(doc)* — `render`, `screen` ve rol sorgularıyla örnek test.
4. [jest-dom](https://github.com/testing-library/jest-dom) *(repo)* — `toBeVisible` ve `toBeDisabled` matcher'larının kuralları.
5. [Node.js: Internationalization support](https://nodejs.org/api/intl.html) *(doc)* — `Intl` çıktısının ICU verisine ve Node.js derlemesine bağlılığı.
