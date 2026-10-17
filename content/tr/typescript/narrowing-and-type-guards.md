---
title: "Narrowing ve type guard"
description: "Union'ı daraltma, discriminated union ve güvenli tip kontrolü."
lastVerified: "2026-10-17"
translationKey: "typescript/narrowing-and-type-guards"
---

## Narrowing Nedir

Union tipli bir değer birkaç şeyden biri olabilir. TypeScript size yalnızca **hepsinde ortak olan** işlemlere izin verir:

```ts
function formatPrice(price: number | string) {
  return price.toFixed(2);
  // Hata: Property 'toFixed' does not exist on type 'string | number'.
}
```

Çözüm, değeri bir `if` ile kontrol etmektir. TypeScript kodun akışını takip eder ve her dalda değerin olabileceği en dar tipi hesaplar. Bildirilen tipten daha dar bir tipe inmeye **narrowing** *(daraltma)*, bunu sağlayan kontrollere **type guard** denir.[^1]

```ts
function formatPrice(price: number | string) {
  if (typeof price === "string") {
    return price; // price: string
  }
  return price.toFixed(2); // price: number
}
```

`return`'den sonra `string` ihtimali kalmadığı için TypeScript alttaki satırda `price`'ı `number` kabul eder. Buna **control flow analysis** denir.[^1] Ekstra bir sözdizimi yoktur; yazdığınız sıradan JavaScript kontrolleri tipi daraltır.

## Yerleşik Kontroller

| Kontrol | Ne zaman |
| :-- | :-- |
| `typeof x === "string"` | Primitive tipleri ayırmak |
| `if (x)` / `if (!x)` | `null`, `undefined` ve boş değerleri elemek |
| `x === "shipped"`, `x != null` | Belirli bir değere ya da `null`'a göre ayırmak |
| `"weight" in x` | Object'leri sahip oldukları alana göre ayırmak |
| `x instanceof Date` | Class örneklerini *(`Date`, `Error`)* ayırmak |

`typeof`'un bir tuzağı var: JavaScript'te `typeof null` da `"object"` döner. TypeScript bunu bilir; `typeof x === "object"` dalında `x` hâlâ `null` olabilir ve sizi `'x' is possibly 'null'` hatasıyla uyarır.[^1]

Truthiness kontrolü *(`if (value)`)* kısa ama dikkat ister: `0` ve `""` de falsy'dir.[^1] Stok gibi `0` olabilen değerlerde açık karşılaştırma yapın:

```ts
function showStock(stock: number | undefined) {
  if (stock === undefined) {
    return "Bilgi yok";
  }
  return stock === 0 ? "Tükendi" : `${stock} adet`; // stock: number
}
```

`if (!stock)` yazsaydınız stok `0` olduğunda da "Bilgi yok" görünürdü. `x != null` ise tek seferde hem `null` hem `undefined`'ı eler.[^1]

`in` ile object'leri bir alanın varlığına göre ayırırsınız:[^1]

```ts
type PhysicalProduct = { name: string; weight: number };
type DigitalProduct = { name: string; downloadUrl: string };

function shippingLabel(product: PhysicalProduct | DigitalProduct) {
  if ("weight" in product) {
    return `${product.weight} kg`; // PhysicalProduct
  }
  return "İndirme linki e-postayla gönderilir"; // DigitalProduct
}
```

## Discriminated Union

Gerçek projelerde en çok işinize yarayacak kalıp budur. Union'daki her üyeye aynı isimde, **literal tipli** bir alan verirsiniz *(genellikle `status`, `type` ya da `kind`)*. Bu ortak alana **discriminant** denir; onu kontrol etmek, union'ı tek bir üyeye daraltır.[^1][^2]

Ürün listesini API'den çeken bir ekranın üç durumu olsun:

```ts
type ProductsState =
  | { status: "loading" }
  | { status: "success"; data: Product[] }
  | { status: "error"; message: string };

function renderProducts(state: ProductsState): string {
  switch (state.status) {
    case "loading":
      return "Yükleniyor...";
    case "success":
      return `${state.data.length} ürün bulundu`; // yalnızca burada data var
    case "error":
      return `Hata: ${state.message}`; // yalnızca burada message var
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}
```

`{ isLoading: boolean; data?: Product[]; error?: string }` gibi opsiyonel alanlarla kurulan bir tip, "hem yükleniyor hem hata var" gibi imkansız durumlara izin verir ve her yerde `!` kullanmaya iter. Discriminated union bu durumları tip seviyesinde imkansız kılar.[^1] React'te `useReducer` action'ları da aynı kalıpla yazılır; bunu React'te tipler dersinde göreceksiniz.

### never ile eksiksiz kontrol

`default` dalındaki satır bir güvenlik ağıdır. Bütün durumlar ele alındıysa geriye hiçbir ihtimal kalmaz, `state`'in tipi `never` olur ve atama geçerlidir.[^1] Union'a ileride `{ status: "idle" }` eklenir ama `case "idle":` unutulursa TypeScript unutulan durumu adıyla söyler:

```ts
const exhaustiveCheck: never = state;
// Hata: Type '{ status: "idle"; }' is not assignable to type 'never'.
```

## Kendi Type Guard'ınız

Kontrol uzun ya da tekrar eden bir hale gelince onu fonksiyona çıkarırsınız. Dönüş tipine `value is Product` yazarsanız fonksiyon bir **type predicate** olur: `true` dönerse TypeScript değeri `Product` kabul eder.[^1]

```ts
function isProduct(value: unknown): value is Product {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "price" in value &&
    typeof value.price === "number" &&
    "stock" in value &&
    typeof value.stock === "number"
  );
}
```

> [!WARNING]
>
> TypeScript, fonksiyonun içindeki kontrolün `value is Product` iddiasıyla uyuştuğunu **doğrulamaz**. Kontrolü eksik yazarsanız tip yanlış daraltılır. Kendi type guard'ınız, `as` kadar dikkat ister.[^3]

TypeScript 5.5'ten beri basit fonksiyonlar için predicate'i kendisi çıkarır *(inferred type predicates)*. En çok `filter`'da işe yarar:[^4]

```ts
const cartProducts = cartIds
  .map((id) => products.find((p) => p.id === id))
  .filter((product) => product !== undefined);
// TS 5.5+: Product[] (öncesinde (Product | undefined)[])
```

`filter((x) => !!x)` sayılarda çalışmaz, çünkü `false` dönmesi hem `undefined` hem `0` anlamına gelebilir; açık karşılaştırma yazın.[^4]

### Assertion fonksiyonları

Type guard `boolean` döner ve `if` ister. **Assertion fonksiyonu** ise koşul sağlanmazsa hata fırlatır; çağrıdan sonraki satırlarda tip daralmış olur. Dönüş tipi `asserts value is ...` şeklinde yazılır.[^5]

```ts
function assertIsDefined<T>(
  value: T,
  message: string,
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

function getPrice(id: number) {
  const product = products.find((p) => p.id === id); // Product | undefined
  assertIsDefined(product, `Ürün bulunamadı: ${id}`);
  return product.price; // product: Product
}
```

`<T>` ve `NonNullable<T>` sözdizimini Generic'ler ve Utility types derslerinde göreceksiniz.

## as ve ! ile Tipi Zorlamak

**Type assertion** *(`as`)* TypeScript'e "bu değerin tipini ben senden iyi biliyorum" demektir. Hiçbir çalışma zamanı kontrolü yapmaz; yanılıyorsanız hata uygulama çalışırken çıkar.[^6] Postfix `!` *(non-null assertion)* ise değerin `null` ya da `undefined` olmadığını kontrol etmeden iddia eder.[^6]

```ts
const data = JSON.parse('{"id": 1}') as Product;
data.name.toUpperCase(); // derlenir, çalışırken patlar: name undefined

const product = products.find((p) => p.id === 99)!;
product.price; // derlenir, ürün yoksa çalışırken patlar
```

TypeScript yalnızca birbiriyle örtüşen tipler arasında `as`'e izin verir. `"1299" as number` gibi ilgisiz bir dönüşüm `Conversion of type 'string' to type 'number' may be a mistake...` hatası verir.[^6]

Kural basit: önce gerçek bir kontrolle daraltın *(`if`, type guard, discriminated union)*; `as` ve `!`'i hata mesajını susturmak için değil, yalnızca TypeScript'in bilemeyeceği ama sizin kesin bildiğiniz durumlarda kullanın.

## unknown'ı Daraltmak

Dış dünyadan gelen veri, tipi bilinmeyen veridir. `response.json()` ve `JSON.parse` ise `any` döner ve kontrolü tamamen kapatır. Değeri `unknown` olarak alıp daraltmak daha güvenlidir: TypeScript, kontrol etmeden kullanmanıza izin vermez.[^2]

```ts
async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("/api/products");
  const data: unknown = await response.json();

  if (!Array.isArray(data) || !data.every(isProduct)) {
    throw new Error("Beklenmeyen ürün verisi");
  }
  return data; // data: Product[]
}
```

`isProduct` içindeki `"id" in value && typeof value.id === "number"` zinciri, TypeScript 4.9 ile mümkün oldu: `in` kontrolü artık tipte listelenmemiş bir alanı da erişilebilir yapar.[^7]

`catch` bloğundaki hata da `unknown`'dır, çünkü JavaScript'te her şey fırlatılabilir. `strict` modda açık olan `useUnknownInCatchVariables` bunu sağlar.[^8][^9]

```ts
try {
  await addToCart(productId);
} catch (error) {
  console.error(error.message);
  // Hata: 'error' is of type 'unknown'.

  const message = error instanceof Error ? error.message : String(error);
  console.error(message); // güvenli
}
```

> [!TIP]
>
> Gerçek projelerde API yanıtlarını elle yazılmış type guard'larla değil, [!zod] gibi bir şema kütüphanesiyle doğrularsınız. Şema hem çalışma zamanında veriyi kontrol eder hem de tipi kendisi üretir.[^10] Formlar yolundaki Zod dersi bunu ayrıntılı anlatır.

## Kendin Dene

- TS Playground'da `ProductsState`'e `{ status: "empty" }` ekleyin ve `never` kontrolünün hangi satırda hata verdiğine bakın.
- `isProduct`'tan `stock` kontrolünü silin. TypeScript hata veriyor mu? Neden vermediğini düşünün.
- `[1, 0, undefined].filter((x) => x !== undefined)` ile `filter((x) => !!x)` sonuçlarının tiplerini fareyle üzerine gelerek karşılaştırın.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** TypeScript Handbook'un Narrowing sayfası; bu dersteki her kontrolün örnekli anlatımı.[^1]
- **Kitap:** [Matt Pocock](https://www.mattpocock.com/)'un çevrimiçi okunabilen Total TypeScript Essentials kitabının "Unions, Literals, and Narrowing" bölümü.[^2]
- **Yazı:** [Kent C. Dodds](https://kentcdodds.com/)'un `catch` bloğundaki `unknown` hatadan güvenle mesaj çıkarma yazısı.[^9]
- **Yazı:** TypeScript 5.5 duyurusundaki "Inferred Type Predicates" bölümü; özelliği geliştiren [Dan Vanderkam](https://danvk.org/) yazdı.[^4]
- **Resmi doküman:** Zod'un tanıtım sayfası; şema ile çalışma zamanı doğrulaması.[^10]

## Kaynaklar

1. [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) *(doc)* — `typeof`, truthiness, eşitlik, `in`, `instanceof`, type predicate, discriminated union ve `never` ile eksiksiz kontrol.
2. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Unions, Literals, and Narrowing](https://www.totaltypescript.com/books/total-typescript-essentials/unions-literals-and-narrowing) *(article)* — Narrowing, `unknown`'ın neden güvenli olduğu ve discriminated union ile durum modelleme.
3. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Utility Folder Development](https://www.totaltypescript.com/books/total-typescript-essentials/utility-folder-development-in-typescript) *(article)* — Kendi type predicate ve assertion fonksiyonlarınızın `as` kadar riskli olabileceği uyarısı.
4. [Announcing TypeScript 5.5](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/) *(article)* — 20 Haziran 2024. `filter` ile inferred type predicates, koşulları ve `!!x` sınırlaması.
5. [TypeScript 3.7 Release Notes: Assertion Functions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html) *(doc)* — `asserts condition` ve `asserts val is Type` imzaları.
6. [TypeScript Handbook: Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) *(doc)* — Type assertion ve non-null assertion; çalışma zamanında kontrol yapmadıkları.
7. [Announcing TypeScript 4.9](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9/) *(article)* — `in` operatörüyle listelenmemiş alanlarda daraltma; `unknown` veriden alan okuma örneği.
8. [TypeScript 4.4 Release Notes: useUnknownInCatchVariables](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html) *(doc)* — `catch` değişkeninin `any` yerine `unknown` olması ve bayrağın `strict` ile birlikte açılması.
9. [Kent C. Dodds](https://kentcdodds.com/): [Get a catch block error message with TypeScript](https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript) *(article)* — Her şeyin fırlatılabileceği ve `getErrorMessage` yardımcı fonksiyonu.
10. [Zod](https://zod.dev/) *(doc)* — "TypeScript-first schema validation with static type inference"; şema ile veriyi doğrulama.
