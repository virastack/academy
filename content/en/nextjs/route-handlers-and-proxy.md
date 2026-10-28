---
title: "Route Handlers and the proxy"
description: "API endpoints, webhooks, proxy.ts and which one to use when."
lastVerified: "2026-10-21"
translationKey: "nextjs/route-handlers-and-proxy"
---

## Which one for what

There are four ways to run code on the server in Next.js. Picking the wrong one is among the most common App Router mistakes:[^1]

| What you need | The right tool |
| :-- | :-- |
| Reading data for a page | A Server Component |
| Changing data from a form or a button | A Server Action |
| An address called from outside: a webhook, a mobile app, an OAuth callback, a file download | A Route Handler |
| Redirecting, rewriting or adding a header before every request | `proxy.ts` |

## Route Handlers

A `route.ts` file is an HTTP endpoint that works with the Web standard `Request` and `Response`. You export one function per HTTP method.[^2]

```ts
// app/api/products/[slug]/route.ts
import type { NextRequest } from "next/server";

import { getProduct } from "@/lib/products";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/products/[slug]">) {
  const { slug } = await ctx.params;
  const product = await getProduct(slug);

  if (!product) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ slug: product.slug, name: product.name, price: product.price });
}
```

`RouteContext` is a global helper like `PageProps`; it generates the `params` type from the folder.[^2] The same folder cannot hold both a `page.tsx` and a `route.ts`; each of them claims every request to that address.[^2]

With Cache Components on, `GET` handlers follow the same rule as pages: if they read no request data they are generated statically at build time, and if they do they run at request time. Write `"use cache"` not on the handler itself but on the helper function it calls.[^2]

> [!DONT]
>
> - Sending a `fetch` from your own Server Component to your own Route Handler. Call the function directly.[^1]
> - Using a Route Handler to submit a form in place of a Server Action. An Action is typed and updates the page in the same request.

## A webhook: refreshing the cache when the CMS changes

A CMS can send a request to your address when the content changes. The handler verifies the request and revalidates the matching tag:[^3]

```ts
// app/api/revalidate/route.ts
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (request.headers.get("x-revalidate-secret") !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = (await request.json()) as { slug?: string };
  revalidateTag(slug ? `product-${slug}` : "products", "max");

  return Response.json({ revalidated: true });
}
```

Route Handlers are open endpoints too. The documentation's security list is short: do not trust incoming headers, apply a rate limit, verify the webhook body against the provider's signature, and check authorisation on protected resources.[^3] An example of a role check is in the [Authorisation and roles](/academy/auth-security/authorization-and-roles) lesson.

For work that should run after the response *(logging, analytics)*, use `after()`; the user does not wait for it.[^4]

```ts
import { after } from "next/server";

after(() => logEvent("product_revalidated"));
```

## proxy.ts

In Next.js 16, `middleware.ts` was renamed `proxy.ts`. The job is the same: it runs before the request reaches the application, and redirects, rewrites or changes headers. By default it runs on the Node.js runtime.[^5][^6]

An example: trying two designs of the home page as an A/B test. The user is assigned to a group, and group B sees the `/home-b` page without the URL changing:

```ts
// proxy.ts
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const bucket = request.cookies.get("home-test")?.value ?? (Math.random() < 0.5 ? "a" : "b");

  const response =
    bucket === "b"
      ? NextResponse.rewrite(new URL("/home-b", request.url))
      : NextResponse.next();

  response.cookies.set("home-test", bucket);
  return response;
}

export const config = {
  matcher: "/",
};
```

Two rules:

- **Do not forget the `matcher`.** Without one, the proxy runs on every request, static files and images included; a wrong redirect can block your CSS and pictures too.[^5]
- **For a simple redirect, look at `redirects` in `next.config.ts` first.** The proxy is for logic that looks at the request data.[^6]

> [!WARNING]
>
> The proxy is not for slow data fetching or for a complete authorisation system. It can check whether a cookie exists and redirect optimistically; the real check is done close to the data.[^6] Why that is, and the CVE-2025-29927 example, are in the [Auth in Next.js](/academy/auth-security/auth-in-nextjs) lesson.

## Try it yourself

- Write `app/api/products/[slug]/route.ts` and call it with `curl localhost:3000/api/products/canvas-sneaker`.
- Call the webhook without the secret and then with it; compare the two responses.
- Set up the A/B example, delete the `home-test` cookie in DevTools and refresh the page a few times.
- Delete the `matcher` from `proxy.ts` and `console.log` on every request. How many times does it run when one page opens?
- Add a `/old-shop` → `/products` redirect to `next.config.ts` with `redirects`.

## Going deeper

- **Official docs:** the "Backend for Frontend" guide; content types, proxying to a backend, webhooks, security and the limits.[^3]
- **Article:** [Lee Robinson](https://leerob.com/), "Common mistakes with the Next.js App Router"; using a Route Handler needlessly, and the other mistakes.[^1]
- **Official docs:** the `proxy.js` reference; the `matcher` patterns, reading cookies and headers, and migrating from `middleware`.[^5]

## Sources

1. [Lee Robinson](https://leerob.com/): [Common mistakes with the Next.js App Router and how to fix them](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) *(article)* — The Vercel blog. Calling a Route Handler from a Server Component, and choosing the right tool.
2. [Next.js: Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) *(doc)* — `route.ts`, the HTTP methods, `GET` with Cache Components, `RouteContext` and route conflicts.
3. [Next.js: Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend) *(doc)* — `revalidateTag` from a webhook, proxying to a backend, the security points and the limits.
4. [Next.js: after](https://nextjs.org/docs/app/api-reference/functions/after) *(doc)* — Scheduling work after the response.
5. [Next.js: proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) *(doc)* — `matcher`, the Node.js runtime, migrating from `middleware`, and the version history.
6. [Next.js: Proxy](https://nextjs.org/docs/app/getting-started/proxy) *(doc)* — Where it is used, the `redirects` recommendation, and the proxy not being a complete authorisation solution.
