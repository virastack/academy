---
title: "Masking and regex"
description: "The displayed value, the raw value and @virastack/mask."
lastVerified: "2026-10-22"
translationKey: "forms/masking-and-regex"
---

## The displayed value and the raw value

A user who types `493012345678` into a phone field wants to see `+49 30 12345678` on screen; it is easier to read and to check. The server, meanwhile, expects `493012345678` with no spaces. A **mask** separates those two values:

| | Displayed value | Raw value |
| :-- | :-- | :-- |
| Phone | `+49 30 12345678` | `493012345678` |
| IBAN | `DE89 3704 0044 0532 0130 00` | `89370400440532013000` |
| Card | `4111 1111 1111 1111` | `4111111111111111` |

A good mask does three things: it never lets a disallowed character be typed, it adds the separators itself, and it keeps the cursor in the right place. Ignoring the separators rather than making the user type them is GOV.UK's advice too: characters such as spaces and hyphens should not be a cause of errors.[^1]

The rule: **validation and storage use the raw value.** The displayed value is only for the screen.

## Validating the format with a regex

You check the raw value's format with a regular expression. Forms need only a few pieces of it:[^2]

| Piece | Meaning | Example |
| :-- | :-- | :-- |
| `^` and `$` | The start and end of the text | `^\d{9}$`: exactly 9 digits, no more |
| `\d` | One digit | `\d{3}`: three digits |
| `[...]` | A character set | `[.,]`: a dot or a comma |
| `{n}`, `{n,m}` | How many times | `\d{1,2}`: one or two digits |
| `?` | Optional | `([.,]\d{1,2})?`: the decimal part may be there |

```ts
const vatNumber = /^\d{9}$/; // 9 digits after the DE country code
const mobilePhone = /^\d{8,15}$/; // 8 to 15 digits, country code included
const price = /^\d+([.,]\d{1,2})?$/; // 249 or 249.90
```

Forgetting `^` and `$` is the most common mistake: `/\d{9}/` accepts any text with nine digits in it, including `abc12345678901234`.

> [!DONT]
>
> - Restricting a name field with `/^[a-zA-Z]+$/`. "Zoë", "Mary Jane" and "O'Brien" are all rejected. Put no rule other than a length on a name field.
> - Validating an e-mail address with a regex of your own. Zod's `z.email()`, and a confirmation e-mail sent from the server, are more reliable.

## inputMode instead of type="number"

Not every field that looks like a number is one. A phone number, a card number, an IBAN and a VAT number are **strings of digits**: a leading zero matters, they are not added up and they are not incremented. That is why the GOV.UK team dropped `type="number"`: screen readers and voice control software do not recognise the field, the mouse wheel changes the value silently, long numbers can be rounded, and Chrome removes letters without saying so.[^3]

Their recommendation is a text field with a numeric keyboard:[^3]

```html
<input type="text" inputmode="numeric" autocomplete="tel" />
```

For a price with decimals, `inputMode="decimal"` opens the keyboard that has a comma or a dot. That is why the price field in this guide's project example is text, and why both `249.90` and `249,90` are accepted.

## @virastack/mask

[!virastack] Mask is a small masking library that works with [!react-hook-form]. It registers the field with RHF itself; it writes the **raw value** into the form and shows the displayed value in the input.[^4]

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
    defaultValues: { card: "", iban: "", phone: "", vatNumber: "" },
    mode: "onTouched",
  });

  const masks = useViraMask({
    form,
    schema: {
      card: "card",
      iban: { displayPrefix: "DE", mask: "99 9999 9999 9999 9999 99", allowedChars: /[0-9]/ },
      phone: { preset: "phone", displayPrefix: "+", mask: "99 99 99999999" },
      vatNumber: { displayPrefix: "DE", mask: "999999999", allowedChars: /[0-9]/ },
    },
  });

  return (
    <form onSubmit={form.handleSubmit(savePayment)} noValidate>
      <label htmlFor="phone">Mobile phone</label>
      <input id="phone" {...masks.phone} autoComplete="tel" />
      {/* the same pattern for card, iban and vatNumber */}
    </form>
  );
}
```

You give `useViraMask` the form and which mask each field uses. For every field it returns an object holding the `ref`, the `name`, the `value` and the event handlers, which you spread onto the input. Do not `register` the field separately as well.[^4]

**The ready-made masks:** `card`, `expiry`, `cvv`, `tckn`, `phone`, `iban`, `taxNumber`, `date`, `zipCode`, `currency`, `numeric`, `alpha` and others. Each one brings the right `inputMode` and the characters it allows. To change a ready-made mask, pass an object: the default phone mask is `(999) 999-9999`, and above it was turned into an international layout. A `9` stands for one digit, and `displayPrefix` is shown on screen without going into the value.[^4]

When the form is submitted, the values that arrive are raw:

```ts
{ card: "4111111111111111", iban: "89370400440532013000", phone: "493012345678", vatNumber: "123456789" }
```

The `iban` and `taxNumber` presets that come with the package carry Turkish layouts and checks, so the example above passes its own mask for those two fields.[^4]

> [!WARNING]
>
> In version 1.1.1 the mask object also holds a `rawValue` field. Spread the object straight onto an input and React warns in development: "React does not recognize the `rawValue` prop on a DOM element". To avoid the warning, pull the field out: `const { rawValue, ...phoneProps } = masks.phone;`.

## The validation lives in Zod

`@virastack/mask` has validators of its own too *(Luhn, IBAN, and the Turkish ID and tax number)*. They attach to the field through `register`'s `validate` rule. As you saw in the [React Hook Form with Zod](/academy/forms/react-hook-form-with-zod) lesson, `register` rules **do not run** when there is a resolver. Write every rule into the schema, against the raw value:[^5]

```ts
// payment-schema.ts
import { z } from "zod";

/** The number of digits an EU VAT number has after its country code. */
const vatLengths: Record<string, number> = { DE: 9, FR: 11, NL: 12, IT: 11 };

export function isValidVatNumber(country: string, digits: string) {
  const length = vatLengths[country];
  return length !== undefined && digits.length === length;
}

export const paymentSchema = z.object({
  card: z.creditCard("The card number is invalid; check the number."),
  iban: z
    .string()
    .regex(/^\d{20}$/, "An IBAN must have 20 digits after DE.")
    .refine((digits) => z.iban().validate(`DE${digits}`), "The IBAN is invalid; check the number."),
  phone: z.string().regex(/^\d{8,15}$/, "Enter the phone number with its country code."),
  vatNumber: z
    .string()
    .refine((digits) => isValidVatNumber("DE", digits), "A VAT number must be 9 digits after DE."),
});

export type PaymentValues = z.infer<typeof paymentSchema>;
```

- **The card:** `z.creditCard()` arrived with Zod 4.5; it checks for 12 to 19 digits and runs the Luhn check.[^6]
- **The IBAN:** `z.iban()` arrived with Zod 4.6; it expects the electronic format, with the country code, no spaces and uppercase. The raw value gets `DE` prepended and is checked with `.validate()`.[^7]
- **The VAT number:** Zod has no ready-made format for it, and the arithmetic check differs per country, so the schema checks the length for the country and leaves the real confirmation to the tax authority's own service. Input such as `abc` cannot get through the mask, but not every request that reaches the server goes through a mask; the schema checks it anyway.

When you do not keep more than one rule for the same field, RHF shows the first message: with an 8-digit VAT number the user sees "must be 9 digits", not a checksum error.

> [!NOTE]
>
> Functions the package exports, such as `validateIBAN`, can be used in the browser. Because the package is marked `"use client"`, you cannot call them in a Server Action or in a schema that runs on the server. In a schema shared with the server, use a function of your own or one of Zod's formats.

## Try it yourself

- Set the phone mask up and show the value written into the form with `form.watch("phone")`. Is it the same as the displayed value?
- Paste letters and spaces into the IBAN field. What happens?
- Delete the VAT `refine` from the schema and add it back with `register("vatNumber", { validate: ... })`. Does it run while there is a resolver?
- Write a length table for another country and bind it to the `vatNumber` mask.
- Make a price field `type="number"`; run the mouse wheel over it and try typing `e`.

## Going deeper

- **Official docs:** [ViraStack Mask](https://virastack.com/mask/); the ready-made masks, the options and the examples.[^4]
- **Article:** GOV.UK, "Why the GOV.UK Design System team changed the input type for numbers"; the problems with `type="number"`.[^3]
- **Official docs:** MDN, "Regular expressions"; the regex syntax.[^2]

## Sources

1. [GOV.UK Design System: Validation](https://design-system.service.gov.uk/patterns/validation/) *(doc)* — Not treating characters such as spaces and hyphens as errors.
2. [MDN: Regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions) *(doc)* — Anchors, character sets and repetition counts.
3. [GOV.UK Technology: Why the GOV.UK Design System team changed the input type for numbers](https://technology.blog.gov.uk/2020/02/24/why-the-gov-uk-design-system-team-changed-the-input-type-for-numbers/) *(article)* — February 24, 2020. The accessibility and data problems with `type="number"`, and `inputmode="numeric"`.
4. [ViraStack: Mask](https://virastack.com/mask/) *(doc)* — `useViraMask`, the ready-made masks, the raw value and a custom mask.
5. [React Hook Form: useForm](https://react-hook-form.com/docs/useform#resolver) *(doc)* — The built-in rules not running while there is a resolver.
6. [Zod: Zod 4.5](https://zod.dev/blog/zod-4-5) *(doc)* — August 28, 2026. `z.creditCard()`.
7. [Zod: Zod 4.6](https://zod.dev/blog/zod-4-6) *(doc)* — September 9, 2026. `z.iban()` and `.validate()`.
