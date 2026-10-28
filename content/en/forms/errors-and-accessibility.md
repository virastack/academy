---
title: "Showing errors and accessibility"
description: "Attaching the error to the field, focus and timing."
lastVerified: "2026-10-22"
translationKey: "forms/errors-and-accessibility"
---

## Being visible is not enough

A user who sees red text understands the error. For somebody using a screen reader, that text is a paragraph sitting somewhere on the page unless it is attached to the field. WCAG asks for two things: the field in error has to be **identified** and the error described in text *(3.3.1)*; and when the way to correct it is known, it should be suggested *(3.3.3)*.[^1][^2]

An accessible error is made of four parts:[^3][^4]

| Part | How |
| :-- | :-- |
| The field's name | A visible label with `<label htmlFor>` |
| That it is in error | `aria-invalid="true"` |
| The error's text | A message attached to the field with `aria-describedby` |
| A visual cue | Not colour alone: text, a border, an icon |

## Attaching it to the field

The [!react-hook-form] documentation recommends using `aria-invalid` and the message together. A screen reader then reads the field as: "Name, edit text, invalid entry, A name is required."[^3]

```tsx
<label htmlFor="email">Email</label>
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

When the field also has a description *(an example format, a rule)*, `aria-describedby` takes more than one `id` and the screen reader reads both: `aria-describedby="phone-hint phone-error"`.[^4]

> [!TIP]
>
> The React Hook Form documentation also adds `role="alert"` to the messages. That makes a message read out **the moment it appears**. In a form with many fields, ten messages are read at once on submit. For field messages `aria-describedby` is enough; leave `role="alert"` for single messages such as the form's general error.[^3][^4]

## A Field component

Making this connection by hand on every field is asking for trouble. A `Field` component gathers the label, the description and the error in one place. It reads the error state with `useFormState`, so it only renders when that field's error changes:[^5][^6]

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
      {/* Space is reserved for the error so the buttons do not shift when a message arrives. */}
      <p id={errorId} className="min-h-5 text-sm text-red-700">
        {error?.message}
      </p>
    </div>
  );
}
```

```tsx
<Field name="email" label="Email">
  {(a11y) => <input {...a11y} type="email" autoComplete="email" {...register("email")} />}
</Field>
```

For `useFormContext`, the form has to be wrapped in a `FormProvider` *(see [Dynamic fields and multi-step forms](/academy/forms/dynamic-and-multi-step-forms))*. The dots in a field name become hyphens in the `id`, so the field `products.0.name` gets the `id` `products-0-name`.

**Why reserve the space?** When the error message is added below the field, everything below it moves down. As the user leaves the field and clicks a button, the `blur` shows the error, the button moves and the click misses. In this guide's project example, the Playwright tests got stuck for exactly that reason. Reserving a fixed height for the message solves it.

## When to validate

When should the error be shown? [Vitaly Friedman](https://www.smashingmagazine.com/author/vitaly-friedman/) sums up what the years have taught:[^7]

- **Do not validate early.** Saying "invalid" before the user has even typed is the worst of it.
- **Validate when the field is left** *(on blur)*. The most common and most balanced route.
- **Reward early, punish late.** The error should disappear as soon as it is corrected; while a correct field is being edited, the error should only arrive once the field is left.
- **Check empty fields on submit.** Leaving a field empty is usually an accidental click.

React Hook Form's `mode: "onTouched"` is close to that advice: the first check happens when the field is left and the rest on every change. The error disappears as you type.[^5]

The GOV.UK Design System is more cautious: it recommends validating not when the field is left but when the user presses "Continue" or "Submit". Its reasoning is that showing an error to somebody who has not finished typing causes more problems.[^8] Both positions are defensible. What they have in common: do not show an error **while** the user is typing.

## Focus and an error summary on submit

When a submission fails, the user has to find the error. React Hook Form focuses the first invalid field by default *(`shouldFocusError: true`)*. For that to work the field's `ref` has to reach the input; if you spread the object `register` returns onto the input, you are fine.[^5]

For long forms, the W3C and GOV.UK recommend one more step: an **error summary** at the top of the form. The summary lists the errors, each one links to its field, and focus moves to the summary:[^4][^9]

```tsx
import { useEffect, useRef } from "react";
import type { FieldErrors } from "react-hook-form";

type SummaryError = { name: string; message: string };

export function ErrorSummary({ errors, submitCount }: { errors: SummaryError[]; submitCount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const focusedSubmit = useRef(0);
  const hasErrors = errors.length > 0;

  // Focus moves to the summary once per submission; errors that appear while typing do not steal it.
  useEffect(() => {
    if (hasErrors && submitCount > focusedSubmit.current) {
      focusedSubmit.current = submitCount;
      ref.current?.focus();
    }
  }, [hasErrors, submitCount]);

  if (!hasErrors) return null;

  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby="error-summary-title">
      <h2 id="error-summary-title">There is a problem</h2>
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

`toSummary` is for flat forms; with nested fields you flatten the errors yourself. The links go to the field's `id`, which has to follow the same rule as the `id` in Field.

If you use a summary, turn off focusing the first field with `useForm({ shouldFocusError: false })` so that there are not two focus moves at once. GOV.UK also recommends putting "Error:" at the front of the page title, so that a screen reader announces it as soon as the page opens.[^9]

## A good error message

The GOV.UK Design System's writing rules are among the most cited sources on forms:[^10]

| Rule | Bad | Good |
| :-- | :-- | :-- |
| Say what happened and how to fix it | Invalid entry. | Enter the email address as name@example.com. |
| Give an instruction on an empty field | The name field cannot be empty. | Enter your name. |
| Be specific about the problem | Wrong phone. | Enter the phone number with its country code, such as +49 30 12345678. |
| Use the same words as the label | This field is required. | Enter the VAT number. |
| Do not blame or apologise | Please remember to enter a valid value! | Enter the year of birth as 4 digits. |

Write a separate message per rule: empty, too short, too long and the wrong format are different problems. When you show an error, do **not clear** the field; the user has to be able to correct what they typed.[^10]

## Labels and autofill

- **A placeholder is not a label.** It disappears as soon as you start typing, and its contrast is low. Give the example format in the description text.
- **State that a field is required in the label.** The `required` attribute does not tell every user that the field is required; say it in the visible label. When most of the form is required, marking the optional ones with "*(optional)*" makes less noise.[^11]
- **Provide `autocomplete`.** On name, e-mail, phone and address fields, values such as `autocomplete="name"`, `"email"` and `"tel"` give you both autofill and WCAG 1.3.5 *(identifying the input's purpose)*.[^12]

## Try it yourself

- Delete a field's `aria-describedby` and move to the field with VoiceOver or NVDA. Is the error read out?
- Delete the `min-h-5` in Field, leave a field empty and click the button right below it. Does the click work?
- Set `mode` to `onChange` and type an e-mail address. On which letter does the error appear?
- Add `ErrorSummary` to the form, click the links and check that focus goes to the field.
- Rewrite every error message in your form against the table above.

## Going deeper

- **Official docs:** W3C WAI, "User Notification"; the error summary, inline messages, the title and live regions.[^4]
- **Official docs:** GOV.UK Design System, "Error message" and "Error summary"; placement and writing rules.[^10][^9]
- **Article:** [Vitaly Friedman](https://www.smashingmagazine.com/author/vitaly-friedman/), "A Complete Guide To Live Validation UX"; the timing of validation.[^7]

## Sources

1. [W3C: Understanding SC 3.3.1 Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html) *(doc)* — Identifying the field in error and describing the error in text.
2. [W3C: Understanding SC 3.3.3 Error Suggestion](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html) *(doc)* — Offering a suggestion for the correction.
3. [React Hook Form: Advanced Usage](https://react-hook-form.com/advanced-usage#AccessibilityA11y) *(doc)* — Accessible validation with `aria-invalid` and the message.
4. [W3C: User Notification](https://www.w3.org/WAI/tutorials/forms/notifications/) *(doc)* — The error list, `aria-describedby`, focus, the page title and live regions.
5. [React Hook Form: useForm](https://react-hook-form.com/docs/useform) *(doc)* — `mode: "onTouched"` and `shouldFocusError`.
6. [React Hook Form: getFieldState](https://react-hook-form.com/docs/useform/getfieldstate) *(doc)* — Reading a field's state together with `useFormState`.
7. [Vitaly Friedman](https://www.smashingmagazine.com/author/vitaly-friedman/): [A Complete Guide To Live Validation UX](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/) *(article)* — September 21, 2022. Early and late validation, "reward early, punish late", and empty fields.
8. [GOV.UK Design System: Validation](https://design-system.service.gov.uk/patterns/validation/) *(doc)* — Validating on submit, and not validating while the user types.
9. [GOV.UK Design System: Error summary](https://design-system.service.gov.uk/components/error-summary/) *(doc)* — Where the summary goes, focus, links to the fields, and the "Error:" title prefix.
10. [GOV.UK Design System: Error message](https://design-system.service.gov.uk/components/error-message/) *(doc)* — Where the message goes and how to write it.
11. [Adrian Roselli](https://adrianroselli.com/): [Avoid Default Field Validation](https://adrianroselli.com/2019/02/avoid-default-field-validation.html) *(article)* — February 2019, updated August 2023. Stating that a field is required in the visible label, and passing states to assistive technology.
12. [W3C: Understanding SC 1.3.5 Identify Input Purpose](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html) *(doc)* — Identifying the input's purpose with `autocomplete`.
