---
title: "Maskeleme ve regex"
description: "Görünen değer, ham değer ve @virastack/mask."
lastVerified: "2026-10-22"
translationKey: "forms/masking-and-regex"
---

## Görünen değer, ham değer

Telefon alanına `5321234567` yazan kullanıcı ekranda `(532) 123 45 67` görmek ister; okuması ve kontrol etmesi kolaydır. Sunucu ise boşluksuz `5321234567`'yi bekler. **Maske** bu iki değeri ayırır:

| | Görünen değer | Ham değer |
| :-- | :-- | :-- |
| Telefon | `(532) 123 45 67` | `5321234567` |
| IBAN | `TR33 0006 1005 1978 6457 8413 26` | `330006100519786457841326` |
| Kart | `4111 1111 1111 1111` | `4111111111111111` |

İyi bir maske üç şey yapar: izin verilmeyen karakteri hiç yazdırmaz, ayırıcıları kendisi ekler ve imleci doğru yerde tutar. Ayırıcıları kullanıcıya yazdırmak yerine yok saymak GOV.UK'in de önerisidir: boşluk ve tire gibi karakterler hata sebebi olmamalıdır.[^1]

Kural: **doğrulama ve saklama ham değerle yapılır.** Görünen değer yalnızca ekran içindir.

## Regex ile biçim doğrulamak

Ham değerin biçimini düzenli ifadeyle *(regex)* kontrol edersiniz. Formlarda gereken parçalar azdır:[^2]

| Parça | Anlamı | Örnek |
| :-- | :-- | :-- |
| `^` ve `$` | Metnin başı ve sonu | `^\d{10}$`: tam 10 rakam, fazlası değil |
| `\d` | Bir rakam | `\d{3}`: üç rakam |
| `[...]` | Karakter kümesi | `[.,]`: nokta ya da virgül |
| `{n}`, `{n,m}` | Tekrar sayısı | `\d{1,2}`: bir ya da iki rakam |
| `?` | İsteğe bağlı | `([.,]\d{1,2})?`: kuruş kısmı olabilir |

```ts
const taxNumber = /^\d{10}$/; // 10 haneli vergi numarası
const mobilePhone = /^5\d{9}$/; // 5 ile başlayan 10 hane
const price = /^\d+([.,]\d{1,2})?$/; // 249 ya da 249,90
```

`^` ve `$`'ı unutmak en sık hatadır: `/\d{10}/` içinde 10 rakam geçen her metni, `abc12345678901234`'ü de kabul eder.

> [!DONT]
>
> - Ad ve soyad alanını `/^[a-zA-Z]+$/` ile kısıtlamak. "Çağrı", "Ayşe Nur" ve "O'Brien" reddedilir. Ad alanında uzunluktan başka kural koymayın.
> - E-postayı kendi regex'inizle doğrulamak. Zod'un `z.email()`'i ve sunucuya giden doğrulama e-postası daha güvenilirdir.

## type="number" yerine inputMode

Sayı gibi görünen her alan sayı değildir. Telefon, kart, IBAN ve vergi numarası **rakamlardan oluşan metinlerdir**: başındaki sıfır önemlidir, toplanmazlar, artırılmazlar. GOV.UK ekibi `type="number"`'ı bu yüzden bıraktı: ekran okuyucular ve sesle kontrol yazılımları alanı tanımıyor, fare tekerleği değeri sessizce değiştiriyor, uzun sayılar yuvarlanabiliyor ve Chrome harfleri haber vermeden siliyor.[^3]

Önerileri metin alanı ve sayısal klavyedir:[^3]

```html
<input type="text" inputmode="numeric" autocomplete="tel-national" />
```

Kuruşlu fiyat için `inputMode="decimal"` virgül ya da nokta tuşu olan klavyeyi açar. Bu rehberin proje örneğinde fiyat alanı bu yüzden metindir ve `249,90` da `249.90` da kabul edilir.

## @virastack/mask

[!virastack] Mask, [!react-hook-form] ile çalışan küçük bir maske kütüphanesidir. Alanı RHF'ye kendisi kaydeder; forma **ham değeri** yazar, input'ta görünen değeri gösterir.[^4]

```command
npm install @virastack/mask
```

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useViraMask } from "@virastack/mask";
import { paymentSchema, type PaymentValues } from "./payment-schema";

export function PaymentForm() {
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { tckn: "", card: "", iban: "", phone: "" },
    mode: "onTouched",
  });

  const masks = useViraMask({
    form,
    schema: {
      tckn: "tckn",
      card: "card",
      iban: "iban",
      phone: { preset: "phone", mask: "(999) 999 99 99" },
    },
  });

  return (
    <form onSubmit={form.handleSubmit(savePayment)} noValidate>
      <label htmlFor="phone">Cep telefonu</label>
      <input id="phone" {...masks.phone} autoComplete="tel-national" />
      {/* tckn, card ve iban için aynı kalıp */}
    </form>
  );
}
```

`useViraMask`'a formu ve hangi alanın hangi maskeyi kullanacağını verirsiniz. Her alan için `ref`, `name`, `value` ve olay yöneticilerini içeren bir nesne döner; input'a yayarsınız. Alanı ayrıca `register` etmeyin.[^4]

**Hazır maskeler:** `card`, `expiry`, `cvv`, `tckn`, `phone`, `iban`, `taxNumber`, `date`, `zipCode`, `currency`, `numeric`, `alpha` ve diğerleri. Her biri doğru `inputMode`'u ve izin verilen karakterleri getirir. Bir hazır maskeyi değiştirmek için nesne verin: telefonun varsayılan maskesi `(999) 999-9999`'dur; yukarıda Türkiye'deki yazıma çevrildi. `9` bir rakamı temsil eder.[^4]

Form gönderildiğinde gelen değerler hamdır:

```ts
{ tckn: "10000000146", card: "4111111111111111", iban: "330006100519786457841326", phone: "5321234567" }
```

IBAN maskesi `TR` önekini yalnızca ekranda gösterir; ham değer `TR`'siz 24 rakamdır.[^4]

> [!WARNING]
>
> 1.1.1 sürümünde maske nesnesi bir `rawValue` alanı da içerir. Nesneyi input'a doğrudan yaydığınızda React geliştirme modunda "React does not recognize the `rawValue` prop on a DOM element" uyarısı verir. Uyarıyı önlemek için alanı ayırın: `const { rawValue, ...phoneProps } = masks.phone;`.

## Doğrulama Zod'da

`@virastack/mask`'ın kendi doğrulayıcıları da var *(Luhn, TCKN, IBAN, vergi numarası)*. Bunlar alanı `register`'ın `validate` kuralıyla bağlar. [React Hook Form ile Zod](/academy/forms/react-hook-form-with-zod) dersinde gördüğünüz gibi resolver varken `register` kuralları **çalışmaz**. Tüm kuralları ham değer üzerinden şemaya yazın:[^5]

```ts
// payment-schema.ts
import { z } from "zod";

/** TCKN: 11 hane, ilk hane 0 değil; 10. ve 11. hane sağlama hanesidir. */
export function isValidTckn(value: string) {
  if (!/^[1-9]\d{10}$/.test(value)) return false;
  const d = [...value].map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const tenth = (((odd * 7 - even) % 10) + 10) % 10;
  const eleventh = d.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10;
  return d[9] === tenth && d[10] === eleventh;
}

export const paymentSchema = z.object({
  tckn: z
    .string()
    .regex(/^\d{11}$/, "T.C. kimlik numarası 11 haneli olmalı.")
    .refine(isValidTckn, "T.C. kimlik numarası hatalı; numarayı kontrol edin."),
  card: z.creditCard("Kart numarası hatalı; numarayı kontrol edin."),
  iban: z
    .string()
    .regex(/^\d{24}$/, "IBAN, TR'den sonra 24 haneli olmalı.")
    .refine((digits) => z.iban().validate(`TR${digits}`), "IBAN hatalı; numarayı kontrol edin."),
  phone: z.string().regex(/^5\d{9}$/, "Telefon numarası 5 ile başlayan 10 haneli olmalı."),
});

export type PaymentValues = z.infer<typeof paymentSchema>;
```

- **Kart:** `z.creditCard()` Zod 4.5 ile geldi; 12-19 hane ve Luhn sağlaması yapar.[^6]
- **IBAN:** `z.iban()` Zod 4.6 ile geldi; ülke kodlu, boşluksuz ve büyük harfli elektronik biçimi bekler. Ham değere `TR` ekleyip `.validate()` ile kontrol edilir.[^7]
- **TCKN:** Zod'da hazır biçim yok. Sağlama kuralı yukarıdaki gibi kısa bir fonksiyondur. `abc` gibi bir girdi maskeden geçemez ama sunucuya giden her istek maskeden geçmez; şema yine de kontrol eder.

Aynı alan için birden fazla kural tutmadığında RHF ilk mesajı gösterir: 10 haneli bir TCKN'de kullanıcı "11 haneli olmalı"yı görür, sağlama hatasını değil.

> [!NOTE]
>
> Paketin dışa açtığı `validateTCKN` ve `validateIBAN` gibi fonksiyonlar tarayıcıda kullanılabilir. Paket `"use client"` ile işaretli olduğu için bu fonksiyonları bir Server Action'da ya da sunucuda çalışan şemada çağıramazsınız. Sunucuyla paylaşılan şemada kendi fonksiyonunuzu ya da Zod'un biçimlerini kullanın.

## Kendin dene

- Telefon maskesini kurun ve `form.watch("phone")` ile forma yazılan değeri ekranda gösterin. Görünen değerle aynı mı?
- IBAN alanına harf ve boşluk yapıştırın. Ne oluyor?
- Şemadan TCKN `refine`'ını silin, `register("tckn", { validate: ... })` ile tekrar ekleyin. Resolver varken çalışıyor mu?
- Vergi numarası için de bir sağlama fonksiyonu yazın ve `taxNumber` maskesiyle bağlayın.
- Bir fiyat alanını `type="number"` ile yapın; fare tekerleğiyle üzerinden geçin ve `e` yazmayı deneyin.

## Detaylı öğrenmek için

- **Resmi doküman:** [ViraStack Mask](https://virastack.com/mask/); hazır maskeler, seçenekler ve örnekler.[^4]
- **Yazı:** GOV.UK, "Why the GOV.UK Design System team changed the input type for numbers"; `type="number"`'ın sorunları.[^3]
- **Resmi doküman:** MDN, "Regular expressions"; regex sözdizimi.[^2]

## Kaynaklar

1. [GOV.UK Design System: Validation](https://design-system.service.gov.uk/patterns/validation/) *(doc)* — Boşluk ve tire gibi karakterleri hata saymamak.
2. [MDN: Regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions) *(doc)* — Çapalar, karakter kümeleri ve tekrar sayıları.
3. [GOV.UK Technology: Why the GOV.UK Design System team changed the input type for numbers](https://technology.blog.gov.uk/2020/02/24/why-the-gov-uk-design-system-team-changed-the-input-type-for-numbers/) *(article)* — 24 Şubat 2020. `type="number"`'ın erişilebilirlik ve veri sorunları, `inputmode="numeric"`.
4. [ViraStack: Mask](https://virastack.com/mask/) *(doc)* — `useViraMask`, hazır maskeler, ham değer ve özel maske.
5. [React Hook Form: useForm](https://react-hook-form.com/docs/useform#resolver) *(doc)* — Resolver varken yerleşik kuralların çalışmaması.
6. [Zod: Zod 4.5](https://zod.dev/blog/zod-4-5) *(doc)* — 28 Ağustos 2026. `z.creditCard()`.
7. [Zod: Zod 4.6](https://zod.dev/blog/zod-4-6) *(doc)* — 9 Eylül 2026. `z.iban()` ve `.validate()`.
