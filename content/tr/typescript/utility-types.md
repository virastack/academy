---
title: "Utility types"
description: "keyof, typeof, Partial, Pick, Omit ve Record ile tip türetme."
lastVerified: "2026-10-17"
translationKey: "typescript/utility-types"
---

## Neden tip türetmek

Mağazada bir `Product` tipiniz var. Ürün güncelleme formu için "aynı alanlar ama hepsi opsiyonel", sepet için "ürünün birkaç alanı artı adet" gibi tiplere ihtiyacınız olacak. Bunları elle yeniden yazarsanız `Product`'a bir alan eklediğinizde diğerlerini güncellemeyi unutursunuz.

Çözüm, tipleri **tek bir kaynaktan türetmektir**. TypeScript, mevcut bir tipten ya da değerden yeni tip üreten operatörler ve hazır **utility type**'lar sunar.[^1][^2] Bu derste hepsi şu tip üzerinden ilerliyor:

```ts
const categories = ["electronics", "books", "home"] as const;
type Category = (typeof categories)[number]; // "electronics" | "books" | "home"

type Product = {
  id: number;
  name: string;
  price: number;
  category: Category;
  description: string;
};
```

İlk iki satırı aşağıda adım adım açıyoruz.

## keyof, typeof ve indexed access

### keyof

`keyof`, bir object tipinin anahtarlarını string literal union'ı olarak verir:[^3]

```ts
type ProductKey = keyof Product; // "id" | "name" | "price" | "category" | "description"

const key: ProductKey = "nmae";
// Hata: Type '"nmae"' is not assignable to type 'keyof Product'.
```

Parametresi `keyof Product` olan bir `sortBy(products, key)` fonksiyonu artık yalnızca gerçekten var olan alan adlarını kabul eder.

### typeof (tip konumunda)

JavaScript'teki `typeof` çalışma zamanında bir string döner. TypeScript, **tip konumunda** yazılan `typeof`'a ikinci bir anlam verir: bir değişkenin tipini alır.[^4] Böylece tipi değerden üretirsiniz:

```ts
const defaultFilters = {
  category: "electronics",
  maxPrice: 5000,
  inStockOnly: true,
};

type Filters = typeof defaultFilters;
// { category: string; maxPrice: number; inStockOnly: boolean }
```

`typeof` yalnızca değişken adlarıyla ve onların alanlarıyla çalışır; içine bir fonksiyon çağrısı yazamazsınız.[^4]

### Indexed access

`Product["price"]`, bir alanın tipini okur. Köşeli parantez içine bir union da yazabilirsiniz:[^5]

```ts
type Price = Product["price"]; // number
type NameOrPrice = Product["name" | "price"]; // string | number
```

Dizilerde index olarak `number` yazmak, eleman tipini verir. Dersin başındaki satır bu üç parçanın birleşimidir: `as const` dizinin elemanlarını literal tipler olarak sabitler, `typeof` dizinin tipini alır, `[number]` de elemanlarının union'ını çıkarır.[^5][^2]

```ts
const categories = ["electronics", "books", "home"] as const;
type Category = (typeof categories)[number];
```

Diziye yeni bir kategori eklediğinizde `Category` tipi kendiliğinden güncellenir; aynı dizi bir `<select>`'in seçeneklerini üretmek için çalışma zamanında da kullanılır.

## Hazır utility tipler

TypeScript'in global olarak sunduğu, en sık kullanılan utility tipler:[^1]

| Tip | Ne yapar | Örnek |
| :-- | :-- | :-- |
| `Partial<T>` | Bütün alanları opsiyonel yapar | Güncelleme formu |
| `Required<T>` | Bütün alanları zorunlu yapar | Varsayılanlar doldurulduktan sonra |
| `Readonly<T>` | Alanları `readonly` yapar | Değişmemesi gereken veri |
| `Pick<T, K>` | Yalnızca seçilen alanları alır | Sepet kalemi |
| `Omit<T, K>` | Seçilen alanları çıkarır | `id`'siz yeni ürün |
| `Record<K, V>` | `K` anahtarlı, `V` değerli object | Kategori başına stok |
| `Exclude<U, M>` | Union'dan üyeleri çıkarır | Açık sipariş durumları |
| `Extract<U, M>` | Union'dan uyan üyeleri alır | Kapanmış sipariş durumları |
| `NonNullable<T>` | `null` ve `undefined`'ı çıkarır | Kontrol edilmiş değer |
| `ReturnType<F>` | Fonksiyonun dönüş tipini verir | Yardımcı fonksiyonun sonucu |
| `Parameters<F>` | Parametre tiplerini tuple olarak verir | Fonksiyonu saran wrapper |
| `Awaited<T>` | `Promise`'in içindeki tipi açar | `async` fonksiyonun sonucu |

### Partial, omit ve pick

Utility tipler iç içe yazılabilir. Ürün güncellemesinde `id` değişmez, diğer alanların hepsi opsiyoneldir:

```ts
type ProductUpdate = Partial<Omit<Product, "id">>;

function updateProduct(id: number, changes: ProductUpdate) {
  // ...
}

updateProduct(1, { price: 1199 }); // OK
updateProduct(1, { id: 2 });
// Hata: Object literal may only specify known properties, and 'id' does not exist in type 'Partial<Omit<Product, "id">>'.
```

Sepet kalemi, ürünün birkaç alanı ile adet bilgisinin birleşimidir:

```ts
type CartItem = Pick<Product, "id" | "name" | "price"> & { quantity: number };
```

> [!WARNING]
>
> `Pick`, verdiğiniz anahtarın gerçekten var olduğunu kontrol eder; `Omit` etmez. `Omit<Product, "nmae">` hata vermeden `Product`'ın aynısını döner. `Pick` ve `Omit` object tipleri, `Exclude` ve `Extract` ise union'lar içindir; birini diğerinin yerine kullanmak yaygın bir hatadır.[^2]

### Record, exclude ve extract

`Record<Category, number>`, union'daki **her** anahtarın yazılmasını zorunlu kılar:[^1]

```ts
const stock: Record<Category, number> = { electronics: 12, books: 40 };
// Hata: Property 'home' is missing in type '{ electronics: number; books: number; }' but required in type 'Record<"books" | "electronics" | "home", number>'.
```

`Exclude` ve `Extract` bir union'ı filtreler:[^1]

```ts
type OrderStatus = "pending" | "shipped" | "delivered" | "cancelled";

type OpenStatus = Exclude<OrderStatus, "delivered" | "cancelled">; // "pending" | "shipped"
type ClosedStatus = Extract<OrderStatus, "delivered" | "cancelled">; // "delivered" | "cancelled"
```

### ReturnType, parameters ve awaited

Bu üçü bir fonksiyonun tipinden türetir. Fonksiyonun kendisi bir değer olduğu için önce `typeof` ile tipini almanız gerekir; `ReturnType<fetchProduct>` yazarsanız `'fetchProduct' refers to a value, but is being used as a type here. Did you mean 'typeof fetchProduct'?` hatası alırsınız.[^4]

```ts
async function fetchProduct(id: number) {
  const response = await fetch(`/api/products/${id}`);
  const data: unknown = await response.json();
  return { data, fetchedAt: new Date() };
}

type FetchArgs = Parameters<typeof fetchProduct>; // [id: number]
type FetchResult = ReturnType<typeof fetchProduct>; // Promise<{ data: unknown; fetchedAt: Date }>
type FetchData = Awaited<ReturnType<typeof fetchProduct>>; // { data: unknown; fetchedAt: Date }
```

`async` fonksiyonların dönüş tipi `Promise` ile sarılıdır; `Awaited` bu sarmalı açar.[^1][^2]

## satisfies

Bir object'in belirli bir tipe uyduğunu kontrol etmek isteyip **daha dar tipini de korumak** istediğiniz durumlar için TypeScript 4.9 `satisfies` operatörünü getirdi.[^6]

```ts
type Route = { path: string; title: string };

// Tip annotation: tip kazanır
const routes: Record<string, Route> = {
  home: { path: "/", title: "Ana sayfa" },
  cart: { path: "/cart", title: "Sepet" },
};
routes.wishlist.path; // hata yok, çalışırken patlar

// satisfies: değer kazanır
const checkedRoutes = {
  home: { path: "/", title: "Ana sayfa" },
  cart: { path: "/cart", title: "Sepet" },
} satisfies Record<string, Route>;
checkedRoutes.wishlist;
// Hata: Property 'wishlist' does not exist on type '{ home: { path: string; title: string; }; cart: { path: string; title: string; }; }'.
```

Her iki durumda da her rotanın `path` ve `title` alanları kontrol edilir. Fark, sonuçtaki tiptir: annotation ile tip `Record<string, Route>`'a genişler ve hangi anahtarların olduğu unutulur; `satisfies` ile `keyof typeof checkedRoutes` hâlâ `"home" | "cart"`'tır. [Matt Pocock](https://www.mattpocock.com/)'un özetiyle: iki nokta üst üste ile "tip değeri yener", `satisfies` ile "değer tipi yener".[^7]

`satisfies`, `as`'ten farklı olarak tipi zorlamaz, gerçekten kontrol eder. Bir kategori adını yanlış yazarsanız yakalar:

```ts
const categoryLabels = {
  electronics: "Elektronik",
  books: "Kitap",
  hom: "Ev",
} satisfies Record<Category, string>;
// Hata: Object literal may only specify known properties, but 'hom' does not exist in type 'Record<"books" | "electronics" | "home", string>'. Did you mean to write 'home'?
```

<details>
<summary>Derinlemesine: mapped ve conditional types</summary>

Utility tiplerin çoğu iki temel özellikle yazılmıştır ve kendi utility tiplerinizi de bunlarla yazabilirsiniz.

**Mapped type**, `keyof` ile bir tipin anahtarları üzerinde döner ve her biri için yeni bir alan üretir. `?` ve `readonly` eklenebilir, başına `-` konarak kaldırılabilir.[^8]

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
```

**Conditional type**, tip seviyesinde bir üçlü operatördür: `A extends B ? X : Y`. `infer` ile bir tipin içinden parça çıkarılabilir. Union'a uygulandığında her üyeye ayrı ayrı uygulanır.[^9]

```ts
type MyNonNullable<T> = T extends null | undefined ? never : T;
type ElementOf<T> = T extends (infer Item)[] ? Item : never;

type A = MyNonNullable<string | null>; // string
type B = ElementOf<Product[]>; // Product
```

Uygulama kodunda bunlara nadiren ihtiyaç duyarsınız; kütüphane yazarken ve karmaşık tipleri okurken işe yarar.

</details>

## Kendin dene

- TS Playground'da `categories` dizisine `"toys"` ekleyin ve `Record<Category, number>` olan `stock` değişkeninin ne hata verdiğine bakın.
- `type NewProduct = Omit<Product, "id">` tanımlayın ve `id`'siz bir ürün object'i yazın.
- `checkedRoutes`'taki bir rotadan `title`'ı silip hata mesajını okuyun. Sonra `keyof typeof routes` ile `keyof typeof checkedRoutes` tiplerini fareyle karşılaştırın.

## Detaylı öğrenmek için

- **Resmi doküman:** TypeScript Handbook'un Utility Types sayfası; her tipin açıklaması, örneği ve hangi sürümde geldiği.[^1]
- **Kitap:** [Matt Pocock](https://www.mattpocock.com/)'un Total TypeScript Essentials kitabının "Deriving Types" bölümü; ne zaman türetmeli, ne zaman ayrı tip yazmalı.[^2]
- **Yazı:** [Matt Pocock](https://www.mattpocock.com/)'un "Clarifying the `satisfies` Operator" yazısı; annotation, `satisfies` ve `as` karşılaştırması.[^7]
- **Konuşma:** [Luca Del Puppo](https://delpuppo.net/)'nun mapped ve conditional type'larla `Partial`, `Pick`, `Omit` gibi tipleri yeniden yazdığı konuşma *(JSNation 2025, 23 dk)*.[^10]

## Kaynaklar

1. [TypeScript Handbook: Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) *(doc)* — `Partial`, `Pick`, `Omit`, `Record`, `Exclude`, `ReturnType`, `Awaited` ve diğerleri; her birinin geldiği sürüm.
2. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Deriving Types](https://www.totaltypescript.com/books/total-typescript-essentials/deriving-types) *(article)* — `keyof`, `typeof`, `as const` ile union, `Awaited`, `Pick`/`Omit` ile `Exclude`/`Extract` farkı.
3. [TypeScript Handbook: Keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html) *(doc)* — Bir object tipinin anahtarlarından literal union üretme.
4. [TypeScript Handbook: Typeof Type Operator](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html) *(doc)* — Tip konumunda `typeof`, `ReturnType<typeof f>` ve sınırlamaları.
5. [TypeScript Handbook: Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html) *(doc)* — `Type["key"]`, union ile index ve `typeof arr[number]`.
6. [Announcing TypeScript 4.9](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9/) *(article)* — 15 Kasım 2022. `satisfies` operatörü ve tipi genişletmeden kontrol etme.
7. [Matt Pocock](https://www.mattpocock.com/): [Clarifying the `satisfies` Operator](https://www.totaltypescript.com/clarifying-the-satisfies-operator) *(article)* — Annotation, `satisfies`, `as` ve çıkarımın ne zaman kullanılacağı.
8. [TypeScript Handbook: Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) *(doc)* — `[K in keyof T]`, `readonly` ve `?` modifier'ları, `as` ile anahtar yeniden adlandırma.
9. [TypeScript Handbook: Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) *(doc)* — `extends ? :` sözdizimi, `infer` ve union'a dağılan conditional type'lar.
10. [Luca Del Puppo](https://delpuppo.net/): [TypeScript Gymnastics: Why Are They So Powerful for You?](https://gitnation.com/contents/typescript-gymnastics-why-are-they-so-powerful-for-you) *(video)* — JSNation 2025, 23 dakika. Conditional ve mapped type'lar, `infer` ve utility tipleri sıfırdan yazma.
