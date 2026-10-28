---
title: "Auth in Next.js"
description: "Choosing an auth library, signing in, reading the session and redirecting with the proxy."
lastVerified: "2026-10-18"
translationKey: "auth-security/auth-in-nextjs"
---

In the previous lessons we saw how a session, a password and OAuth work. In this lesson we bring them all together in a [!nextjs] Next.js App Router project: choosing a library, the sign-in form, reading the session on the server, signing out and redirecting with `proxy.ts`.

> [!NOTE]
>
> The code in this lesson was run in a `next@16.4.2` project opened with `create-next-app`, with `better-auth@1.7.10` and `better-sqlite3`. The sign-in, sign-out and redirect flow was tested in Chromium with Playwright, and `next build` finished without errors.

## Choosing a library

The Next.js documentation says you can write the auth yourself but recommends using a library, for security and simplicity.[^1] The options split into two groups:

| Kind | Example | When |
| :-- | :-- | :-- |
| A library that runs on your own database | Better Auth, Auth.js | If you want the user data to stay with you |
| A hosted service | Clerk, Auth0, WorkOS, Supabase Auth | If you want the interface, 2FA and enterprise sign-in to come ready |

In September 2025, Auth.js *(formerly NextAuth.js)* was handed over to the Better Auth team. The team keeps giving Auth.js security patches but recommends that new projects start with Better Auth.[^2] Better Auth joined Vercel in July 2026 and stayed open source under the MIT licence.[^3] In this lesson we use Better Auth.

## Setup

```command
npm install better-auth better-sqlite3
```

A secret key and the application's address are written into the `.env` file. The key has to be at least 32 characters:[^4]

```bash
# Generate it with openssl rand -base64 32
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
```

The server-side configuration is a single file:

```ts
// lib/auth.ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import Database from "better-sqlite3";

export const auth = betterAuth({
  database: new Database("./sqlite.db"),
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],
});
```

The `nextCookies()` plugin makes sure the cookie really is written for the sign-ins and sign-outs made from inside a Server Action; it has to be last in the list.[^5] To create the tables you run `npx auth@latest migrate`.[^4] That command created the `user`, `session`, `account` and `verification` tables. The library takes on the jobs we saw in the earlier lessons, such as hashing the password, producing the session identifier and the `HttpOnly` cookie.

> [!TIP]
>
> If TypeScript cannot find the types for `better-sqlite3`, add `npm install -D @types/better-sqlite3`. In a real project you can use Postgres with the Drizzle or Prisma adapter instead of SQLite.

Next, the route handler that serves the auth requests and the browser-side client are added:[^5]

```ts
// app/api/auth/[...all]/route.ts
import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

```ts
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
```

## The sign-in form

The sign-in is done on the client with `authClient.signIn.email`.[^6] The error message does not reveal whether the account exists, as we saw in the [Passwords, passkeys and 2FA](/academy/auth-security/passwords-passkeys-and-mfa) lesson:

```tsx
// app/sign-in/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const { error } = await authClient.signIn.email({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });

    if (error) {
      setError("Email or password is incorrect.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form action={handleSubmit}>
      <input name="email" type="email" autoComplete="username" required />
      <input name="password" type="password" autoComplete="current-password" required />
      <button type="submit">Sign in</button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
```

After a successful sign-in, a cookie named `better-auth.session_token` with `HttpOnly` and `SameSite=Lax` appeared in the browser. OAuth providers such as "Sign in with GitHub" are added with the `socialProviders` setting and called with `authClient.signIn.social({ provider: "github" })`.[^4][^6]

## Reading the session on the server

Collecting the code that reads the session in one place is the essence of the **Data Access Layer** idea Next.js recommends. The `server-only` package stops that file being imported into a Client Component by accident, with a build error.[^1][^7]

```ts
// lib/dal.ts
import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  return { id: session.user.id, email: session.user.email };
}
```

The function returns only the fields needed rather than the whole session object. That reduces the risk of a value such as a token going to the client.[^1]

In the `next.config.ts` that `create-next-app` 16.4 produced, `cacheComponents: true` came ready. In that mode a component reading `headers()` or `cookies()` has to be inside a `<Suspense>`; otherwise Next.js raises a "runtime data during prerendering" error.[^8] The rest of the page stays static and the user-specific part arrives by streaming:

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react";

import { getCurrentUser } from "@/lib/dal";

import { signOut } from "./actions";

export default function DashboardPage() {
  return (
    <main>
      <Suspense fallback={<p>Loading…</p>}>
        <Welcome />
      </Suspense>
    </main>
  );
}

async function Welcome() {
  const user = await getCurrentUser();

  return (
    <>
      <h1>Welcome, {user.email}</h1>
      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </>
  );
}
```

In the `next build` output, `/dashboard` was therefore marked as **Partial Prerender** *(◐)*.

> [!WARNING]
>
> Do not put the session check at the top of a layout. Layouts are not re-rendered while navigating between pages, and they do not stop the child pages from rendering.[^1]

## Signing out

Signing out is a Server Action. The session is deleted on the server and the cookie is cleared:[^5]

```ts
// app/dashboard/actions.ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}
```

In the test, after signing out the session record in the database was deleted, no cookie was left in the browser, and going to `/dashboard` redirected to `/sign-in` again.

## Redirecting with the proxy

In Next.js 16 the `middleware.ts` file was renamed `proxy.ts` and runs on the Node.js runtime by default.[^9] Because the proxy runs before every request, it suits redirecting a signed-out user early:

```ts
// proxy.ts
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

This check is **optimistic**: `getSessionCookie` only looks at whether the cookie exists, not at whether it is valid.[^5] In the test a `better-auth.session_token=forged` cookie was added to the browser by hand. The proxy let the request through, but because `getCurrentUser` could not verify the session, the page redirected to `/sign-in` without showing any content.

There is a real example showing that the proxy should not be the only line of defence. CVE-2025-29927, disclosed in March 2025, showed that in self-hosted Next.js applications the middleware could be bypassed entirely with an `x-middleware-subrequest` header. Vercel's incident report explicitly recommends not using middleware as the only way of protecting routes.[^10] The Next.js documentation also says that Server Functions can fall outside the proxy's matcher, so every Server Action has to do its own authorisation check.[^9]

> [!DO]
>
> - In the proxy, do only a fast and optimistic redirect.
> - Do the real check close to the data: inside the Data Access Layer, the Server Action and the Route Handler.

Access by role and protecting Server Actions are the next lesson's subject.

## Try it yourself

- Set a project up with the files above, go to `/dashboard` without signing in and see the redirect.
- Change the session cookie's value from DevTools > **Application** > **Cookies** and reload the page; see that the proxy lets it through but the page throws you out.
- Move the `Welcome` component outside the `<Suspense>` and read the error in the `next dev` output.

## Going deeper

- **Official docs:** the Next.js Authentication guide; the session, the Data Access Layer and the authorisation check.[^1]
- **Article:** Sebastian Markbåge, "How to Think About Security in Next.js"; the security model in Server Components and Server Actions.[^7]
- **Video:** [Lee Robinson](https://leerob.com/), "Next.js App Router Authentication (Sessions, Cookies, JWTs)"; where sessions and cookies sit in the App Router.[^11]
- **Official docs:** the Better Auth Next.js integration.[^5]

## Sources

1. [Next.js: How to implement authentication](https://nextjs.org/docs/app/guides/authentication) *(doc)* — The library recommendation, the Data Access Layer, the DTO, the optimistic check in the proxy and the layout warning.
2. [Better Auth: Auth.js is now part of Better Auth](https://www.better-auth.com/blog/authjs-joins-better-auth) *(article)* — September 22, 2025; Auth.js's maintenance and the recommendation for new projects.
3. [Vercel: Vercel acquires Better Auth](https://vercel.com/blog/vercel-acquires-better-auth) *(article)* — July 7, 2026; Better Auth staying open source under the MIT licence.
4. [Better Auth: Installation](https://www.better-auth.com/docs/installation) *(doc)* — `BETTER_AUTH_SECRET`, the database options, `emailAndPassword`, `socialProviders` and the migration with the CLI.
5. [Better Auth: Next.js integration](https://www.better-auth.com/docs/integrations/next) *(doc)* — `toNextJsHandler`, `nextCookies`, `getSession` and the warning that `getSessionCookie` does not validate the cookie.
6. [Better Auth: Basic Usage](https://www.better-auth.com/docs/basic-usage) *(doc)* — `signUp.email`, `signIn.email`, `signIn.social`, `useSession` and `signOut`.
7. [Sebastian Markbåge: How to Think About Security in Next.js](https://nextjs.org/blog/security-nextjs-server-components-actions) *(article)* — The Data Access Layer, `server-only`, and treating Server Actions as public endpoints.
8. [Next.js: Authentication with Cache Components](https://nextjs.org/docs/app/guides/authentication-with-cache-components) *(doc)* — A component reading the session having to be inside `<Suspense>`, and caching data derived from the session.
9. [Next.js: proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) *(doc)* — The move from `middleware` to `proxy`, the Node.js runtime, the `matcher` and the Server Function warning.
10. [Vercel: Postmortem on Next.js Middleware bypass](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass) *(article)* — CVE-2025-29927, the affected setups, the fixed versions and the advice not to rely on middleware alone.
11. [Lee Robinson](https://leerob.com/): [Next.js App Router Authentication (Sessions, Cookies, JWTs)](https://www.youtube.com/watch?v=DJvM2lSPn6w) *(video)* — Sessions, cookies and JWTs in the App Router.
