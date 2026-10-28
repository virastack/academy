---
title: "Temeller"
description: "İlk test, render, expect ve matcher'lar."
lastVerified: "2026-10-14"
translationKey: "vitest/basics"
---

## Test yapısı

Bir test üç adımdan oluşur. Bu yapıya **Arrange – Act – Assert (AAA)** denir. Türkçesi: *hazırla – uygula – doğrula*.

| Adım | Ne yapılır | Örnek |
| --- | --- | --- |
| Arrange (hazırla) | Component'i hazırla ve render et. | `render(<ProductCard ... />)` |
| Act (uygula) | Kullanıcı işlemini yap. | `await user.click(button)` |
| Assert (doğrula) | Sonucu kontrol et. | `expect(...).toHaveBeenCalledWith(...)` |

Bu adımda `ProductCard` component'ine bir **Add to cart** butonu ekleyin:

```tsx
import { formatPrice } from "./format-price";
import type { Product } from "./types";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <article>
      <h2>{product.name}</h2>
      <p>{formatPrice(product.price)}</p>
      {product.inStock ? null : <p>Out of stock</p>}
      <button
        type="button"
        disabled={!product.inStock}
        onClick={() => onAddToCart(product)}
      >
        Add to cart
      </button>
    </article>
  );
}
```

Butona tıklanınca `onAddToCart` fonksiyonunun çağrıldığını test edin:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "./ProductCard";

test("reports the product when Add to cart is clicked", async () => {
  // Arrange
  const user = userEvent.setup();
  const product = { id: 1, name: "Wireless Headphones", price: 1299, inStock: true };
  const onAddToCart = vi.fn();
  render(<ProductCard product={product} onAddToCart={onAddToCart} />);

  // Act
  await user.click(screen.getByRole("button", { name: "Add to cart" }));

  // Assert
  expect(onAddToCart).toHaveBeenCalledWith(product);
});
```

> [!CAUTION]
>
> `user.click` bir Promise döndürür. `await` yazmazsanız doğrulama tıklama bitmeden çalışır ve test başarısız olur.

## test ve describe

- `test` ve `it` aynı işi yapar.[^1] **Birini seçin** ve tüm projede onu kullanın.
- `describe` aynı component'in testlerini gruplar.

```tsx
const headphones = { id: 1, name: "Wireless Headphones", price: 1299, inStock: true };

describe("ProductCard", () => {
  test("shows the product name and price", () => {
    render(<ProductCard product={headphones} onAddToCart={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Wireless Headphones" }),
    ).toBeInTheDocument();
    expect(screen.getByText("₺1.299,00")).toBeInTheDocument();
  });
});
```

Test adını *davranış* olarak yazın. Örnek: `"stokta olmayan ürün için butonu devre dışı bırakır"`. `"test 1"` gibi adlar kullanmayın.

## render ve screen

`render`, component'i jsdom içindeki `document.body` alanına çizer. Her testten sonra React Testing Library bu alanı otomatik temizler. Render sonrası elemanlara `screen` ile erişin.[^2]

`screen` ile elemanları üç sorgu ailesiyle bulursunuz: [!getBy], [!queryBy] ve [!findBy]. Aralarındaki farkı **Sorgular** adımında öğrenirsiniz. Şimdilik üç ön eki tanıyın.

> [!TIP]
>
> Üç ön ek tüm rehberde aynı rengi kullanır. Rozetin üzerine gelince kısa bir hatırlatma görürsünüz. Sayfanın üstündeki anahtarla ipuçlarını kapatabilirsiniz.

<details>
<summary>render'ın döndürdüğü sonuç</summary>

- `rerender(ui)` aynı component'i yeni props ile tekrar render eder.[^2]
- `unmount()` component'i DOM'dan kaldırır. Temizlik davranışını test etmek için kullanın.[^2]
- `container` render edilen kök elemanı verir. Elemanları `container` ile aramayın. Bunun yerine `screen` sorgularını kullanın.[^2]

</details>

## En sık kullanılan matcher'lar

`expect(değer)` ifadesinden sonra bir matcher çağırırsınız. DOM matcher'ları jest-dom'dan,[^3] genel ve mock matcher'ları Vitest'ten gelir.[^4] Component testlerinin büyük bölümü şu matcher'larla yazılır:

| Matcher | Ne kontrol eder |
| --- | --- |
| `toBeInTheDocument()` | Eleman DOM'da var. |
| `toBeVisible()` | Eleman kullanıcıya görünür. `display: none` ve `hidden` elemanlar görünür değildir. |
| `toBeDisabled()` / `toBeEnabled()` | Form elemanı devre dışı / aktif. |
| `toHaveTextContent("x")` | Eleman metni `x` içerir. |
| `toHaveValue("x")` | Input, select veya textarea değeri `x`. |
| `toHaveAttribute("href", "/x")` | Eleman bu attribute değerine sahip. |
| `toBe(x)` / `toEqual(x)` | Genel değer eşitliği. |
| `toHaveBeenCalledWith(...)` | Mock fonksiyon bu argümanlarla çağrıldı. |

> [!TIP]
>
> `toBeInTheDocument` ile `toBeVisible` farklıdır. `hidden` attribute'lu eleman DOM'da vardır ama görünür değildir. Kullanıcının görmesi gereken elemanlar için `toBeVisible` kullanın.

<details>
<summary>Diğer matcher'lar</summary>

- **jest-dom:** `toBeChecked()`, `toHaveFocus()`, `toHaveClass("x")`, `toHaveAccessibleName("x")`. Tam liste için [jest-dom belgesine](https://github.com/testing-library/jest-dom) bakın.[^3]
- **Vitest:** `toHaveLength(n)`, `toThrow()`, `toHaveBeenCalled()`, `toHaveBeenCalledTimes(n)`.[^4]

</details>

## Aynı testi farklı verilerle çalıştırma

Saf fonksiyonlar için `test.each` kullanın. Her veri satırı ayrı bir test olur:[^1]

```ts
import { formatPrice } from "./format-price";

test.each([
  [0, "₺0,00"],
  [899, "₺899,00"],
  [1299, "₺1.299,00"],
  [1299.5, "₺1.299,50"],
])("formats %s as '%s'", (price, expected) => {
  expect(formatPrice(price)).toBe(expected);
});
```

## Testleri bağımsız tutun

Her test *kendi başına* çalışmalıdır. Her testte component'i yeniden render edin. Testler arasında değişken paylaşmayın.

> [!WARNING]
>
> `test.only` kodunu commit etmeyin. Yerelde diğer testler çalışmaz ve eksik bir sonuca güvenmiş olursunuz. CI ortamında Vitest varsayılan olarak `.only` için hata verir, ama CI'a kadar gitmeden `.only`'yi silin.[^5]

<details>
<summary>beforeEach ve test.skip</summary>

- `beforeEach` ortak hazırlık için kullanılır. Yalnızca her testte tekrar eden hazırlık için tercih edin. Testin ne yaptığını okurken hazırlığı da görmek istersiniz.
- `test.skip(...)` testi atlar. `test.todo("...")` henüz yazılmamış testi not eder.[^1]

</details>

## Kendin dene

`ProductCard` için bir test yazın. Ürün stokta yoksa kullanıcı şunları görmelidir:

- **Out of stock** yazısı görünür.
- **Add to cart** butonu devre dışıdır.

## Kaynaklar

1. [Vitest: Test API](https://vitest.dev/api/test) *(doc)* — `test` ve `it` takma adı, `test.each`, `test.only`, `test.skip`, `test.todo` ve `describe`.
2. [React Testing Library: API](https://testing-library.com/docs/react-testing-library/api) *(doc)* — `render` sonucu, `document.body` içine çizim, otomatik temizlik ve `container` uyarısı.
3. [jest-dom: Matcher listesi](https://github.com/testing-library/jest-dom) *(repo)* — `toBeInTheDocument`, `toBeVisible`, `toBeDisabled`, `toHaveTextContent` ve diğer DOM matcher'ları.
4. [Vitest: expect API](https://vitest.dev/api/expect) *(doc)* — `toBe`, `toEqual`, `toHaveLength`, `toThrow` ve mock matcher'ları.
5. [Vitest: allowOnly](https://vitest.dev/config/allowonly) *(doc)* — CI ortamında `.only` varsayılan olarak yasak.
