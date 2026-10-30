---
title: "Temel tipler ve çıkarım"
description: "Primitive tipler, array, fonksiyon tipleri, any, unknown ve tip çıkarımı."
lastVerified: "2026-10-17"
translationKey: "typescript/basic-types-and-inference"
---

## Tip belirtmek

[!typescript]'te bir değişkenin, parametrenin ya da dönüş değerinin tipi, adından sonra iki nokta üst üste ile yazılır. Buna **type annotation** denir.[^1]

```ts
let productName: string = "Wireless Headphones";
let price: number = 1299.9;
let inStock: boolean = true;

price = "1299";
// Hata: Type 'string' is not assignable to type 'number'.
```

Üç temel *(primitive)* tip `string`, `number` ve `boolean`'dır. `number` tam sayı ve ondalık sayıyı ayırmaz; JavaScript'te ikisi de aynı tiptir. Tipleri her zaman küçük harfle yazın: `String`, `Number` ve `Boolean` başka şeylerdir.[^1] Daha seyrek kullanılan `bigint` ve `symbol` de vardır.

## Tip çıkarımı

Yukarıdaki örnekte tipleri yazmaya gerek yoktu. TypeScript, değişkenin tipini ilk değerinden kendisi çıkarır. Buna **tip çıkarımı** *(type inference)* denir.[^1][^2] `let price = 1299.9;` yazdığınızda `price` yine `number` olur ve `price = "1299"` aynı hatayı verir. Editörde değişkenin üzerine geldiğinizde çıkarılan tipi görürsünüz. Resmi Handbook'un önerisi açıktır: "Yeni başlıyorsanız düşündüğünüzden daha az type annotation yazmayı deneyin."[^1]

| Nerede | Tip yazılır mı? |
| :-- | :-- |
| Yerel değişkenler | Hayır, çıkarıma bırakın |
| Fonksiyon parametreleri | Evet, TypeScript parametreyi kullanımdan çıkarmaz |
| Callback parametreleri *(`map`, `onClick`)* | Hayır, bağlamdan çıkarılır |
| Dışa açılan fonksiyonun dönüş tipi | Yazmayı düşünün |

[Dan Vanderkam](https://danvk.org/) da *Effective TypeScript*'te aynı kuralı verir: yerel değişkenlere değil, fonksiyon imzalarına tip yazın.[^3] Dönüş tipini yazmak, fonksiyonun içindeki bir hatanın onu kullanan her yere yayılmasını engeller; hata fonksiyonun kendisinde görünür.[^3] [Matt Pocock](https://www.mattpocock.com/) da modülün en üst seviyesindeki fonksiyonlara dönüş tipi yazmayı, JSX döndüren component'leri ise bunun dışında tutmayı önerir.[^4]

```ts
export function getShippingCost(total: number): number {
  if (total >= 500) {
    return 0;
  }
  return "49.90";
  // Hata: Type 'string' is not assignable to type 'number'.
}
```

### let ve const farkı

`let` ile tanımlanan değişken sonradan değişebileceği için genel tipi alır. `const` değişmeyeceği için tam değerin kendisi tip olur. Buna **literal tip** denir.[^1]

```ts
let orderStatus = "pending"; // string, sonra "shipped" atanabilir
const currency = "TRY"; // "TRY"
```

## Array ve tuple

Array tipi, eleman tipinin sonuna `[]` eklenerek yazılır. `Array<number>` yazımı da aynı anlama gelir; bu `<>` yazımını Generic'ler dersinde göreceksiniz.[^1]

Farklı tipte elemanlar varsa TypeScript hepsini kapsayan bir tip seçer.[^2] **Tuple** ise eleman sayısı ve her sıradaki tipi sabit olan bir array'dir.[^5] React'te `useState`'in döndürdüğü `[value, setValue]` çifti de bir tuple'dır.

```ts
const prices: number[] = [1299.9, 249];
const tags: Array<string> = ["ses", "kablosuz"];
const ids = [1, 2, 3]; // number[]
ids.push("4");
// Hata: Argument of type 'string' is not assignable to parameter of type 'number'.

const mixed = [1, "iki", null]; // (string | number | null)[]
const entry: [string, number] = ["Wireless Headphones", 2]; // tuple
```

## Fonksiyonlar

Parametre tipleri parametre adından sonra, dönüş tipi parantezden sonra yazılır. Tip yazılan parametreye gelen her argüman kontrol edilir.[^1]

```ts
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

calculateTotal(1299.9);
// Hata: Expected 2 arguments, but got 1.
```

### Opsiyonel ve varsayılan parametreler

Parametre adından sonra `?` koymak onu opsiyonel yapar; içeride tipi `string | undefined` olur. Varsayılan değer verilen parametre de opsiyoneldir ve tipini o değerden alır.[^6]

```ts
function formatPrice(amount: number, currency?: string) {
  return `${amount.toFixed(2)} ${currency ?? "TRY"}`;
}

function applyDiscount(price: number, rate = 0.1) {
  return price * (1 - rate); // rate: number
}

formatPrice(249); // "249.00 TRY"
applyDiscount(1000, "0.2");
// Hata: Argument of type 'string' is not assignable to parameter of type 'number'.
```

### void ve arrow function

Değer döndürmeyen fonksiyonun dönüş tipi `void`'dir.[^6] Arrow function'larda tipler aynı yerlere yazılır. Fonksiyon `map` gibi tipini bilen bir yere verildiğinde parametre tipi bağlamdan çıkarılır; buna **contextual typing** denir.[^1][^2]

```ts
function logOrder(orderId: string): void {
  console.log(`Sipariş alındı: ${orderId}`);
}

const toUpper = (text: string) => text.toUpperCase(); // dönüş: string
const labels = [249, 89.5].map((p) => p.toFixed(2)); // p: number
```

### Fonksiyon tipi

Bir fonksiyonu parametre olarak alırken ya da prop olarak verirken tipini `(parametre: tip) => dönüşTipi` şeklinde yazarsınız. Parametre adı zorunludur.[^6]

```ts
type PriceFormatter = (amount: number) => string;

function renderPrice(amount: number, format: PriceFormatter) {
  return format(amount);
}

renderPrice(249, (amount) => `${amount} TL`);
renderPrice(249, (amount) => amount * 2);
// Hata: Type 'number' is not assignable to type 'string'.
```

`type` ile tipe isim verme konusunu Interface, type ve union dersinde ayrıntılı göreceksiniz.

## null ve undefined

`strictNullChecks` açıkken `null` ve `undefined` kendi tipleridir; `string` bekleyen yere `null` veremezsiniz.[^7] Bu ayar `strict` ile birlikte gelir ve TypeScript 7'de `strict` artık varsayılan olarak açıktır.[^8] Bir değer olmayabilirse bunu tipte `|` ile söylersiniz:

```ts
function formatCoupon(code: string | null) {
  code.toUpperCase();
  // Hata: 'code' is possibly 'null'.

  if (code !== null) {
    return code.toUpperCase(); // burada code: string
  }
  return "Kupon yok";
}
```

`|` ile yazılan **union** tiplere sonraki derste, `if` ile tipi daraltmaya *(narrowing)* Narrowing ve type guard dersinde değineceğiz.

## any, unknown ve never

**`any`** tip kontrolünü kapatır: her şeyi kabul eder, her işleme izin verir. Bu yüzden kaçınılması gerekir.[^1] `function getTotal(items) {...}` gibi tipsiz bir parametreyi TypeScript `any` sayar; `noImplicitAny` ayarı *(strict ile açık)* bunu `Parameter 'items' implicitly has an 'any' type.` hatasına çevirir.[^9]

**`unknown`**, `any`'nin güvenli karşılığıdır: her değer atanabilir ama tipi kontrol edilmeden üzerinde hiçbir işlem yapılamaz.[^10] Bu yüzden `JSON.parse` ya da API'den gelen veri gibi tipi bilinmeyen değerler için doğru seçimdir.[^11]

```ts
const fromAny: any = JSON.parse('{"price": 249}');
fromAny.prise.toFixed(2); // derlenir, çalışırken patlar

const fromUnknown: unknown = JSON.parse('{"price": 249}');
fromUnknown.price;
// Hata: 'fromUnknown' is of type 'unknown'.
```

`unknown` bir değeri kullanmadan önce `typeof` gibi kontrollerle tipini doğrularsınız; bunu Narrowing ve type guard dersinde göreceksiniz.

> [!TIP]
>
> `any` "bunun ne olduğu umurumda değil", `unknown` ise "bunun ne olduğunu bilmiyorum" demektir.[^11] Emin olmadığınızda `unknown` yazın; TypeScript sizi önce kontrol etmeye zorlar.

**`never`** hiçbir zaman oluşmayan değerin tipidir; örneğin her zaman hata fırlatan `function fail(message: string): never` fonksiyonunun dönüş tipi.[^6]

## Literal tipler ve as const

Literal tipleri `|` ile birleştirerek bir değişkenin alabileceği değerleri sınırlayabilirsiniz: `let size: "S" | "M" | "L"` değişkenine `"XL"` atanamaz.[^1] Bunu bir sonraki derste ayrıntılı göreceksiniz.

Object içindeki özellikler değişebileceği için genel tipi alır. Sonuna `as const` eklemek tüm değerleri literal ve `readonly` yapar.[^1]

```ts
const config = { currency: "TRY", taxRate: 0.2 };
// { currency: string; taxRate: number }

const constConfig = { currency: "TRY", taxRate: 0.2 } as const;
// { readonly currency: "TRY"; readonly taxRate: 0.2 }
constConfig.taxRate = 0.1;
// Hata: Cannot assign to 'taxRate' because it is a read-only property.
```

## Object tipine ilk bakış

Object'in tipini, özelliklerini süslü parantez içinde sayarak doğrudan yazabilirsiniz. Eksik bir özellik hata verir.[^1]

```ts
function printProduct(product: { name: string; price: number }) {
  console.log(`${product.name}: ${product.price} TL`);
}

printProduct({ name: "Wireless Headphones" });
// Hata: Property 'price' is missing in type '{ name: string; }' but required in type '{ name: string; price: number; }'.
```

Bu yazım tek seferlik kullanımlar içindir. Aynı şekli birden çok yerde kullanmak için ona `type` ya da `interface` ile isim verirsiniz; bunu bir sonraki derste anlatıyoruz.

## Kendin dene

TypeScript Playground'u açın ve:

- `const total = calculateTotal(249, 2)` yazıp `total`'ın üzerine gelin; çıkarılan tipi görün.
- `calculateTotal`'ın parametrelerinden tipleri silin ve çıkan `implicitly has an 'any' type` hatasını okuyun.
- `getShippingCost`'tan `: number` dönüş tipini silin; hatanın kaybolduğunu ve dönüş tipinin `"49.90" | 0` olarak çıkarıldığını görün.
- `JSON.parse` sonucunu `unknown` tipinde bir değişkene atayın ve `typeof` kontrolüyle `number` olduğunu doğrulayın.

## Detaylı öğrenmek için

- **Resmi doküman:** TypeScript Handbook'un Everyday Types sayfası; bu dersteki tüm konuların kaynağı.[^1]
- **Kitap:** [Matt Pocock](https://www.mattpocock.com/)'un çevrimiçi okunabilen *Total TypeScript Essentials* kitabının "Essential Types and Annotations" bölümü.[^12]
- **Yazı:** [Dan Vanderkam](https://danvk.org/)'ın *Effective TypeScript* kitabından "Avoid Cluttering Your Code with Inferable Types" maddesi.[^3]
- **Konuşma:** [Stefan Baumgartner](https://oida.dev/)'ın `any`, `unknown` ve tip kontrolünün kaçırdığı yerleri anlattığı "The Lies We Tell Ourselves Using TypeScript" konuşması *(TypeScript Congress 2023, 28 dk)*.[^13]
- **Alıştırma:** Matt Pocock'un ücretsiz, etkileşimli Beginner's TypeScript eğitimi *(18 ders)*.[^14]

## Kaynaklar

1. [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) *(doc)* — Primitive tipler, array, `any`, type annotation, fonksiyonlar, literal tipler ve `as const`.
2. [TypeScript Handbook: Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html) *(doc)* — En iyi ortak tip *(best common type)* ve contextual typing.
3. [Dan Vanderkam](https://danvk.org/): [Item 19: Avoid Cluttering Your Code with Inferable Types](https://effectivetypescript.com/2020/04/28/avoid-inferable/) *(article)* — Yerel değişkenlere değil fonksiyon imzalarına tip yazmak; dönüş tipinin faydası.
4. [Matt Pocock](https://www.mattpocock.com/): [Should You Declare Return Types?](https://www.totaltypescript.com/should-you-declare-return-types) *(article)* — Üst seviye fonksiyonlara dönüş tipi yazmak, JSX döndüren component'ler hariç.
5. [TypeScript Handbook: Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types) *(doc)* — Tuple tipleri, opsiyonel ve `readonly` tuple'lar.
6. [TypeScript Handbook: More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) *(doc)* — Fonksiyon tipi, opsiyonel ve varsayılan parametre, `void`, `unknown` ve `never`.
7. [TSConfig Reference: strictNullChecks](https://www.typescriptlang.org/tsconfig/#strictNullChecks) *(doc)* — `null` ve `undefined`'ın ayrı tip olması; `strict` ile varsayılan açık.
8. [Daniel Rosenwasser: Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) *(article)* — 8 Temmuz 2026; `strict`'in varsayılan olarak `true` olması.
9. [TSConfig Reference: noImplicitAny](https://www.typescriptlang.org/tsconfig/#noImplicitAny) *(doc)* — Çıkarılamayan tipin `any`'ye düşmesini hataya çevirmek.
10. [TypeScript 3.0 Release Notes: The unknown type](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html) *(doc)* — `unknown`'ın `any`'nin tip güvenli karşılığı olarak eklenmesi.
11. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Unions, Literals, and Narrowing](https://www.totaltypescript.com/books/total-typescript-essentials/unions-literals-and-narrowing) *(article)* — `unknown` ve `any` farkı, `never`, literal tipler.
12. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Essential Types and Annotations](https://www.totaltypescript.com/books/total-typescript-essentials/essential-types-and-annotations) *(article)* — Annotation, çıkarım, array, tuple ve fonksiyon tipleri; alıştırmalarıyla.
13. [Stefan Baumgartner](https://oida.dev/): [The Lies We Tell Ourselves Using TypeScript](https://gitnation.com/contents/the-lies-we-tell-ourselves-using-typescript) *(video)* — 28 dakika. `any`, `unknown`, `as` ve tip sisteminin kör noktaları.
14. [Matt Pocock](https://www.mattpocock.com/): [Beginner's TypeScript](https://totaltypescript.com/tutorials/beginners-typescript) *(video)* — Ücretsiz, 18 derslik etkileşimli eğitim; değişken, fonksiyon ve hata tipleri.
