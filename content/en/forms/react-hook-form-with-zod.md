---
title: "React Hook Form with Zod"
description: "The resolver, input and output types, and rules across fields."
lastVerified: "2026-10-22"
translationKey: "forms/react-hook-form-with-zod"
---

## Why together?

In the [React Hook Form basics](/academy/forms/react-hook-form-basics) lesson you wrote the rules into `register`. That approach has two problems: the rules get scattered through the JSX, and you have to write the same rules again on the server. The answer is to move the rules into a [!zod] schema and validate the form with it. A **resolver** makes the connection.[^1][^2]

## Setup

```command
npm install react-hook-form zod @hookform/resolvers
```

> [!WARNING]
>
> `@hookform/resolvers` 6.0.0 *(October 19, 2026)* can fail on npm 10 with `ERESOLVE unable to resolve dependency tree`. The package lists every validation library it supports as an optional peer, and npm 10 cannot resolve a version clash between them. The npm 11 that ships with Node.js 24, and pnpm, install it without trouble. If you have to stay on npm 10, `--legacy-peer-deps` is a temporary way around it.[^3]

## zodResolver

The schema lives in one file and the form in another:[^2]

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
      <label htmlFor="name">Name</label>
      <input id="name" autoComplete="name" {...register("name")} />
      {errors.name && <p>{errors.name.message}</p>}

      <label htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="email" {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        autoComplete="new-password"
        {...register("password", { deps: "confirmPassword" })}
      />
      {errors.password && <p>{errors.password.message}</p>}

      <label htmlFor="confirmPassword">Confirm password</label>
      <input
        id="confirmPassword"
        type="password"
        autoComplete="new-password"
        {...register("confirmPassword")}
      />
      {errors.confirmPassword && <p>{errors.confirmPassword.message}</p>}

      <button>Create account</button>
    </form>
  );
}
```

You gave `useForm` no generic; the field names and the type of `errors` come from `zodResolver(signUpSchema)`. A typo such as `register("emial")` is caught at compile time.[^3]

Three rules when working with a resolver:[^1]

- **The built-in rules do not run.** With a resolver, `register("name", { required: true })` is ignored. Every rule has to be in the schema.
- **A form-level `validate` does not run.** The `useForm({ validate })` that arrived in RHF 7.72 and a resolver are mutually exclusive; given both, only the resolver runs.
- **The error message comes from the schema.** Write the messages in the schema; the JSX only shows `errors.x.message`.

## A rule across fields, and deps

When the password and its confirmation match, there is no error. If the user then changes the password, "The passwords do not match." should appear. It does not: RHF only updates the error of the field that changed, and while the refinement writes to `confirmPassword`, the field that changed is `password`.

`deps` makes that connection. When `password` is validated, the fields in the list are validated again:[^4]

```tsx
<input type="password" {...register("password", { deps: "confirmPassword" })} />
```

That is why `deps` is in the form above. When you validate by hand with `trigger()`, `deps` is not applied.[^4]

> [!NOTE]
>
> In Zod, an object's `.refine` does not run while any field of the object has a type error. An unchosen `z.enum` field can hold the password check up *(see [Schemas and validation with Zod](/academy/forms/zod-schema-and-validation))*.

## Input and output types

When the schema has a `.transform`, its input and output types come apart. The form holds the **input** type *(the text in the input)* and `handleSubmit` gives you the **output** type *(the transformed value)*:[^3][^5]

```tsx
const productSchema = z.object({
  title: z.string().trim().min(1, "Enter the product name."),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter the price as 1250.50.")
    .transform(Number),
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

`useForm`'s three generics are, in order, the form values, the context and the submitted values. Either give no generic at all and let the type come from the resolver, or give all three. A single generic, `useForm<ProductOutput>`, pins the two types to the same thing and clashes with `zodResolver`. The resolver documentation gives the same warning about `.default()`: a field with a default value is optional in the input and required in the output.[^3]

## Sharing the schema with the server

The real benefit of keeping the schema in a separate file is on the server. Validation in the browser is for the user's experience and can be bypassed. The server validates the input again with the same schema:[^6][^7]

```ts
// app/sign-up/actions.ts
"use server";

import { signUpSchema } from "@/features/auth/sign-up-schema";

export async function createAccount(values: unknown) {
  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error" as const };
  }
  // parsed.data is safe
}
```

> [!CAUTION]
>
> Take care when the schema has a `.transform`: `handleSubmit` gives you the **transformed** value. Validate that again on the server with the same schema and the schema expects text while a number arrives, so the validation fails. There are two routes: do not transform in the schema that goes to the server and do the transform on the server, or send the raw `FormData` to the server. The details are in the [Forms with Server Actions](/academy/forms/forms-with-server-actions) lesson.

## Try it yourself

- Set the sign-up form up. Make the passwords match, then change the password. Delete the `deps` and try again.
- Add `register("name", { required: "Required" })` and delete the `min(2)` from the schema. What happens when you submit it empty?
- Delete the generics in `ProductForm`. What type does `product.price` become? Then write only `useForm<ProductOutput>` and read the error.
- Call `createAccount({ email: "x" })` from a test button without using the form. What does the server return?

## Going deeper

- **Official docs:** React Hook Form, "Schema Validation"; schema validation through a resolver.[^2]
- **Repo:** the `@hookform/resolvers` README; the Zod example and the input/output types.[^3]
- **Official docs:** React Hook Form, "useForm: resolver"; the resolver rules.[^1]

## Sources

1. [React Hook Form: useForm](https://react-hook-form.com/docs/useform#resolver) *(doc)* — The resolver, it not working alongside the built-in rules, and being mutually exclusive with a form-level `validate`.
2. [React Hook Form: Get Started](https://react-hook-form.com/get-started#SchemaValidation) *(doc)* — Schema validation and setting the resolver up.
3. [React Hook Form: Resolvers](https://github.com/react-hook-form/resolvers) *(repo)* — `zodResolver`, the supported libraries, `.default()`, and the warning about the three generics.
4. [React Hook Form: register](https://react-hook-form.com/docs/useform/register) *(doc)* — The `deps` option and how it relates to `trigger`.
5. [Zod: Transforms](https://zod.dev/api#transforms) *(doc)* — `.transform`, `z.input` and `z.output`.
6. [GOV.UK Design System: Validation](https://design-system.service.gov.uk/patterns/validation/) *(doc)* — Always validating on the server, and browser validation being bypassable.
7. [Next.js: How to create forms with Server Actions](https://nextjs.org/docs/app/guides/forms) *(doc)* — Validating with a schema in a Server Action.
