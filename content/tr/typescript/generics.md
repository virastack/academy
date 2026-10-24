---
title: "Generic'ler"
description: "Tipe göre çalışan, yeniden kullanılabilir fonksiyon ve tipler."
lastVerified: "2026-10-17"
translationKey: "typescript/generics"
---

## Neden generic

Bir listenin ilk elemanını döndüren bir fonksiyon yazdığınızı düşünün. Ürünlerle de, sepet kalemleriyle de, string'lerle de çalışsın istiyorsunuz. İlk akla gelen `any` kullanmaktır:

```ts
function getFirst(items: any[]) {
  return items[0];
}

const first = getFirst(products); // any
first.nmae; // hata yok, yazım hatası çalışırken ortaya çıkar
```

Fonksiyon her tiple çalışır ama içeri giren tipin bilgisi kaybolur.[^1] Diğer seçenek her tip için ayrı fonksiyon yazmaktır *(`getFirstProduct`, `getFirstCartItem`...)*; o da aynı kodu tekrar etmek demektir.

**Generic**'ler bu ikisinin arasındaki yoldur: fonksiyon her tiple çalışır, ama hangi tiple çağrıldığını hatırlar.

## Generic fonksiyon

Fonksiyon adından sonra açılı parantez içine bir **tip parametresi** yazarsınız. `T`, çağrı anında gerçek bir tiple dolacak bir yer tutucudur:[^1]

```ts
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}

const firstProduct = getFirst(products); // Product | undefined
const firstName = getFirst(["Kulaklık", "Klavye"]); // string | undefined

firstProduct?.nmae;
// Hata: Property 'nmae' does not exist on type 'Product'.
```

`getFirst<Product>(products)` yazmanıza gerek yok: TypeScript argümana bakar ve `T`'nin `Product` olduğunu kendisi çıkarır *(type argument inference)*.[^1] [Matt Pocock](https://www.mattpocock.com/)'un benzetmesiyle generic fonksiyon, sıradan bir fonksiyonun üstüne oturtulmuş bir "tip fonksiyonu"dur: çalışma zamanındaki argüman `items`, tip seviyesindeki `T`'ye eşlenir.[^2]

### Tipi elle vermek

Çıkarım yetmediğinde ya da farklı bir tip istediğinizde tip argümanını açıkça yazarsınız. Örneğin boş bir dizide çıkarılacak bir tip yoktur:[^1][^3]

```ts
const none = getFirst<Product>([]); // Product | undefined

getFirst<string>(products);
// Hata: Argument of type 'Product[]' is not assignable to parameter of type 'string[]'.
```

Elle verilen tip, çıkarımı ezer ve argümanlar ona göre kontrol edilir.[^3]

### Birden fazla tip parametresi

Tip parametreleri virgülle ayrılır. `Array.prototype.map`'in sadeleştirilmiş hali iki tip arasındaki ilişkiyi kurar:

```ts
function mapItems<TItem, TResult>(
  items: TItem[],
  fn: (item: TItem) => TResult,
): TResult[] {
  return items.map(fn);
}

const names = mapItems(products, (product) => product.name); // string[]
```

Tek harfli `T` yaygın bir gelenektir. Birden fazla parametre olduğunda `TItem`, `TResult` gibi açıklayıcı isimler kodu okunur kılar.

## Constraint ile sınırlamak

`T` her şey olabildiği için fonksiyonun içinde ona özel bir alana erişemezsiniz:[^1]

```ts
function sortByPrice<T>(items: T[]) {
  return [...items].sort((a, b) => a.price - b.price);
  // Hata: Property 'price' does not exist on type 'T'.
}
```

`extends` ile `T`'ye bir alt sınır koyarsınız: "`price` alanı olan herhangi bir tip".[^1]

```ts
function sortByPrice<T extends { price: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.price - b.price);
}

const sortedProducts = sortByPrice(products); // Product[]
const sortedCart = sortByPrice(cartItems); // CartItem[]

sortByPrice(["Kulaklık"]);
// Hata: Type 'string' is not assignable to type '{ price: number; }'.
```

Fark, dönüş tipindedir. Parametreyi doğrudan `{ price: number }[]` yapsaydınız sonuç da `{ price: number }[]` olurdu ve `name` gibi diğer alanları kaybederdiniz. Generic sürüm, içeri gireni olduğu gibi geri verir.

### keyof ile anahtar seçmek

Bir tip parametresi diğerine bağlanabilir. `K extends keyof T`, "`K`, `T`'nin anahtarlarından biri olmalı" demektir:[^1]

```ts
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

const names = pluck(products, "name"); // string[]
const prices = pluck(products, "price"); // number[]

pluck(products, "nmae");
// Hata: Argument of type '"nmae"' is not assignable to parameter of type 'keyof Product'.
```

`keyof` ve `T[K]` sözdizimini Utility types dersinde ayrıntılı göreceksiniz.

## Generic tipler

Tip parametreleri yalnızca fonksiyonlarda değil, `type` ve `interface` tanımlarında da kullanılır. API'nin sayfalı yanıtı her kaynak için aynı şekle sahipse bir kez yazarsınız:[^4]

```ts
type Paginated<T> = {
  items: T[];
  page: number;
  totalPages: number;
};

type ProductPage = Paginated<Product>;
type CartPage = Paginated<CartItem>;
```

Bir tip parametresine `=` ile **varsayılan değer** verebilirsiniz. Varsayılanı olan parametre opsiyoneldir; varsayılanı olmayan zorunludur:[^1][^4]

```ts
type ApiResponse<TData, TError = string> =
  | { ok: true; data: TData }
  | { ok: false; error: TError };

type ProductResponse = ApiResponse<Product[]>; // error: string
type CartResponse = ApiResponse<CartItem[], { code: number; message: string }>;

const page: Paginated = { items: [], page: 1, totalPages: 1 };
// Hata: Generic type 'Paginated' requires 1 type argument(s).
```

### Zaten kullandığınız generic'ler

Generic'leri farkında olmadan kullanıyorsunuz. `number[]`, `Array<number>`'ın kısa yazımıdır. `async` bir fonksiyon `Promise<Product>` döner, `new Map<number, number>()` anahtar ve değer tipini alır. React'te `useState<Product | null>(null)` de bir generic çağrısıdır; bunu ve generic component yazmayı React'te tipler dersinde göreceksiniz.

## Tipli fetch yardımcısı

Her projede bir `fetchJson<T>` yardımcısı bulunur:

```ts
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`İstek başarısız: ${response.status}`);
  }
  return response.json();
}

const products = await fetchJson<Product[]>("/api/products"); // Product[]
```

Kullanışlıdır ama dürüst olmak gerekirse bir **kontrolsüz type assertion**'dır. `response.json()` `any` döner; `fetchJson<Product[]>` yazmak, `as Product[]` yazmaktan farksızdır. Sunucu başka bir şey dönerse TypeScript bunu bilemez.[^5]

> [!WARNING]
>
> `T` bu fonksiyonda yalnızca dönüş tipinde geçiyor. Hiçbir argümana bağlı olmayan bu tür "return-only" generic'ler, `any`'nin kılık değiştirmiş halidir.[^5]

Daha güvenli sürüm, veriyi `unknown` olarak alıp bir type guard ile doğrular. Narrowing ve type guard dersindeki `isProduct` burada işe yarar:

```ts
async function fetchJson<T>(
  url: string,
  isValid: (value: unknown) => value is T,
): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`İstek başarısız: ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!isValid(data)) {
    throw new Error("Beklenmeyen yanıt");
  }
  return data;
}

const product = await fetchJson("/api/products/1", isProduct); // Product
```

Artık `T` iki yerde geçiyor ve argümandan çıkarılıyor; tip gerçek bir kontrole dayanıyor. Gerçek projelerde `isValid` yerine çoğunlukla bir [!zod] şeması verilir.

## Gereğinden fazla generic yazmayın

Generic yazmak keyiflidir ve abartmak kolaydır. TypeScript Handbook'taki ölçüt, [Dan Vanderkam](https://danvk.org/)'ın deyişiyle "generic'lerin altın kuralı", şudur:[^3][^5]

> [!TIP]
>
> Bir tip parametresi imzada yalnızca bir yerde geçiyorsa, ona gerçekten ihtiyacınız olup olmadığını yeniden düşünün. Tip parametreleri birden fazla değerin tipini **birbirine bağlamak** içindir.

```ts
// Gereksiz: T yalnızca bir yerde geçiyor, hiçbir şeyi bağlamıyor
function printName<T extends { name: string }>(item: T): void {
  console.log(item.name);
}
```

```ts
// Yeterli
function printName(item: { name: string }): void {
  console.log(item.name);
}
```

`getFirst<T>(items: T[]): T | undefined` kuralı geçer: `T` hem parametrede hem dönüşte geçer ve ikisini bağlar. Handbook ayrıca mümkün olduğunca az tip parametresi kullanmayı önerir.[^3] typescript-eslint'in `no-unnecessary-type-parameters` kuralı bu kuralı otomatik kontrol eder; `strict-type-checked` yapılandırmasında açıktır.[^6]

## Kendin dene

- TS Playground'da `getFirst([1, "iki"])` çağrısında `T`'nin ne olarak çıkarıldığına fareyle bakın.
- `pluck(cartItems, "quantity")` sonucunun tipini fareyle kontrol edin.
- `ApiResponse<TData, TError = string>` tipinden `ProductResponse` üretip `ok` alanıyla daraltın.

## Detaylı öğrenmek için

- **Resmi doküman:** TypeScript Handbook'un Generics sayfası; constraint, `keyof` ile constraint ve varsayılan tip parametreleri.[^1]
- **Resmi doküman:** Handbook'taki "Guidelines for Writing Good Generic Functions" bölümü; üç kısa kural.[^3]
- **Yazı:** [Matt Pocock](https://www.mattpocock.com/)'un generic'leri fonksiyon üstüne oturtulmuş tip fonksiyonu olarak anlattığı "Building the Mental Model for Generics".[^2]
- **Yazı:** [Dan Vanderkam](https://danvk.org/)'ın "The Golden Rule of Generics" yazısı; kötü ve iyi generic örnekleri.[^5]
- **Kitap:** [Matt Pocock](https://www.mattpocock.com/)'un Total TypeScript Essentials kitabının "Designing Your Types" bölümü; generic tipler, çoklu parametre ve varsayılanlar.[^4]

## Kaynaklar

1. [TypeScript Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) *(doc)* — `any` ile bilgi kaybı, tip argümanı çıkarımı, constraint, `keyof` ile constraint ve varsayılan tip parametreleri.
2. [Matt Pocock](https://www.mattpocock.com/): [Building the Mental Model for Generics](https://www.totaltypescript.com/mental-model-for-typescript-generics) *(article)* — Generic fonksiyonu sıradan fonksiyonun üstündeki tip fonksiyonu olarak düşünmek.
3. [TypeScript Handbook: More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html) *(doc)* — Tip argümanını elle verme ve iyi generic fonksiyon yazmanın üç kuralı.
4. [Matt Pocock](https://www.mattpocock.com/): [Total TypeScript Essentials: Designing Your Types](https://www.totaltypescript.com/books/total-typescript-essentials/designing-your-types-in-typescript) *(article)* — Generic tip alias'ları, birden fazla tip parametresi, varsayılan değer ve constraint.
5. [Dan Vanderkam](https://danvk.org/): [The Golden Rule of Generics](https://effectivetypescript.com/2020/08/12/generics-golden-rule/) *(article)* — 12 Ağustos 2020. Tek yerde geçen tip parametreleri ve `any` gibi davranan return-only generic'ler.
6. [typescript-eslint: no-unnecessary-type-parameters](https://typescript-eslint.io/rules/no-unnecessary-type-parameters/) *(doc)* — Yalnızca bir kez kullanılan tip parametrelerini yakalayan, tip bilgisi gerektiren kural.
