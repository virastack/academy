---
title: "Satıcı başvuru formu"
description: "Çok adımlı, maskeli ve sunucuda doğrulanan form."
lastVerified: "2026-10-22"
translationKey: "forms/project"
---

## Senaryo

Bir pazaryeri için satıcı başvuru formu yazacaksınız. Form:

- Üç adımdan oluşur: mağaza, iletişim ve ödeme. "Next" yalnızca o adımın alanlarını doğrular ve ilk hatalı alana odaklanır.
- Kullanıcı geri dönünce önceki adımların değerlerini korur.
- Mağaza adımında 1 ile 3 arasında örnek ürün ister; satır eklenir ve silinir.
- Vergi numarası, telefon ve IBAN alanlarını maskeyle biçimlendirir; forma yalnızca rakamları yazar.
- IBAN'ın sağlamasını Zod ile kontrol eder; fiyatı `249,90` ya da `249.90` biçiminde kabul eder.
- Hata mesajlarını alana `aria-describedby` ile bağlar; mesaj gelince düzen kaymaz.
- Başvuruyu bir Server Action'a gönderir. Sunucu aynı şemayla tekrar doğrular; daha önce kullanılmış bir e-posta için alan hatası döndürür ve form o alanın adımına geri döner.

Amaç tasarım değil, derslerdeki parçaların birlikte çalışmasıdır. Her parçanın hangi dersten geldiği:

| Parça | Dosya | Ders |
| :-- | :-- | :-- |
| Şema, `z.input`/`z.output`, özel mesajlar | `lib/application-schema.ts` | Zod ile şema ve doğrulama |
| `zodResolver`, `mode: "onTouched"` | `components/application-form.tsx` | React Hook Form ile Zod |
| `Field`, `aria-invalid`, `aria-describedby`, ayrılmış hata alanı | `components/field.tsx` | Hata gösterimi ve erişilebilirlik |
| `useViraMask`, ham değer, IBAN sağlaması | `application-form.tsx`, `application-schema.ts` | Maskeleme ve regex |
| `useFieldArray`, `FormProvider`, `trigger` ile adımlar | `store-step.tsx`, `application-form.tsx` | Dinamik alanlar ve çok adımlı formlar |
| Server Action, `setError`, hatanın adımına dönmek | `app/actions.ts`, `application-form.tsx` | Server Actions ile form |

Projenin çalışan hali GitHub'da: [examples/forms/project](https://github.com/virastack/academy/tree/main/examples/forms/project). Akışları tarayıcıda deneyen Playwright testleri de orada; takıldığınızda karşılaştırın.

## Adım 1: Projeyi kurun

[!nextjs] projesini varsayılan ayarlarla açın ve paketleri ekleyin:[^1]

```command
npx create-next-app@latest seller-application --yes
```

```command
npm install react-hook-form zod @hookform/resolvers @virastack/mask
```

> [!WARNING]
>
> `@hookform/resolvers` 6.0.0 npm 10'da `ERESOLVE` hatası verebilir. Node.js 24 ile gelen npm 11'i ya da pnpm'i kullanın *(bkz. [React Hook Form ile Zod](/academy/forms/react-hook-form-with-zod))*.

`public/` altındaki örnek SVG'leri silin. `app/layout.tsx` ve `app/globals.css`'i sadeleştirin:

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seller application",
  description: "A multi-step application form with masking and server-side validation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
```

```css
/* app/globals.css */
@import "tailwindcss";

body {
  font-family: system-ui, sans-serif;
}
```

`LayoutProps`, Next.js'in route'lardan ürettiği global bir tiptir; import gerekmez.[^1]

## Adım 2: Şema

Tüm kurallar tek bir şemada durur. Hem form hem Server Action bu dosyayı kullanır:[^2][^3]

```ts
// lib/application-schema.ts
import { z } from "zod";

export const categories = [
  { value: "fashion", label: "Moda" },
  { value: "electronics", label: "Elektronik" },
  { value: "home", label: "Home and living" },
] as const;

export const parsePrice = (value: string) => Number(value.replace(",", "."));

const productSchema = z.object({
  name: z.string().trim().min(2, "The product name must be at least 2 characters."),
  // Fiyat metin olarak kalır; "249,90" de "249.90" de geçerlidir.
  price: z
    .string()
    .trim()
    .min(1, "Fiyat girin.")
    .regex(/^\d+([.,]\d{1,2})?$/, "Enter the price as 249,90.")
    .refine((value) => parsePrice(value) > 0, "The price must be greater than zero."),
});

export const applicationSchema = z.object({
  storeName: z.string().trim().min(2, "The store name must be at least 2 characters."),
  taxNumber: z.string().regex(/^\d{10}$/, "A tax number must be 10 digits."),
  category: z.enum(["fashion", "electronics", "home"], { error: "Choose a category." }),
  products: z
    .array(productSchema)
    .min(1, "Add at least one product.")
    .max(3, "You can add at most 3 products."),
  contactName: z.string().trim().min(2, "The full name must be at least 2 characters."),
  email: z.email("Enter the email address as name@example.com."),
  phone: z.string().regex(/^5\d{9}$/, "A phone number must be 10 digits starting with 5."),
  // Maske yalnızca rakamları saklar; ülke kodunu ekleyip IBAN sağlamasını yapıyoruz.
  iban: z
    .string()
    .regex(/^\d{24}$/, "An IBAN must have 24 digits after TR.")
    .refine((value) => z.iban().validate(`TR${value}`), "The IBAN is invalid; check the number."),
  acceptTerms: z.boolean().refine((value) => value, "Accept the terms to continue."),
});

export type ApplicationInput = z.input<typeof applicationSchema>;
export type ApplicationValues = z.output<typeof applicationSchema>;
export type ApplicationField = keyof ApplicationValues;

export const steps = [
  { title: "Store", fields: ["storeName", "taxNumber", "category", "products"] },
  { title: "Contact", fields: ["contactName", "email", "phone"] },
  { title: "Payment", fields: ["iban", "acceptTerms"] },
] as const satisfies { title: string; fields: ApplicationField[] }[];

export const stepOf = (field: ApplicationField) =>
  steps.findIndex((step) => (step.fields as readonly ApplicationField[]).includes(field));
```

Üç karar:

- **Dönüşüm yok.** Fiyat şemada metin olarak kalır. `handleSubmit`'in verdiği değer sunucuda aynı şemayla tekrar doğrulanabilir. Sayıya çevirme sunucuda, doğrulamadan sonra yapılır *(bkz. [Server Actions ile form](/academy/forms/forms-with-server-actions))*.
- **IBAN sağlaması ham değerle.** Maske forma `TR`'siz 24 rakam yazar; kontrol `TR` eklenerek `z.iban()` ile yapılır.[^4]
- **Adımlar şemanın yanında.** `steps` hangi alanın hangi adımda olduğunu söyler. `as const satisfies` listeyi daraltır ve alan adlarının şemada olduğunu derlemede kontrol eder; `stepOf` bir alanın adımını bulur.

## Adım 3: Server Action

Gerçek bir veritabanı yerine gecikmeli bir fonksiyon kullanın. `taken@example.com` adresi, sunucudan gelen alan hatasını denemek için:

```ts
// app/actions.ts
"use server";

import { z } from "zod";
import {
  applicationSchema,
  parsePrice,
  type ApplicationField,
  type ApplicationValues,
} from "@/lib/application-schema";

export type ApplicationResult =
  | { status: "success"; applicationId: string }
  | {
      status: "error";
      message: string;
      fieldErrors: Partial<Record<ApplicationField, string>>;
    };

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type StoredApplication = Omit<ApplicationValues, "products"> & {
  products: { name: string; price: number }[];
};

// Gerçek uygulamada veritabanına yazılır.
async function saveApplication(application: StoredApplication) {
  void application;
  await delay(400);
}

export async function submitApplication(values: unknown): Promise<ApplicationResult> {
  // İstemci doğrulamış olsa bile sunucu girdiye güvenmez.
  const parsed = applicationSchema.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      status: "error",
      message: "The application could not be validated.",
      fieldErrors: Object.fromEntries(
        Object.entries(fieldErrors).map(([field, messages]) => [field, messages?.[0]]),
      ),
    };
  }

  if (parsed.data.email === "taken@example.com") {
    return {
      status: "error",
      message: "An application with this email already exists.",
      fieldErrors: { email: "An application with this email already exists." },
    };
  }

  // Fiyat metin olarak doğrulandı; sayıya doğrulamadan sonra, sunucuda çevrilir.
  const products = parsed.data.products.map((product) => ({
    ...product,
    price: parsePrice(product.price),
  }));
  await saveApplication({ ...parsed.data, products });

  const applicationId = `APP-${parsed.data.taxNumber.slice(-4)}`;
  return { status: "success", applicationId };
}
```

Action girdiyi `unknown` alır; tipini şema garanti eder. `z.flattenError` her alan için bir mesaj listesi verir; ilkini döndürüyoruz.[^5] Gerçek bir uygulamada action'ın başında oturum ve yetki kontrolü de olmalı.[^6]

## Adım 4: Field ve maske yardımcısı

`Field`, [Hata gösterimi ve erişilebilirlik](/academy/forms/errors-and-accessibility) dersindeki component'in aynısıdır:

```tsx
// components/field.tsx
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

`@virastack/mask` 1.1.1, maske nesnesinde bir `rawValue` alanı da döndürür. Nesneyi input'a doğrudan yayınca React geliştirme modunda uyarı verir. Küçük bir yardımcı bu alanı ayırır:[^7]

```ts
// lib/mask-input.ts
import type { MaskField } from "@virastack/mask";

export type MaskInputProps = Omit<MaskField, "rawValue">;

/** `rawValue` bir HTML özelliği değil; input'a yaymadan önce ayırıyoruz. */
export function toInputProps({ rawValue, ...props }: MaskField): MaskInputProps {
  void rawValue;
  return props;
}
```

## Adım 5: Mağaza adımı

Mağaza adı, maskeli vergi numarası, kategori ve dinamik ürün listesi:[^8]

```tsx
// components/store-step.tsx
"use client";

import { useFieldArray, useFormContext, useFormState } from "react-hook-form";
import type { MaskInputProps } from "@/lib/mask-input";
import { categories, type ApplicationInput } from "@/lib/application-schema";
import { Field } from "./field";

const inputClass = "rounded border border-gray-400 px-3 py-2 aria-invalid:border-red-700";

export function StoreStep({ taxNumber }: { taxNumber: MaskInputProps }) {
  const { register, control } = useFormContext<ApplicationInput>();
  const { fields, append, remove } = useFieldArray({ control, name: "products" });
  const { errors } = useFormState({ control, name: "products" });
  // Dizi düzeyindeki hata satırlar varken root'a, dizi boşken doğrudan alana yazılır.
  const listError = errors.products?.root?.message ?? errors.products?.message;

  return (
    <>
      <Field name="storeName" label="Store name">
        {(a11y) => <input {...a11y} {...register("storeName")} className={inputClass} />}
      </Field>

      <Field name="taxNumber" label="Tax number" description="10-digit tax identification number">
        {(a11y) => <input {...taxNumber} {...a11y} className={inputClass} />}
      </Field>

      <Field name="category" label="Kategori">
        {(a11y) => (
          <select {...a11y} {...register("category")} className={inputClass}>
            <option value="">Choose</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-medium">Sample products</legend>
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2">
            <Field name={`products.${index}.name`} label={`Product ${index + 1} name`}>
              {(a11y) => (
                <input {...a11y} {...register(`products.${index}.name`)} className={inputClass} />
              )}
            </Field>
            <Field name={`products.${index}.price`} label={`Product ${index + 1} price (₺)`}>
              {(a11y) => (
                <input
                  {...a11y}
                  inputMode="decimal"
                  {...register(`products.${index}.price`)}
                  className={inputClass}
                />
              )}
            </Field>
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={fields.length === 1}
              aria-label={`Remove product ${index + 1}`}
              className="mt-7 rounded border px-2 py-2 disabled:opacity-40"
            >
              Kaldır
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ name: "", price: "" })}
          disabled={fields.length >= 3}
          className="self-start rounded border px-3 py-2 disabled:opacity-40"
        >
          Ürün ekle
        </button>
        {listError && (
          <p role="alert" className="text-sm text-red-700">
            {listError}
          </p>
        )}
      </fieldset>
    </>
  );
}
```

- Satırlar `field.id` ile anahtarlanır; `append` tam bir satır nesnesi alır.
- Son satır silinemez, dördüncü satır eklenemez. Şemadaki `min(1)` ve `max(3)` yine de sunucuyu korur.
- Her "Remove" butonunun `aria-label`'ı satır numarasını içerir.
- Fiyat alanı `type="number"` değil; `inputMode="decimal"` ile metin alanıdır *(bkz. [Maskeleme ve regex](/academy/forms/masking-and-regex))*.

## Adım 6: İletişim ve ödeme adımları

```tsx
// components/contact-step.tsx
"use client";

import { useFormContext } from "react-hook-form";
import type { MaskInputProps } from "@/lib/mask-input";
import type { ApplicationInput } from "@/lib/application-schema";
import { Field } from "./field";

const inputClass = "rounded border border-gray-400 px-3 py-2 aria-invalid:border-red-700";

export function ContactStep({ phone }: { phone: MaskInputProps }) {
  const { register } = useFormContext<ApplicationInput>();

  return (
    <>
      <Field name="contactName" label="Ad soyad">
        {(a11y) => (
          <input {...a11y} autoComplete="name" {...register("contactName")} className={inputClass} />
        )}
      </Field>
      <Field name="email" label="E-posta">
        {(a11y) => (
          <input
            {...a11y}
            type="email"
            autoComplete="email"
            {...register("email")}
            className={inputClass}
          />
        )}
      </Field>
      <Field name="phone" label="Cep telefonu" description="Example: (532) 123 45 67">
        {(a11y) => <input {...phone} {...a11y} autoComplete="tel-national" className={inputClass} />}
      </Field>
    </>
  );
}
```

```tsx
// components/payment-step.tsx
"use client";

import { useFormContext } from "react-hook-form";
import type { MaskInputProps } from "@/lib/mask-input";
import type { ApplicationInput } from "@/lib/application-schema";
import { Field } from "./field";

const inputClass = "rounded border border-gray-400 px-3 py-2 aria-invalid:border-red-700";

export function PaymentStep({ iban }: { iban: MaskInputProps }) {
  const { register } = useFormContext<ApplicationInput>();

  return (
    <>
      <Field name="iban" label="IBAN" description="Payments are sent to this account.">
        {(a11y) => <input {...iban} {...a11y} className={inputClass} />}
      </Field>
      <Field name="acceptTerms" label="I have read and accept the seller agreement.">
        {(a11y) => <input {...a11y} type="checkbox" {...register("acceptTerms")} className="size-5" />}
      </Field>
    </>
  );
}
```

Telefonun açıklaması, kullanıcıya beklenen biçimi placeholder yerine kalıcı bir metinle gösterir. `autoComplete` değerleri otomatik doldurmayı açar.

## Adım 7: Formu birleştirin

```tsx
// components/application-form.tsx
"use client";

import { useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useViraMask } from "@virastack/mask";
import { submitApplication } from "@/app/actions";
import {
  applicationSchema,
  stepOf,
  steps,
  type ApplicationField,
  type ApplicationInput,
} from "@/lib/application-schema";
import { toInputProps } from "@/lib/mask-input";
import { ContactStep } from "./contact-step";
import { PaymentStep } from "./payment-step";
import { StoreStep } from "./store-step";

const defaultValues: ApplicationInput = {
  storeName: "",
  taxNumber: "",
  category: "" as ApplicationInput["category"],
  products: [{ name: "", price: "" }],
  contactName: "",
  email: "",
  phone: "",
  iban: "",
  acceptTerms: false,
};

export function ApplicationForm() {
  const [step, setStep] = useState(0);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(applicationSchema),
    defaultValues,
    mode: "onTouched",
  });
  const masks = useViraMask({
    form,
    schema: {
      taxNumber: "taxNumber",
      phone: { preset: "phone", mask: "(999) 999 99 99" },
      iban: "iban",
    },
  });

  const isLastStep = step === steps.length - 1;

  async function goNext() {
    const valid = await form.trigger([...steps[step].fields], { shouldFocus: true });
    if (valid) setStep((s) => s + 1);
  }

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors("root.server");
    startTransition(async () => {
      const result = await submitApplication(values);
      if (result.status === "success") {
        startTransition(() => setApplicationId(result.applicationId));
        return;
      }
      const fields = Object.keys(result.fieldErrors) as ApplicationField[];
      for (const field of fields) {
        form.setError(field, { type: "server", message: result.fieldErrors[field] });
      }
      form.setError("root.server", { type: "server", message: result.message });
      if (fields.length > 0) {
        startTransition(() => setStep(Math.min(...fields.map(stepOf))));
      }
    });
  });

  if (applicationId) {
    return (
      <div role="status" className="rounded border border-green-700 p-4">
        <h2 className="text-xl font-semibold">Your application was received</h2>
        <p>Your application number: {applicationId}</p>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <ol className="mb-6 flex gap-4" aria-label="Steps">
        {steps.map((s, index) => (
          <li
            key={s.title}
            aria-current={index === step ? "step" : undefined}
            className={index === step ? "font-semibold underline" : "text-gray-600"}
          >
            {index + 1}. {s.title}
          </li>
        ))}
      </ol>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{steps[step].title}</h2>

        {step === 0 && <StoreStep taxNumber={toInputProps(masks.taxNumber)} />}
        {step === 1 && <ContactStep phone={toInputProps(masks.phone)} />}
        {step === 2 && <PaymentStep iban={toInputProps(masks.iban)} />}

        {form.formState.errors.root?.server && (
          <p role="alert" className="text-red-700">
            {form.formState.errors.root.server.message}
          </p>
        )}

        <div className="flex gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded border px-4 py-2">
              Geri
            </button>
          )}
          {isLastStep ? (
            <button type="submit" disabled={isPending} className="rounded bg-black px-4 py-2 text-white">
              {isPending ? "Submitting..." : "Submit the application"}
            </button>
          ) : (
            <button type="button" onClick={goNext} className="rounded bg-black px-4 py-2 text-white">
              İleri
            </button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
```

Adım adım:

- **`defaultValues`.** `category` boş başlar ama şemadaki enum `""`'yu kabul etmez. Cast, formun başlangıçta seçimsiz olmasına izin verir; gönderimde şema boş seçimi reddeder.
- **Maskeler.** `useViraMask` üç alanı forma kendisi kaydeder. Telefon maskesi `(999) 999 99 99` olarak değiştirildi.[^7]
- **`goNext`.** `trigger` yalnızca mevcut adımın alanlarını doğrular ve ilk hatalı alana odaklanır.[^9]
- **`onSubmit`.** `handleSubmit` tüm şemayı doğrular ve action'ı bir transition içinde çağırır; `isPending` buton metnini değiştirir. `await`'ten sonraki state güncellemeleri de `startTransition` ile sarılır.[^10]
- **Sunucu hatası.** Her alan hatası `setError` ile alana yazılır. Form, hatalı alanların en erken adımına döner; `root.server` genel mesajı gösterir.[^11]
- **Başarı.** Form yerine `role="status"` ile bir onay kutusu gösterilir; ekran okuyucu duyurur.

## Adım 8: Sayfa

```tsx
// app/page.tsx
import { Suspense } from "react";
import { ApplicationForm } from "@/components/application-form";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Seller application</h1>
      {/* useFieldArray satırlara crypto.randomUUID() ile id verir; form istek anında render edilmeli */}
      <Suspense fallback={<p>Loading form...</p>}>
        <ApplicationForm />
      </Suspense>
    </main>
  );
}
```

`useFieldArray` satır `id`'lerini `crypto.randomUUID()` ile üretir. Next.js 16'da `cacheComponents` açıkken rastgele değer üreten bir component build sırasında önceden render edilemez; `<Suspense>` formu istek anına bırakır.[^12]

```command
npm run dev
```

## Adım 9: Testler

Örnekteki `tests/application.spec.ts`, formu gerçek tarayıcıda dener: adım doğrulaması ve odak, maskeler, ürün ekleyip çıkarma, geri dönünce değerler, IBAN sağlaması, sunucu hatasında adıma dönme, başarılı başvuru ve her adımda axe ile erişilebilirlik taraması. Çalıştırmak için:[^13]

```command
npm install -D @playwright/test @axe-core/playwright
```

```command
npx playwright install chromium
```

Örnekteki `playwright.config.ts` dosyasını ve `tests/` klasörünü projenize kopyalayın, `package.json`'daki `scripts`'e `"test": "playwright test"` ekleyin. Yapılandırma testten önce production build alır ve sunucuyu kendisi başlatır.

```command
npm test
```

Testlerin nasıl yazıldığı Playwright rehberinde anlatılıyor.

## Kendin dene

- Vergi numarası için sağlama fonksiyonu yazın ve şemaya `refine` ile ekleyin. `1234567890` geçerli mi?
- Field'daki `min-h-5`'i silin ve testleri çalıştırın. Hangi testler neden düşüyor?
- Kategori yerine bir yıldız puanı bileşeni ekleyin ve `Controller` ile bağlayın.
- Başvuruyu adım adım `localStorage`'a kaydedin; sayfa yenilenince kaldığı yerden devam etsin. `subscribe` mi, `watch` mı?
- Ödeme adımına bir T.C. kimlik numarası alanı ekleyin: `tckn` maskesi ve [Maskeleme ve regex](/academy/forms/masking-and-regex) dersindeki sağlama fonksiyonu.

## Kaynaklar

1. [Next.js: Installation](https://nextjs.org/docs/app/getting-started/installation) *(doc)* — `create-next-app` ve varsayılan ayarlar.
2. [Zod: Basic usage](https://zod.dev/basics) *(doc)* — Şema, `safeParse` ve tip çıkarımı.
3. [React Hook Form: Resolvers](https://github.com/react-hook-form/resolvers) *(repo)* — `zodResolver` ile input ve output tipleri.
4. [Zod: Zod 4.6](https://zod.dev/blog/zod-4-6) *(doc)* — 9 Eylül 2026. `z.iban()` ve `.validate()`.
5. [Zod: Formatting errors](https://zod.dev/error-formatting) *(doc)* — `z.flattenError`.
6. [Next.js: How to create forms with Server Actions](https://nextjs.org/docs/app/guides/forms) *(doc)* — Server Action ile doğrulama ve yetki kontrolü.
7. [ViraStack: Mask](https://virastack.com/mask/) *(doc)* — `useViraMask`, hazır maskeler ve özel maske.
8. [React Hook Form: useFieldArray](https://react-hook-form.com/docs/usefieldarray) *(doc)* — `fields`, `append`, `remove` ve `field.id`.
9. [React Hook Form: trigger](https://react-hook-form.com/docs/useform/trigger) *(doc)* — Seçili alanları doğrulamak ve `shouldFocus`.
10. [React: useTransition](https://react.dev/reference/react/useTransition) *(doc)* — Async transition ve `await` sonrası güncellemeler.
11. [React Hook Form: setError](https://react-hook-form.com/docs/useform/seterror) *(doc)* — Sunucu hatasını alana ve `root`'a yazmak.
12. [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching#random-values-and-timestamps) *(doc)* — Rastgele değerler ve Suspense.
13. [Playwright: Installation](https://playwright.dev/docs/intro) *(doc)* — Kurulum ve tarayıcıları indirmek.
