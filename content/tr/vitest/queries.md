---
title: "Sorgular"
description: "getBy, queryBy, findBy ve sorgu önceliği."
lastVerified: "2026-10-14"
translationKey: "vitest/queries"
---

## Temel kural

Elemanları kullanıcının bulduğu gibi bulun. Kullanıcı elemanları rol, label ve metin ile bulur. Kullanıcı state adlarını veya CSS class'larını görmez.

İç yapıya bağlı testler küçük bir refactoring işleminde kırılır. Davranışa bağlı testler kırılmaz.[^1]

## Sorgu önceliği

Listede yukarıdaki sorgu, aşağıdakinden daha iyidir. Her zaman ilk uygun sorguyu seçin.

| Sorgu | Ne zaman kullanılır |
| --- | --- |
| `getByRole` | **İlk tercih.** Button, heading, link, textbox gibi rolü olan her eleman. |
| `getByLabelText` | `<label>` ile bağlı form elemanları. |
| `getByText` | Etkileşimsiz metin: `<p>`, `<span>`, `<div>`. |
| `getByAltText` | `alt` attribute'lu görsel. |
| `getByTestId` | **Son çare.** Başka hiçbir sorgu çalışmıyorsa. |

Tam sıra şöyledir: `getByRole`, `getByLabelText`, `getByPlaceholderText`, `getByText`, `getByDisplayValue`, ardından `getByAltText`, `getByTitle` ve en sonda `getByTestId`.[^2]

> [!WARNING]
>
> `getByTestId` kullanıcının gördüğü bir şey değildir. Önce yukarıdaki sorguları deneyin.[^2]

<details>
<summary>Diğer sorgular</summary>

- `getByPlaceholderText`: Label yoksa kullanılır. Placeholder, label'ın yerini tutmaz. Önce label ekleyin.[^3]
- `getByDisplayValue`: Değeri dolu olan input, select veya textarea için.
- `getByTitle`: `title` attribute'lu eleman için. `title` yardımcı teknoloji kullananlar için sorunludur, çünkü tarayıcı ve ekran okuyucu desteği tutarsızdır.[^4]

</details>

## Örnek sayfa

Bu adımdaki testler ürün listesini kullanır. Component'in tam kodunu **Ürün Listesi** projesinde görürsünüz. Liste şu HTML'i üretir:

```tsx
<section aria-label="Products">
  <label htmlFor="product-search">Search products</label>
  <input id="product-search" type="search" />
  <ul>
    <li>
      <article aria-labelledby="product-2-title">
        <h2 id="product-2-title">Mechanical Keyboard</h2>
        <p>€2,199.00</p>
        <button type="button">Add to cart</button>
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
  { id: 1, name: "Wireless Headphones", price: 1299, inStock: true },
  { id: 2, name: "Mechanical Keyboard", price: 2199, inStock: true },
  { id: 3, name: "Gaming Mouse", price: 899, inStock: false },
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

test("finds the product by role, label and text", async () => {
  await renderList();

  expect(
    screen.getByRole("heading", { name: "Mechanical Keyboard" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Search products")).toBeInTheDocument();
  expect(screen.getByText("€2,199.00")).toBeInTheDocument();
});
```

## getByRole kullanımı

`getByRole`, elemanın ARIA rolünü ve erişilebilir adını kullanır. HTML elemanları otomatik bir role sahiptir.[^5][^6]

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

`name` seçeneği erişilebilir adı belirtir. Aynı roldeki elemanları ayırmak için bunu kullanın:[^5]

```tsx
screen.getByRole("button", { name: "Add to cart" });
screen.getByRole("heading", { name: "Mechanical Keyboard", level: 2 });
screen.getByRole("article", { name: "Mechanical Keyboard" });
screen.getByRole("region", { name: "Products" });
```

`getByRole`, erişilebilirlik ağacından çıkarılan elemanları (`hidden`, `display: none`, `visibility: hidden`, `aria-hidden="true"`) varsayılan olarak yoksayar. Bu elemanları bulmak için `hidden: true` ekleyin.[^5]

> [!NOTE]
>
> Gizli bir elemanın içerikten gelen adı boş hesaplanabilir. Bu durumda `hidden: true` ile birlikte `name` kullanırsanız eşleşme olmaz. Gizli eleman için `name` olmadan sorgulayın veya `aria-label` ile ad verin.

## Sorgu ailesi

Her sorgunun üç ön eki vardır. Ön ek, elemanın şu anda DOM'da olup olmadığını belirler.[^2]

| Ön ek | Eleman bulunamazsa | Ne zaman kullanılır |
| --- | --- | --- |
| [!getBy] | Hata fırlatır | Eleman şu anda DOM'da **olmalı**. |
| [!queryBy] | `null` döner | Eleman şu anda DOM'da **olmamalı**. |
| [!findBy] | Bekler. Süre dolarsa hata fırlatır. | Eleman **bir süre sonra** gelecek. |

Birden fazla eleman bekliyorsanız `All` sürümünü kullanın: `getAllBy`, `queryAllBy`, `findAllBy`. Tekil sorgular birden fazla eşleşmede hata fırlatır.

```tsx
test("query families", async () => {
  await renderList();

  expect(screen.getAllByRole("article")).toHaveLength(3);

  expect(screen.queryByText("No products found.")).not.toBeInTheDocument();
});
```

> [!CAUTION]
>
> Elemanın yokluğunu kontrol ederken `getBy` kullanmayın. Eleman yoksa `getBy` hata fırlatır ve `not.toBeInTheDocument` satırına hiç ulaşılmaz. Bu durumda `queryBy` kullanın.

## Metin eşleştirme

Metin sorguları varsayılan olarak **tam eşleşme** ve **büyük/küçük harf duyarlı** çalışır.[^2][^7]

| Kod | Sonuç |
| --- | --- |
| `getByText("Mechanical Keyboard")` | Yalnızca tam olarak bu metni bulur. |
| `getByText("klavye")` | Bulamaz. Eşleşme tam değil. |
| `getByText(/klavye/i)` | Bulur. Regex kısmi ve büyük/küçük harf duyarsız eşleşir. |

Metin sık değişiyorsa `/add to cart/i` gibi regex kullanabilirsiniz. Regex büyük/küçük harf farkından doğan kırılmaları azaltır. Çok geniş bir regex ise yanlış elemanı da yakalayabilir. Rol sorgusuyla birlikte kullanıp `name` ile daraltın.

## Alan daraltma: within

Listede üç **Add to cart** butonu vardır. `getByRole("button", { name: "Add to cart" })` hata verir. Aramayı bir kartla sınırlayın:[^8]

```tsx
import { screen, within } from "@testing-library/react";

test("finds the button on the keyboard card", async () => {
  await renderList();

  const card = screen.getByRole("article", { name: "Mechanical Keyboard" });

  expect(
    within(card).getByRole("button", { name: "Add to cart" }),
  ).toBeEnabled();
});
```

## Testing playground

HTML'iniz için en uygun sorguyu bu araç önerir. Aşağıdaki örnek bu dersteki ürün kartıdır. Önizlemede bir elemana tıklayın. Önerilen sorguyu okuyun. Sorguyu değiştirip sonucu görün.

```testing-playground
{
  "title": "Testing Playground",
  "src": "https://testing-playground.com/embed?panes=markup,preview,query,result",
  "markup": "<section aria-label=\"Products\">\n  <article aria-labelledby=\"product-2-title\">\n    <h2 id=\"product-2-title\">Mechanical Keyboard</h2>\n    <p>€2,199.00</p>\n    <button type=\"button\">Add to cart</button>\n  </article>\n</section>",
  "query": "screen.getByRole(\"heading\", { name: \"Mechanical Keyboard\" });"
}
```

## Kendin dene

- **Gaming Mouse** kartını `getByRole("article", ...)` ile bulun.
- `within` ile kartın içindeki **Out of stock** yazısının görünür olduğunu test edin.
- **Mechanical Keyboard** kartında **Out of stock** yazısının bulunmadığını `queryByText` ile test edin.

## Kaynaklar

1. [Kent C. Dodds: Making your UI tests resilient to change](https://kentcdodds.com/blog/making-your-ui-tests-resilient-to-change) *(article)* — Uygulama ayrıntılarına bağlı kırılgan testler ve kullanıcının bulduğu gibi sorgulama.
2. [Testing Library: Sorgular](https://testing-library.com/docs/queries/about) *(doc)* — Sorgu önceliği, `getBy`/`queryBy`/`findBy` farkı ve `exact` varsayılanı.
3. [Testing Library: ByPlaceholderText](https://testing-library.com/docs/queries/byplaceholdertext) *(doc)* — Placeholder, label'ın yerini tutmaz; genelde `getByLabelText` tercih edilir.
4. [MDN: title attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/title) *(doc)* — `title` kullanımının yardımcı teknoloji kullananlar için sorunları.
5. [Testing Library: ByRole](https://testing-library.com/docs/queries/byrole) *(doc)* — Örtük roller, `name`, `level` ve `hidden` seçenekleri.
6. [Matan Borenkraout: Testing Library, everybody uses it, but nobody understands it](https://gitnation.com/contents/testing-library-everybody-uses-it-but-nobody-understands-it) *(video)* — `getByRole`'ün erişilebilirlik ağacı ve örtük rollerle çalışması.
7. [Testing Library: ByText](https://testing-library.com/docs/queries/bytext) *(doc)* — Metin eşleştirme, regex kullanımı ve `ignore` seçeneği.
8. [Testing Library: within](https://testing-library.com/docs/dom-testing-library/api-within) *(doc)* — Sorguyu tek bir elemanın içine daraltma.
