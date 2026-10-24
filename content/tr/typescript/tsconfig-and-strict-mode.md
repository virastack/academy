---
title: "tsconfig ve strict mod"
description: "Derleyici ayarları, strict bayrakları ve CI'da tip kontrolü."
lastVerified: "2026-10-17"
translationKey: "typescript/tsconfig-and-strict-mode"
---

## tsconfig.json nedir

Bir klasörde `tsconfig.json` bulunması, o klasörün bir TypeScript projesinin kökü olduğunu gösterir. Dosya hangi dosyaların kontrol edileceğini ve hangi kuralların uygulanacağını tanımlar. `tsc`'yi dosya adı vermeden çalıştırdığınızda derleyici bu dosyayı bulunduğunuz klasörden başlayıp yukarı doğru arar.[^1]

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "strict": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

| Alan | Ne işe yarar |
| :-- | :-- |
| `compilerOptions` | Derleyici ayarları; bu dersin büyük kısmı bunlarla ilgili |
| `include` | Projeye dahil edilecek dosya ya da klasörler *(tsconfig'e göre göreli)*[^2] |
| `extends` | Ayarları başka bir tsconfig dosyasından devralır[^2] |
| `references` | Projeyi birbirine bağlı küçük parçalara böler *(Vite şablonu bunu kullanır)* |

## strict modu

TypeScript'in sıkılığı tek bir anahtardan çok bir **ayar düğmesi** gibidir: kontrolleri tek tek açıp kapatabilirsiniz. `"strict": true` hepsini birden açar.[^3]

| Bayrak | Ne yapar |
| :-- | :-- |
| `noImplicitAny` | Tipi çıkarılamayan değişken ve parametrelerin sessizce `any` olmasını engeller |
| `strictNullChecks` | `null` ve `undefined`'ı ayrı tip yapar; kontrol etmeden kullanamazsınız |
| `strictFunctionTypes` | Fonksiyon parametrelerini daha sıkı karşılaştırır |
| `strictBindCallApply` | `bind`, `call` ve `apply` argümanlarını kontrol eder |
| `strictPropertyInitialization` | Class alanlarının constructor'da başlatılmasını ister |
| `strictBuiltinIteratorReturn` | Yerleşik iterator'ların dönüş değerini `any` yerine `undefined` sayar |
| `noImplicitThis` | Tipi belirsiz `this` kullanımını hata sayar |
| `useUnknownInCatchVariables` | `catch (error)` içindeki `error`'u `any` yerine `unknown` yapar |
| `alwaysStrict` | Çıktıya JavaScript'in `"use strict"` modunu uygular |

Bayrak listesi TSConfig referansındaki strict ailesidir.[^4] En çok fark edeceğiniz ikisi `noImplicitAny` ve `strictNullChecks`'tir:

```ts
function getProduct(id) {}
// Hata: Parameter 'id' implicitly has an 'any' type.

try {
  await fetchProducts();
} catch (error) {
  console.log(error.message);
  // Hata: 'error' is of type 'unknown'.
}
```

TypeScript 6.0 ile `strict` **varsayılan olarak açık** hale geldi, TypeScript 7 de bu varsayılanı korudu.[^5][^6] Yine de dosyaya `"strict": true` yazmak niyetinizi açıkça gösterir. Eski bir projeyi taşırken bile `strict`'i tamamen kapatmak yerine bayrakları tek tek açın.

## strict'e ek bayraklar

### noUncheckedIndexedAccess

`strict`'in parçası değildir ama en faydalı ek bayraktır. Dizi elemanına ya da index signature'lı bir nesneye erişimin sonucuna `undefined` ekler.[^7] Dizinin boş olabileceğini unutmanızı engeller:

```ts
const products: Product[] = await fetchProducts();

const first = products[0]; // Product | undefined
console.log(first.name);
// Hata: 'first' is possibly 'undefined'.

if (first) {
  console.log(first.name); // artık Product
}
```

[Matt Pocock](https://www.mattpocock.com/) bu bayrağın aslında `strict`'e dahil olması gerektiğini söyler.[^8] TypeScript 7'de `tsc --init` de onu açık olarak üretir. Vite şablonunda ise kapalıdır; kendiniz eklemeniz gerekir.

### Diğerleri

| Bayrak | Ne yapar | Öneri |
| :-- | :-- | :-- |
| `noUnusedLocals` | Kullanılmayan yerel değişkeni hata sayar[^2] | Vite şablonunda açık |
| `noUnusedParameters` | Kullanılmayan parametreyi hata sayar; `_` ile başlayanlar hariç[^2] | Vite şablonunda açık |
| `noFallthroughCasesInSwitch` | `break`'i unutulmuş `case`'leri yakalar | Vite şablonunda açık |
| `exactOptionalPropertyTypes` | `discountCode?: string` alanına açıkça `undefined` atamayı yasaklar[^4] | İsteğe bağlı; sıkı ama gürültülü |

Matt Pocock ise `noUnusedLocals` gibi bayrakları "gürültülü" bulur ve yalnızca isteyenlerin eklemesini önerir.[^8] İkisi de geçerli bir seçim; ekip olarak birini seçin.

## React uygulaması için ayarlar

Vite ya da Next.js kullanan bir uygulamada JavaScript'i TypeScript üretmez, bundler üretir. TypeScript yalnızca **tip denetleyicisi** olarak çalışır. Bu yüzden ayarlar buna göre seçilir:

| Ayar | Değer | Anlamı |
| :-- | :-- | :-- |
| `target` | `es2023` | Hangi JavaScript sürümünün söz dizimine izin verildiği |
| `lib` | `["ES2023", "DOM"]` | Hangi global API'lerin tipli olduğu; tarayıcı kodu için `DOM` şart[^9] |
| `module` | `esnext` | Modern `import`/`export`; TypeScript 7'de varsayılan[^6] |
| `moduleResolution` | `bundler` | Import'ları bundler gibi çözer; göreli import'ta uzantı istemez[^4] |
| `jsx` | `react-jsx` | React 17+ JSX dönüşümü; her dosyada `import React` gerekmez[^10] |
| `noEmit` | `true` | JavaScript dosyası üretmez, yalnızca kontrol eder |
| `verbatimModuleSyntax` | `true` | `type` ile işaretlenmemiş import'lar kalır, işaretlenenler tamamen silinir; `import type` yazmaya zorlar[^11] |
| `isolatedModules` | `true` | Tek dosyaya bakarak çeviren araçların *(Oxc, SWC, esbuild)* desteklemediği kodu hata sayar[^12] |
| `erasableSyntaxOnly` | `true` | `enum`, parameter property gibi çalışma anı kodu üreten TypeScript söz dizimini yasaklar *(TypeScript 5.8)*[^13] |
| `skipLibCheck` | `true` | `node_modules` içindeki `.d.ts` dosyalarını kontrol etmez; hız kazandırır[^8] |

`verbatimModuleSyntax` açıkken yalnızca tip olan import'ları şöyle yazarsınız:

```ts
import type { Product } from "./types";
import { formatPrice, type CartItem } from "./cart";
```

## Vite şablonundaki üç dosya

`npm create vite@latest -- --template react-ts` *(create-vite 9.2)* üç dosya üretir:

| Dosya | Kapsam |
| :-- | :-- |
| `tsconfig.json` | Kendisi dosya içermez *(`"files": []`)*, diğer ikisine `references` verir |
| `tsconfig.app.json` | `src` klasörü: tarayıcıda çalışan uygulama kodu, `lib` içinde `DOM` var |
| `tsconfig.node.json` | `vite.config.ts`: Node'da çalışan yapılandırma, `types` içinde `node` var |

Uygulama kodu ile Node'da çalışan yapılandırma farklı ortamlarda çalıştığı için ayrı ayarlarla kontrol edilir. `tsconfig.app.json`'ın özü şöyledir:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

Dosyada `strict` yok, çünkü şablonun kurduğu TypeScript 6.0'da zaten varsayılan. `types: ["vite/client"]` ise `import.meta.env` ve resim, CSS import'ları için tipleri ekler.[^14]

`references` kullanan bir projede tip kontrolü `tsc -b` *(`--build`)* ile yapılır; bu komut referans verilen projeleri bulur ve doğru sırayla kontrol eder.[^15] Şablondaki `build` script'i de `tsc -b && vite build`'dir.

> [!CAUTION]
>
> Kök dizinde `npx tsc --noEmit` çalıştırmak bu şablonda hiçbir dosyayı kontrol etmez, çünkü kök `tsconfig.json` boştur. Komut hata olsa bile başarıyla biter. `npx tsc -b` ya da `npx tsc --noEmit -p tsconfig.app.json` kullanın.

## Next.js'te tsconfig

[!nextjs] projesi `create-next-app` ile açıldığında `tsconfig.json` hazır gelir; var olan bir projede bir dosyayı `.ts` yapıp `next dev` çalıştırdığınızda Next.js dosyayı kendisi oluşturur.[^16] Üretilen dosyada `strict`, `noEmit`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `isolatedModules`, `@/*` path alias'ı ve Next.js'in editör eklentisi *(`"plugins": [{ "name": "next" }]`)* bulunur. Ayrıca `next-env.d.ts` adında, elle düzenlenmemesi gereken bir tip dosyası üretilir.[^16]

`next build` tip hatası varsa build'i durdurur. `typescript.ignoreBuildErrors` bu kontrolü kapatır; dokümantasyon bunu ancak tip kontrolünü başka bir yerde çalıştırıyorsanız önerir.[^16]

## Path alias

`../../../components/ProductCard` gibi uzun göreli yollar yerine `@/components/ProductCard` yazmak için `paths` kullanılır:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

`paths` yalnızca TypeScript'e bu eşlemeyi anlatır; çıktıdaki import'ları değiştirmez. Eşlemeyi çalışma anında bundler'ın da bilmesi gerekir.[^4] Vite'ta bunun için `vite.config.ts` içinde `resolve: { tsconfigPaths: true }` ayarını açarsınız.[^14] Next.js `paths`'i kendisi okur.

> [!WARNING]
>
> Eski rehberlerde `paths` ile birlikte `"baseUrl": "."` görürsünüz. `baseUrl` TypeScript 6.0'da kullanımdan kaldırıldı, TypeScript 7'de ise tamamen silindi; `Option 'baseUrl' has been removed.` hatası verir.[^5][^6] Yolların başına `./` ekleyerek `baseUrl` olmadan yazın.

## @types paketleri ve .d.ts

JavaScript ile yazılmış bir kütüphanenin tipleri **declaration** *(`.d.ts`)* dosyalarında durur. Birçok paket bu dosyaları kendisi getirir; getirmeyenler için topluluğun yazdığı tipler `@types/` önekiyle yayımlanır *(`@types/react`, `@types/node`)*.[^17] Bir paketi import ettiğinizde "Could not find a declaration file" hatası alıyorsanız önce `npm install -D @types/<paket-adı>` deneyin.

TypeScript 6.0'dan itibaren `types` ayarının varsayılanı boş dizidir: global tipler *(örneğin Node'un `process`'i)* artık kendiliğinden yüklenmez, `"types": ["node"]` gibi açıkça yazmanız gerekir.[^5] Vite şablonundaki `types` satırları bu yüzden var.

## typescript-eslint

`tsc` tip hatalarını bulur; hatalı ama tip açısından geçerli kalıpları *(örneğin beklenmeyen bir Promise)* ise linter bulur. [!eslint] için TypeScript desteğini typescript-eslint sağlar. Tip bilgisini kullanan kurallar için `recommendedTypeChecked` ya da daha katı `strictTypeChecked` yapılandırması seçilir ve `projectService` açılır:[^18]

```js
// eslint.config.mjs
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig({
  files: ["**/*.{ts,tsx}"],
  extends: [
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
  ],
  languageOptions: {
    parserOptions: {
      projectService: true,
    },
  },
});
```

typescript-eslint, `strictTypeChecked`'i yalnızca ekibin önemli bir kısmı TypeScript'te deneyimliyse önerir.[^19]

> [!NOTE]
>
> typescript-eslint şu an `>=4.8.4 <6.1.0` aralığındaki TypeScript sürümlerini destekler.[^20] TypeScript 7 henüz bir API sunmadığı için TypeScript ekibi, linter gibi araçlar için 6.0'ı `@typescript/typescript6` paketiyle yanında tutmayı öneriyor.[^6] Güncel Vite şablonu ise ESLint yerine `oxlint` ile gelir.

## CI'da tip kontrolü

Bundler tip kontrolü yapmadığı için, hatalı kodun ana dala girmemesini garanti etmenin yolu CI'da `tsc` çalıştırmaktır.[^21] Önce `package.json`'a bir script ekleyin:

```json
{
  "scripts": {
    "typecheck": "tsc -b"
  }
}
```

Next.js ya da tek tsconfig'li bir projede değer `tsc --noEmit` olur. Ardından [!github] Actions iş akışı:[^22]

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
```

Pull request'te tip hatası varsa bu adım kırmızıya döner. Lint ve test adımlarını aynı job'a ekleyebilirsiniz.

## Kendin dene

- Vite şablonunun `tsconfig.app.json` dosyasına `"noUncheckedIndexedAccess": true` ekleyin ve `npx tsc -b` ile kaç yeni hata çıktığına bakın.
- TS Playground'un **TS Config** menüsünden `strict`'i kapatıp açın; aynı kodda hangi hataların kaybolduğunu izleyin.
- `@/*` alias'ını hem `paths` hem `resolve.tsconfigPaths` ile kurun; yalnızca birini açınca editörün ve `vite build`'in nasıl davrandığını karşılaştırın.
- Bir dosyaya bilerek tip hatası koyup CI iş akışının kırmızıya döndüğünü görün.

## Detaylı öğrenmek için

- **Yazı:** [Matt Pocock](https://www.mattpocock.com/)'un TSConfig Cheat Sheet'i; bundler kullanan ve kullanmayan projeler için hazır bloklar.[^8]
- **Kitap:** Matt Pocock'un Total TypeScript Essentials kitabının "Configuring TypeScript" bölümü; `extends`, `lib`, `jsx` ve project references.[^23]
- **Resmi doküman:** TSConfig Reference; her ayarın açıklaması ve örneği.[^4]
- **Resmi doküman:** typescript-eslint'in "Linting with Type Information" rehberi.[^18]
- **Yazı:** TypeScript 6.0 duyurusu; değişen varsayılanlar ve `baseUrl` olmadan `paths` yazımı.[^5]

## Kaynaklar

1. [TypeScript Handbook: What is a tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) *(doc)* — Proje kökü, `tsc`'nin dosyayı araması ve `extends` ile hazır temel ayarlar.
2. [TSConfig Reference: Root Fields](https://www.typescriptlang.org/tsconfig/) *(doc)* — `include`, `extends`, `references`, `noUnusedLocals` ve `noUnusedParameters` açıklamaları.
3. [TypeScript Handbook: The Basics — Strictness](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#strictness) *(doc)* — Sıkılığın bir düğme gibi olması, `noImplicitAny` ve `strictNullChecks`.
4. [TSConfig Reference: strict](https://www.typescriptlang.org/tsconfig/#strict) *(doc)* — Strict ailesindeki bayraklar, `exactOptionalPropertyTypes`, `moduleResolution: bundler` ve `paths`.
5. [Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) *(article)* — `strict` ve `types: []` varsayılanları, `baseUrl`'in kullanımdan kalkması ve `paths` yazımı.
6. [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) *(article)* — 7.0 varsayılanları, kaldırılan ayarlar ve `@typescript/typescript6` ile araç uyumluluğu.
7. [TSConfig Reference: noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html) *(doc)* — Index signature erişimine `undefined` eklenmesi ve örneği.
8. [Matt Pocock](https://www.mattpocock.com/): [The TSConfig Cheat Sheet](https://www.totaltypescript.com/tsconfig-cheat-sheet) *(article)* — Önerilen temel ve strict ayarlar, `noUncheckedIndexedAccess` ve `skipLibCheck` gerekçeleri.
9. [react.dev: Using TypeScript](https://react.dev/learn/typescript) *(doc)* — React projesinde `lib` içinde `dom` ve geçerli bir `jsx` ayarı gerekmesi.
10. [TSConfig Reference: jsx](https://www.typescriptlang.org/tsconfig/jsx.html) *(doc)* — `react-jsx` ile `react/jsx-runtime` dönüşümü.
11. [TSConfig Reference: verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html) *(doc)* — `type` işaretli import'ların silinip diğerlerinin olduğu gibi kalması.
12. [TSConfig Reference: isolatedModules](https://www.typescriptlang.org/tsconfig/isolatedModules.html) *(doc)* — Tek dosya çalışan dönüştürücülerin sınırları.
13. [Announcing TypeScript 5.8](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8) *(article)* — `--erasableSyntaxOnly` bayrağının tanıtımı ve gerekçesi.
14. [Vite: Features — TypeScript](https://vite.dev/guide/features#typescript) *(doc)* — Tip kontrolü yapılmaması, `isolatedModules` önerisi ve `vite/client` tipleri; `resolve.tsconfigPaths` için [Shared Options](https://vite.dev/config/shared-options).
15. [TypeScript Handbook: Project References](https://www.typescriptlang.org/docs/handbook/project-references.html) *(doc)* — `references` ve `tsc -b`'nin projeleri doğru sırayla derlemesi.
16. [Next.js: TypeScript](https://nextjs.org/docs/app/api-reference/config/typescript) *(doc)* — Otomatik `tsconfig.json`, `next-env.d.ts`, build sırasında tip kontrolü ve `ignoreBuildErrors`.
17. [TypeScript Handbook: Consumption](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html) *(doc)* — `@types/` paketlerini kurmak ve kendi tipini getiren paketler.
18. [typescript-eslint: Linting with Type Information](https://typescript-eslint.io/getting-started/typed-linting) *(doc)* — `recommendedTypeChecked`, `strictTypeChecked` ve `projectService` ile örnek yapılandırma.
19. [typescript-eslint: Shared Configs](https://typescript-eslint.io/users/configs) *(doc)* — Hazır yapılandırmalar ve `strict-type-checked` için uyarı.
20. [typescript-eslint: Dependency Versions](https://typescript-eslint.io/users/dependency-versions) *(doc)* — Desteklenen TypeScript sürüm aralığı.
21. [Matt Pocock](https://www.mattpocock.com/): [TypeScript In The Development Pipeline](https://www.totaltypescript.com/books/total-typescript-essentials/typescript-in-the-development-pipeline) *(article)* — `tsc --noEmit`'i linter gibi kullanmak ve CI'da tip kontrolü.
22. [GitHub Docs: Building and testing Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs) *(doc)* — `actions/checkout`, `actions/setup-node`, npm önbelleği ve `npm ci`.
23. [Matt Pocock](https://www.mattpocock.com/): [Configuring TypeScript](https://www.totaltypescript.com/books/total-typescript-essentials/configuring-typescript) *(article)* — Temel yapılandırma, `strict`, `isolatedModules`, `verbatimModuleSyntax` ve project references.
