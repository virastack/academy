---
title: "Server Actions"
description: "Form ve mutation, useActionState, cache'i güncelleme ve güvenlik."
lastVerified: "2026-10-21"
translationKey: "nextjs/server-actions"
---

## Server Function ve Server Action

React rehberindeki [Actions](/academy/react/actions) dersinde Action'ı tarayıcıda çalıştırdınız. **Server Function**, `"use server"` ile işaretlenmiş ve sunucuda çalışan async bir fonksiyondur. Bir form'a ya da transition'a bağlandığında adı **Server Action** olur.[^1]

İstemci onu bir ağ isteğiyle çağırır. Next.js bu isteği sizin yerinize kurar: bir API route, `fetch` ya da JSON ayrıştırma yazmazsınız.[^1]

```ts
// app/actions.ts
"use server";

import { updateTag } from "next/cache";

export async function addReview(formData: FormData) {
  const text = String(formData.get("text"));
  await db.review.create({ data: { text } });
  updateTag("reviews");
}
```

```tsx
// app/products/[slug]/page.tsx
import { addReview } from "@/app/actions";

<form action={addReview}>
  <textarea name="text" aria-label="Yorumunuz" required />
  <button>Submit</button>
</form>;
```

`"use server"` dosyanın başındaysa tüm export'lar Server Function olur. Client Component'ler Server Function tanımlayamaz ama böyle bir dosyadan import edip kullanabilir.[^1]

Server Component'teki form JavaScript yüklenmeden de gönderilir *(progressive enhancement)*. Client Component'te ise JavaScript yüklenene kadar gönderim sıraya alınır.[^1]

## Sonucu göstermek: useActionState

Hata ya da başarı mesajı göstermek için Action'ı React'in `useActionState`'ine verin. Action bu durumda ilk argüman olarak önceki state'i alır.[^1][^2]

```ts
// app/actions.ts
"use server";

export type SubscribeState = { message: string | null };

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const email = String(formData.get("email"));
  if (!email.includes("@")) return { message: "Enter a valid email address." };

  await db.subscriber.create({ data: { email } });
  return { message: "Abone oldunuz." };
}
```

```tsx
// components/subscribe-form.tsx
"use client";

import { useActionState } from "react";

import { subscribe } from "@/app/actions";

export function SubscribeForm() {
  const [state, formAction, isPending] = useActionState(subscribe, { message: null });

  return (
    <form action={formAction}>
      <input name="email" type="email" aria-label="E-posta" />
      <button disabled={isPending}>Abone ol</button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
```

Doküman beklenen hatalar için `throw` yerine **değer döndürmeyi** önerir. `throw` en yakın hata sınırına gider; doğrulama hatası için fazla sert.[^3] Alan bazlı doğrulama ve [!zod] şeması [Formlar](/academy/forms) rehberinde.

## Mutation'dan sonra ne yenilenmeli

Next.js, Action'ı ve güncellenen sayfayı **tek istekte** döndürebilir. Hangisinin yenileneceğini Action'da çağırdığınız fonksiyon belirler:[^4]

| Çağrı | Sonuç |
| :-- | :-- |
| `updateTag("reviews")` | Etiketli cache hemen silinir, sayfa aynı yanıtta taze veriyle gelir |
| `revalidateTag("reviews", "max")` | Arka planda yenilenir; bu yanıt sayfayı yeniden render etmez |
| `revalidatePath("/products")` | Bir adresin verisi geçersiz olur, sayfa aynı yanıtta gelir |
| `refresh()` | Cache'e dokunmadan mevcut sayfayı yeniden çizer |
| `redirect("/orders")` | Başka sayfaya yönlendirir; sonrasındaki kod çalışmaz |
| `cookies().set(...)` | Cookie değişir, sayfa yeni değerle yeniden render edilir |

Kullanıcı kendi yaptığı değişikliği hemen görmeli ise *(sepete ekleme, yorum yazma)* `updateTag` doğru seçimdir. `redirect`'i her zaman yenileme çağrılarından **sonra** yazın.[^4]

## Güvenlik: Her action açık bir uç noktadır

`"use server"`, fonksiyonu bir POST uç noktasına çevirir. Sayfanızda form göstermeseniz bile herkes aynı isteği elle gönderebilir.[^4] [Sebastian Markbåge](https://github.com/sebmarkbage)'ın Next.js güvenlik yazısındaki kural: Server Action'ları dışarıya açık bir API gibi ele alın.[^5]

Next.js kendi tarafında birkaç koruma sağlar: `Origin` ile `Host`'u karşılaştırıp CSRF'i engeller, istek gövdesini varsayılan 1 MB ile sınırlar, kullanılmayan Action'ları paketten çıkarır ve Action kimliklerini şifreler.[^4] Ama uygulamanın kendi kontrolleri sizin işiniz:

> [!DO]
>
> - Her Action'ın içinde **kimlik ve yetki** kontrolü yapın.
> - `FormData`'yı güvenilmeyen girdi sayın ve doğrulayın.
> - İstemciden yalnızca **kimlik** *(id)* ve değişikliği alın; sahiplik gibi bilgileri oturumdan ve veritabanından okuyun.
> - İstemciye yalnızca arayüzün göstereceği alanları döndürün.

```ts
"use server";

export async function deleteReview(reviewId: string) {
  const user = await getCurrentUser();
  const review = await db.review.findFirst({
    where: { id: reviewId, authorId: user.id },
  });
  if (!review) return { error: "No reviews found." };

  await db.review.delete({ where: { id: review.id } });
  updateTag("reviews");
  return { error: null };
}
```

Rol kontrolünü tek yerde toplamak [Yetkilendirme ve roller](/academy/auth-security/authorization-and-roles) dersinde.

## Ne zaman action, ne zaman başka bir şey

Next.js bir istemcideki Action'ları **sırayla** çalıştırır; ikincisi birincinin bitmesini bekler. `Promise.all` ile Action'ları paralel çağırmak işe yaramaz.[^4]

| İhtiyaç | Kullanın |
| :-- | :-- |
| Form gönderme, veri değiştirme | Server Action |
| Sayfa için veri okuma | Server Component |
| Dış servisin çağıracağı adres *(webhook)*, mobil uygulama API'si | [Route Handler](/academy/nextjs/route-handlers-and-proxy) |

> [!WARNING]
>
> Yeni bir deploy, Action kimliklerini değiştirir. Eski sayfayı açık tutan kullanıcı "Failed to find Server Action" hatası alabilir. Arayüzde bu hatayı yenileme öneren bir mesajla karşılayın.[^4]

## Kendin dene

- `addReview`'u bir Server Component'teki forma bağlayın. Tarayıcıda JavaScript'i kapatıp formu gönderin.
- `SubscribeForm`'a `@` içermeyen bir adres girin; mesajın sayfa yenilenmeden geldiğini görün.
- Aynı Action'da `updateTag` yerine `revalidateTag(..., "max")` kullanın. Yorum listesi hemen güncelleniyor mu?
- DevTools'un **Network** sekmesinde Action isteğini bulun. Bu isteği `curl` ile tekrarlayabilir misiniz? `deleteReview`'daki sahiplik kontrolü neden şart?

## Detaylı öğrenmek için

- **Resmi doküman:** "Server Actions and Mutations" rehberi; tek istekte veri ve arayüz, sıralı çalıştırma, güvenlik ve deploy notları.[^4]
- **Yazı:** [Sebastian Markbåge](https://github.com/sebmarkbage), "How to Think About Security in Next.js"; Server Component ve Action'larda güvenlik modeli.[^5]
- **Resmi doküman:** "Data Security" rehberi; Data Access Layer, girdi doğrulama, rate limit ve dönüş değerini kısıtlamak.[^6]
- **Video:** [Aurora Scharff](https://aurorascharff.no/), "Enhancing Forms with React Server Components"; Server Component ve Action'larla form deneyimini adım adım iyileştirmek.[^7]

## Kaynaklar

1. [Next.js: Mutating Data](https://nextjs.org/docs/app/getting-started/mutating-data) *(doc)* — Server Function oluşturma, form ve event handler ile çağırma, bekleme durumu, `refresh`, `revalidatePath` ve `redirect`.
2. [React: useActionState](https://react.dev/reference/react/useActionState) *(doc)* — Önceki state'i alan Action, `isPending` ve sıralı çalıştırma.
3. [Next.js: Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) *(doc)* — Beklenen hataları dönüş değeri olarak modellemek.
4. [Next.js: Server Actions and Mutations](https://nextjs.org/docs/app/guides/server-actions) *(doc)* — Sıralı çalıştırma, tek yanıtta veri ve arayüz, yerleşik korumalar, cache güncelleme seçimi ve deploy notları.
5. [Sebastian Markbåge](https://github.com/sebmarkbage): [How to Think About Security in Next.js](https://nextjs.org/blog/security-nextjs-server-components-actions) *(article)* — Data Access Layer ve Server Action'ları açık uç nokta gibi ele almak.
6. [Next.js: Data Security](https://nextjs.org/docs/app/guides/data-security) *(doc)* — Girdi doğrulama, yetki, dönüş değerini kısıtlama, rate limit ve closure şifreleme.
7. [Aurora Scharff](https://aurorascharff.no/): [Enhancing Forms with React Server Components](https://gitnation.com/contents/enhancing-forms-with-react-server-components) *(video)* — React Day Berlin 2024. Server Component ve React 19 ile kademeli geliştirilen formlar.
