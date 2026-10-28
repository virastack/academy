---
title: "Controlled and uncontrolled forms"
description: "Who holds the value, FormData and the common mistakes."
lastVerified: "2026-10-22"
translationKey: "forms/controlled-and-uncontrolled-forms"
---

## Who holds the value?

Text typed into an `<input>` is stored somewhere. This lesson has two options:[^1][^2]

| | Uncontrolled | Controlled |
| :-- | :-- | :-- |
| Holds the value | The DOM *(the browser)* | React state |
| Initial value | `defaultValue` / `defaultChecked` | `value` / `checked` |
| Reading the value | With `FormData` on submit | From state at any moment |
| A render per keystroke | No | The component that owns the state renders |

[Josh W. Comeau](https://www.joshwcomeau.com/) sums the difference up like this: by default React does not interfere with a form field, so the field is **uncontrolled**. The moment you pass a `value`, React starts managing it and the field becomes **controlled**.[^2]

## Uncontrolled: leaving it to the DOM

The simplest form holds no state. The values are read with `FormData` at the moment of submission. Every field needs a `name`; `FormData` gathers the fields by name:[^3][^4]

```tsx
export function NewsletterForm() {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    subscribe(email);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" defaultValue="" />
      <button>Subscribe</button>
    </form>
  );
}
```

`FormData.get` always returns a `string`, a `File` or `null`. A field where you expect a number arrives as text too; converting and validating it is your job.[^4] That is why you will use a schema in every form that reaches the server *(see [Schemas and validation with Zod](/academy/forms/zod-schema-and-validation))*.

In [!react] 19 you can also pass a function to the `action` prop. The function receives the `FormData` directly and needs no `preventDefault`:[^3]

```tsx
<form action={(formData) => subscribe(String(formData.get("email") ?? ""))}>
```

A form submitted through `action` **resets** its uncontrolled fields once the operation succeeds. That is the browser's own behaviour too. What to do to keep what the user typed on an error is in the [Forms with Server Actions](/academy/forms/forms-with-server-actions) lesson.[^5]

## Controlled: binding it to state

The field's value comes from state; on every keystroke `onChange` updates the state and React draws the field with the new value:[^1]

```tsx
export function SearchBox() {
  const [query, setQuery] = useState("");

  return (
    <>
      <label htmlFor="search">Search</label>
      <input id="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      <p>{query.length} characters</p>
    </>
  );
}
```

Because the value is in your hands at every moment, changing the interface as the user types is easy: a character counter, a live filter, opening one field based on another. The price is that the component owning the state re-renders on **every keystroke**. In a small form nobody notices; in a form with dozens of fields and heavy components, typing starts to feel sticky.

## Common mistakes

The React documentation singles out three warnings about controlled fields:[^1]

- **A `value` with no `onChange`.** The field becomes read-only and the user cannot type. React warns in the console. If it really is read-only, pass `readOnly`; if not, add an `onChange` or move to `defaultValue`.
- **Starting with `value={undefined}`.** A field that is `undefined` at first counts as uncontrolled; when a value arrives later it becomes controlled and React warns about "changing an uncontrolled input to be controlled". Start text fields with `""`, and do not pass `null` either.
- **`value` on a checkbox.** For checkboxes and radios the state is controlled with `checked`; `value` is what gets submitted.

Josh W. Comeau points out the same rule for a select: the initial value has to match one of the options.[^2]

> [!WARNING]
>
> Do not use `value` and `defaultValue` together on the same field. A field is either controlled or uncontrolled, and should not change for its lifetime.[^1]

## The browser's validation

`required`, `type="email"`, `minLength` and `pattern` give you validation for free from the browser. But the messages differ between browsers, do not match the design and do not work well with screen readers. In his testing, [Adrian Roselli](https://adrianroselli.com/) shows that a field is announced as "invalid" the moment it takes focus, that the pattern is never explained, and that nothing is announced when the field is corrected. His advice is to write your own validation.[^6] The GOV.UK Design System also recommends turning the browser's validation off with `novalidate` and showing your own error messages.[^7]

```html
<form novalidate>
```

`novalidate` only turns off the browser's bubbles. `type="email"` still changes the mobile keyboard and `autocomplete` still fills fields in. How to show the error messages is in the [Showing errors and accessibility](/academy/forms/errors-and-accessibility) lesson.

## Why a form library?

You can write a two-field form by hand with either approach. In real forms these things pile up: an error state per field, "has the field been touched", is it submitting, has it changed from its initial value, focusing the first invalid field, writing a server error onto a field.

[!react-hook-form] builds on the uncontrolled approach: it attaches to fields with a `ref`, reads the value from the DOM and renders only the component that needs it.[^8] For controlled fields, such as a date picker whose own component wants `value`/`onChange`, it offers `Controller` *(see [Dynamic fields and multi-step forms](/academy/forms/dynamic-and-multi-step-forms))*.

## Which one when

| Situation | Recommendation |
| :-- | :-- |
| A form of one or two fields that is only submitted *(a search, a newsletter)* | Uncontrolled + `FormData` |
| A single field that changes the interface as you type *(a live filter, a counter)* | Controlled |
| A form with validation and many fields | [!react-hook-form] |
| A third-party component that wants `value`/`onChange` | `Controller` in React Hook Form |
| A form that has to work before JavaScript loads | Uncontrolled + `action` *(a Server Action)* |

## Try it yourself

- Write the newsletter form uncontrolled and look at the object `console.log(Object.fromEntries(formData))` gives you. Add an age field; what type is it?
- Start the search box with `useState<string>()` instead of `useState("")` and type something. What appears in the console?
- Pass a `value` and delete the `onChange`. Can you type in the field?
- Submit the form without `novalidate`, using `required` and `type="email"`. Then try it with a screen reader *(VoiceOver, NVDA)*.

## Going deeper

- **Official docs:** React, "`<input>`"; controlled fields, `defaultValue` and the common mistakes.[^1]
- **Article:** [Josh W. Comeau](https://www.joshwcomeau.com/), "Data Binding in React"; binding text, checkbox, radio and select.[^2]
- **Article:** [Adrian Roselli](https://adrianroselli.com/), "Avoid Default Field Validation"; the accessibility problems with the browser's validation.[^6]

## Sources

1. [React: `<input>`](https://react.dev/reference/react-dom/components/input) *(doc)* — Controlled and uncontrolled fields, `value` and `defaultValue`, and the warnings about a `value` with no `onChange` and about `undefined`.
2. [Josh W. Comeau](https://www.joshwcomeau.com/): [Data Binding in React](https://www.joshwcomeau.com/react/data-binding/) *(article)* — January 9, 2023, updated December 2025. Controlled fields, two-way binding and a select's initial value.
3. [React: `<form>`](https://react.dev/reference/react-dom/components/form) *(doc)* — Passing a function to the `action` prop, and `FormData`.
4. [MDN: FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData) *(doc)* — Reading form fields by name, and the return type of `get`.
5. [React: Issue #29034](https://github.com/react/react/issues/29034) *(repo)* — The automatic reset after a form action, how it matches the browser's behaviour, and the suggested workarounds.
6. [Adrian Roselli](https://adrianroselli.com/): [Avoid Default Field Validation](https://adrianroselli.com/2019/02/avoid-default-field-validation.html) *(article)* — February 2019, updated August 2023. The screen reader problems with the browser's validation.
7. [GOV.UK Design System: Validation](https://design-system.service.gov.uk/patterns/validation/) *(doc)* — `novalidate`, validating on the server, and where the error message goes.
8. [React Hook Form: Get Started](https://react-hook-form.com/get-started) *(doc)* — Registering uncontrolled fields, and the isolated-render design.
