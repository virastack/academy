---
title: "Actions and async updates"
description: "Form actions, useActionState, useFormStatus and useOptimistic."
lastVerified: "2026-10-21"
translationKey: "react/actions"
---

## What an Action is

To send a request to the server when a button is pressed and then show the result, people used to write three pieces of state: `isPending`, `error` and `data`. React 19 gathers this into the idea of an **Action**: a function, which may be async, that runs inside `startTransition`.[^1][^2]

```tsx
import { useTransition } from "react";

function AddToCartButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await addToCart(productId);
        });
      }}
    >
      {isPending ? "Adding..." : "Add to cart"}
    </button>
  );
}
```

React keeps `isPending` `true` until the Action finishes, does not lock the interface, and passes an error thrown inside the Action to the nearest Error Boundary.[^1]

> [!WARNING]
>
> State updates made **after** an `await` do not count as part of the transition. Wrap those in `startTransition` again. This is a JavaScript limitation; it will go away with `AsyncContext` in future.[^1]

The performance side of `useTransition` *(filtering a slow list without blocking)* is in the [Render performance in React](/academy/performance-accessibility/render-performance) lesson.

## Form actions

When you give a function to a `<form>`'s `action` prop, React calls it with the `FormData` once the form is submitted. How it differs from `onSubmit`: it runs inside a transition, needs no `preventDefault`, and resets uncontrolled fields when it succeeds.[^3]

```tsx
<form action={async (formData) => {
  await subscribe(String(formData.get("email")));
}}>
  <input name="email" type="email" required />
  <SubmitButton />
</form>
```

You do not have to pass a prop for the button to know the form has been submitted. `useFormStatus` reads the status of the **form above it**:[^4]

```tsx
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Submitting..." : "Subscribe"}</button>;
}
```

`useFormStatus` sees the parent form, not a `<form>` in the same component, which is why the button has to be a separate component.[^4]

## useActionState: the Action's result

When the Action has a result *(an error message, a discount that was applied)*, use `useActionState`. It works like an async reducer that takes the previous state and the submitted data and returns new state.[^5]

```tsx
import { useActionState } from "react";

type CouponState = { error: string | null; discount: number };

async function applyCoupon(_prev: CouponState, formData: FormData): Promise<CouponState> {
  const result = await checkCoupon(String(formData.get("code")));
  if (!result.ok) return { error: "Invalid coupon.", discount: 0 };
  return { error: null, discount: result.discount };
}

export function CouponForm() {
  const [state, formAction, isPending] = useActionState(applyCoupon, {
    error: null,
    discount: 0,
  });

  return (
    <form action={formAction}>
      <input name="code" aria-label="Coupon code" />
      <button disabled={isPending}>Apply</button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.discount > 0 && <p>{state.discount}% discount applied.</p>}
    </form>
  );
}
```

If the same Action is triggered more than once, React runs the calls **in sequence**; each one receives the result of the one before it.[^5]

## useOptimistic: showing it before the answer arrives

When the user presses the favourite button, you want to fill the heart in without waiting for the server. `useOptimistic` shows a temporary value while the Action runs. When the Action finishes, the value falls back to the real source on its own; if the request failed, the optimistic value disappears.[^6]

```tsx
import { useOptimistic, useTransition } from "react";

function FavoriteButton({ isFavorite, action }: FavoriteButtonProps) {
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(isFavorite);
  const [, startTransition] = useTransition();

  return (
    <button
      aria-pressed={optimisticFavorite}
      onClick={() => {
        startTransition(async () => {
          setOptimisticFavorite(!optimisticFavorite);
          await action(!optimisticFavorite);
        });
      }}
    >
      {optimisticFavorite ? "In favorites" : "Add to favorites"}
    </button>
  );
}
```

`setOptimistic...` is only called inside an Action; React warns if it is called outside one.[^6] If you manage server state with TanStack Query, the library's side of optimistic updates is in the [TanStack Query](/academy/tanstack-query) guide.

## Designing components with an action prop

The `FavoriteButton` above names its prop **`action`**, not `onClick`. The React documentation recommends this pattern: components in your design system such as buttons, tabs and selects take an `action` prop, call `startTransition` themselves and show the pending state themselves. The product code only has to `await`.[^7]

[Ricky Hanlon](https://github.com/rickhanlonii) takes this idea to its conclusion in the demo from his "Async React" talk at React Conf 2025: router transitions, Suspense in the data layer, `action` props on the design components and optimistic updates are all used by default. The result: on a fast network no loading state appears at all, and on a slow one it appears automatically.[^8][^9]

## This lesson and the forms guide

This lesson covered React's own tools. Field-level validation, Zod schemas, masking and multi-step forms are in the [Forms](/academy/forms) guide; the server-side version of an Action *(Server Functions)* is in the [Server Actions](/academy/nextjs/server-actions) lesson of the Next.js guide.

## Try it yourself

- Add a 2-second delay to `AddToCartButton`'s `addToCart` and press the button three times quickly.
- In `CouponForm`, write `checkCoupon` so that it rejects every code except `"SALE10"`; try the error and success messages.
- Change `FavoriteButton`'s `action` so that it always throws. What does the heart do?
- Call `setState` after an `await` inside an Action; then wrap it in `startTransition` and watch the difference.

## Going deeper

- **Official docs:** the `useTransition` reference; Actions, exposing an `action` prop, avoiding unwanted loading indicators, and troubleshooting.[^1]
- **Video:** both parts of [Ricky Hanlon](https://github.com/rickhanlonii)'s "Async React" talk *(React Conf 2025)*.[^8][^10]
- **Repo:** the talk's demo application; change the network speed and see the difference for yourself.[^9]
- **Official docs:** the `useActionState` and `useOptimistic` references; they walk through the pending, error and optimistic states with a cart example.[^5][^6]

## Sources

1. [React: useTransition](https://react.dev/reference/react/useTransition) *(doc)* — Async Actions, `isPending`, errors through an Error Boundary, and the limitation on updates after an `await`.
2. [React v19](https://react.dev/blog/2024/12/05/react-19) *(doc)* — The announcement of Actions, `useActionState`, `useOptimistic` and form actions.
3. [React: form](https://react.dev/reference/react-dom/components/form) *(doc)* — The `action` prop, `FormData`, running inside a transition, and fields resetting after a successful submit.
4. [React: useFormStatus](https://react.dev/reference/react-dom/hooks/useFormStatus) *(doc)* — Reading the parent form's pending state, and the separate-component requirement.
5. [React: useActionState](https://react.dev/reference/react/useActionState) *(doc)* — The async reducer, `isPending`, sequential execution and the error behaviour.
6. [React: useOptimistic](https://react.dev/reference/react/useOptimistic) *(doc)* — A temporary value for the duration of an Action, use with a reducer, and the warning about calling it outside an Action.
7. [React: useTransition, Exposing action prop from components](https://react.dev/reference/react/useTransition#exposing-action-props-from-components) *(doc)* — A component taking an `action` prop and starting the transition itself.
8. [Ricky Hanlon: Async React Part I (React Conf 2025)](https://www.youtube.com/watch?v=zyVRg2QR6LA&t=10907s) *(video)* — Day 1 stream. An application that uses transitions, Suspense and optimistic state together.
9. [Ricky Hanlon: async-react demo](https://github.com/rickhanlonii/async-react) *(repo)* — The final state of the talk; the router, the data layer, design components with `action` props, and the 150 ms threshold.
10. [Ricky Hanlon: Async React Part II (React Conf 2025)](https://www.youtube.com/watch?v=p9OcztRyDl0&t=29073s) *(video)* — Day 2 stream. The rest of the talk.
