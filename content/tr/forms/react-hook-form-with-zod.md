---
title: "React Hook Form ile Zod"
description: "Resolver, input ve output tipleri, alanlar arası kural."
lastVerified: "2026-10-22"
translationKey: "forms/react-hook-form-with-zod"
---

## Neden birlikte?

[React Hook Form temelleri](/academy/forms/react-hook-form-basics) dersinde kuralları `register`'a yazdınız. Bu yaklaşımın iki sorunu var: kurallar JSX'in içine dağılır ve aynı kuralları sunucuda tekrar yazmanız gerekir. Çözüm kuralları bir [!zod] şemasına taşıyıp formu bu şemayla doğrulamaktır. Bağlantıyı **resolver** kurar.[^1][^2]

## Kurulum

```command
npm install react-hook-form zod @hookform/resolvers
```

> [!WARNING]
>
> `@hookform/resolvers` 6.0.0 *(19 Ekim 2026)* npm 10'da `ERESOLVE unable to resolve dependency tree` hatası verebilir. Paket desteklediği her doğrulama kütüphanesini isteğe bağlı peer olarak listeler ve npm 10 bunların arasındaki bir sürüm çakışmasını çözemez. Node.js 24 ile gelen npm 11 ve pnpm sorunsuz kurar. npm 10'da kalmanız gerekiyorsa `--legacy-peer-deps` geçici bir çözümdür.[^3]

## zodResolver

Şema bir dosyada, form başka bir dosyada durur:[^2]

```ts
// src/features/auth/sign-up-schema.ts
import { z } from "zod";

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "The name must be at least 2 characters."),
    email: z.email("Enter the email address as name@example.com."),
    password: z.string().min(8, "The password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "The passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignUpValues = z.infer<typeof signUpSchema>;
```

```tsx
// src/features/auth/sign-up-form.tsx
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpValues } from "./sign-up-schema";

export function SignUpForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    mode: "onTouched",
  });

  const onSubmit: SubmitHandler<SignUpValues> = (values) => createAccount(values);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <label htmlFor="name">Ad</label>
      <input id="name" autoComplete="name" {...register("name")} />
      {errors.name && <p>{errors.name.message}</p>}

      <label htmlFor="email">E-posta</label>
      <input id="email" type="email" autoComplete="email" {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}

      <label htmlFor="password">Şifre</label>
      <input
        id="password"
        type="password"
        autoComplete="new-password"
        {...register("password", { deps: "confirmPassword" })}
      />
      {errors.password && <p>{errors.password.message}</p>}

      <label htmlFor="confirmPassword">Şifre tekrar</label>
      <input
        id="confirmPassword"
        type="password"
        autoComplete="new-password"
        {...register("confirmPassword")}
      />
      {errors.confirmPassword && <p>{errors.confirmPassword.message}</p>}

      <button>Hesap oluştur</button>
    </form>
  );
}
```

`useForm`'a generic vermediniz; alan adları ve `errors`'ın tipi `zodResolver(signUpSchema)`'dan çıkar. `register("emial")` gibi bir yazım hatası derlemede yakalanır.[^3]

Resolver'la çalışırken üç kural:[^1]

- **Yerleşik kurallar çalışmaz.** `register("name", { required: true })` resolver varken yok sayılır. Tüm kurallar şemada olmalı.
- **Form düzeyindeki `validate` çalışmaz.** RHF 7.72 ile gelen `useForm({ validate })` ve resolver birbirini dışlar; ikisi birden verilirse yalnızca resolver çalışır.
- **Hata mesajı şemadan gelir.** Mesajları şemaya yazın; JSX yalnızca `errors.x.message`'ı gösterir.

## Alanlar arası kural ve deps

Şifre ve tekrarı eşleştiğinde hata yok. Kullanıcı sonra şifreyi değiştirirse "The passwords do not match." çıkmalı. Çıkmaz: RHF yalnızca değişen alanın hatasını günceller; refine `confirmPassword`'a yazıyor ama değişen alan `password`.

`deps` bu bağı kurar. `password` doğrulandığında listedeki alanlar da yeniden doğrulanır:[^4]

```tsx
<input type="password" {...register("password", { deps: "confirmPassword" })} />
```

Yukarıdaki formda `deps` bu yüzden var. `trigger()` ile elle doğrulama yaptığınızda `deps` uygulanmaz.[^4]

> [!NOTE]
>
> Zod'da nesnenin `.refine`'ı, nesnenin herhangi bir alanında tip hatası varken çalışmaz. Seçilmemiş bir `z.enum` alanı şifre kontrolünü bekletebilir *(bkz. [Zod ile şema ve doğrulama](/academy/forms/zod-schema-and-validation))*.

## Input ve output tipleri

Şemada `.transform` varsa şemanın girdi ve çıktı tipi ayrılır. Form **girdi** tipini tutar *(input'taki metin)*, `handleSubmit` **çıktı** tipini verir *(dönüşmüş değer)*:[^3][^5]

```tsx
const productSchema = z.object({
  title: z.string().trim().min(1, "Enter the product name."),
  price: z
    .string()
    .regex(/^\d+(,\d{1,2})?$/, "Enter the price as 1250,50.")
    .transform((value) => Number(value.replace(",", "."))),
});

type ProductInput = z.input<typeof productSchema>; // { title: string; price: string }
type ProductOutput = z.output<typeof productSchema>; // { title: string; price: number }

export function ProductForm() {
  const { register, handleSubmit } = useForm<ProductInput, unknown, ProductOutput>({
    resolver: zodResolver(productSchema),
    defaultValues: { title: "", price: "" },
  });

  return (
    <form onSubmit={handleSubmit((product) => saveProduct(product))}>
      <input {...register("title")} />
      <input inputMode="decimal" {...register("price")} />
    </form>
  );
}
```

`useForm`'un üç generic'i sırasıyla form değerleri, context ve gönderilen değerlerdir. Ya hiç generic vermeyin ve tipi resolver'dan çıkarın, ya da üçünü birden verin. Tek generic `useForm<ProductOutput>` iki tipi aynıya sabitler ve `zodResolver` ile çakışır. Resolver dokümanı `.default()` için de aynı uyarıyı yapar: varsayılan değeri olan alan girdide isteğe bağlı, çıktıda zorunludur.[^3]

## Şemayı sunucuyla paylaşmak

Şemayı ayrı bir dosyada tutmanın asıl faydası sunucudadır. Tarayıcıdaki doğrulama kullanıcı deneyimi içindir; atlatılabilir. Sunucu aynı şemayla girdiyi tekrar doğrular:[^6][^7]

```ts
// app/sign-up/actions.ts
"use server";

import { signUpSchema } from "@/features/auth/sign-up-schema";

export async function createAccount(values: unknown) {
  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error" as const };
  }
  // parsed.data güvenli
}
```

> [!CAUTION]
>
> Şemada `.transform` varsa dikkat: `handleSubmit` **dönüşmüş** değeri verir. Bunu aynı şemayla sunucuda tekrar doğrularsanız şema metin bekler ama sayı gelir ve doğrulama başarısız olur. İki yol var: sunucuya gidecek şemada dönüşüm yapmayın ve dönüşümü sunucuda yapın, ya da sunucuya ham `FormData` gönderin. Ayrıntılar [Server Actions ile form](/academy/forms/forms-with-server-actions) dersinde.

## Kendin dene

- Kayıt formunu kurun. Şifreleri eşleştirin, sonra şifreyi değiştirin. `deps`'i silip tekrar deneyin.
- `register("name", { required: "Zorunlu" })` ekleyip şemadan `min(2)`'yi silin. Boş gönderince ne oluyor?
- `ProductForm`'da generic'leri silin. `product.price`'ın tipi ne oluyor? Sonra yalnızca `useForm<ProductOutput>` yazın ve hatayı okuyun.
- `createAccount`'ı formu kullanmadan, bir test butonundan `createAccount({ email: "x" })` ile çağırın. Sunucu ne döndürüyor?

## Detaylı öğrenmek için

- **Resmi doküman:** React Hook Form, "Schema Validation"; resolver ile şema doğrulaması.[^2]
- **Repo:** `@hookform/resolvers` README; Zod örneği ve input/output tipleri.[^3]
- **Resmi doküman:** React Hook Form, "useForm: resolver"; resolver kuralları.[^1]

## Kaynaklar

1. [React Hook Form: useForm](https://react-hook-form.com/docs/useform#resolver) *(doc)* — Resolver, yerleşik kurallarla birlikte kullanılamaması ve form düzeyindeki `validate` ile birbirini dışlaması.
2. [React Hook Form: Get Started](https://react-hook-form.com/get-started#SchemaValidation) *(doc)* — Şema doğrulaması ve resolver kurulumu.
3. [React Hook Form: Resolvers](https://github.com/react-hook-form/resolvers) *(repo)* — `zodResolver`, desteklenen kütüphaneler, `.default()` ve üç generic uyarısı.
4. [React Hook Form: register](https://react-hook-form.com/docs/useform/register) *(doc)* — `deps` seçeneği ve `trigger` ile ilişkisi.
5. [Zod: Transforms](https://zod.dev/api#transforms) *(doc)* — `.transform`, `z.input` ve `z.output`.
6. [GOV.UK Design System: Validation](https://design-system.service.gov.uk/patterns/validation/) *(doc)* — Her zaman sunucuda doğrulamak, tarayıcı doğrulamasının atlatılabilmesi.
7. [Next.js: How to create forms with Server Actions](https://nextjs.org/docs/app/guides/forms) *(doc)* — Server Action'da şema ile doğrulama.
