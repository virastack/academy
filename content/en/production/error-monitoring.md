---
title: "Error monitoring"
description: "onRequestError, the error code, Sentry and useful alerts."
lastVerified: "2026-10-22"
translationKey: "production/error-monitoring"
---

## Users don't report errors

When a page breaks in production, most users do not write to you; they close the tab. The ones who do write say "it doesn't work". Which page, which browser, which version, which line? You cannot debug without knowing those.

Error monitoring closes that gap: every error is recorded somewhere together with the stack trace, the version, the environment and the request's details, similar errors are grouped, and the team is alerted when needed.

This lesson has two layers: first [!nextjs]'s own hooks, then connecting them to an error monitoring service.

## Errors on both sides

| Where | Example | Who catches it |
| :-- | :-- | :-- |
| The server | A database error in a Server Component, a Route Handler, a Server Action, the proxy | `onRequestError` in `instrumentation.ts` |
| The browser | A render error in a Client Component, an error in an event handler | `error.tsx`, `global-error.tsx`, the client-side SDK |

An error on the server reaches the browser **without its details**. According to the Next.js documentation, for errors coming from a Server Component the user only sees a generic message and an identifier; the real message is hidden so it does not leak sensitive information.[^1] That identifier is called the **digest**, and it is there to match the error with the one in the server logs.

## error.tsx and the digest

`error.tsx` wraps a route segment with a React error boundary *(see [Error handling](/academy/nextjs/error-handling))*. Showing the user an error code in production lets the support team find the error in the logs:

```tsx
// app/error.tsx
"use client";

function getDigest(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error) {
    return typeof error.digest === "string" ? error.digest : undefined;
  }
}

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = getDigest(error);

  return (
    <main>
      <div role="alert">
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred while loading the page. You can try again.</p>
        {digest && (
          <p>
            Error code to pass on to support: <code>{digest}</code>
          </p>
        )}
        <button type="button" onClick={() => retry()}>
          Try again
        </button>
      </div>
    </main>
  );
}
```

In Next.js 16 the `error` prop's type is `unknown`; you have to narrow it before reading it.[^1]

> [!WARNING]
>
> Do not narrow it with `error instanceof Error`. In this guide's project, a server error thrown inside Suspense reached the browser as an object with `message`, `stack` and `digest` fields that did **not** pass the `instanceof Error` check. Check the field's presence and type, as above.

`global-error.tsx` catches the errors in the root layout. Because it replaces the root layout, it has to render its own `<html>` and `<body>` tags, and your global styles are not loaded there.[^1]

## onRequestError: every error on the server

`onRequestError` in the `instrumentation.ts` file is called whenever Next.js catches an error on the server: a Server Component render, a Route Handler, a Server Action and the proxy.[^2]

```ts
// instrumentation.ts
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { logger } = await import("./lib/logger");
  const digest =
    typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;

  logger.error(
    {
      event: "request_error",
      err: error,
      digest,
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routeType: context.routeType,
    },
    "An error occurred while handling the request",
  );
};
```

The function takes three arguments:[^2]

| Argument | What it holds |
| :-- | :-- |
| `error` | The thrown value; on server render errors it carries a `digest` |
| `request` | `path`, `method`, `headers` |
| `context` | `routerKind`, `routePath` *(the pattern, such as `/orders/[id]`)*, `routeType` *(`render`, `route`, `action`, `proxy`)*, `renderSource`, `revalidateReason` |

In this guide's project the `/debug` page throws on purpose. The error code shown in the browser is the same as the `digest` in the server log:

```json
{"level":50,"env":"local","version":"abc123","event":"request_error","digest":"403643587","method":"GET","path":"/debug","routePath":"/debug","routeType":"render","msg":"An error occurred while handling the request"}
```

> [!CAUTION]
>
> `request.headers` carries the cookie and authorisation headers. Do not add all the headers to the error record *(see [Logging](/academy/production/logging))*.

## Sending them to a service: Sentry

A log records the error but does not group it, does not tell you when a new kind of error appears, and does not see the browser's errors. An error monitoring service such as Sentry does those things. For the Next.js integration, Sentry's wizard creates the necessary files:[^3]

```command
npx @sentry/wizard@latest -i nextjs
```

In a manual setup, the files are:[^3]

| File | Its job |
| :-- | :-- |
| `instrumentation-client.ts` | Starts the browser-side SDK |
| `sentry.server.config.ts` | The Node.js side's SDK |
| `sentry.edge.config.ts` | The Edge runtime's SDK |
| `instrumentation.ts` | Loads the server configuration and connects `onRequestError` to Sentry |
| `next.config.ts` | Uploads the source maps at build time with `withSentryConfig` |

```ts
// instrumentation.ts
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

```ts
// instrumentation-client.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

`instrumentation-client.ts` is the file Next.js runs in the browser before the application becomes interactive; `onRouterTransitionStart` is there to track the page transitions.[^4] The DSN is not a secret; Sentry itself recommends passing it with `NEXT_PUBLIC_`.[^3]

If you want to keep your own log too, combine the two jobs in one function:

```ts
export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  Sentry.captureRequestError(...args);
  // ...your own log line
};
```

To catch the render errors on the client, report the error to Sentry in `global-error.tsx` and `error.tsx`:[^3]

```tsx
useEffect(() => {
  Sentry.captureException(error);
}, [error]);
```

## A readable stack trace: source maps

The JavaScript in production is minified. Without source maps a stack trace looks like `at g (chunk.js:1:209)`. `withSentryConfig` uploads the source maps to Sentry at build time; that needs an auth token:[^3]

```ts
// next.config.ts
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // ...
};

export default withSentryConfig(nextConfig, {
  org: "my-company",
  project: "order-panel",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
```

`SENTRY_AUTH_TOKEN` is a real secret: it lives in `.env.local` locally and as a GitHub secret in CI *(see [CI/CD](/academy/production/cicd))*. Sentry's warning is clear: do not add this token to version control.[^3]

At build time the plugin also creates a **release** in Sentry, and tries to work the version out from the environment itself; you can state it with `SENTRY_RELEASE` if you want.[^5] The version information answers the question "which deploy did this error start with?".

## How much data?

**Sampling.** Errors are sent in full by default. Performance traces, on the other hand, are sampled because there are so many of them: Sentry's example uses 100 percent in development and 10 percent in production, and says to tune it to your traffic.[^3]

**Personal data.** Sentry's current SDK sends the user's identifying details *(IP address, id)*, the HTTP bodies and the query parameters by default. Known keys such as `password` and `auth` are replaced with `[Filtered]`. To send less data, you turn the categories off with the `dataCollection` option.[^6] If your application falls under the GDPR or a similar law, review the default deliberately.

**Ad blockers.** Some blockers cut off the requests going to Sentry. `tunnelRoute: "/sentry-tunnel"` routes the events through your own server; in exchange, the server load grows.[^3]

## Alerts that are worth having

A system that sends a notification for every error is muted within a few days. Google's SRE book sets this principle for monitoring: every notification that pages you has to be **actionable** and has to need a human's intelligence; anything that can be solved by an automatic response should not be a notification.[^7]

In practice:

- Send a notification for a **new kind of error**: a deploy may have brought a new problem.
- Send a notification when **the count of a known error** rises suddenly, not on every occurrence.
- Give priority to **the symptoms that affect users**. The SRE book separates the symptom *(what is broken?)* from the cause *(why is it broken?)*: "the payment page is failing 5 percent of the time" is a symptom and is worth an alert; "one server's memory is high" perhaps is not.[^7]
- Do not report expected errors *(an invalid form, a record not found)* as errors; those are the application's normal flow *(see [Error handling](/academy/nextjs/error-handling))*.

## Trying the pipeline

After the setup, do not count the job as done before you have thrown an error and seen it really reach the service. The `/debug` page in this guide's project is there for that:

```tsx
// app/debug/page.tsx
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getEnv } from "@/lib/env";

export default function DebugPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <FailingSection />
    </Suspense>
  );
}

async function FailingSection(): Promise<never> {
  await connection();
  if (getEnv().APP_ENV === "production") notFound();
  throw new Error("Test error: thrown on purpose to exercise the error-tracking pipeline.");
}
```

`connection()` makes the error throw at request time rather than at build time; otherwise the build fails. The page returns a 404 in production. Sentry's wizard creates a similar example page too.[^3]

## Try it yourself

- Add `onRequestError` to your project. Throw an error in a Server Component and find the browser's error code in the server log.
- Show the error code in `error.tsx`. Compare how the message differs between the development and production builds.
- Run the wizard with a free Sentry account. Produce a client error and a server error and see that both arrive.
- Compare the same error's stack trace before and after uploading the source maps.

## Going deeper

- **Official docs:** Next.js, "error.js"; `error`, `digest`, `retry` and `global-error`.[^1]
- **Official docs:** Sentry, "Manual Setup for Next.js"; the files, the source maps, the tunnel and verifying it.[^3]
- **Book chapter:** Google, "Monitoring Distributed Systems"; symptoms and causes, and actionable alerts.[^7]

## Sources

1. [Next.js: error.js](https://nextjs.org/docs/app/api-reference/file-conventions/error) *(doc)* — The `error` prop's type, the message hidden in production, `digest`, `retry` and `global-error`.
2. [Next.js: instrumentation.js](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation) *(doc)* — The `register` and `onRequestError` signatures, and the `request` and `context` fields.
3. [Sentry: Manual Setup for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) *(doc)* — The wizard, the configuration files, `captureRequestError`, the source maps, sampling and the tunnel.
4. [Next.js: instrumentation-client.js](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client) *(doc)* — Code that runs early in the browser, and `onRouterTransitionStart`.
5. [Sentry: Build Options for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/build/) *(doc)* — Creating a release, `SENTRY_RELEASE` and the source map options.
6. [Sentry: Data Collected](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection) *(doc)* — The user data sent by default, and `dataCollection`.
7. [Google](https://sre.google/): [Site Reliability Engineering: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) *(article)* — 2016, Rob Ewaschuk. Symptoms and causes, the four golden signals, and actionable alerts.
