---
title: "Forms with Server Actions"
description: "useActionState, Zod on the server and server errors."
lastVerified: "2026-10-22"
translationKey: "forms/forms-with-server-actions"
---

## What a Server Action is

A Server Action is an async function that runs on the server and can be called from the browser; given to a `<form action>`, it receives the `FormData` directly.[^1][^2] Its definition, the `"use server"` boundary and revalidating the cache are in the [Server Actions](/academy/nextjs/server-actions) lesson. This lesson focuses on the form itself: validation, showing errors and use alongside React Hook Form.

> [!CAUTION]
>
> A Server Action is a public endpoint: check the session, the authorisation and the input **inside the action**. The detail is in the [Server Actions](/academy/nextjs/server-actions) and [Authorisation and roles](/academy/auth-security/authorization-and-roles) lessons.[^1]

## A plain form and useActionState

The simplest route is React's own form support. The action takes the previous state and the `FormData`, and returns the new state:[^1][^3]

```ts
// app/newsletter/actions.ts
"use server";

import { z } from "zod";

const subscribeSchema = z.object({
  name: z.string().trim().min(2, "Your name must be at least 2 characters."),
  email: z.email("Enter the email address as name@example.com."),
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
  return { status: "success", message: `We've sent a confirmation email to ${parsed.data.email}.` };
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
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        defaultValue={state.values?.email}
        aria-invalid={Boolean(state.fieldErrors?.email)}
        aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
      />
      {state.fieldErrors?.email && <p id="email-error">{state.fieldErrors.email[0]}</p>}

      {/* the name field follows the same pattern */}

      <button disabled={isPending}>{isPending ? "Submitting..." : "Subscribe"}</button>
      <p aria-live="polite">{state.message}</p>
    </form>
  );
}
```

`useActionState` returns three things: the state the action last returned, the action to give the form, and the pending flag.[^3] When the submit button is in a separate component, you can also read the pending state with `useFormStatus` from `react-dom`.[^1]

This form's strength is **progressive enhancement**: it works before JavaScript loads, and with JavaScript turned off. The browser submits the form in the normal way and the server returns the page with the error messages.[^1][^3]

**Why is `values` returned?** React **resets** a form submitted through `action` once the operation finishes, which is the browser's natural behaviour too. On an error, what the user typed is cleared. Returning the submitted values from the action and giving them to `defaultValue` fills the fields back in. On a successful submission no `values` is returned, so the form is cleared.[^4] GOV.UK also asks you not to clear the fields while showing an error.[^5]

> [!NOTE]
>
> The validation example in Next.js's forms guide uses Zod 3's `invalid_type_error` and `error.flatten()` APIs. In Zod 4 those were replaced by the `error` parameter and `z.flattenError()` *(see [Schemas and validation with Zod](/academy/forms/zod-schema-and-validation))*.[^1][^6]

`Object.fromEntries(formData)` looks like a shortcut, but the object then also holds Next.js's `$ACTION_`-prefixed fields. Reading the fields by name, or applying the schema to the object directly, is cleaner.[^1]

## Together with React Hook Form

A plain form works without JavaScript, but has no instant validation, focus management or dynamic fields. There are two ways to combine the two.

### 1. Calling the action directly

A Server Action can be called like any async function. `handleSubmit` validates in the browser and, if it passes, hands the validated values to the action. This guide's project example uses this route:[^7]

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

An error written with `setError` looks like the field's normal error and is cleared when the field is corrected. `root.server` is a general error that belongs to no field, and is removed on the next submission.[^8]

### 2. With useActionState

If you want React to manage the state the action returns and the pending flag, call the function `useActionState` gives you from inside `handleSubmit`. The React Hook Form documentation recommends this pattern:[^7]

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
      <label htmlFor="username">Username</label>
      <input id="username" aria-invalid={Boolean(errors.username)} {...register("username")} />
      {errors.username && <p>{errors.username.message}</p>}
      <button disabled={isPending}>{isPending ? "Saving..." : "Save"}</button>
      {state.status === "success" && <p role="status">Profile saved.</p>}
    </form>
  );
}
```

Two details:

- **`startTransition` is required.** Because the function is not given to a `<form action>`, you have to call it inside a transition. Forget it and React raises "An async function with useActionState was called outside of a transition", and `isPending` is not updated.[^3]
- **The `useEffect` is legitimate here.** The React Hook Form documentation treats writing the state the action returned onto the form with `setError` as synchronising with an external source.[^7]

| | A plain form + `useActionState` | RHF + an action |
| :-- | :-- | :-- |
| Works without JavaScript | Yes | No |
| Instant validation and focus | By hand | Ready |
| Dynamic fields, masks | Hard | Easy |
| Where it fits | A newsletter, a search, a sign-in | Forms with many fields and many steps |

React Hook Form's `Form` component, still in beta, can also take a Server Action in its `action` prop and sets up the progressive enhancement itself.[^9]

## The server always validates again

Validation on the client is for the user; validation on the server is for security. The value that arrives at the action is `unknown`, and its type is guaranteed by the schema, not by TypeScript:[^5][^1]

```ts
export async function submitApplication(values: unknown): Promise<ApplicationResult> {
  const session = await auth();
  if (!session) return { status: "error", message: "Sign in.", fieldErrors: {} };

  const parsed = applicationSchema.safeParse(values);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    // ...return the field errors
  }
  // parsed.data is safe
}
```

> [!WARNING]
>
> `handleSubmit` gives you the schema's **output**. If the schema has a `.transform` *(turning text into a number, say)*, validating that output again on the server with the same schema fails: the schema expects text and a number arrives. Do not transform in the schema you share with the server; do the transform after validation, on the server. That is why the price in the project example is validated as text and converted to a number on the server.

## Which step is the error on?

In a multi-step form the server may return an error for a field on the first step *(for example "An application with this email already exists.")*. The user is on the last step and does not see it. Go back to the earliest step the error landed on:

```ts
const fields = Object.keys(result.fieldErrors) as ApplicationField[];
if (fields.length > 0) {
  setStep(Math.min(...fields.map(stepOf)));
}
```

`stepOf` finds which step a field is on from the `steps` list *(see [Dynamic fields and multi-step forms](/academy/forms/dynamic-and-multi-step-forms))*.

## Try it yourself

- Set the newsletter form up and submit it with a wrong e-mail address. Delete the `defaultValue` and try again; what happens to what you typed?
- Turn JavaScript off in the browser *(DevTools > Settings > Debugger > Disable JavaScript)* and submit the form.
- Delete the `startTransition` in `ProfileForm` and open the console.
- Add a check such as `const session = await auth()` to the action and call it with no session.
- Add a `.transform` to the schema that turns the price into a number, use the same schema in the action, and see the error.

## Going deeper

- **Official docs:** Next.js, "How to create forms with Server Actions"; validation, the pending state and optimistic updates.[^1]
- **Official docs:** React, "useActionState"; the state, the transition and progressive enhancement.[^3]
- **Official docs:** React Hook Form, "Server Actions / useActionState"; joining the two worlds without building a `useEffect` bridge.[^7]

## Sources

1. [Next.js: How to create forms with Server Actions](https://nextjs.org/docs/app/guides/forms) *(doc)* — `FormData`, Zod on the server, `useActionState`, `useFormStatus`, the `$ACTION_` fields, and an authorisation check in every action.
2. [React: Server Functions](https://react.dev/reference/rsc/server-functions) *(doc)* — `"use server"`, and calling server functions from the client.
3. [React: useActionState](https://react.dev/reference/react/useActionState) *(doc)* — The returned values, calling it inside a transition, and progressive enhancement.
4. [React: Issue #29034](https://github.com/react/react/issues/29034) *(repo)* — The automatic reset after a form action, and keeping the values with `defaultValue`.
5. [GOV.UK Design System: Validation](https://design-system.service.gov.uk/patterns/validation/) *(doc)* — Always validating on the server, and keeping the values after an error.
6. [Zod: Migration guide](https://zod.dev/v4/changelog) *(doc)* — The error APIs that changed from Zod 3 to 4.
7. [React Hook Form: Advanced Usage](https://react-hook-form.com/advanced-usage#ServerActionsuseActionState) *(doc)* — Calling an action from inside `handleSubmit`, and writing the server error with `setError`.
8. [React Hook Form: setError](https://react-hook-form.com/docs/useform/seterror) *(doc)* — Server errors, `root` errors and how they are cleared.
9. [React Hook Form: Form](https://react-hook-form.com/docs/useform/form) *(doc)* — Passing a function to the `action` prop *(7.84+)*.
