---
title: "Server Actions ile form"
description: "useActionState, sunucuda Zod ve sunucu hatası."
lastVerified: "2026-10-22"
translationKey: "forms/forms-with-server-actions"
---

## Server Action Nedir?

Server Action, sunucuda çalışan ve tarayıcıdan çağrılabilen bir async fonksiyondur. Dosyanın başına `"use server"` yazarsınız; [!nextjs] fonksiyonu bir uç noktaya çevirir ve çağrıyı sizin yerinize yapar. `<form action>`'a verildiğinde fonksiyon `FormData`'yı doğrudan alır.[^1][^2]

> [!CAUTION]
>
> Server Action herkese açık bir uç noktadır. Formu yalnızca giriş yapmış kullanıcıya göstermeniz, action'ın yalnızca onlardan çağrılacağı anlamına gelmez. Her action'da oturumu ve yetkiyi **action'ın içinde** kontrol edin, girdiyi her zaman doğrulayın.[^1]

## Doğal Form ve useActionState

En sade yol React'in kendi form desteğidir. Action önceki durumu ve `FormData`'yı alır, yeni durumu döndürür:[^1][^3]

```ts
// app/newsletter/actions.ts
"use server";

import { z } from "zod";

const subscribeSchema = z.object({
  name: z.string().trim().min(2, "Adınız en az 2 karakter olmalı."),
  email: z.email("E-posta adresini ad@ornek.com biçiminde girin."),
});

export type SubscribeState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: { name?: string[]; email?: string[] };
  values?: { name: string; email: string };
};

export async function subscribe(
  _prevState: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  const parsed = subscribeSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }

  await saveSubscriber(parsed.data);
  return { status: "success", message: `${parsed.data.email} adresine onay e-postası gönderdik.` };
}
```

```tsx
// app/newsletter/subscribe-form.tsx
"use client";

import { useActionState } from "react";
import { subscribe, type SubscribeState } from "./actions";

const initialState: SubscribeState = { status: "idle" };

export function SubscribeForm() {
  const [state, formAction, isPending] = useActionState(subscribe, initialState);

  return (
    <form action={formAction} noValidate>
      <label htmlFor="email">E-posta</label>
      <input
        id="email"
        name="email"
        type="email"
        defaultValue={state.values?.email}
        aria-invalid={Boolean(state.fieldErrors?.email)}
        aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
      />
      {state.fieldErrors?.email && <p id="email-error">{state.fieldErrors.email[0]}</p>}

      {/* name alanı aynı kalıpla */}

      <button disabled={isPending}>{isPending ? "Gönderiliyor..." : "Abone ol"}</button>
      <p aria-live="polite">{state.message}</p>
    </form>
  );
}
```

`useActionState` üç şey döndürür: action'ın son döndürdüğü durum, forma verilecek action ve bekleme bilgisi.[^3] Gönder butonu ayrı bir component'teyse `react-dom`'daki `useFormStatus` ile de bekleme durumunu okuyabilirsiniz.[^1]

Bu formun güçlü yanı **progressive enhancement**'tır: JavaScript yüklenmeden ya da kapalıyken de çalışır. Tarayıcı formu normal şekilde gönderir, sunucu sayfayı hata mesajlarıyla döndürür.[^1][^3]

**Neden `values` döndürülüyor?** React, `action` ile gönderilen formu işlem bitince **sıfırlar**; tarayıcının doğal davranışı da budur. Hata durumunda kullanıcının yazdıkları silinir. Action'dan gönderilen değerleri döndürüp `defaultValue`'ya vermek alanları geri doldurur. Başarılı gönderimde `values` dönmediği için form temizlenir.[^4] GOV.UK de hata gösterirken alanları temizlememeyi ister.[^5]

> [!NOTE]
>
> Next.js'in form rehberindeki doğrulama örneği Zod 3'ün `invalid_type_error` ve `error.flatten()` API'lerini kullanır. Zod 4'te bunların yerini `error` parametresi ve `z.flattenError()` aldı *(bkz. [Zod ile şema ve doğrulama](/academy/forms/zod-schema-and-validation))*.[^1][^6]

`Object.fromEntries(formData)` kısa bir yol gibi görünür ama nesneye Next.js'in `$ACTION_` önekli alanları da girer. Alanları adıyla okumak ya da şemayı doğrudan nesneye uygulamak daha temizdir.[^1]

## React Hook Form ile Birlikte

Doğal form JavaScript'siz çalışır ama anlık doğrulama, odak yönetimi ve dinamik alanlar yoktur. İkisini birleştirmenin iki yolu var.

### 1. Action'ı Doğrudan Çağırmak

Server Action sıradan bir async fonksiyon gibi çağrılabilir. `handleSubmit` tarayıcıda doğrular, geçerse doğrulanmış değerleri action'a verir. Bu rehberin proje örneği bu yolu kullanır:[^7]

```tsx
const [isPending, startTransition] = useTransition();

const onSubmit = form.handleSubmit((values) => {
  startTransition(async () => {
    const result = await submitApplication(values);
    if (result.status === "error") {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        form.setError(field as ApplicationField, { type: "server", message });
      }
      form.setError("root.server", { type: "server", message: result.message });
    }
  });
});
```

`setError` ile yazılan hata alanın normal hatası gibi görünür ve alan düzeltilince temizlenir. `root.server` bir alana ait olmayan genel hatadır ve bir sonraki gönderimde silinir.[^8]

### 2. useActionState ile

Action'ın döndürdüğü durumu ve bekleme bilgisini React yönetsin istiyorsanız `useActionState`'in döndürdüğü fonksiyonu `handleSubmit`'in içinden çağırın. React Hook Form dokümanı bu kalıbı önerir:[^7]

```tsx
"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema } from "./schema";
import { updateProfile, type ProfileState } from "./actions";

export function ProfileForm() {
  const [state, submitAction, isPending] = useActionState<ProfileState, unknown>(updateProfile, {
    status: "idle",
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: "" },
  });

  useEffect(() => {
    if (state.status === "error" && state.fieldErrors.username) {
      setError("username", { type: "server", message: state.fieldErrors.username }, { shouldFocus: true });
    }
  }, [state, setError]);

  return (
    <form onSubmit={handleSubmit((values) => startTransition(() => submitAction(values)))} noValidate>
      <label htmlFor="username">Kullanıcı adı</label>
      <input id="username" aria-invalid={Boolean(errors.username)} {...register("username")} />
      {errors.username && <p>{errors.username.message}</p>}
      <button disabled={isPending}>{isPending ? "Kaydediliyor..." : "Kaydet"}</button>
      {state.status === "success" && <p role="status">Profil kaydedildi.</p>}
    </form>
  );
}
```

İki ayrıntı:

- **`startTransition` şart.** Fonksiyon `<form action>`'a verilmediği için onu bir transition içinde çağırmalısınız. Unutursanız React "An async function with useActionState was called outside of a transition" hatası verir ve `isPending` güncellenmez.[^3]
- **`useEffect` burada meşru.** React Hook Form dokümanı, action'ın döndürdüğü durumu `setError` ile forma yazmayı dış bir kaynağı senkronlamak olarak görür.[^7]

| | Doğal form + `useActionState` | RHF + action |
| :-- | :-- | :-- |
| JavaScript'siz çalışır | Evet | Hayır |
| Anlık doğrulama ve odak | Elle | Hazır |
| Dinamik alanlar, maske | Zor | Kolay |
| Uygun olduğu yer | Bülten, arama, giriş | Çok alanlı, çok adımlı formlar |

React Hook Form'un beta durumdaki `Form` component'i de `action` prop'una Server Action alabilir ve progressive enhancement'ı kendisi kurar.[^9]

## Sunucu Her Zaman Tekrar Doğrular

İstemci doğrulaması kullanıcı içindir; sunucu doğrulaması güvenlik içindir. Action'a gelen değer `unknown`'dır; tipini TypeScript değil şema garanti eder:[^5][^1]

```ts
export async function submitApplication(values: unknown): Promise<ApplicationResult> {
  const session = await auth();
  if (!session) return { status: "error", message: "Oturum açın.", fieldErrors: {} };

  const parsed = applicationSchema.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    // ...alan hatalarını döndür
  }
  // parsed.data güvenli
}
```

> [!WARNING]
>
> `handleSubmit` şemanın **çıktısını** verir. Şemada `.transform` varsa *(metni sayıya çevirmek gibi)* bu çıktıyı aynı şemayla sunucuda tekrar doğrulamak başarısız olur: şema metin bekler, sayı gelir. Sunucuyla paylaşılan şemada dönüşüm yapmayın; dönüşümü doğrulamadan sonra sunucuda yapın. Proje örneğinde fiyat bu yüzden metin olarak doğrulanır ve sayıya sunucuda çevrilir.

## Hata Hangi Adımda?

Çok adımlı bir formda sunucu, ilk adımdaki bir alan için hata döndürebilir *(ör. "Bu e-posta ile daha önce başvuru yapılmış.")*. Kullanıcı son adımdadır ve hatayı görmez. Hatanın düştüğü en erken adıma dönün:

```ts
const fields = Object.keys(result.fieldErrors) as ApplicationField[];
if (fields.length > 0) {
  setStep(Math.min(...fields.map(stepOf)));
}
```

`stepOf`, alanın hangi adımda olduğunu `steps` listesinden bulur *(bkz. [Dinamik alanlar ve çok adımlı formlar](/academy/forms/dynamic-and-multi-step-forms))*.

## Kendin Dene

- Bülten formunu kurun, yanlış e-posta ile gönderin. `defaultValue`'yu silip tekrar deneyin; yazdıklarınıza ne oluyor?
- Tarayıcıda JavaScript'i kapatın *(DevTools > Ayarlar > Debugger > Disable JavaScript)* ve formu gönderin.
- `ProfileForm`'daki `startTransition`'ı silin ve konsolu açın.
- Action'a `const session = await auth()` benzeri bir kontrol ekleyin ve oturum yokken çağırın.
- Şemaya fiyatı sayıya çeviren bir `.transform` ekleyin, aynı şemayı action'da kullanın ve hatayı görün.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** Next.js, "How to create forms with Server Actions"; doğrulama, bekleme durumu ve iyimser güncelleme.[^1]
- **Resmi doküman:** React, "useActionState"; durum, transition ve progressive enhancement.[^3]
- **Resmi doküman:** React Hook Form, "Server Actions / useActionState"; iki dünyayı `useEffect` köprüsü kurmadan birleştirmek.[^7]

## Kaynaklar

1. [Next.js: How to create forms with Server Actions](https://nextjs.org/docs/app/guides/forms) *(doc)* — `FormData`, sunucuda Zod, `useActionState`, `useFormStatus`, `$ACTION_` alanları ve her action'da yetki kontrolü.
2. [React: Server Functions](https://react.dev/reference/rsc/server-functions) *(doc)* — `"use server"` ve sunucu fonksiyonlarını istemciden çağırmak.
3. [React: useActionState](https://react.dev/reference/react/useActionState) *(doc)* — Dönen değerler, transition içinde çağırmak ve progressive enhancement.
4. [React: Issue #29034](https://github.com/facebook/react/issues/29034) *(repo)* — Form action sonrası otomatik sıfırlama ve değerleri `defaultValue` ile korumak.
5. [GOV.UK Design System: Validation](https://design-system.service.gov.uk/patterns/validation/) *(doc)* — Sunucuda her zaman doğrulamak ve hata sonrası değerleri korumak.
6. [Zod: Migration guide](https://zod.dev/v4/changelog) *(doc)* — Zod 3'ten 4'e değişen hata API'leri.
7. [React Hook Form: Advanced Usage](https://react-hook-form.com/advanced-usage#ServerActionsuseActionState) *(doc)* — `handleSubmit` içinden action çağırmak ve sunucu hatasını `setError` ile yazmak.
8. [React Hook Form: setError](https://react-hook-form.com/docs/useform/seterror) *(doc)* — Sunucu hatası, `root` hataları ve temizlenmeleri.
9. [React Hook Form: Form](https://react-hook-form.com/docs/useform/form) *(doc)* — `action` prop'una fonksiyon vermek *(7.84+)*.
