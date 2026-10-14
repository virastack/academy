---
title: "Sorgular"
description: "getBy, queryBy, findBy ve sorgu önceliği."
lastVerified: "2026-10-14"
translationKey: "vitest-ile-component-testi/sorgular"
---

## Temel kural

Elemanları kullanıcının bulduğu gibi bulun. Kullanıcı elemanları rol, label ve metin ile bulur. Kullanıcı state adlarını veya CSS class'larını görmez.

İç yapıya bağlı testler küçük bir refactoring işleminde kırılır. Davranışa bağlı testler kırılmaz.

## Sorgu önceliği

Listede yukarıdaki sorgu, aşağıdakinden daha iyidir. Her zaman ilk uygun sorguyu seçin.

| Sorgu | Ne zaman kullanılır |
| --- | --- |
| `getByRole` | **İlk tercih.** Button, heading, link, textbox gibi rolü olan her eleman. |
| `getByLabelText` | `<label>` ile bağlı form elemanları. |
| `getByText` | Etkileşimsiz metin: `<p>`, `<span>`, `<div>`. |
| `getByAltText` | `alt` attribute'lu görsel. |
| `getByTestId` | **Son çare.** Başka hiçbir sorgu çalışmıyorsa. |

> [!WARNING]
>
> `getByTestId` kullanıcının gördüğü bir şey değildir. Önce yukarıdaki sorguları deneyin.

<details>
<summary>Diğer sorgular</summary>

<ul>
<li>`getByPlaceholderText`: Label yoksa kullanılır. Placeholder, label'ın yerini tutmaz. Önce label ekleyin.</li>
<li>`getByDisplayValue`: Değeri dolu olan input, select veya textarea için. `getByTitle`: `title` attribute'lu eleman için. Ekran okuyucular `title` değerini güvenilir okumaz.</li>
</ul>

</details>

## Örnek sayfa

Bu adımdaki testler ürün listesini kullanır. Component'in tam kodunu **Ürün Listesi** projesinde görürsünüz. Liste şu HTML'i üretir:

```tsx
<section aria-label="Ürünler">
  <label htmlFor="product-search">Ürün ara</label>
  <input id="product-search" type="search" />
  <ul>
    <li>
      <article aria-labelledby="product-2-title">
        <h2 id="product-2-title">Mekanik Klavye</h2>
        <p>₺2.199,00</p>
        <button type="button">Sepete ekle</button>
      </article>
    </li>
    {/* ... diğer ürünler */}
  </ul>
</section>
```

Liste veriyi sonradan yükler. Bu yüzden her testin ilk satırı `await screen.findAllByRole("article")` olur. Bekleme konusunu **Asenkron Testler** adımında öğrenirsiniz.

```tsx
import { render, screen } from "@testing-library/react";
import { ProductList } from "./ProductList";

const products = [
  { id: 1, name: "Kablosuz Kulaklık", price: 1299, inStock: true },
  { id: 2, name: "Mekanik Klavye", price: 2199, inStock: true },
  { id: 3, name: "Oyuncu Faresi", price: 899, inStock: false },
];

async function renderList() {
  render(
    <ProductList
      loadProducts={() => Promise.resolve(products)}
      onAddToCart={vi.fn()}
    />,
  );

  await screen.findAllByRole("article");
}

test("ürünü rol, label ve metin ile bulur", async () => {
  await renderList();

  expect(
    screen.getByRole("heading", { name: "Mekanik Klavye" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Ürün ara")).toBeInTheDocument();
  expect(screen.getByText("₺2.199,00")).toBeInTheDocument();
});
```

## getByRole kullanımı

`getByRole`, elemanın ARIA rolünü ve erişilebilir adını kullanır. HTML elemanları otomatik bir role sahiptir.

| HTML | Rol |
| --- | --- |
| `<button>` | `button` |
| `<a href>` | `link` |
| `<h1>` – `<h6>` | `heading` |
| `<input type="search">` | `searchbox` |
| `<input type="checkbox">` | `checkbox` |
| `<select>` | `combobox` |
| `<ul>` / `<li>` | `list` / `listitem` |
| `<article aria-labelledby>` | `article` |
| `<section aria-label>` | `region` |

`name` seçeneği erişilebilir adı belirtir. Aynı roldeki elemanları ayırmak için bunu kullanın:

```tsx
screen.getByRole("button", { name: "Sepete ekle" });
screen.getByRole("heading", { name: "Mekanik Klavye", level: 2 });
screen.getByRole("article", { name: "Mekanik Klavye" });
screen.getByRole("region", { name: "Ürünler" });
```

`getByRole`, görünmeyen elemanları (`hidden`, `display: none`) varsayılan olarak yoksayar. Görünmeyen elemanı bulmak için `hidden: true` ekleyin.

## Sorgu ailesi

Her sorgunun üç ön eki vardır. Ön ek, elemanın şu anda DOM'da olup olmadığını belirler.

| Ön ek | Eleman bulunamazsa | Ne zaman kullanılır |
| --- | --- | --- |
| [!getBy] | Hata fırlatır | Eleman şu anda DOM'da **olmalı**. |
| [!queryBy] | `null` döner | Eleman şu anda DOM'da **olmamalı**. |
| [!findBy] | Bekler. Süre dolarsa hata fırlatır. | Eleman **bir süre sonra** gelecek. |

Birden fazla eleman bekliyorsanız `All` sürümünü kullanın: `getAllBy`, `queryAllBy`, `findAllBy`. Tekil sorgular birden fazla eşleşmede hata fırlatır.

```tsx
test("sorgu ailesi", async () => {
  await renderList();

  expect(screen.getAllByRole("article")).toHaveLength(3);

  expect(screen.queryByText("Ürün bulunamadı.")).not.toBeInTheDocument();
});
```

> [!CAUTION]
>
> Elemanın yokluğunu kontrol ederken `getBy` kullanmayın. Eleman yoksa `getBy` hata fırlatır ve `not.toBeInTheDocument` satırına hiç ulaşılmaz. Bu durumda `queryBy` kullanın.

## Metin eşleştirme

Metin sorguları varsayılan olarak **tam eşleşme** ve **büyük/küçük harf duyarlı** çalışır.

| Kod | Sonuç |
| --- | --- |
| `getByText("Mekanik Klavye")` | Yalnızca tam olarak bu metni bulur. |
| `getByText("klavye")` | Bulamaz. Eşleşme tam değil. |
| `getByText(/klavye/i)` | Bulur. Regex kısmi ve büyük/küçük harf duyarsız eşleşir. |

Arayüz metinleri değişebilir. Bu nedenle `/sepete ekle/i` gibi regex kullanmak güvenlidir.

## Alan daraltma: within

Listede üç **Sepete ekle** butonu vardır. `getByRole("button", { name: "Sepete ekle" })` hata verir. Aramayı bir kartla sınırlayın:

```tsx
import { screen, within } from "@testing-library/react";

test("klavye kartındaki butonu bulur", async () => {
  await renderList();

  const card = screen.getByRole("article", { name: "Mekanik Klavye" });

  expect(
    within(card).getByRole("button", { name: "Sepete ekle" }),
  ).toBeEnabled();
});
```

## Testing Playground

HTML'iniz için en uygun sorguyu bu araç önerir. Aşağıdaki örnek bu dersteki ürün kartıdır. Önizlemede bir elemana tıklayın. Önerilen sorguyu okuyun. Sorguyu değiştirip sonucu görün.

```testing-playground
{
  "title": "Testing Playground",
  "src": "https://testing-playground.com/embed?panes=markup,preview,query,result",
  "markup": "<section aria-label=\"Ürünler\">\n  <article aria-labelledby=\"product-2-title\">\n    <h2 id=\"product-2-title\">Mekanik Klavye</h2>\n    <p>₺2.199,00</p>\n    <button type=\"button\">Sepete ekle</button>\n  </article>\n</section>",
  "query": "screen.getByRole(\"heading\", { name: \"Mekanik Klavye\" });"
}
```

## Kendin dene

- **Oyuncu Faresi** kartını `getByRole("article", ...)` ile bulun.
- `within` ile kartın içindeki **Stokta yok** yazısının görünür olduğunu test edin.
- **Mekanik Klavye** kartında **Stokta yok** yazısının bulunmadığını `queryByText` ile test edin.

- [Testing Library: Sorgular](https://testing-library.com/docs/queries/about)
- [Testing Library: ByRole](https://testing-library.com/docs/queries/byrole)

## Ek kaynaklar

- [Kent C. Dodds: Making your UI tests resilient to change](https://kentcdodds.com/blog/making-your-ui-tests-resilient-to-change) *(article)*
- [Matan Borenkraout: Testing Library, everybody uses it, but nobody understands it](https://gitnation.com/contents/testing-library-everybody-uses-it-but-nobody-understands-it) *(video)*
