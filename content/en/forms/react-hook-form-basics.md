---
title: "React Hook Form basics"
description: "register, handleSubmit, formState and the validation mode."
lastVerified: "2026-10-22"
translationKey: "forms/react-hook-form-basics"
---

## Setup and the first form

[!react-hook-form] *(RHF)* is at version 7.90 as this lesson is written. v8 is in beta; the places where it differs are noted.[^1]

```command
npm install react-hook-form
```

Let the contact form have three fields. `useForm` sets the form up, `register` attaches a field to it, and `handleSubmit` handles the submission:[^1][^2]

```tsx
import { useForm, type SubmitHandler } from "react-hook-form";

type ContactForm = { name: string; email: string; message: string };

export function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    defaultValues: { name: "", email: "", message: "" },
  });

  const onSubmit: SubmitHandler<ContactForm> = async (data) => {
    await sendMessage(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <label htmlFor="name">Name</label>
      <input id="name" {...register("name", { required: "A name is required." })} />
      {errors.name && <p>{errors.name.message}</p>}

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        {...register("email", {
          required: "An email address is required.",
          pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter the email address as name@example.com." },
        })}
      />
      {errors.email && <p>{errors.email.message}</p>}

      <label htmlFor="message">Message</label>
      <textarea
        id="message"
        {...register("message", { minLength: { value: 10, message: "At least 10 characters." } })}
      />
      {errors.message && <p>{errors.message.message}</p>}

      <button disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit"}</button>
    </form>
  );
}
```

In this lesson the rules are written into `register`. In a real project you will move them into a Zod schema *(see [React Hook Form with Zod](/academy/forms/react-hook-form-with-zod))*. Attaching the error messages to the field accessibly is in the [Showing errors and accessibility](/academy/forms/errors-and-accessibility) lesson.

## defaultValues

`defaultValues` is the form's first state. The documentation recommends providing one per field: a field that starts as `undefined` leads to a warning in controlled components, and `isDirty` *(has the form changed)* is worked out by comparing against this value.[^3]

When the first values come from the server there are two routes:[^3]

- **`defaultValues: async () => ...`**: the form is loaded once as it opens. While it loads, `formState.isLoading` is `true`.
- **The `values` prop**: the form is updated as the value changes. It suits data fetched with [!tanstack-query].

```tsx
const { data: profile } = useQuery(profileQueries.detail());

const form = useForm<ProfileForm>({
  defaultValues: { name: "", city: "" },
  values: profile, // the form updates when the data arrives and when it changes
});
```

## register

`register("name")` returns an object: `name`, `ref`, `onChange` and `onBlur`. You spread it onto the input. RHF reads the value from the DOM, so the input stays uncontrolled and the form component does not render as you type.[^4]

A field name can contain dots. `register("address.city")` gathers the value as `{ address: { city } }`, and `register("tags.0")` as an array.[^4]

**Built-in rules:** `required`, `min`, `max`, `minLength`, `maxLength`, `pattern` and a custom `validate`. Each one takes either a message directly or `{ value, message }`. `validate` is a function and returns `true` when the value is valid, or a message when it is not:[^4]

```tsx
<input
  {...register("username", {
    validate: async (value) => (await isUsernameFree(value)) || "This username is taken.",
  })}
/>
```

**Converting the value:** an input always gives you text. `valueAsNumber: true` turns the value into a number and `valueAsDate: true` into a date; an empty field becomes `NaN`. `setValueAs` passes the text through a function of your own. The conversion runs **before** validation and is not applied to `defaultValues`.[^4]

```tsx
<input type="number" {...register("age", { valueAsNumber: true })} />
```

## handleSubmit

`handleSubmit(onValid, onInvalid?)` validates the form first. With no errors `onValid(data)` runs; with errors they are written into `formState.errors` and the first invalid field is focused.[^5][^3]

Two details:[^5]

- If `onValid` returns a promise, `isSubmitting` stays `true` until that promise settles. Do not forget the `await`.
- `handleSubmit` does not swallow an error thrown inside `onValid`. Wrap the request in a `try/catch` and write the server error onto the form with `setError`.

```tsx
const onSubmit: SubmitHandler<ContactForm> = async (data) => {
  try {
    await sendMessage(data);
  } catch {
    setError("root.server", { message: "The message could not be sent. Try again." });
  }
};
```

Errors starting with `root` do not belong to a field; they are the form's general error and are cleared on the next submission.[^6]

## formState and the proxy rule

`formState` gives you the form's status:[^7]

| Field | Meaning |
| :-- | :-- |
| `errors` | The field errors |
| `isSubmitting` | `onValid` is running |
| `isSubmitSuccessful` | The last submission finished without an error |
| `isDirty`, `dirtyFields` | The fields that differ from `defaultValues` |
| `touchedFields` | The fields that have been left |
| `isValid` | There is no error in the form |

`formState` is a **Proxy**. RHF only subscribes to the fields you read during render, and only renders when those change. So read the fields you need during render, unconditionally:[^7]

```tsx
// ❌ While isDirty is false, isValid is never read and never subscribed to
return <button disabled={!formState.isDirty || !formState.isValid} />;

// ✅
const { isDirty, isValid } = formState;
return <button disabled={!isDirty || !isValid} />;
```

## The validation mode

`mode` chooses when validation first runs, and `reValidateMode` when it is repeated after a submission:[^3]

| `mode` | First validation |
| :-- | :-- |
| `onSubmit` *(the default)* | On submit |
| `onBlur` | When the field is left |
| `onChange` | On every change |
| `onTouched` | On the first leave, then on every change |
| `all` | On leaving and on every change |

If you are not sure, the documentation recommends `onTouched`: the error appears once the user leaves the field and then updates as they type, so nobody is told off while typing for the first time.[^3] The UX research behind that timing is in the [Showing errors and accessibility](/academy/forms/errors-and-accessibility) lesson.

## Resetting the form

To clear the form after a submission, do not call `reset` inside `onSubmit`. `handleSubmit` updates the submission state **after** `onSubmit` finishes; `reset` clears the values but fields such as `isSubmitSuccessful` stay stale. The documentation recommends watching `isSubmitSuccessful` in an effect:[^8]

```tsx
const { reset, formState: { isSubmitSuccessful } } = form;

useEffect(() => {
  if (isSubmitSuccessful) reset();
}, [isSubmitSuccessful, reset]);
```

## Reading a value

There are several ways to read a value, and each renders something different:[^9]

| API | What renders | What for |
| :-- | :-- | :-- |
| `watch` | The component that called `useForm` | Showing a value at form level. Simple, but it renders the whole form. |
| `useWatch` | Only the calling component | A value deep down: a live total, a conditional field. Usually the best one. |
| `subscribe` | Nothing | A side effect: autosaving, analytics. |
| `getValues` | Nothing | Reading the latest value inside an event. Do not use it during render. |

```tsx
function MessageCounter({ control }: { control: Control<ContactForm> }) {
  const message = useWatch({ control, name: "message" });
  return <span>{message.length} / 500</span>;
}
```

> [!WARNING]
>
> If you use the [React Compiler](https://react.dev/learn/react-compiler), `watch` and `getValues` can show a stale value during render: both return the same reference on every render and the compiler caches the result. Use `useWatch` for render and `subscribe` for side effects. v8 brings compiler support.[^9][^10]

## Getting ready for v8

v8 is still in beta. The most visible change that affects the code in this guide: `field.id` in `useFieldArray` becomes `field.key` in v8.[^10][^11] When the time to migrate comes, follow the official migration guide.

## Try it yourself

- Set the contact form up and change `mode` to `onSubmit`, `onBlur` and `onTouched` in turn. When do the error messages appear?
- Use `formState.isDirty` on the button; delete the `defaultValues` and try again.
- Write `MessageCounter` first with `watch` inside the form and then with `useWatch` in a separate component. Use "Highlight updates" in React DevTools to see which one renders less.
- Change `sendMessage` so that it always throws, and show the `root.server` error.

## Going deeper

- **Official docs:** "Get Started"; registering, validation, controlled components and the design philosophy.[^1]
- **Official docs:** "useForm"; all the options, `mode`, `values` and async `defaultValues`.[^3]
- **Official docs:** "FAQs"; a comparison of the ways to read a value, and the React Compiler.[^9]

## Sources

1. [React Hook Form: Get Started](https://react-hook-form.com/get-started) *(doc)* — Installation, `register`, the built-in rules and showing errors.
2. [React Hook Form: handleSubmit](https://react-hook-form.com/docs/useform/handlesubmit) *(doc)* — The submission flow and an async `onSubmit`.
3. [React Hook Form: useForm](https://react-hook-form.com/docs/useform) *(doc)* — `defaultValues`, `values`, `mode`, `reValidateMode`, `shouldFocusError` and the `onTouched` recommendation.
4. [React Hook Form: register](https://react-hook-form.com/docs/useform/register) *(doc)* — The returned object, the rules, `valueAsNumber`, `setValueAs` and nested field names.
5. [React Hook Form: handleSubmit](https://react-hook-form.com/docs/useform/handlesubmit#rules) *(doc)* — `isSubmitting` awaiting the promise, and errors not being swallowed.
6. [React Hook Form: setError](https://react-hook-form.com/docs/useform/seterror) *(doc)* — A form-level error with `root`.
7. [React Hook Form: formState](https://react-hook-form.com/docs/useform/formstate) *(doc)* — The status fields and the Proxy subscription rule.
8. [React Hook Form: reset](https://react-hook-form.com/docs/useform/reset) *(doc)* — Not resetting inside `onSubmit`, and the effect on `isSubmitSuccessful`.
9. [React Hook Form: FAQs](https://react-hook-form.com/faqs) *(doc)* — A comparison of `watch`, `useWatch`, `subscribe` and `getValues`, and the React Compiler warning.
10. [React Hook Form: Migrating from v7 to v8](https://react-hook-form.com/migrate-v7-to-v8) *(doc)* — React Compiler support and the APIs that change.
11. [React Hook Form: useFieldArray](https://react-hook-form.com/docs/usefieldarray) *(doc)* — `field.id`, and `field.key` in v8.
