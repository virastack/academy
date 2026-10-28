---
title: "Ürün listesi"
description: "Yükleme, arama ve sepete ekleme akışı."
lastVerified: "2026-10-14"
translationKey: "vitest/project-product-list"
---

## Senaryo

Mağaza ana sayfası ürünleri bir API'den yükler. Liste şunları yapar:

- Yüklenirken **Loading products...** mesajı gösterir.
- Yükleme başarısız olursa **Products could not be loaded.** mesajı gösterir.
- Arama kutusuna yazılan metne göre ürünleri filtreler.
- Eşleşme yoksa **No products found.** mesajı gösterir.
- Her ürün için **Add to cart** butonu sunar.

Projenin çalışan hali GitHub'da: [examples/vitest/project](https://github.com/virastack/academy/tree/main/examples/vitest/project). Takıldığınızda karşılaştırın.

## Component

`loadProducts` fonksiyonu dışarıdan verilir. Testte gerçek API yerine kendi fonksiyonunuzu verirsiniz.

```tsx
import { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";
import type { Product } from "./types";

type ProductListProps = {
  loadProducts: () => Promise<Product[]>;
  onAddToCart: (product: Product) => void;
};

type Status = "loading" | "error" | "ready";

export function ProductList({ loadProducts, onAddToCart }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let ignore = false;

    loadProducts()
      .then((loaded) => {
        if (ignore) return;
        setProducts(loaded);
        setStatus("ready");
      })
      .catch(() => {
        if (ignore) return;
        setStatus("error");
      });

    return () => {
      ignore = true;
    };
  }, [loadProducts]);

  if (status === "loading") {
    return <p role="status">Loading products...</p>;
  }

  if (status === "error") {
    return <p role="alert">Products could not be loaded.</p>;
  }

  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
  const visibleProducts = products.filter((product) =>
    product.name.toLocaleLowerCase("tr-TR").includes(normalizedQuery),
  );

  return (
    <section aria-label="Products">
      <label htmlFor="product-search">Search products</label>
      <input
        id="product-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {visibleProducts.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <ul>
          {visibleProducts.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} onAddToCart={onAddToCart} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

Effect içindeki `ignore` bayrağı, `loadProducts` değiştiğinde ya da component kaldırıldığında eski cevabın state'i güncellemesini engeller.[^1] Arama `toLocaleLowerCase("tr-TR")` kullanır. Türkçe gibi dillerde büyük-küçük harf eşlemesi varsayılandan farklı olabilir.[^2]

## Testler

Önce ortak veriyi ve bir yardımcı fonksiyonu yazın:

```tsx
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductList } from "./ProductList";
import type { Product } from "./types";

const products: Product[] = [
  { id: 1, name: "Wireless Headphones", price: 1299, inStock: true },
  { id: 2, name: "Mechanical Keyboard", price: 2199, inStock: true },
  { id: 3, name: "Gaming Mouse", price: 899, inStock: false },
];

function renderList(
  loadProducts: () => Promise<Product[]> = () => Promise.resolve(products),
  onAddToCart = vi.fn(),
) {
  render(<ProductList loadProducts={loadProducts} onAddToCart={onAddToCart} />);

  return { onAddToCart };
}
```

### Adım 1: Yükleme

Konu: [!getBy], [!findBy] ve [!queryBy].[^3]

```tsx
test("shows a status message while loading, then the products", async () => {
  renderList();

  expect(screen.getByText("Loading products...")).toBeInTheDocument();
  expect(await screen.findAllByRole("article")).toHaveLength(3);
  expect(screen.queryByText("Loading products...")).not.toBeInTheDocument();
});
```

### Adım 2: Hata durumu

Konu: `Promise.reject` ve `findByRole("alert")`.

```tsx
test("shows an error message when loading fails", async () => {
  renderList(() => Promise.reject(new Error("network error")));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Products could not be loaded.",
  );
});
```

### Adım 3: Arama ve boş durum

Konu: `userEvent.type` ve `userEvent.clear`.

```tsx
test("filters the products by search", async () => {
  const user = userEvent.setup();
  renderList();

  await user.type(await screen.findByLabelText("Search products"), "keyboard");

  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(
    screen.getByRole("heading", { name: "Mechanical Keyboard" }),
  ).toBeInTheDocument();
});

test("shows the empty state when nothing matches", async () => {
  const user = userEvent.setup();
  renderList();

  await user.type(await screen.findByLabelText("Search products"), "monitor");

  expect(screen.getByText("No products found.")).toBeInTheDocument();
});
```

### Adım 4: Sepete ekleme

Konu: `within` ile kart içinde arama.[^4]

```tsx
test("adds the selected product to the cart", async () => {
  const user = userEvent.setup();
  const { onAddToCart } = renderList();

  const card = await screen.findByRole("article", { name: "Mechanical Keyboard" });
  await user.click(within(card).getByRole("button", { name: "Add to cart" }));

  expect(onAddToCart).toHaveBeenCalledWith(products[1]);
});

test("the button of an out-of-stock product is disabled", async () => {
  renderList();

  const card = await screen.findByRole("article", { name: "Gaming Mouse" });

  expect(
    within(card).getByRole("button", { name: "Add to cart" }),
  ).toBeDisabled();
});
```

### Adım 5: Yükleme mesajının kaybolması

Konu: `waitFor` ve `queryByRole`.[^5]

```tsx
test("the status message disappears once loading finishes", async () => {
  renderList();

  await waitFor(() =>
    expect(screen.queryByRole("status")).not.toBeInTheDocument(),
  );
});
```

## Hangi konuyu tekrar ettiniz?

| Adım | Tekrar edilen konu |
| --- | --- |
| 1 | Sorgu ailesi ve `findAllByRole`[^3] |
| 2 | Asenkron hata durumu |
| 3 | `userEvent.type`, boş durum |
| 4 | `within`, `toBeDisabled`[^4] |
| 5 | `waitFor` ile kaybolan eleman[^5] |

> [!TIP]
>
> Her testte gerçek API yerine kendi `loadProducts` fonksiyonunuzu verdiniz. Mock kütüphanesi gerekmedi. API'yi mock'lamayı **Mock** adımında öğrenirsiniz.

## Kendin dene

Listeye fiyat sıralaması ekleyin ve test edin:

- `ProductList` içine **Sort** etiketli bir `<select>` ekleyin. Seçenekler: **Recommended** ve **Price: ascending**.
- `user.selectOptions` ile **Price: ascending** seçeneğini seçin.
- İlk kartın en ucuz ürün (**Gaming Mouse**) olduğunu test edin. İpucu: `getAllByRole("article")[0]`.

## Kaynaklar

1. [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) *(doc)* — Veri çekerken yarış durumu ve eski cevapları yok sayan `ignore` bayrağı.
2. [MDN: String.prototype.toLocaleLowerCase()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLocaleLowerCase) *(doc)* — Türkçe gibi dillerde yerel büyük-küçük harf eşlemesi.
3. [Testing Library: About Queries](https://testing-library.com/docs/queries/about) *(doc)* — `getBy`, `queryBy` ve `findBy` farkı; yokluk ve bekleme için hangisi kullanılır.
4. [Testing Library: within](https://testing-library.com/docs/dom-testing-library/api-within) *(doc)* — Sorguyu tek bir elemanın içine daraltma.
5. [Testing Library: Async API'leri](https://testing-library.com/docs/dom-testing-library/api-async) *(doc)* — `findBy` ile `waitFor` ilişkisi, 1000 ms zaman aşımı ve yeniden denemenin hata fırlatmaya bağlı olması.
