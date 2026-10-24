---
title: "Zod ile şema ve doğrulama"
description: "Şema, tip çıkarımı, hata mesajları ve dönüşüm."
lastVerified: "2026-10-22"
translationKey: "forms/zod-schema-and-validation"
---

## Neden şema?

TypeScript tipleri derlemeden sonra silinir. Formdan, URL'den ya da bir API'den gelen veri çalışma anında ne olduğunu bilmediğiniz bir değerdir. [!zod] bu değeri bir **şemaya** göre doğrular ve aynı şemadan TypeScript tipini çıkarır. Böylece kural ve tip tek bir yerde durur.[^1]

Bu ders Zod 4.6 ile yazıldı:[^2]

```command
npm install zod
```

## İlk şema

```ts
import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  age: z.number().int().min(18),
  newsletter: z.boolean(),
});

export type SignUp = z.infer<typeof signUpSchema>;
// { name: string; email: string; age: number; newsletter: boolean }
```

Zod 4'te e-posta, URL ve UUID gibi biçimler üst düzey fonksiyonlardır: `z.email()`, `z.url()`, `z.uuid()`. Eski `z.string().email()` yazımı çalışır ama kullanımdan kaldırılmıştır.[^3][^4]

## parse ve safeParse

```ts
signUpSchema.parse(input); // geçersizse ZodError fırlatır

const result = signUpSchema.safeParse(input);
if (!result.success) {
  console.log(result.error.issues);
} else {
  result.data; // SignUp tipinde, temizlenmiş veri
}
```

Formlarda ve Server Action'larda `safeParse` kullanın; hata beklenen bir durumdur, istisna değil.[^1] Yalnızca evet/hayır gerekiyorsa Zod 4.6 ile gelen `.validate()` hata nesnesi kurmadan `boolean` döndürür:[^5]

```ts
if (signUpSchema.validate(input)) {
  input.email; // tip daraltıldı
}
```

## Hata mesajlarını özelleştirmek

Zod 4'te mesaj, `error` parametresiyle ya da doğrudan metinle verilir:[^6]

```ts
z.string().min(2, "Ad en az 2 karakter olmalı.");
z.string().min(2, { error: "Ad en az 2 karakter olmalı." });
z.number({ error: "Yaşınızı girin." }); // tip hatası için
```

Zod 3'teki `message`, `invalid_type_error` ve `required_error` yerine artık tek parametre `error` var. İnternetteki eski örneklerde *(Next.js'in form rehberindeki örnek dahil)* hâlâ bu adları görebilirsiniz.[^7]

**Türkçe varsayılan mesajlar.** Zod'un yerleşik dil paketleri var. Uygulamanın girişinde bir kez ayarlayın:[^6]

```ts
import { z } from "zod";
import { tr } from "zod/locales";

z.config(tr());

z.string().min(2).safeParse("a").error?.issues[0].message;
// "Çok küçük: beklenen string >=2 karakter"
```

Bu mesajlar geneldir ve son kullanıcı için teknik kalır. Kullanıcının göreceği alanlarda kendi mesajınızı yazın; dil paketi unuttuğunuz yerler için güvenlik ağıdır.

## Alanlar arası kural

Bir kural birden fazla alana bakıyorsa nesneye `.refine` ekleyin. `path` hatanın hangi alana yazılacağını seçer:[^8]

```ts
const passwordSchema = z
  .object({
    password: z.string().min(8, "Şifre en az 8 karakter olmalı."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
  });
```

> [!WARNING]
>
> Nesnedeki bir alanda **tip** hatası varsa *(seçilmemiş enum, `NaN` sayı)* nesnenin `.refine`'ı hiç çalışmaz. Zod refinement'a yalnızca tipi doğru veriyi verir. Kullanıcı başka bir alanı düzeltene kadar "Şifreler eşleşmiyor." görünmez. Gerekirse `when` seçeneğiyle refine'ın hangi koşulda çalışacağını kendiniz belirleyin.[^8]

## Dönüşüm: transform ve pipe

`.transform` doğrulanan değeri başka bir değere çevirir. Şemanın **girdi** ve **çıktı** tipi artık farklıdır:[^9]

```ts
const priceSchema = z
  .string()
  .regex(/^\d+(,\d{1,2})?$/, "Fiyatı 1250,50 biçiminde girin.")
  .transform((value) => Number(value.replace(",", ".")));

type PriceInput = z.input<typeof priceSchema>; // string
type PriceOutput = z.output<typeof priceSchema>; // number
```

`.pipe` bir şemanın çıktısını ikinci bir şemaya verir. Dönüşümden sonra tekrar doğrulamak için kullanılır:[^9]

```ts
const ibanSchema = z
  .string()
  .transform((digits) => `TR${digits}`)
  .pipe(z.iban("IBAN hatalı; numarayı kontrol edin."));
```

Girdi ve çıktı tipinin ayrılması formlarda önemlidir: form **girdi** tipini tutar, gönderim **çıktı** tipini alır *(bkz. [React Hook Form ile Zod](/academy/forms/react-hook-form-with-zod))*.

## Boş alan tuzakları

Formdan gelen değer çoğu zaman metindir ve boş alan `""`'dır, `undefined` değil. Üç sık hata:

| Şema | Beklenen | Gerçekte |
| :-- | :-- | :-- |
| `z.url().optional()` | Boş bırakılabilir web sitesi | `""` reddedilir; `optional` yalnızca `undefined`'ı kabul eder.[^10] |
| `z.coerce.number()` | Boş alan "zorunlu" hatası versin | `Number("")` `0`'dır; boş alan `0` olarak geçer.[^11] |
| `z.string()` | Zorunlu alan | `""` geçerli bir metindir; `.min(1)` ekleyin. |

```ts
// Boş bırakılabilir URL
website: z.union([z.url("Web sitesini https://ornek.com biçiminde girin."), z.literal("")]),

// Zorunlu sayı: boş metni önce yakalayın
age: z.string().min(1, "Yaşınızı girin.").pipe(z.coerce.number<string>().int().min(18)),
```

`z.coerce.number()`'ın girdi tipi `unknown`'dır; şemayı formla kullanırken bu tip `useForm`'a da yansır. `pipe` ile bağlarken girdi tipini generic ile verin: `z.coerce.number<string>()`.[^11]

## Hatayı biçimlendirmek

`result.error.issues` ham listedir. Zod 4 üç yardımcı verir:[^12]

```ts
const result = signUpSchema.safeParse(input);
if (!result.success) {
  z.flattenError(result.error);
  // { formErrors: [], fieldErrors: { email: ["Geçersiz e-posta adresi"] } }

  z.treeifyError(result.error); // iç içe nesne ve diziler için
  z.prettifyError(result.error); // log için okunur metin
}
```

Düz formlarda `z.flattenError` yeterlidir; sunucudan alan hatası döndürmek için kullanacaksınız. Zod 3'teki `error.flatten()` ve `error.format()` kullanımdan kaldırıldı.[^12]

## Yeni biçimler

Zod 4.5 ve 4.6 formlarda işe yarayan iki biçim ekledi:[^5][^13]

```ts
z.creditCard(); // 12-19 hane ve Luhn sağlaması; boşluklu "4111 1111 1111 1111" geçerli
z.iban(); // elektronik biçim: boşluksuz, büyük harf, mod-97 sağlaması
```

Telefon için `z.e164()` *(`+905321234567`)* hazır gelir.[^3] Maskeli alanlarda bu biçimleri ham değer üzerinde nasıl kullanacağınız [Maskeleme ve regex](/academy/forms/masking-and-regex) dersinde.

## Kendin dene

- `signUpSchema`'yı yazıp `safeParse`'a `{ name: " a", email: "x@", age: "20" }` verin. Kaç hata çıkıyor? `age` neden hata veriyor?
- `z.config(tr())` ekleyip aynı denemeyi yapın.
- Şifre şemasına `role: z.enum(["buyer", "seller"])` ekleyin, `role: ""` ve farklı şifreler verin. "Şifreler eşleşmiyor." görünüyor mu?
- `z.url().optional()`'a `""` verin, sonra `z.literal("")` ile birleştirin.
- `priceSchema` için `z.input` ve `z.output` tiplerini editörde fareyle inceleyin.

## Detaylı öğrenmek için

- **Resmi doküman:** "Basic usage"; şema, parse ve tip çıkarımı.[^1]
- **Resmi doküman:** "Customizing errors"; `error` parametresi, öncelik sırası ve dil paketleri.[^6]
- **Resmi doküman:** "Migration guide"; Zod 3'ten 4'e değişen API'ler.[^7]

## Kaynaklar

1. [Zod: Basic usage](https://zod.dev/basics) *(doc)* — Şema tanımlamak, `parse`, `safeParse` ve `z.infer`.
2. [Zod: Intro](https://zod.dev/) *(doc)* — Kurulum ve gereksinimler.
3. [Zod: Defining schemas](https://zod.dev/api) *(doc)* — Üst düzey string biçimleri, `z.e164`, `z.creditCard` ve `z.iban`.
4. [Zod: Release notes](https://zod.dev/v4) *(doc)* — Zod 4'teki yenilikler ve üst düzey biçim fonksiyonları.
5. [Zod: Zod 4.6](https://zod.dev/blog/zod-4-6) *(doc)* — 9 Eylül 2026. `.validate()` ve `z.iban()`.
6. [Zod: Customizing errors](https://zod.dev/error-customization) *(doc)* — `error` parametresi ve `z.config` ile dil paketleri.
7. [Zod: Migration guide](https://zod.dev/v4/changelog) *(doc)* — `message`, `invalid_type_error`, `required_error` ve `flatten`'ın yerini alanlar.
8. [Zod: Refinements](https://zod.dev/api#refinements) *(doc)* — `.refine`, `path`, `abort` ve `when`.
9. [Zod: Transforms](https://zod.dev/api#transforms) *(doc)* — `.transform`, `.pipe`, `z.input` ve `z.output`.
10. [Zod: Optionals](https://zod.dev/api#optionals) *(doc)* — `optional`'ın yalnızca `undefined`'ı kabul etmesi.
11. [Zod: Coercion](https://zod.dev/api#coercion) *(doc)* — `z.coerce` ve girdi tipinin `unknown` olması.
12. [Zod: Formatting errors](https://zod.dev/error-formatting) *(doc)* — `z.flattenError`, `z.treeifyError` ve `z.prettifyError`.
13. [Zod: Zod 4.5](https://zod.dev/blog/zod-4-5) *(doc)* — 28 Ağustos 2026. `z.creditCard()` ve diğer yenilikler.
