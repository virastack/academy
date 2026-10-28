---
title: "Server Actions"
description: "Forms and mutations, useActionState, updating the cache and security."
lastVerified: "2026-10-21"
translationKey: "nextjs/server-actions"
---

## Server Functions and Server Actions

In the [Actions](/academy/react/actions) lesson of the React guide you ran an Action in the browser. A **Server Function** is an async function marked with `"use server"` that runs on the server. Attached to a form or to a transition, it is called a **Server Action**.[^1]

The client calls it with a network request. Next.js sets that request up for you: you write no API route, no `fetch` and no JSON parsing.[^1]

```ts
// app/actions.ts
"use server";

import { updateTag } from "next/cache";

export async function addReview(formData: FormData) {
  const text = String(formData.get("text"));
  await db.review.create({ data: { text } });
  updateTag("reviews");
}
```

```tsx
// app/products/[slug]/page.tsx
import { addReview } from "@/app/actions";

<form action={addReview}>
  <textarea name="text" aria-label="Your review" required />
  <button>Submit</button>
</form>;
```

When `"use server"` is at the top of a file, every export becomes a Server Function. Client Components cannot define a Server Function but can import and use one from such a file.[^1]

A form in a Server Component is submitted even before JavaScript has loaded *(progressive enhancement)*. In a Client Component the submit is queued until JavaScript loads.[^1]

## Showing the result: useActionState

To show an error or a success message, pass the Action to React's `useActionState`. The Action then takes the previous state as its first argument.[^1][^2]

```ts
// app/actions.ts
"use server";

export type SubscribeState = { message: string | null };

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const email = String(formData.get("email"));
  if (!email.includes("@")) return { message: "Enter a valid email address." };

  await db.subscriber.create({ data: { email } });
  return { message: "You're subscribed." };
}
```

```tsx
// components/subscribe-form.tsx
"use client";

import { useActionState } from "react";

import { subscribe } from "@/app/actions";

export function SubscribeForm() {
  const [state, formAction, isPending] = useActionState(subscribe, { message: null });

  return (
    <form action={formAction}>
      <input name="email" type="email" aria-label="Email" />
      <button disabled={isPending}>Subscribe</button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
```

The documentation recommends **returning a value** rather than `throw`ing for expected errors. A `throw` goes to the nearest error boundary, which is too harsh for a validation error.[^3] Field-level validation and [!zod] schemas are in the [Forms](/academy/forms) guide.

## What should be refreshed after a mutation

Next.js can return the Action and the updated page **in a single request**. Which one is refreshed depends on the function you call in the Action:[^4]

| Call | Result |
| :-- | :-- |
| `updateTag("reviews")` | The tagged cache is removed at once and the page arrives with fresh data in the same response |
| `revalidateTag("reviews", "max")` | Refreshed in the background; this response does not re-render the page |
| `revalidatePath("/products")` | One address's data becomes invalid and the page arrives in the same response |
| `refresh()` | Redraws the current page without touching the cache |
| `redirect("/orders")` | Redirects to another page; the code after it does not run |
| `cookies().set(...)` | The cookie changes and the page is re-rendered with the new value |

When the user has to see their own change immediately *(adding to the cart, writing a review)*, `updateTag` is the right choice. Always write the `redirect` **after** the revalidation calls.[^4]

## Security: every action is an open endpoint

`"use server"` turns a function into a POST endpoint. Even if you never show the form on your page, anyone can send the same request by hand.[^4] The rule from [Sebastian Markbåge](https://github.com/sebmarkbage)'s Next.js security article: treat Server Actions like a public API.[^5]

Next.js provides a few protections of its own: it compares `Origin` with `Host` to prevent CSRF, limits the request body to 1 MB by default, removes unused Actions from the bundle and encrypts the Action ids.[^4] But the application's own checks are your job:

> [!DO]
>
> - Check **identity and authorisation** inside every Action.
> - Treat `FormData` as untrusted input and validate it.
> - Take only the **id** and the change from the client; read things like ownership from the session and the database.
> - Return only the fields the interface will show.

```ts
"use server";

export async function deleteReview(reviewId: string) {
  const user = await getCurrentUser();
  const review = await db.review.findFirst({
    where: { id: reviewId, authorId: user.id },
  });
  if (!review) return { error: "No reviews found." };

  await db.review.delete({ where: { id: review.id } });
  updateTag("reviews");
  return { error: null };
}
```

Gathering the role checks in one place is in the [Authorisation and roles](/academy/auth-security/authorization-and-roles) lesson.

## When an action, and when something else

Next.js runs the Actions from one client **in sequence**; the second waits for the first to finish. Calling Actions in parallel with `Promise.all` does not help.[^4]

| What you need | Use |
| :-- | :-- |
| Submitting a form, changing data | A Server Action |
| Reading data for a page | A Server Component |
| An address an external service will call *(a webhook)*, an API for a mobile app | A [Route Handler](/academy/nextjs/route-handlers-and-proxy) |

> [!WARNING]
>
> A new deploy changes the Action ids. A user with an old page open may get a "Failed to find Server Action" error. Meet that error in the interface with a message suggesting a refresh.[^4]

## Try it yourself

- Attach `addReview` to a form in a Server Component. Turn JavaScript off in the browser and submit the form.
- Enter an address without an `@` in `SubscribeForm`; see the message arrive without the page reloading.
- Use `revalidateTag(..., "max")` instead of `updateTag` in the same Action. Does the review list update immediately?
- Find the Action request in the DevTools **Network** tab. Could you repeat that request with `curl`? Why is the ownership check in `deleteReview` essential?

## Going deeper

- **Official docs:** the "Server Actions and Mutations" guide; data and interface in one request, sequential execution, security and the deploy notes.[^4]
- **Article:** [Sebastian Markbåge](https://github.com/sebmarkbage), "How to Think About Security in Next.js"; the security model for Server Components and Actions.[^5]
- **Official docs:** the "Data Security" guide; the Data Access Layer, input validation, rate limiting and restricting the return value.[^6]
- **Video:** [Aurora Scharff](https://aurorascharff.no/), "Enhancing Forms with React Server Components"; improving the form experience step by step with Server Components and Actions.[^7]

## Sources

1. [Next.js: Mutating Data](https://nextjs.org/docs/app/getting-started/mutating-data) *(doc)* — Creating a Server Function, calling it from a form and an event handler, the pending state, `refresh`, `revalidatePath` and `redirect`.
2. [React: useActionState](https://react.dev/reference/react/useActionState) *(doc)* — An Action that takes the previous state, `isPending` and sequential execution.
3. [Next.js: Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) *(doc)* — Modelling expected errors as a return value.
4. [Next.js: Server Actions and Mutations](https://nextjs.org/docs/app/guides/server-actions) *(doc)* — Sequential execution, data and interface in one response, the built-in protections, choosing how to update the cache, and the deploy notes.
5. [Sebastian Markbåge](https://github.com/sebmarkbage): [How to Think About Security in Next.js](https://nextjs.org/blog/security-nextjs-server-components-actions) *(article)* — The Data Access Layer, and treating Server Actions like a public endpoint.
6. [Next.js: Data Security](https://nextjs.org/docs/app/guides/data-security) *(doc)* — Input validation, authorisation, restricting the return value, rate limiting and closure encryption.
7. [Aurora Scharff](https://aurorascharff.no/): [Enhancing Forms with React Server Components](https://gitnation.com/contents/enhancing-forms-with-react-server-components) *(video)* — React Day Berlin 2024. Forms enhanced progressively with Server Components and React 19.
