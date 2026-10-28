---
title: "Schemas and validation with Zod"
description: "Schemas, type inference, error messages and transforms."
lastVerified: "2026-10-22"
translationKey: "forms/zod-schema-and-validation"
---

## Why a schema?

TypeScript types are erased after compilation. Data from a form, from the URL or from an API is a value whose shape you do not know at runtime. [!zod] validates that value against a **schema** and infers the TypeScript type from the same schema, so the rule and the type live in one place.[^1]

This lesson was written with Zod 4.6:[^2]

```command
npm install zod
```

## The first schema

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

In Zod 4, formats such as e-mail, URL and UUID are top-level functions: `z.email()`, `z.url()`, `z.uuid()`. The old `z.string().email()` form works but is deprecated.[^3][^4]

## parse and safeParse

```ts
signUpSchema.parse(input); // throws a ZodError when invalid

const result = signUpSchema.safeParse(input);
if (!result.success) {
  console.log(result.error.issues);
} else {
  result.data; // typed as SignUp, with the data cleaned up
}
```

Use `safeParse` in forms and Server Actions; an error there is an expected state, not an exception.[^1] When all you need is yes or no, the `.validate()` that arrived with Zod 4.6 returns a `boolean` without building an error object:[^5]

```ts
if (signUpSchema.validate(input)) {
  input.email; // the type is narrowed
}
```

## Customising the error messages

In Zod 4 the message is given with the `error` parameter, or as a plain string:[^6]

```ts
z.string().min(2, "The name must be at least 2 characters.");
z.string().min(2, { error: "The name must be at least 2 characters." });
z.number({ error: "Enter your age." }); // for the type error
```

Instead of Zod 3's `message`, `invalid_type_error` and `required_error`, there is now the single `error` parameter. You may still see those names in older examples on the web *(the example in Next.js's forms guide among them)*.[^7]

**The default messages.** Zod's built-in messages are English, and the library ships locale packs for other languages. You set one once at the application's entry point:[^6]

```ts
import { z } from "zod";

z.string().min(2).safeParse("a").error?.issues[0].message;
// "Too small: expected string to have >=2 characters"

// For an interface in another language, pick a locale pack:
// import { de } from "zod/locales";
// z.config(de());
```

These messages are generic and stay technical for an end user. Write your own message on the fields the user sees; the locale pack is a safety net for the places you forget.

## A rule across fields

When a rule looks at more than one field, add a `.refine` to the object. `path` chooses which field the error is written to:[^8]

```ts
const passwordSchema = z
  .object({
    password: z.string().min(8, "The password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "The passwords do not match.",
    path: ["confirmPassword"],
  });
```

> [!WARNING]
>
> If any field in the object has a **type** error *(an enum nobody chose, a `NaN` number)*, the object's `.refine` does not run at all. Zod only passes data of the right type to a refinement. "The passwords do not match." does not appear until the user has corrected the other field. Where it matters, use the `when` option to decide for yourself under which condition the refinement runs.[^8]

## Transforms: transform and pipe

`.transform` turns the validated value into another value. The schema's **input** and **output** types are now different:[^9]

```ts
const priceSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter the price as 1250.50.")
  .transform(Number);

type PriceInput = z.input<typeof priceSchema>; // string
type PriceOutput = z.output<typeof priceSchema>; // number
```

`.pipe` feeds one schema's output into a second schema. It is used to validate again after a transform:[^9]

```ts
const ibanSchema = z
  .string()
  .transform((digits) => `DE${digits}`)
  .pipe(z.iban("The IBAN is invalid; check the number."));
```

Separating the input and output types matters in forms: the form holds the **input** type and the submission receives the **output** type *(see [React Hook Form with Zod](/academy/forms/react-hook-form-with-zod))*.

## Empty field traps

A value from a form is usually text, and an empty field is `""`, not `undefined`. Three common mistakes:

| Schema | What you expect | What happens |
| :-- | :-- | :-- |
| `z.url().optional()` | A website that can be left empty | `""` is rejected; `optional` only accepts `undefined`.[^10] |
| `z.coerce.number()` | An empty field giving a "required" error | `Number("")` is `0`, so the empty field passes as `0`.[^11] |
| `z.string()` | A required field | `""` is a valid string; add `.min(1)`. |

```ts
// A website that can be left empty
website: z.union([z.url("Enter the website as https://example.com."), z.literal("")]),

// A required number: catch the empty string first
age: z.string().min(1, "Enter your age.").pipe(z.coerce.number<string>().int().min(18)),
```

The input type of `z.coerce.number()` is `unknown`, and that type reaches `useForm` too when you use the schema with a form. Give the input type as a generic when piping: `z.coerce.number<string>()`.[^11]

## Formatting the error

`result.error.issues` is the raw list. Zod 4 gives you three helpers:[^12]

```ts
const result = signUpSchema.safeParse(input);
if (!result.success) {
  z.flattenError(result.error);
  // { formErrors: [], fieldErrors: { email: ["Invalid email address"] } }

  z.treeifyError(result.error); // for nested objects and arrays
  z.prettifyError(result.error); // readable text for a log
}
```

For flat forms `z.flattenError` is enough, and you will use it to return field errors from the server. Zod 3's `error.flatten()` and `error.format()` are deprecated.[^12]

## The new formats

Zod 4.5 and 4.6 added two formats that come in useful in forms:[^5][^13]

```ts
z.creditCard(); // 12–19 digits with the Luhn check; "4111 1111 1111 1111" with spaces is valid
z.iban(); // the electronic format: no spaces, uppercase, with the mod-97 check
```

For a phone number, `z.e164()` *(`+493012345678`)* comes ready.[^3] How to use these formats on the raw value of a masked field is in the [Masking and regex](/academy/forms/masking-and-regex) lesson.

## Try it yourself

- Write `signUpSchema` and pass `{ name: " a", email: "x@", age: "20" }` to `safeParse`. How many errors appear? Why does `age` fail?
- Set a locale pack with `z.config(...)` and run the same experiment.
- Add `role: z.enum(["buyer", "seller"])` to the password schema, and pass `role: ""` with two different passwords. Does "The passwords do not match." appear?
- Pass `""` to `z.url().optional()`, then combine it with `z.literal("")`.
- Hover over the `z.input` and `z.output` types for `priceSchema` in your editor.

## Going deeper

- **Official docs:** "Basic usage"; schemas, parsing and type inference.[^1]
- **Official docs:** "Customizing errors"; the `error` parameter, the order of precedence, and the locale packs.[^6]
- **Official docs:** the "Migration guide"; the APIs that changed from Zod 3 to 4.[^7]

## Sources

1. [Zod: Basic usage](https://zod.dev/basics) *(doc)* — Defining a schema, `parse`, `safeParse` and `z.infer`.
2. [Zod: Intro](https://zod.dev/) *(doc)* — Installation and the requirements.
3. [Zod: Defining schemas](https://zod.dev/api) *(doc)* — The top-level string formats, `z.e164`, `z.creditCard` and `z.iban`.
4. [Zod: Release notes](https://zod.dev/v4) *(doc)* — What is new in Zod 4, and the top-level format functions.
5. [Zod: Zod 4.6](https://zod.dev/blog/zod-4-6) *(doc)* — September 9, 2026. `.validate()` and `z.iban()`.
6. [Zod: Customizing errors](https://zod.dev/error-customization) *(doc)* — The `error` parameter, and locale packs through `z.config`.
7. [Zod: Migration guide](https://zod.dev/v4/changelog) *(doc)* — What replaced `message`, `invalid_type_error`, `required_error` and `flatten`.
8. [Zod: Refinements](https://zod.dev/api#refinements) *(doc)* — `.refine`, `path`, `abort` and `when`.
9. [Zod: Transforms](https://zod.dev/api#transforms) *(doc)* — `.transform`, `.pipe`, `z.input` and `z.output`.
10. [Zod: Optionals](https://zod.dev/api#optionals) *(doc)* — `optional` only accepting `undefined`.
11. [Zod: Coercion](https://zod.dev/api#coercion) *(doc)* — `z.coerce`, and the input type being `unknown`.
12. [Zod: Formatting errors](https://zod.dev/error-formatting) *(doc)* — `z.flattenError`, `z.treeifyError` and `z.prettifyError`.
13. [Zod: Zod 4.5](https://zod.dev/blog/zod-4-5) *(doc)* — August 28, 2026. `z.creditCard()` and the other additions.
