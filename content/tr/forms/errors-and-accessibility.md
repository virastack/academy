---
title: "Hata gösterimi ve erişilebilirlik"
description: "Hatayı alana bağlamak, odak ve zamanlama."
lastVerified: "2026-10-22"
translationKey: "forms/errors-and-accessibility"
---

## Hata görünmek yetmez

Kırmızı bir metin gören kullanıcı hatayı anlar. Ekran okuyucu kullanan biri için o metin, alana bağlanmadıkça sayfada bir yerde duran bir paragraftır. WCAG iki şey ister: hatalı alan **tanımlanmalı** ve hata metinle açıklanmalı *(3.3.1)*; düzeltme yolu biliniyorsa önerilmeli *(3.3.3)*.[^1][^2]

Erişilebilir bir hata dört parçadan oluşur:[^3][^4]

| Parça | Nasıl |
| :-- | :-- |
| Alanın adı | `<label htmlFor>` ile görünür etiket |
| Hatalı olduğu | `aria-invalid="true"` |
| Hatanın metni | `aria-describedby` ile alana bağlı mesaj |
| Görsel ipucu | Yalnızca renk değil: metin, kenarlık, ikon |

## Alana bağlamak

[!react-hook-form] dokümanı `aria-invalid` ve mesajı birlikte kullanmayı önerir. Ekran okuyucu alanı şöyle okur: "Ad, düzenleme alanı, geçersiz giriş, Ad zorunlu."[^3]

```tsx
<label htmlFor="email">E-posta</label>
<input
  id="email"
  type="email"
  autoComplete="email"
  aria-invalid={errors.email ? "true" : "false"}
  aria-describedby={errors.email ? "email-error" : undefined}
  {...register("email")}
/>
{errors.email && <p id="email-error">{errors.email.message}</p>}
```

Alanın bir açıklaması da varsa *(örnek biçim, kural)* `aria-describedby` birden fazla `id` alır; ekran okuyucu ikisini de okur: `aria-describedby="phone-hint phone-error"`.[^4]

> [!TIP]
>
> React Hook Form dokümanı mesajlara `role="alert"` de ekler. Bu, mesaj **göründüğü anda** okunmasını sağlar. Çok alanlı bir formda gönderimde on mesaj birden okunur. Alan mesajlarında `aria-describedby` yeterlidir; `role="alert"`'ü formun genel hatası gibi tek mesajlara bırakın.[^3][^4]

## Field component'i

Her alanda bu bağlantıyı elle kurmak hata davetiyesidir. Bir `Field` component'i etiketi, açıklamayı ve hatayı tek yerde toplar. Hata durumunu `useFormState` ile okur; böylece yalnızca bu alanın hatası değişince render olur:[^5][^6]

```tsx
// src/components/field.tsx
"use client";

import type { ReactNode } from "react";
import { useFormContext, useFormState } from "react-hook-form";

type FieldA11y = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
};

type FieldProps = {
  name: string;
  label: string;
  description?: string;
  children: (a11y: FieldA11y) => ReactNode;
};

export function Field({ name, label, description, children }: FieldProps) {
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name });
  const { error } = getFieldState(name, formState);
  const id = name.replaceAll(".", "-");
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": [descriptionId, errorId].filter(Boolean).join(" ") || undefined,
      })}
      {description && (
        <p id={descriptionId} className="text-sm text-gray-600">
          {description}
        </p>
      )}
      {/* Hata için yer ayrılır; mesaj gelince düğmeler kaymaz. */}
      <p id={errorId} className="min-h-5 text-sm text-red-700">
        {error?.message}
      </p>
    </div>
  );
}
```

```tsx
<Field name="email" label="E-posta">
  {(a11y) => <input {...a11y} type="email" autoComplete="email" {...register("email")} />}
</Field>
```

`useFormContext` için form bir `FormProvider` ile sarılmalıdır *(bkz. [Dinamik alanlar ve çok adımlı formlar](/academy/forms/dynamic-and-multi-step-forms))*. Alan adındaki noktalar `id`'de tireye çevrilir; `products.0.name` alanının `id`'si `products-0-name` olur.

**Neden yer ayrılıyor?** Hata mesajı alanın altına eklenince altındaki her şey aşağı kayar. Kullanıcı alandan çıkıp bir düğmeye tıklarken `blur` hatayı gösterir, düğme kayar ve tıklama boşa gider. Bu rehberin proje örneğinde Playwright testleri tam olarak bu yüzden takıldı. Mesaj için sabit bir yükseklik ayırmak sorunu çözer.

## Doğrulama zamanlaması

Hata ne zaman gösterilmeli? [Vitaly Friedman](https://www.smashingmagazine.com/author/vitaly-friedman/) yıllar içinde öğrenilenleri şöyle özetler:[^7]

- **Erken doğrulama yapmayın.** Kullanıcı daha yazmadan "geçersiz" demek en kötüsüdür.
- **Alandan çıkınca doğrulayın** *(blur)*. En yaygın ve dengeli yol.
- **Ödülü erken, cezayı geç verin.** Hata düzeltilir düzeltilmez kaybolsun; doğru bir alanı düzenlerken hata ancak alandan çıkınca gelsin.
- **Boş alanları gönderimde kontrol edin.** Bir alanı boş geçmek çoğu zaman yanlışlıkla bir tıklamadır.

React Hook Form'daki `mode: "onTouched"` bu öneriye yakındır: ilk kontrol alandan çıkınca, sonrası her değişiklikte yapılır. Hata yazarken kaybolur.[^5]

GOV.UK Design System daha temkinlidir: alandan çıkınca değil, kullanıcı "Devam" ya da "Gönder"e bastığında doğrulamayı önerir. Gerekçesi, yazmayı bitirmemiş birine hata göstermenin daha çok sorun çıkarmasıdır.[^8] İki yaklaşım da savunulabilir. Ortak noktaları: kullanıcı **yazarken** hata göstermeyin.

## Gönderimde odak ve hata özeti

Gönderim başarısız olunca kullanıcı hatayı bulmalıdır. React Hook Form varsayılan olarak ilk hatalı alana odaklanır *(`shouldFocusError: true`)*. Bunun çalışması için alanın `ref`'i input'a ulaşmalıdır; `register`'ın döndürdüğü nesneyi input'a yayıyorsanız sorun yok.[^5]

Uzun formlarda W3C ve GOV.UK bir adım daha önerir: formun üstünde bir **hata özeti**. Özet hataları listeler, her biri alana linktir ve odak özete taşınır:[^4][^9]

```tsx
import { useEffect, useRef } from "react";
import type { FieldErrors } from "react-hook-form";

type SummaryError = { name: string; message: string };

export function ErrorSummary({ errors, submitCount }: { errors: SummaryError[]; submitCount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const focusedSubmit = useRef(0);
  const hasErrors = errors.length > 0;

  // Odak her gönderimde bir kez özete taşınır; yazarken çıkan hatalar odağı çalmaz.
  useEffect(() => {
    if (hasErrors && submitCount > focusedSubmit.current) {
      focusedSubmit.current = submitCount;
      ref.current?.focus();
    }
  }, [hasErrors, submitCount]);

  if (!hasErrors) return null;

  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby="error-summary-title">
      <h2 id="error-summary-title">Bir sorun var</h2>
      <ul>
        {errors.map((error) => (
          <li key={error.name}>
            <a href={`#${error.name.replaceAll(".", "-")}`}>{error.message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const toSummary = (errors: FieldErrors): SummaryError[] =>
  Object.entries(errors).flatMap(([name, error]) =>
    typeof error?.message === "string" ? [{ name, message: error.message }] : [],
  );
```

```tsx
const { formState: { errors, submitCount } } = form;

<ErrorSummary errors={toSummary(errors)} submitCount={submitCount} />
```

`toSummary` düz formlar içindir; iç içe alanlarda hataları kendiniz düzleştirin. Linkler alanın `id`'sine gider; Field'daki `id` kuralıyla aynı olmalı.

Özet kullanıyorsanız `useForm({ shouldFocusError: false })` ile ilk alana odaklanmayı kapatın; aynı anda iki odak hareketi olmasın. GOV.UK ayrıca sayfa başlığının başına "Hata:" eklemeyi önerir; ekran okuyucu sayfayı açar açmaz duyurur.[^9]

## İyi hata mesajı

GOV.UK Design System'in yazım kuralları formlarda en çok başvurulan kaynaklardan biridir:[^10]

| Kural | Kötü | İyi |
| :-- | :-- | :-- |
| Ne olduğunu ve nasıl düzeleceğini söyleyin | Geçersiz giriş. | E-posta adresini ad@ornek.com biçiminde girin. |
| Boş alanda talimat verin | Ad alanı boş olamaz. | Adınızı girin. |
| Soruna özel olun | Hatalı telefon. | Telefon numarası 5 ile başlayan 10 haneli olmalı. |
| Etiketle aynı kelimeleri kullanın | Bu alan zorunlu. | Vergi numarasını girin. |
| Suçlamayın, özür dilemeyin | Lütfen geçerli bir değer girmeyi unutmayın! | Doğum yılını 4 haneyle girin. |

Kural başına ayrı mesaj yazın: boş, çok kısa, çok uzun ve yanlış biçim farklı sorunlardır. Hata gösterdiğinizde alanı **temizlemeyin**; kullanıcı yazdığını düzeltebilmelidir.[^10]

## Etiket ve otomatik doldurma

- **Placeholder etiket değildir.** Yazmaya başlayınca kaybolur, kontrastı düşüktür. Örnek biçimi açıklama metninde verin.
- **Zorunluluğu etikette belirtin.** `required` özelliği her kullanıcıya alanın zorunlu olduğunu söylemez; görünür etikette belirtin. Formun çoğu zorunluysa isteğe bağlı olanları "*(isteğe bağlı)*" ile işaretlemek daha az gürültü çıkarır.[^11]
- **`autocomplete` verin.** Ad, e-posta, telefon ve adres alanlarında `autocomplete="name"`, `"email"`, `"tel-national"` gibi değerler hem otomatik doldurmayı hem WCAG 1.3.5'i *(girdi amacını tanımlamak)* sağlar.[^12]

## Kendin dene

- Bir alanın `aria-describedby`'ını silin ve VoiceOver ya da NVDA ile alana gelin. Hata okunuyor mu?
- Field'daki `min-h-5`'i silin, bir alanı boş bırakıp doğrudan altındaki düğmeye tıklayın. Tıklama çalışıyor mu?
- `mode`'u `onChange` yapın ve e-posta yazın. Kaçıncı harfte hata görünüyor?
- `ErrorSummary`'yi forma ekleyin, linklere tıklayın ve odağın alana gittiğini kontrol edin.
- Formunuzdaki her hata mesajını yukarıdaki tabloya göre yeniden yazın.

## Detaylı öğrenmek için

- **Resmi doküman:** W3C WAI, "User Notification"; hata özeti, satır içi mesaj, başlık ve canlı bölgeler.[^4]
- **Resmi doküman:** GOV.UK Design System, "Error message" ve "Error summary"; yerleşim ve yazım kuralları.[^10][^9]
- **Yazı:** [Vitaly Friedman](https://www.smashingmagazine.com/author/vitaly-friedman/), "A Complete Guide To Live Validation UX"; doğrulama zamanlaması.[^7]

## Kaynaklar

1. [W3C: Understanding SC 3.3.1 Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html) *(doc)* — Hatalı alanın tanımlanması ve hatanın metinle açıklanması.
2. [W3C: Understanding SC 3.3.3 Error Suggestion](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html) *(doc)* — Düzeltme önerisi sunmak.
3. [React Hook Form: Advanced Usage](https://react-hook-form.com/advanced-usage#AccessibilityA11y) *(doc)* — `aria-invalid` ve mesajla erişilebilir doğrulama.
4. [W3C: User Notification](https://www.w3.org/WAI/tutorials/forms/notifications/) *(doc)* — Hata listesi, `aria-describedby`, odak, sayfa başlığı ve canlı bölgeler.
5. [React Hook Form: useForm](https://react-hook-form.com/docs/useform) *(doc)* — `mode: "onTouched"` ve `shouldFocusError`.
6. [React Hook Form: getFieldState](https://react-hook-form.com/docs/useform/getfieldstate) *(doc)* — Alan durumunu `useFormState` ile birlikte okumak.
7. [Vitaly Friedman](https://www.smashingmagazine.com/author/vitaly-friedman/): [A Complete Guide To Live Validation UX](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/) *(article)* — 21 Eylül 2022. Erken ve geç doğrulama, "ödülü erken, cezayı geç ver" ve boş alanlar.
8. [GOV.UK Design System: Validation](https://design-system.service.gov.uk/patterns/validation/) *(doc)* — Gönderimde doğrulamak ve yazarken doğrulamamak.
9. [GOV.UK Design System: Error summary](https://design-system.service.gov.uk/components/error-summary/) *(doc)* — Özetin yeri, odak, alanlara link ve "Hata:" başlık öneki.
10. [GOV.UK Design System: Error message](https://design-system.service.gov.uk/components/error-message/) *(doc)* — Mesajın yeri ve yazım kuralları.
11. [Adrian Roselli](https://adrianroselli.com/): [Avoid Default Field Validation](https://adrianroselli.com/2019/02/avoid-default-field-validation.html) *(article)* — Şubat 2019, güncelleme Ağustos 2023. Zorunluluğu görünür etikette belirtmek ve durumları yardımcı teknolojiye iletmek.
12. [W3C: Understanding SC 1.3.5 Identify Input Purpose](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html) *(doc)* — `autocomplete` ile girdi amacını tanımlamak.
