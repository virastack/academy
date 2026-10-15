---
title: "Sepet Akışı"
description: "Ürün listesinden sepete tam akış testi."
lastVerified: "2026-10-14"
translationKey: "vitest/project-cart-flow"
---

## Senaryo

Bu adımda önceki tüm parçaları birleştirirsiniz. Kullanıcı mağaza sayfasını açar. Ürünleri görür, sepete ekler, toplamı kontrol eder ve bir ürünü çıkarır.

| Parça | Görevi | Öğrenildiği adım |
| --- | --- | --- |
| `ProductList` | API'den ürünleri yükler ve gösterir. | Ürün Listesi |
| `CartProvider` | Sepet durumunu paylaşır. | Provider ve Hook |
| `CartBadge` | Sepetteki ürün adedini gösterir. | Provider ve Hook |
| `CartSummary` | Ürünleri ve toplamı gösterir. | Provider ve Hook |
| MSW | API yanıtını taklit eder. | Mock |

## Sayfa

```tsx
import { CartBadge, CartSummary } from "./cart-components";
import { useCart } from "./cart-context";
import { fetchProducts } from "./fetch-products";
import { ProductList } from "./ProductList";

export function ShopPage() {
  const { addToCart } = useCart();

  return (
    <>
      <CartBadge />
      <ProductList loadProducts={fetchProducts} onAddToCart={addToCart} />
      <CartSummary />
    </>
  );
}
```

Sayfa gerçek `fetchProducts` fonksiyonunu kullanır. Testte MSW, API yanıtını verir. Hiçbir component mock'lanmaz. Bu, **entegrasyon testidir**.

## Testler

```tsx
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { server } from "./mocks/server";
import { ShopPage } from "./ShopPage";
import { renderWithProviders } from "./test-utils";
```

`http` ve `HttpResponse` MSW 3'te `msw/http` yolundan import edilir.[^1]

### Adım 1: Sepete ekleme ve toplam

Konu: MSW, `within`,[^2] `findByRole`,[^3] `userEvent`, Context.

```tsx
describe("ShopPage", () => {
  test("kullanıcı ürünleri sepete ekler ve toplamı görür", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShopPage />);

    const keyboard = await screen.findByRole("article", {
      name: "Mekanik Klavye",
    });
    await user.click(
      within(keyboard).getByRole("button", { name: "Sepete ekle" }),
    );
    await user.click(
      within(keyboard).getByRole("button", { name: "Sepete ekle" }),
    );

    const headphones = screen.getByRole("article", {
      name: "Kablosuz Kulaklık",
    });
    await user.click(
      within(headphones).getByRole("button", { name: "Sepete ekle" }),
    );

    expect(screen.getByRole("link", { name: "Sepet (3)" })).toBeInTheDocument();

    const summary = screen.getByRole("region", { name: "Sepet özeti" });
    expect(within(summary).getByText("Mekanik Klavye × 2")).toBeInTheDocument();
    expect(
      within(summary).getByText("Kablosuz Kulaklık × 1"),
    ).toBeInTheDocument();
    expect(within(summary).getByText("Toplam: ₺5.697,00")).toBeInTheDocument();
  });
```

Hesabı kontrol edin: 2 × 2.199 + 1.299 = 5.697. Beklenen değeri elle hesaplayın. Beklenen değeri koddaki formülle hesaplamayın.

> [!TIP]
>
> `article` ve `region` rollerinin erişilebilir adı içeriğinden değil, sizin verdiğiniz etiketten gelir. Bu yüzden `ProductCard` içinde `aria-labelledby`, `CartSummary` içinde `aria-label` bulunmalıdır. Etiket yoksa `name` ile sorgu eşleşmez.[^4]

### Adım 2: Sepetten çıkarma

Konu: erişilebilir isim (`aria-label`) ve sepetin boşalması.

```tsx
  test("kullanıcı ürünü sepetten çıkarır", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShopPage />);

    const keyboard = await screen.findByRole("article", {
      name: "Mekanik Klavye",
    });
    await user.click(
      within(keyboard).getByRole("button", { name: "Sepete ekle" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Mekanik Klavye ürününü sepetten çıkar",
      }),
    );

    expect(screen.getByText("Sepetiniz boş.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sepet (0)" })).toBeInTheDocument();
  });
```

### Adım 3: Stokta olmayan ürün

Konu: `toBeVisible` ve `toBeDisabled`.[^5]

```tsx
  test("stokta olmayan ürün sepete eklenemez", async () => {
    renderWithProviders(<ShopPage />);

    const mouse = await screen.findByRole("article", { name: "Oyuncu Faresi" });

    expect(within(mouse).getByText("Stokta yok")).toBeVisible();
    expect(
      within(mouse).getByRole("button", { name: "Sepete ekle" }),
    ).toBeDisabled();
  });
```

### Adım 4: API hatası

Konu: `server.use` ile tek test için farklı yanıt.[^6]

```tsx
  test("API hata verirse sepet çalışmaya devam eder", async () => {
    server.use(
      http.get(
        "https://api.magaza.test/products",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    renderWithProviders(<ShopPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ürünler yüklenemedi.",
    );
    expect(screen.getByRole("link", { name: "Sepet (0)" })).toBeInTheDocument();
    expect(screen.getByText("Sepetiniz boş.")).toBeInTheDocument();
  });
});
```

## Neden iyi bir test?

> [!DO]
>
> - Kullanıcı gibi davranır: arar, tıklar, sonucu görür.[^7]
> - Component'lerin iç yapısını bilmez. Kodu refactor edince kırılmaz.
> - Yalnızca ağ sınırı mock'lanmıştır. Component'ler gerçek birlikte çalışır.[^8]
> - Başarılı akışı ve hata akışını birlikte kapsar.

## Tüm rehberin özeti

| Konu | Kural |
| --- | --- |
| Sorgu | `getByRole` ile başlayın.[^3] |
| Yokluk | `queryBy` kullanın.[^3] |
| Bekleme | `findBy` kullanın.[^3] |
| Etkileşim | `userEvent.setup()` ve her çağrıda `await`. |
| Mock | Yalnızca sınırları mock'layın: ağ, analitik, tarayıcı API'si.[^8] |
| Provider | `renderWithProviders` yardımcı fonksiyonu yazın. |
| Hata | Mesajı okuyun, `screen.debug()` kullanın. |

## Kendin dene

Sepete **Azalt** butonu ekleyin. Önce testi yazın:

- `CartProvider` içine `decreaseQuantity(productId)` fonksiyonu ekleyin. Adet 1 ise ürünü sepetten çıkarsın.
- `CartSummary` içinde her ürün için erişilebilir adı **"<ürün adı> adedini azalt"** olan bir buton gösterin.
- Test: Sepette 2 adet **Mekanik Klavye** varken **Azalt** tıklanınca **Mekanik Klavye × 1** görünür. İkinci tıklamada ürün listeden kalkar ve **Sepetiniz boş.** görünür.

## Kaynaklar

1. [MSW: Migrating from 2.x to 3.x](https://mswjs.io/docs/migrations/2.x-to-3.x) *(doc)* — `http` ve `HttpResponse` için `msw/http` import yolu.
2. [Testing Library: within](https://testing-library.com/docs/dom-testing-library/api-within) *(doc)* — Sorguyu tek bir elemanın içine daraltma.
3. [Testing Library: About Queries](https://testing-library.com/docs/queries/about) *(doc)* — `getByRole` önceliği, `queryBy` ile yokluk ve `findBy` ile bekleme.
4. [WAI-ARIA 1.2: Roles](https://www.w3.org/TR/wai-aria-1.2/#article) *(doc)* — `article` ve `region` rollerinin adı yazardan gelir, `region` için ad zorunludur.
5. [jest-dom](https://github.com/testing-library/jest-dom) *(repo)* — `toBeVisible` ve `toBeDisabled` matcher'larının kuralları.
6. [MSW: server.use()](https://mswjs.io/docs/api/setup-server/use) *(doc)* — Çalışma anında handler ekleme.
7. [Testing Library: Guiding Principles](https://testing-library.com/docs/guiding-principles) *(doc)* — Testler yazılımın kullanılış biçimine ne kadar benzerse o kadar güven verir.
8. [Vitest: Mocking Requests](https://vitest.dev/guide/mocking/requests) *(doc)* — MSW ile ağ isteklerini mock'lama.
