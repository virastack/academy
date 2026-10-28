---
title: "Error handling"
description: "Expected errors, error.tsx and retry, catchError and notFound."
lastVerified: "2026-10-21"
translationKey: "nextjs/error-handling"
---

## Two kinds of error

Next.js splits errors in two and handles them differently:[^1]

| Kind | Example | How it is handled |
| :-- | :-- | :-- |
| An expected error | An invalid coupon, out of stock, a product that is not there | Return it as a value, or call `notFound()` |
| An unexpected error | The database went down, a bug in the code | `throw` it and let an error boundary catch it |

## Expected errors: return a value

Do not `throw` for a validation error in a Server Action; return a message to `useActionState`. The documentation recommends modelling the error as a return value rather than using `try`/`catch` and `throw` in that case.[^1] You saw the example in the [Server Actions](/academy/nextjs/server-actions) lesson.

The same reasoning holds in a Server Component: if the response failed, render a message.

```tsx
async function Reviews({ slug }: { slug: string }) {
  const res = await fetch(`https://api.example.com/reviews/${slug}`);
  if (!res.ok) return <p>Reviews cannot be loaded right now.</p>;

  const reviews: Review[] = await res.json();
  return <ReviewList reviews={reviews} />;
}
```

## Not found: notFound

When somebody arrives at a product that does not exist, call `notFound()`. The nearest `not-found.tsx` is shown.[^1] `ProductDetails` is rendered inside the page's `<Suspense>`, as in the [Navigation and prefetching](/academy/nextjs/navigation-and-prefetching) lesson.

```tsx
// app/products/[slug]/page.tsx
import { notFound } from "next/navigation";

async function ProductDetails({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return <h1>{product.name}</h1>;
}
```

```tsx
// app/products/[slug]/not-found.tsx
import Link from "next/link";

export default function ProductNotFound() {
  return (
    <>
      <h1>Product not found</h1>
      <Link href="/products">All products</Link>
    </>
  );
}
```

> [!NOTE]
>
> Once the page has started streaming, the server is committed to the `200` status code, and a `notFound()` called afterwards cannot turn it into a `404`. Next.js then adds `<meta name="robots" content="noindex">` to the page and the search engine does not index it. In the same way, a `redirect()` during streaming becomes a client-side redirect rather than an HTTP one.[^2] In this guide's project application, `/products/nope` behaved exactly like this.

> [!WARNING]
>
> `notFound()` and `redirect()` work by throwing internally. Call them inside a `try` block and the `catch` swallows them and they do nothing. Call them outside `try`/`catch`.[^3]

## Unexpected errors: error.tsx

Adding an `error.tsx` to a segment wraps that segment in an Error Boundary. The error travels up to the nearest boundary above, which lets you confine it to one part of the page. Error boundaries have to be Client Components.[^4]

```tsx
// app/products/error.tsx
"use client";

import { useEffect } from "react";

export default function ProductsError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error); // send it to an error tracking service
  }, [error]);

  return (
    <>
      <h2>Products could not be loaded.</h2>
      <button onClick={() => retry()}>Try again</button>
    </>
  );
}
```

Three details:[^4]

- `retry()` **fetches the segment's data again** and re-renders it. It became stable in 16.3. The `reset()` in older examples only clears the error state and does not refetch.
- The type of `error` is `unknown`. Narrow it before reading `message` or `digest`. The documentation gives the `instanceof Error` example, but a server error thrown inside Suspense may not pass that check; checking for the field itself, as in `"digest" in error`, is safer *(see [Error monitoring](/academy/production/error-monitoring))*.
- In production, Server Component errors arrive with a generic message so that no detail leaks. `error.digest` lets you find the matching entry in the server logs.

To catch errors in the root layout there is `app/global-error.tsx`. Because it replaces the root layout, it writes its own `<html>` and `<body>` tags.[^1]

## At component level: catchError

To protect a single section of a page *(the recommendations, the reviews)* you can use `catchError` instead of the file convention. It became stable in 16.3.[^5]

```tsx
// components/section-boundary.tsx
"use client";

import { catchError, type ErrorInfo } from "next/error";

function SectionError(props: { title: string }, { retry }: ErrorInfo) {
  return (
    <div role="alert">
      <p>{props.title} could not be loaded.</p>
      <button onClick={() => retry()}>Try again</button>
    </div>
  );
}

export default catchError(SectionError);
```

```tsx
<SectionBoundary title="Suggestions">
  <Recommendations />
</SectionBoundary>
```

How it differs from an Error Boundary class of your own: it does not catch `redirect()` and `notFound()` by accident, `retry()` refetches the data, and the error state clears itself when you move to another page.[^5]

## What an error boundary does not catch

Error boundaries catch errors during render. An error inside an `onClick` is not caught; catch it with `try`/`catch` and hold it in state. An error thrown inside `startTransition` does reach the nearest boundary.[^1] Collecting errors in production is the subject of the [Getting to production](/academy/production) guide.

## Try it yourself

- Write `throw new Error("db down")` inside `getProducts`. Does `error.tsx` appear? Is the header still there?
- Change it to throw only on the first call and press **Try again**.
- Run it with `next build && next start` and look at the `error` object's message. Is it the same as in development?
- Put `notFound()` inside a `try` block. What happens?

## Going deeper

- **Official docs:** the "Error Handling" page; expected and unexpected errors, nested boundaries and `global-error`.[^1]
- **Official docs:** the `error.js` reference; the difference between `retry` and `reset`, and a custom error boundary example.[^4]
- **Official docs:** React's account of the Error Boundary; the errors a boundary catches and the ones it does not.[^6]

## Sources

1. [Next.js: Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) *(doc)* — Expected errors, `notFound`, nested `error.js`, `catchError`, event handler errors and `global-error`.
2. [Next.js: Streaming, Status codes](https://nextjs.org/docs/app/guides/streaming#status-codes) *(doc)* — The behaviour of `notFound()` and `redirect()` after streaming has started, and the `noindex` meta tag.
3. [Next.js: redirect](https://nextjs.org/docs/app/api-reference/functions/redirect) *(doc)* — `redirect` working by throwing, and being called outside a `try` block.
4. [Next.js: error.js](https://nextjs.org/docs/app/api-reference/file-conventions/error) *(doc)* — The `error`, `error.digest`, `retry` and `reset` props, the generic message in production, and the version history.
5. [Next.js: catchError](https://nextjs.org/docs/app/api-reference/functions/catchError) *(doc)* — An error boundary at component level, `retry`, and getting along with the framework's own errors.
6. [React: Catching rendering errors with an Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) *(doc)* — How an Error Boundary works and what its limits are.
