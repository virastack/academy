---
title: "Interface, type ve union"
description: "Nesne şekilleri, type alias, union ve literal tipler."
lastVerified: "2026-10-17"
translationKey: "typescript/interfaces-types-and-unions"
---

## Object tiplerine isim vermek

Önceki derste object tipini parametrenin yanına doğrudan yazdınız: `product: { name: string; price: number }`. Aynı şekil ürün listesinde, sepette ve sipariş özetinde tekrar tekrar gerekir. Her seferinde yeniden yazmak yerine şekle bir isim verirsiniz. [!typescript]'te bunun iki yolu vardır: `type` ve `interface`.[^1]

**Type alias**, herhangi bir tipe verilen isimdir.[^1]

```ts
type Product = {
  readonly id: number;
  name: string;
  price: number;
  description?: string;
};

const headset: Product = { id: 1, name: "Kablosuz Kulaklık", price: 1299.9 };
```

**Interface** de bir object tipine isim vermenin yoludur. Eşittir işareti ve sondaki noktalı virgül yoktur; geri kalanı aynıdır.[^1]

```ts
interface Product {
  readonly id: number;
  name: string;
  price: number;
  description?: string;
}
```

TypeScript tipleri isimlerine göre değil **şekillerine** göre karşılaştırır *(structural typing)*: `Product`'ın istediği özelliklere sahip her object, `Product` yerine geçer.[^1]

## Opsiyonel ve readonly

Özellik adından sonraki `?` onu **opsiyonel** yapar; okurken `undefined` olabileceğini hesaba katmanız gerekir. `readonly` ise özelliğin yeniden atanmasını engeller.[^2]

```ts
headset.price = 1199.9; // sorun yok
headset.id = 2;
// Hata: Cannot assign to 'id' because it is a read-only property.
headset.description.toUpperCase();
// Hata: 'headset.description' is possibly 'undefined'.
```

> [!NOTE]
>
> `readonly` yalnızca o özelliğin kendisini korur, içindeki object'i değil. Ayrıca sadece tip kontrolünde çalışır; çalışma anında object'i dondurmaz.[^2]

## İç içe object ve array

Tipler birbirinin içinde kullanılabilir. Sipariş, kalemlerinden oluşan bir array ve bir adres taşır.[^2]

```ts
type OrderItem = {
  product: Product;
  quantity: number;
};

type Order = {
  id: string;
  items: OrderItem[];
  shippingAddress: {
    city: string;
    district: string;
  };
};
```

Sadece bir yerde kullanılan `shippingAddress` gibi bir şekli içeride bırakabilirsiniz. Başka yerde de gerekiyorsa ona da isim verin.

## Union tipler

**Union**, bir değerin birkaç tipten **biri** olabileceğini söyler ve `|` ile yazılır.[^1] Ürün kimliği bazı yerlerde sayı, bazı yerlerde stok kodu olabilir:

```ts
type ProductId = number | string;

function findProduct(id: ProductId) {
  console.log(id.toString()); // iki tipte de var
  console.log(id.toFixed(0));
  // Hata: Property 'toFixed' does not exist on type 'ProductId'.
}

findProduct("SKU-42");
findProduct(true);
// Hata: Argument of type 'boolean' is not assignable to parameter of type 'ProductId'.
```

TypeScript yalnızca union'ın **her** üyesinde geçerli olan işlemlere izin verir.[^1] `id`'nin sayı mı yazı mı olduğunu kontrol edip daraltmayı *(narrowing)* bir sonraki derste göreceksiniz.

### Literal union

Literal tiplerle kurulan union, bir değerin alabileceği seçenekleri tek tek sayar. Sipariş durumu, beden ya da sıralama seçeneği gibi sabit listeler için en çok kullanılan kalıptır; editör de bu değerleri otomatik tamamlar.[^3]

```ts
type OrderStatus = "pending" | "shipped" | "delivered";

function updateStatus(orderId: string, status: OrderStatus) {
  console.log(`${orderId}: ${status}`);
}

updateStatus("ORD-1001", "shipped");
updateStatus("ORD-1001", "cancelled");
// Hata: Argument of type '"cancelled"' is not assignable to parameter of type 'OrderStatus'.
```

### enum yerine literal union

TypeScript'in bir de `enum` yapısı vardır. Ancak `enum` tip bilgisi olmanın ötesinde çalışma anında kod üretir.[^1] Handbook da modern TypeScript'te çoğu zaman `as const` bir object'in yeterli olduğunu söyler.[^4]

```ts
enum OrderStatus {
  // Hata: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
  Pending = "pending",
  Shipped = "shipped",
}
```

`erasableSyntaxOnly` ayarı, silinerek JavaScript'e dönüşemeyen `enum` gibi yapıları hata yapar.[^5] Bu ayar TypeScript 5.8'le geldi ve [!vite]'ın React şablonunda açık gelir.[^6] [Matt Pocock](https://www.mattpocock.com/) da yeni bir projeye `enum` eklemeyeceğini söyler.[^7] Kısacası sabit seçenekler için literal union yazın.

## Intersection tipler

**Intersection**, birden fazla tipi `&` ile birleştirir; sonuçta hepsinin özellikleri bulunur.[^2] Sepet kalemini `Product`'a adet ekleyerek tanımlayabilirsiniz. Interface'te aynı işi `extends` yapar.[^2]

```ts
type CartItem = Product & { quantity: number };

interface DigitalProduct extends Product {
  downloadUrl: string;
}

const cartItem: CartItem = { ...headset, quantity: 2 };
```

## interface mi type mı?

Çoğu durumda ikisi de iş görür. Farklar şunlardır:[^1][^2][^8]

| | `type` | `interface` |
| :-- | :-- | :-- |
| Object şekli | Evet | Evet |
| Union ve literal tip | Evet | Hayır |
| Genişletme | `&` ile | `extends` ile |
| Aynı isimle tekrar tanımlama | Hata *(`Duplicate identifier`)* | Birleşir *(declaration merging)* |

**Declaration merging**, aynı isimle yazılan iki interface'in sessizce tek interface'e dönüşmesidir:

```ts
interface Customer {
  id: number;
}

interface Customer {
  email: string;
}

const customer: Customer = { id: 1 };
// Hata: Property 'email' is missing in type '{ id: number; }' but required in type 'Customer'.
```

Kütüphane tiplerini genişletirken işe yarar ama farkında olmadan da olabilir.[^9] Hangisini seçeceğiniz konusunda kaynaklar ayrışır:

- **TypeScript Handbook:** Çoğunlukla kişisel tercihtir; bir kural isterseniz `type`'ın özelliklerine ihtiyaç duyana kadar `interface` kullanın.[^1]
- **[Matt Pocock](https://www.mattpocock.com/):** Varsayılan olarak `type` kullanın; daha esnek ve daha az şaşırtıcıdır. Object kalıtımı gerekiyorsa `interface extends` seçin; çakışan özellikleri tanımda yakalar ve derleyici için daha hızlıdır.[^8][^10]

Bu yol haritasında, [!react] component prop'ları dahil, `type` kullanıyoruz. Önemli olan proje içinde tutarlı olmaktır.

## Fazla özellik kontrolü

Bir object literal'ı doğrudan tipli bir değişkene atadığınızda ya da fonksiyona verdiğinizde, TypeScript tipte olmayan özellikleri hata sayar. Buna **excess property check** denir ve çoğunlukla yazım hatalarını yakalar.[^2]

```ts
const product: Product = {
  id: 1,
  name: "Kablosuz Kulaklık",
  price: 1299.9,
  colour: "siyah",
  // Hata: Object literal may only specify known properties, and 'colour' does not exist in type 'Product'.
};
```

> [!WARNING]
>
> Bu kontrol yalnızca **taze** object literal'larda çalışır. Aynı object önce başka bir değişkene atanıp sonra `Product`'a verilirse fazla özellik hata vermez; tipler şekle göre karşılaştırılır.[^2]

## Tipleri dosyalar arasında paylaşmak

Tipler değerler gibi `export` ve `import` edilir. Yalnızca tip içeren import'ları `import type` ile, karışık olanlarda tipin önüne `type` yazarak işaretleyin. Böylece Vite gibi araçlar bu import'ları güvenle silebilir.[^11]

```ts
// types.ts
export type Product = { id: number; name: string; price: number };

export type OrderStatus = "pending" | "shipped" | "delivered";

export function formatPrice(price: number) {
  return `${price.toFixed(2)} TL`;
}

// cart.ts
import { formatPrice, type Product } from "./types";
import type { OrderStatus } from "./types";
```

Vite şablonunda açık gelen `verbatimModuleSyntax` ayarı, tipi `type` olmadan import ederseniz hata verir: `'Product' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.`[^12][^6]

## Kendin dene

TypeScript Playground'da:

- `Product` tipini `interface` ile yazın ve aynı isimle ikinci bir `interface Product { stock: number }` ekleyin; mevcut object'lerin neden hata verdiğine bakın.
- Aynısını `type` ile deneyin ve `Duplicate identifier` hatasını görün.
- `OrderStatus`'a `"cancelled"` ekleyin ve `updateStatus` çağrısındaki hatanın kaybolduğunu görün.
- `type A = { name: string }` ile `type B = { name: number }` tiplerini `&` ile birleştirin; `name`'in tipinin `never` olduğunu görün.

## Detaylı öğrenmek için

- **Resmi doküman:** TypeScript Handbook'un Object Types sayfası; opsiyonel, `readonly`, excess property check, `extends` ve intersection.[^2]
- **Kitap:** [Matt Pocock](https://www.mattpocock.com/)'un çevrimiçi okunabilen *Total TypeScript Essentials* kitabının "Objects" bölümü; intersection ile `interface extends` karşılaştırması.[^10]
- **Yazı:** Matt Pocock'un "Type vs Interface: Which Should You Use?" yazısı.[^8]
- **Yazı:** [Stefan Baumgartner](https://oida.dev/)'ın declaration merging'in yol açtığı sürprizleri anlatan "Tidy TypeScript: Prefer type aliases over interfaces" yazısı.[^9]
- **Alıştırma:** Matt Pocock'un ücretsiz, etkileşimli Beginner's TypeScript eğitimi.[^13]

## Kaynaklar

1. [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) *(doc)* — Type alias, interface, aralarındaki farklar ve union tipler; "`type`'ın özelliklerine ihtiyaç duyana kadar `interface`" önerisi.
2. [TypeScript Handbook: Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html) *(doc)* — Opsiyonel ve `readonly` özellikler, excess property check, `extends`, intersection ve çakışmaların farkı.
3. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Unions, Literals, and Narrowing](https://www.totaltypescript.com/books/total-typescript-essentials/unions-literals-and-narrowing) *(article)* — Union ve literal tipler, otomatik tamamlama.
4. [TypeScript Handbook: Enums](https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums) *(doc)* — "Objects vs Enums": modern TypeScript'te `as const` object'in çoğu zaman yeterli olması.
5. [TypeScript 5.8 Release Notes: --erasableSyntaxOnly](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html) *(doc)* — `enum`, namespace ve parameter property'leri hata yapan ayar ve Node.js type stripping gerekçesi.
6. [create-vite: template-react-ts/tsconfig.app.json](https://github.com/vitejs/vite/blob/main/packages/create-vite/template-react-ts/tsconfig.app.json) *(repo)* — Vite React şablonunda `erasableSyntaxOnly` ve `verbatimModuleSyntax`'ın açık olması.
7. [Matt Pocock](https://www.mattpocock.com/): [Why I Don't Like Enums](https://www.totaltypescript.com/why-i-dont-like-typescript-enums) *(article)* — Sayısal enum'ların tuhaflıkları ve "yeni bir projeye enum eklemem" görüşü.
8. [Matt Pocock](https://www.mattpocock.com/): [Type vs Interface: Which Should You Use?](https://www.totaltypescript.com/type-vs-interface-which-should-you-use) *(article)* — Varsayılan olarak `type`, kalıtım için `interface extends`; declaration merging riski.
9. [Stefan Baumgartner](https://oida.dev/): [Tidy TypeScript: Prefer type aliases over interfaces](https://oida.dev/tidy-typescript-prefer-type-aliases/) *(article)* — 2020 tarihli; global interface'lerin fark edilmeden genişlemesi örneği.
10. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Objects](https://www.totaltypescript.com/books/total-typescript-essentials/objects) *(article)* — Intersection, `interface extends` ve declaration merging; yazarın `type` varsayılanı.
11. [TypeScript Handbook: Modules](https://www.typescriptlang.org/docs/handbook/2/modules.html) *(doc)* — Tipleri export/import etmek, `import type` ve satır içi `type` import'ları.
12. [TSConfig Reference: verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html) *(doc)* — `type` işaretli import'ların silinmesi, diğerlerinin olduğu gibi kalması.
13. [Matt Pocock](https://www.mattpocock.com/): [Beginner's TypeScript](https://totaltypescript.com/tutorials/beginners-typescript) *(video)* — Ücretsiz, 18 derslik etkileşimli eğitim.
