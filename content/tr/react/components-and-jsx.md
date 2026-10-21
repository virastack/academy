---
title: "Component ve JSX"
description: "Arayüzü component'lere bölme, JSX kuralları, koşullu render, liste ve key, saf component."
lastVerified: "2026-10-21"
translationKey: "react/components-and-jsx"
---

## Arayüzü Kutulara Bölün

React'te arayüz, birbirinin içine yerleşen **component**'lerden oluşur. React dokümanının "Thinking in React" sayfası her işe aynı adımla başlar: tasarımdaki her parçanın etrafına bir kutu çizin ve her kutuya bir isim verin. Bir kutu birden fazla iş yapıyorsa onu daha küçük kutulara bölün.[^1]

```text
ProductPage
├── SearchBar
└── ProductList
    ├── ProductCard
    └── ProductCard
```

Bir component, büyük harfle başlayan ve JSX döndüren bir JavaScript fonksiyonudur:[^2]

```tsx
export function ProductCard() {
  return (
    <article className="product-card">
      <img src="/headphones.jpg" alt="Kablosuz kulaklık" />
      <h2>Kablosuz kulaklık</h2>
    </article>
  );
}
```

İsim küçük harfle başlarsa React onu `<productCard>` diye bir HTML etiketi sanar. Ne kadar bölüneceği bir tasarım kararıdır; ölçütler [Component ve Kod Organizasyonu](/academy/architecture/component-organization) rehberinde.

## JSX Kuralları

JSX, JavaScript içinde HTML'e benzeyen bir sözdizimidir; build sırasında fonksiyon çağrılarına çevrilir. HTML'den üç farkı vardır:[^3]

| Kural | Örnek |
| :-- | :-- |
| Tek bir kök eleman döner | Sarmalayıcı gerekmiyorsa `<>...</>` *(Fragment)* |
| Her etiket kapanır | `<img />`, `<br />`, `<input />` |
| Attribute'lar camelCase yazılır | `className`, `htmlFor`, `onClick`; `aria-*` ve `data-*` tireli kalır |

Süslü parantez `{}` içine her JavaScript **ifadesi** yazılabilir: değişken, fonksiyon çağrısı, ternary. `if` ya da `for` gibi **deyimler** yazılamaz.[^3]

```tsx
const product = { name: "Kulaklık", price: 1499, inStock: true };

<p className={product.inStock ? "price" : "price muted"}>
  {product.name}: {product.price.toLocaleString("tr-TR")} TL
</p>;
```

## Koşullu Render

Üç yol vardır: `if` ile erken `return`, ternary `? :` ve `&&`.[^4]

```tsx
{cartCount > 0 && <Badge count={cartCount} />}
{product.inStock ? <AddToCartButton /> : <p>Stokta yok</p>}
```

> [!WARNING]
>
> `&&`'nin solunda sayı kullanmayın. `{items.length && <List />}` liste boşken ekrana `0` basar, çünkü React `0`'ı render eder. `items.length > 0 &&` yazın ya da ternary kullanın.[^5][^4]

Bir component *yükleniyor*, *boş*, *hata* ve *dolu* gibi farklı durumlar gösteriyorsa JSX içine koşul yığmayın. [TkDodo](https://tkdodo.eu/) *(Dominik Dorfmeister)* her durumu ayrı bir erken `return` ile yazmayı öneriyor: her `if` kullanıcının gördüğü bir ekranı temsil eder, yeni durum eklemek diğerlerini bozmaz.[^6]

```tsx
function ProductListView({ status, products }: ProductListViewProps) {
  if (status === "pending") return <ProductListSkeleton />;
  if (status === "error") return <ErrorMessage />;
  if (products.length === 0) return <EmptyState />;

  return <ProductList products={products} />;
}
```

## Liste ve key

Diziyi `map` ile JSX'e çevirirsiniz. Her elemana bir `key` verilir:[^7]

```tsx
<ul>
  {products.map((product) => (
    <li key={product.id}>{product.name}</li>
  ))}
</ul>
```

`key`, React'in bir sonraki render'da hangi elemanın hangisi olduğunu anlamasını sağlar. Kurallar:[^7]

- **Veriden gelsin.** Veritabanı id'si ya da benzersiz bir slug en iyisidir.
- **Kardeşler arasında benzersiz olsun.** Başka bir listede aynı key sorun değildir.
- **Değişmesin.** `key={Math.random()}` her render'da elemanı sıfırdan oluşturur, state'i kaybeder.

> [!DONT]
>
> - Sıralanan, filtrelenen ya da eleman eklenip çıkarılan listelerde dizinin `index`'ini key yapmak. Sıra değişince React state'i yanlış satıra bağlar; örneğin bir input'a yazdığınız metin başka ürünün satırında kalır.[^7][^5]

`key` yalnızca listeler için değildir. Bir component'e farklı bir key verdiğinizde React onu baştan oluşturur; bu, state'i sıfırlamanın en temiz yoludur. State dersinde tekrar göreceksiniz.

## Component'ler Saf Olmalı

React'in en önemli kuralı: bir component, aynı props, state ve context ile her seferinde aynı JSX'i döndürmelidir. Render sırasında dışarıdaki bir şeyi değiştirmemelidir.[^8][^9]

```tsx
let renderCount = 0;

function ProductCard({ product }: ProductCardProps) {
  renderCount++; // ❌ dışarıdaki değişkeni değiştiriyor
  product.viewed = true; // ❌ prop'u değiştiriyor
  return <h2>{product.name}</h2>;
}
```

Neden önemli? React bir component'i ne zaman ve kaç kez render edeceğine kendisi karar verir. Render'ı yarıda kesebilir, tekrar başlatabilir, ekranda görünmeyen bir ağacı önceden hazırlayabilir. Saf olmayan bir component bu durumlarda tutarsız sonuç verir.[^8] Strict Mode'un component'leri iki kez render etmesinin sebebi budur.

Yan etkiler *(istek atmak, `document.title`'ı değiştirmek, analytics)* render'da değil, **event handler**'larda yapılır. Hiçbir event'e bağlanamıyorsa son çare Effect'tir.[^8]

> [!TIP]
>
> Render içinde **yeni oluşturduğunuz** bir diziyi ya da objeyi değiştirmek serbesttir. Sorun, render'dan önce var olan bir şeyi değiştirmektir.[^8]

Aynı sebepten bir component'i başka bir component'in içinde tanımlamayın. Her render'da yeni bir component tipi oluşur, React alt ağacı sıfırdan kurar ve state kaybolur. `eslint-plugin-react-hooks`'un `static-components` kuralı bunu yakalar.[^10]

## Kendin Dene

- Bir ürün sayfası tasarımı açın *(herhangi bir e-ticaret sitesi)*, kutuları çizin ve component ağacını yazın.
- `products` dizisini boş verin ve `{products.length && <ProductList />}` ifadesinin ekrana ne bastığını görün; sonra düzeltin.
- Ürün listesine her satırda bir `<input>` ekleyin, key'i `index` yapın ve listeyi ters çevirin. Input'taki metin nereye gitti?
- Bir component'te `Math.random()` ile fiyat üretin. Strict Mode açıkken konsolda iki farklı sonuç görün.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** "Thinking in React"; bir arama tablosunu adım adım component'lere bölüp state'i yerleştirir.[^1]
- **Yazı:** [Josh W. Comeau](https://www.joshwcomeau.com/)'nun yeni başlayanların React'te en sık yaptığı dokuz hata; `0` render'ı, key ve state mutasyonu dahil.[^5]
- **Yazı:** [TkDodo](https://tkdodo.eu/)'nun composition ve erken `return` yazısı.[^6]
- **Resmi doküman:** "Keeping Components Pure"; saf component ve yerel mutasyon örnekleri.[^8]

## Kaynaklar

1. [React: Thinking in React](https://react.dev/learn/thinking-in-react) *(doc)* — Arayüzü component hiyerarşisine bölmek ve minimum state'i bulmak.
2. [React: Your First Component](https://react.dev/learn/your-first-component) *(doc)* — Component tanımlama, büyük harf kuralı ve export.
3. [React: Writing Markup with JSX](https://react.dev/learn/writing-markup-with-jsx) *(doc)* — Tek kök, kapalı etiketler ve camelCase attribute kuralları.
4. [React: Conditional Rendering](https://react.dev/learn/conditional-rendering) *(doc)* — `if`, ternary, `&&` ve `&&`'nin solunda sayı uyarısı.
5. [Josh W. Comeau](https://www.joshwcomeau.com/): [Common Beginner Mistakes with React](https://www.joshwcomeau.com/react/common-beginner-mistakes/) *(article)* — 2023, Ekim 2024'te güncellendi. `0` render'ı, state mutasyonu ve key hataları.
6. [TkDodo](https://tkdodo.eu/): [Component Composition is great btw](https://tkdodo.eu/blog/component-composition-is-great-btw) *(article)* — 21 Eylül 2024. Durumları koşullu JSX yerine erken `return` ile yazmak.
7. [React: Rendering Lists](https://react.dev/learn/rendering-lists) *(doc)* — `map`, `key` kuralları, index ve `Math.random()` tuzakları.
8. [React: Keeping Components Pure](https://react.dev/learn/keeping-components-pure) *(doc)* — Saf component, yan etkilerin event handler'a taşınması ve yerel mutasyon.
9. [React: Components and Hooks must be pure](https://react.dev/reference/rules/components-and-hooks-must-be-pure) *(doc)* — Idempotent render, props ve state'in değiştirilmemesi.
10. [React: static-components lint](https://react.dev/reference/eslint-plugin-react-hooks/lints/static-components) *(doc)* — Render sırasında component tanımlamanın state'i sıfırlaması.
