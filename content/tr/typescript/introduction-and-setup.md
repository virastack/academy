---
title: "Giriş ve kurulum"
description: "TypeScript nedir, neden kullanılır ve ilk projede tip kontrolü."
lastVerified: "2026-10-17"
translationKey: "typescript/introduction-and-setup"
---

## TypeScript Nedir

[!typescript], JavaScript'in üzerine **statik tip** sistemi ekleyen bir dildir. JavaScript'in bütün özelliklerini içerir; çalışan her JavaScript kodu aynı zamanda geçerli TypeScript kodudur.[^1] Bu yüzden TypeScript'e JavaScript'in **üst kümesi** *(superset)* denir.

Fark şudur: değişkenlerin, fonksiyon parametrelerinin ve nesnelerin hangi tipte olduğunu yazarsınız *(ya da TypeScript bunu kendisi çıkarır)*, kod çalışmadan önce bir **tip denetleyicisi** *(type checker)* bu tiplerin tutarlı olup olmadığını kontrol eder.[^2]

Bu ders TypeScript'in ne olduğunu, bir projeye nasıl kurulduğunu ve tip kontrolünün nerede çalıştığını anlatır. Tipleri yazmayı sonraki derslerde adım adım öğreneceksiniz.

## Neden Kullanılır

JavaScript dinamik tiplidir: bir değişkenin tipi ancak kod çalışınca belli olur. TypeScript bu bilgiyi kod yazarken verir. Bunun üç somut faydası vardır:

- **Hatalar çalıştırmadan önce görünür.** Yanlış tipte değer, yazım hatası olan property ya da çağrılmayı unutulan bir fonksiyon editörde kırmızı çizgiyle işaretlenir.[^2]
- **Editör sizi tanır.** Otomatik tamamlama, bir nesnede hangi alanların olduğunu, bir fonksiyonun hangi parametreleri beklediğini gösterir.
- **Değişiklik yapmak güvenlidir.** Bir alanın adını değiştirdiğinizde onu kullanan her dosya hata verir; hiçbir yeri gözden kaçırmazsınız.

Sektör de bu yöne gitti. State of JS 2025 anketinde katılımcıların %40'ı yalnızca TypeScript yazdığını söyledi *(2024'te %34)*; statik tip eksikliği hâlâ JavaScript'in en büyük sıkıntısı olarak gösteriliyor.[^3]

### İlk örnek

Sepet toplamını hesaplayan basit bir JavaScript kodu düşünün. Fiyatlardan biri API'den metin olarak gelmiş:

```js
const cart = [
  { name: "Kablosuz Kulaklık", price: 1299 },
  { name: "Telefon Kılıfı", price: "249" },
];

const total = cart.reduce((sum, item) => sum + item.price, 0);
console.log(total); // "1299249" — toplama değil, metin birleştirme
```

JavaScript hata vermez; yanlış sonucu sessizce üretir. Aynı kodu TypeScript ile, sepet elemanının şeklini tanımlayarak yazdığınızda hata kod çalışmadan yakalanır:

```ts
type CartItem = {
  name: string;
  price: number;
};

const cart: CartItem[] = [
  { name: "Kablosuz Kulaklık", price: 1299 },
  { name: "Telefon Kılıfı", price: "249" },
  // Hata: Type 'string' is not assignable to type 'number'.
];
```

`type` ile tip tanımlamayı [Interface, type ve union](/academy/typescript/interfaces-types-and-unions) dersinde ayrıntılı göreceksiniz.

## Tipler Çalışma Anında Yoktur

Tarayıcılar ve Node.js TypeScript tiplerini anlamaz. Kod çalışmadan önce tipler silinir ve geriye düz JavaScript kalır. Handbook'un ifadesiyle tip açıklamaları programın çalışma davranışını hiçbir zaman değiştirmez.[^2]

```ts
// Yazdığınız
function formatPrice(price: number): string {
  return `${price} TL`;
}

// Çalışan (tipler silindikten sonra)
function formatPrice(price) {
  return `${price} TL`;
}
```

> [!WARNING]
>
> TypeScript yalnızca **sizin yazdığınız** kodu kontrol eder. `fetch` ile gelen veri, `JSON.parse` sonucu ya da form girdisi çalışma anında gelir ve hiçbir tip kontrolünden geçmez. Bir API yanıtına `Product` tipi vermek, verinin gerçekten öyle olduğunu garanti etmez. Bu tür veriyi güvenle daraltmayı [Narrowing ve type guard](/academy/typescript/narrowing-and-type-guards) dersinde, şema ile doğrulamayı Formlar yolundaki [!zod] dersinde göreceksiniz.

## Playground'da Deneyin

Kurulum yapmadan denemenin en kısa yolu TypeScript Playground'dur.[^4] Sol tarafa kod yazarsınız, hatalar anında altı çizili görünür, sağ tarafta tipleri silinmiş JavaScript çıktısını izlersiniz. Yazdığınız kodu bir link ile paylaşabilirsiniz; soru sorarken çok işe yarar.

Yukarıdaki sepet örneğini Playground'a yapıştırıp `price: "249"` satırının üzerine gelmeyi deneyin.

## .ts ve .tsx

TypeScript dosyaları `.ts` uzantısını kullanır. İçinde JSX olan her dosya ise `.tsx` olmalıdır; bu uzantı TypeScript'e dosyada JSX olduğunu söyler.[^5]

| Dosya | Uzantı |
| :-- | :-- |
| Tip tanımları, yardımcı fonksiyonlar, API çağrıları | `types.ts`, `format-price.ts` |
| React component'leri | `ProductCard.tsx`, `App.tsx` |

## Yeni Proje: Vite ile React ve TypeScript

[!react] ile TypeScript projesi başlatmanın en kolay yolu [!vite]'ın `react-ts` şablonudur.[^6]

```command
npm create vite@latest my-store -- --template react-ts
```

Şablonda `src/main.tsx` ve `src/App.tsx` hazır gelir; kök dizinde üç tsconfig dosyası *(`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`)* bulunur. `package.json`'daki `build` script'i `tsc -b && vite build` şeklindedir: önce tip kontrolü yapılır, hata varsa build durur.

> [!NOTE]
>
> Ekim 2026 itibarıyla `create-vite` 9.2 şablonu `typescript` paketini `~6.0.2` olarak kurar; npm'deki son sürüm ise 7.0'dır. Aradaki farkın nedeni aşağıdaki TypeScript 7 bölümünde.

tsconfig dosyaları derleyiciye hangi dosyaları hangi kurallarla kontrol edeceğini söyler; ayrıntısını [tsconfig ve strict mod](/academy/typescript/tsconfig-and-strict-mode) dersinde göreceksiniz.

## Var Olan Projeye Eklemek

TypeScript bir npm paketidir ve `tsc` adında bir derleyici komutu getirir.[^2] Projeye geliştirme bağımlılığı olarak kurulur:

```command
npm install -D typescript
```

Ardından bir `tsconfig.json` oluşturun:

```command
npx tsc --init
```

TypeScript 7'de bu komut `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` gibi önerilen ayarların açık olduğu bir dosya üretir. React projesinde ayrıca `@types/react` ve `@types/react-dom` paketlerini kurmanız gerekir.[^5] Sonra dosyaları birer birer `.ts` / `.tsx` yapmaya başlayabilirsiniz; JavaScript dosyaları çalışmaya devam eder.

## Tip Kontrolünü Kim Yapar?

Bu, TypeScript'e yeni başlayanların en sık atladığı noktadır. Bir projede TypeScript iki ayrı işe yarar ve bu işleri farklı araçlar yapar:

| İş | Kim yapar |
| :-- | :-- |
| Tipleri silip JavaScript üretmek | Vite *(Oxc)*, Next.js *(SWC)*, esbuild, Node.js |
| Tiplerin doğru olup olmadığını kontrol etmek | `tsc` ve editör |

Vite `.ts` dosyalarında yalnızca dönüştürme yapar ve **tip kontrolü yapmaz**; dokümantasyonu bu işi editöre ve build sürecine bırakır.[^7] Yani geliştirme sunucusu, tip hatası olan kodu da çalıştırır. Next.js de geliştirme sırasında kodu SWC ile derler; `next build` ise varsayılan olarak tip kontrolü yapar ve hata varsa build'i durdurur.[^8]

Bu yüzden tip kontrolünü ayrıca çalıştırırsınız:

```command
npx tsc --noEmit
```

`--noEmit`, JavaScript dosyası üretmeden yalnızca kontrol yapar. Vite şablonunda ise doğru komut `npx tsc -b`'dir.

> [!CAUTION]
>
> Vite şablonundaki kök `tsconfig.json` dosyası kendi başına hiçbir dosya içermez *(`"files": []`)*, yalnızca diğer iki dosyaya referans verir. Bu yüzden kök dizinde `npx tsc --noEmit` çalıştırmak hiçbir şeyi kontrol etmez ve hata olsa bile başarılı biter. Vite projelerinde `npx tsc -b` kullanın.

Pratikte tip hatalarını üç yerde görürsünüz: yazarken editörde, build sırasında ve CI'da. CI adımını [tsconfig ve strict mod](/academy/typescript/tsconfig-and-strict-mode) dersinde kuracağız.

## Node.js ile Doğrudan Çalıştırmak

[!nodejs] 22.18 ve 23.6 sürümlerinden itibaren `.ts` dosyalarını ek araç olmadan çalıştırabilir; özellik 24.12 ve 25.2'de kararlı *(stable)* oldu.[^9] Node tip yazımını boşlukla değiştirip kodu çalıştırır, buna **type stripping** denir.

```command
node price.ts
```

Bu yöntemin iki sınırı vardır:[^9]

- **Tip kontrolü yapılmaz.** Hatalı tipli kod da çalışır; kontrol için yine `tsc` gerekir.
- **Yalnızca silinebilir söz dizimi desteklenir.** `enum`, çalışma anı kodu olan `namespace` ve class parameter property'leri dönüştürme gerektirdiği için desteklenmez. `.tsx` dosyaları da çalışmaz ve `tsconfig.json` okunmaz.

Script'ler ve küçük araçlar için idealdir. React uygulamasında ise bu işi Vite ya da Next.js yapar.

## TypeScript 7

8 Temmuz 2026'da yayımlanan TypeScript 7, derleyicinin Go diline taşınmış **native** sürümüdür. Tam build'lerde tipik olarak 8–12 kat hız sağlar; kurulumu ve `tsc` komutu aynı kalır.[^10] `strict` artık varsayılan olarak açıktır.

TypeScript 7 henüz bir JavaScript API'si sunmuyor. TypeScript'i kütüphane olarak kullanan araçlar *(typescript-eslint, Vue, Svelte gibi)* şimdilik 6.0 ile çalışır; bunun için `@typescript/typescript6` paketi yayımlandı.[^10] Vite şablonunun hâlâ 6.0 kurmasının nedeni budur. Next.js ise `next build` sırasında projedeki `tsc` komutunu kullandığı için TypeScript 7 ile doğrudan çalışır.[^8]

Yeni başlıyorsanız bu ayrım sizi çok etkilemez: 6.0'da temiz derlenen kod 7.0'da da aynı şekilde derlenir.[^10]

## Kendin Dene

- Playground'da ilk örnekteki `CartItem` tipini yazın, `price` değerini metin yapın ve hata mesajını okuyun.
- Aynı kodda bir alanın adını yanlış yazın *(`item.prise`)* ve TypeScript'in önerisine bakın.
- `npm create vite@latest` ile `react-ts` projesi açın, `App.tsx` içine bilerek bir tip hatası koyun; `npm run dev` çalışırken `npx tsc -b` ile hatayı görün.
- Bir `price.ts` dosyası yazıp `node price.ts` ile çalıştırın.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** TypeScript Handbook'un "The Basics" bölümü; statik tip kontrolü, `tsc` ve tiplerin silinmesi.[^2]
- **Kitap:** [Matt Pocock](https://www.mattpocock.com/)'un çevrimiçi okunabilen Total TypeScript Essentials kitabının "TypeScript In The Development Pipeline" bölümü.[^11]
- **Kitap:** [Dan Vanderkam](https://danvk.org/)'ın Effective TypeScript kitabı *(2. baskı, 2024, 83 madde)*.[^12]
- **Konuşma:** Anders Hejlsberg'in TypeScript'in Go'ya taşınmasını anlattığı "A 10x faster TypeScript" videosu *(Microsoft Developer, 2025, 14 dk)*.[^13]
- **Alıştırma:** Bu derste denediğiniz her örnek TypeScript Playground'da çalışır.[^4]

## Kaynaklar

1. [TypeScript Handbook: TypeScript for JavaScript Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html) *(doc)* — Mevcut JavaScript kodunun aynı zamanda TypeScript olması ve tip çıkarımı.
2. [TypeScript Handbook: The Basics](https://www.typescriptlang.org/docs/handbook/2/basic-types.html) *(doc)* — Statik tip kontrolü, `tsc` kurulumu, "Erased Types" ve strict ayarları.
3. [InfoQ: State of JavaScript 2025](https://www.infoq.com/news/2026/03/state-of-js-survey-2025) *(research)* — Katılımcıların %40'ının yalnızca TypeScript yazması; statik tip eksikliğinin en büyük sıkıntı olması.
4. [TypeScript Playground](https://www.typescriptlang.org/play/) *(doc)* — Tarayıcıda TypeScript yazma, çıktı ve paylaşılabilir link.
5. [react.dev: Using TypeScript](https://react.dev/learn/typescript) *(doc)* — JSX içeren dosyaların `.tsx` olması ve var olan projeye `@types/react` eklemek.
6. [Vite: Getting Started](https://vite.dev/guide/) *(doc)* — `npm create vite@latest` komutu, `--template` bayrağı ve Node.js sürüm gereksinimi.
7. [Vite: Features — TypeScript](https://vite.dev/guide/features#typescript) *(doc)* — Vite'ın yalnızca dönüştürme yapıp tip kontrolü yapmaması ve `tsc --noEmit` önerisi.
8. [Next.js: TypeScript](https://nextjs.org/docs/app/api-reference/config/typescript) *(doc)* — `next build` sırasında tip kontrolü, `ignoreBuildErrors` ve TypeScript 7 ile kullanım.
9. [Node.js: Modules — TypeScript](https://nodejs.org/api/typescript.html) *(doc)* — Type stripping'in varsayılan olduğu sürümler, desteklenmeyen söz dizimi ve tip kontrolü yapılmaması.
10. [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) *(article)* — Native derleyici, 8–12 kat hız, yeni varsayılanlar ve `@typescript/typescript6` ile araç uyumluluğu.
11. [Matt Pocock](https://www.mattpocock.com/): [TypeScript In The Development Pipeline](https://www.totaltypescript.com/books/total-typescript-essentials/typescript-in-the-development-pipeline) *(article)* — Tarayıcının TypeScript'i çalıştıramaması, Vite'ın tip kontrolü yapmaması ve CI'da `tsc --noEmit`.
12. [Dan Vanderkam](https://danvk.org/): [Effective TypeScript](https://effectivetypescript.com/) *(article)* — 83 maddelik kitap ve TypeScript yazılarının yer aldığı blog.
13. [Anders Hejlsberg: A 10x faster TypeScript](https://www.youtube.com/watch?v=pNlq-EVld70) *(video)* — Yaklaşık 14 dakika. Derleyicinin Go ile native'e taşınma kararı ve ilk ölçümler.
