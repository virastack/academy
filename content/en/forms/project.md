---
title: "Seller application form"
description: "A multi-step, masked form validated on the server."
lastVerified: "2026-10-22"
translationKey: "forms/project"
---

## Scenario

You are going to write a seller application form for a marketplace. The form:

- Has three steps: store, contact and payment. "Next" validates only that step's fields and focuses the first invalid one.
- Keeps the earlier steps' values when the user goes back.
- Asks for between 1 and 3 sample products on the store step; rows are added and removed.
- Formats the VAT number, phone and IBAN fields with a mask; only the digits go into the form.
- Checks the IBAN's checksum with Zod, and accepts the price as `249.90` or `249,90`.
- Ties the error messages to their field with `aria-describedby`; the layout does not shift when a message arrives.
- Submits the application to a Server Action. The server validates with the same schema, returns a field error for an email address that is already in use, and the form goes back to that field's step.

The goal is not design but the pieces from the lessons working together. Where each piece comes from:

| Part | File | Lesson |
| :-- | :-- | :-- |
| The schema, `z.input`/`z.output`, custom messages | `lib/application-schema.ts` | Schemas and validation with Zod |
| `zodResolver`, `mode: "onTouched"` | `components/application-form.tsx` | React Hook Form with Zod |
| `Field`, `aria-invalid`, `aria-describedby`, the reserved error space | `components/field.tsx` | Showing errors and accessibility |
| `useViraMask`, the raw value, the IBAN checksum | `application-form.tsx`, `application-schema.ts` | Masking and regex |
| `useFieldArray`, `FormProvider`, steps with `trigger` | `store-step.tsx`, `application-form.tsx` | Dynamic fields and multi-step forms |
| The Server Action, `setError`, going back to the error's step | `app/actions.ts`, `application-form.tsx` | Forms with Server Actions |

The working project is on GitHub: [examples/forms/project](https://github.com/virastack/academy/tree/main/examples/forms/project). The Playwright tests that exercise the flows in a browser are there too; compare against them when you get stuck.

## Step 1: Set up the project

Open a [!nextjs] project with the default settings and add the packages:[^1]

```command
npx create-next-app@latest seller-application --yes
```

```command
npm install react-hook-form zod @hookform/resolvers @virastack/mask
```

> [!WARNING]
>
> `@hookform/resolvers` 6.0.0 can raise an `ERESOLVE` error on npm 10. Use the npm 11 that ships with Node.js 24, or pnpm *(see [React Hook Form with Zod](/academy/forms/react-hook-form-with-zod))*.

Delete the sample SVGs under `public/`. Trim `app/layout.tsx` and `app/globals.css`:

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
    <html lang="en">
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

`LayoutProps` is a global type Next.js generates from the routes; no import is needed.[^1]

## Step 2: The schema

Every rule lives in a single schema. Both the form and the Server Action use this file:[^2][^3]

```ts
// lib/application-schema.ts
import { z } from "zod";

export const categories = [
  { value: "fashion", label: "Fashion" },
  { value: "electronics", label: "Electronics" },
  { value: "home", label: "Home and living" },
] as const;

export const parsePrice = (value: string) => Number(value.replace(",", "."));

const productSchema = z.object({
  name: z.string().trim().min(2, "The product name must be at least 2 characters."),
  // The price stays text; both "249,90" and "249.90" are valid.
  price: z
    .string()
    .trim()
    .min(1, "Enter a price.")
    .regex(/^\d+([.,]\d{1,2})?$/, "Enter the price as 249.90.")
    .refine((value) => parsePrice(value) > 0, "The price must be greater than zero."),
});

export const applicationSchema = z.object({
  storeName: z.string().trim().min(2, "The store name must be at least 2 characters."),
  taxNumber: z.string().regex(/^\d{9}$/, "A VAT number must be 9 digits after DE."),
  category: z.enum(["fashion", "electronics", "home"], { error: "Choose a category." }),
  products: z
    .array(productSchema)
    .min(1, "Add at least one product.")
    .max(3, "You can add at most 3 products."),
  contactName: z.string().trim().min(2, "The full name must be at least 2 characters."),
  email: z.email("Enter the email address as name@example.com."),
  phone: z.string().regex(/^\d{8,15}$/, "Enter the phone number with its country code."),
  // The mask stores digits only, so we prepend the country code and run the IBAN checksum.
  iban: z
    .string()
    .regex(/^\d{20}$/, "An IBAN must have 20 digits after DE.")
    .refine((value) => z.iban().validate(`DE${value}`), "The IBAN is invalid; check the number."),
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

Three decisions:

- **No transforms.** The price stays text in the schema. The value `handleSubmit` gives you can then be validated again on the server with the same schema. The conversion to a number happens on the server, after validation *(see [Forms with Server Actions](/academy/forms/forms-with-server-actions))*.
- **The IBAN checksum runs on the raw value.** The mask writes 20 digits without the `DE` into the form; the check prepends `DE` and calls `z.iban()`.[^4]
- **The steps sit next to the schema.** `steps` says which field belongs to which step. `as const satisfies` narrows the list and checks at compile time that the field names exist in the schema; `stepOf` finds a field's step.

## Step 3: The Server Action

Use a delayed function instead of a real database. The address `taken@example.com` is there to try out a field error coming from the server:

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

// A real app would write this to a database.
async function saveApplication(application: StoredApplication) {
  void application;
  await delay(400);
}

export async function submitApplication(values: unknown): Promise<ApplicationResult> {
  // Even when the client has validated, the server does not trust the input.
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

  // The price is validated as text and converted to a number afterwards, on the server.
  const products = parsed.data.products.map((product) => ({
    ...product,
    price: parsePrice(product.price),
  }));
  await saveApplication({ ...parsed.data, products });

  const applicationId = `APP-${parsed.data.taxNumber.slice(-4)}`;
  return { status: "success", applicationId };
}
```

The action takes the input as `unknown`; its type is guaranteed by the schema. `z.flattenError` gives a list of messages per field, and we return the first.[^5] In a real app the action should also check the session and the authorisation at the top.[^6]

## Step 4: Field and the mask helper

`Field` is the same component as in the [Showing errors and accessibility](/academy/forms/errors-and-accessibility) lesson:

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
      {/* Space is reserved for the error so the buttons do not shift when a message arrives. */}
      <p id={errorId} className="min-h-5 text-sm text-red-700">
        {error?.message}
      </p>
    </div>
  );
}
```

`@virastack/mask` 1.1.1 also returns a `rawValue` field in the mask object. Spreading the object straight onto an input makes React warn in development mode. A small helper pulls that field out:[^7]

```ts
// lib/mask-input.ts
import type { MaskField } from "@virastack/mask";

export type MaskInputProps = Omit<MaskField, "rawValue">;

/** `rawValue` is not an HTML attribute, so we pull it out before spreading onto the input. */
export function toInputProps({ rawValue, ...props }: MaskField): MaskInputProps {
  void rawValue;
  return props;
}
```

## Step 5: The store step

The store name, the masked VAT number, the category and the dynamic product list:[^8]

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
  // An array-level error goes to root while rows exist, and straight to the field when the array is empty.
  const listError = errors.products?.root?.message ?? errors.products?.message;

  return (
    <>
      <Field name="storeName" label="Store name">
        {(a11y) => <input {...a11y} {...register("storeName")} className={inputClass} />}
      </Field>

      <Field name="taxNumber" label="VAT number" description="Country code and number, such as DE123456789">
        {(a11y) => <input {...taxNumber} {...a11y} className={inputClass} />}
      </Field>

      <Field name="category" label="Category">
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
            <Field name={`products.${index}.price`} label={`Product ${index + 1} price (€)`}>
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
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ name: "", price: "" })}
          disabled={fields.length >= 3}
          className="self-start rounded border px-3 py-2 disabled:opacity-40"
        >
          Add product
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

- The rows are keyed by `field.id`, and `append` takes a complete row object.
- The last row cannot be removed and a fourth cannot be added. The `min(1)` and `max(3)` in the schema still protect the server.
- Every "Remove" button's `aria-label` carries the row number.
- The price field is not `type="number"`; it is a text field with `inputMode="decimal"` *(see [Masking and regex](/academy/forms/masking-and-regex))*.

## Step 6: The contact and payment steps

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
      <Field name="contactName" label="Full name">
        {(a11y) => (
          <input {...a11y} autoComplete="name" {...register("contactName")} className={inputClass} />
        )}
      </Field>
      <Field name="email" label="Email">
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
      <Field name="phone" label="Mobile phone" description="Example: +49 30 12345678">
        {(a11y) => <input {...phone} {...a11y} autoComplete="tel" className={inputClass} />}
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

The phone field's description shows the user the expected format in permanent text instead of a placeholder. The `autoComplete` values turn autofill on.

## Step 7: Put the form together

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
      taxNumber: { displayPrefix: "DE", mask: "999999999", allowedChars: /[0-9]/, inputMode: "numeric", type: "tel" },
      phone: { preset: "phone", displayPrefix: "+", mask: "99 99 99999999" },
      iban: { displayPrefix: "DE", mask: "99 9999 9999 9999 9999 99", allowedChars: /[0-9]/, inputMode: "numeric", type: "tel" },
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
              Back
            </button>
          )}
          {isLastStep ? (
            <button type="submit" disabled={isPending} className="rounded bg-black px-4 py-2 text-white">
              {isPending ? "Submitting..." : "Submit the application"}
            </button>
          ) : (
            <button type="button" onClick={goNext} className="rounded bg-black px-4 py-2 text-white">
              Next
            </button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
```

Step by step:

- **`defaultValues`.** `category` starts empty, but the enum in the schema does not accept `""`. The cast lets the form start with nothing selected; on submission the schema rejects the empty choice.
- **The masks.** `useViraMask` registers the three fields with the form itself. The phone mask is given as `displayPrefix: "+"` with `99 99 99999999` for the international format.[^7]
- **`goNext`.** `trigger` validates only the current step's fields and focuses the first invalid one.[^9]
- **`onSubmit`.** `handleSubmit` validates the whole schema and calls the action inside a transition; `isPending` changes the button's text. The state updates after the `await` are wrapped in `startTransition` too.[^10]
- **The server error.** Every field error is written to its field with `setError`. The form goes back to the earliest step the invalid fields are on, and `root.server` shows the general message.[^11]
- **Success.** A confirmation box with `role="status"` replaces the form, so a screen reader announces it.

## Step 8: The page

```tsx
// app/page.tsx
import { Suspense } from "react";
import { ApplicationForm } from "@/components/application-form";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Seller application</h1>
      {/* useFieldArray gives the rows an id with crypto.randomUUID(), so the form has to render at request time */}
      <Suspense fallback={<p>Loading form...</p>}>
        <ApplicationForm />
      </Suspense>
    </main>
  );
}
```

`useFieldArray` produces its row `id`s with `crypto.randomUUID()`. In Next.js 16, with `cacheComponents` on, a component that produces a random value cannot be prerendered at build time; `<Suspense>` leaves the form to request time.[^12]

```command
npm run dev
```

## Step 9: Tests

The example's `tests/application.spec.ts` exercises the form in a real browser: step validation and focus, the masks, adding and removing products, the values after going back, the IBAN checksum, returning to the step on a server error, a successful application, and an axe accessibility scan on every step. To run them:[^13]

```command
npm install -D @playwright/test @axe-core/playwright
```

```command
npx playwright install chromium
```

Copy the example's `playwright.config.ts` and its `tests/` folder into your project, and add `"test": "playwright test"` to `scripts` in `package.json`. The configuration takes a production build before the tests and starts the server itself.

```command
npm test
```

How the tests are written is covered in the Playwright guide.

## Try it yourself

- Write a per-country length check for the VAT number and add it to the schema with `refine`. Is `DE12345678` valid?
- Delete the `min-h-5` in Field and run the tests. Which tests fail, and why?
- Add a star rating component in place of the category and bind it with `Controller`.
- Save the application to `localStorage` step by step, so a page reload continues where it left off. `subscribe` or `watch`?
- Add a card number field to the payment step: the `card` mask and the Luhn check from the [Masking and regex](/academy/forms/masking-and-regex) lesson.

## Sources

1. [Next.js: Installation](https://nextjs.org/docs/app/getting-started/installation) *(doc)* — `create-next-app` and the default settings.
2. [Zod: Basic usage](https://zod.dev/basics) *(doc)* — Schemas, `safeParse` and type inference.
3. [React Hook Form: Resolvers](https://github.com/react-hook-form/resolvers) *(repo)* — Input and output types with `zodResolver`.
4. [Zod: Zod 4.6](https://zod.dev/blog/zod-4-6) *(doc)* — September 9, 2026. `z.iban()` and `.validate()`.
5. [Zod: Formatting errors](https://zod.dev/error-formatting) *(doc)* — `z.flattenError`.
6. [Next.js: How to create forms with Server Actions](https://nextjs.org/docs/app/guides/forms) *(doc)* — Validation and authorisation checks in a Server Action.
7. [ViraStack: Mask](https://virastack.com/mask/) *(doc)* — `useViraMask`, the ready-made masks and a custom mask.
8. [React Hook Form: useFieldArray](https://react-hook-form.com/docs/usefieldarray) *(doc)* — `fields`, `append`, `remove` and `field.id`.
9. [React Hook Form: trigger](https://react-hook-form.com/docs/useform/trigger) *(doc)* — Validating selected fields, and `shouldFocus`.
10. [React: useTransition](https://react.dev/reference/react/useTransition) *(doc)* — Async transitions and updates after an `await`.
11. [React Hook Form: setError](https://react-hook-form.com/docs/useform/seterror) *(doc)* — Writing a server error to a field and to `root`.
12. [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching#random-values-and-timestamps) *(doc)* — Random values and Suspense.
13. [Playwright: Installation](https://playwright.dev/docs/intro) *(doc)* — Installing it and downloading the browsers.
