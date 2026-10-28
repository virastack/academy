---
title: "A protected admin panel"
description: "A small panel with sign-in, role checks and security headers."
lastVerified: "2026-10-22"
translationKey: "auth-security/project"
---

## Scenario

You are going to write a store's admin panel. The panel:

- Asks for an email and a password. A user who has not signed in goes to `/sign-in`.
- Knows three roles: `customer` cannot enter the panel, `editor` updates prices, and `admin` archives products and changes roles.
- Shows the product description as HTML but cleans the script inside it.
- Archiving is a Route Handler and refuses a request coming from another site.
- Every page has a CSP with a nonce, plus the security headers.
- All of it is protected by Playwright tests.

Where each piece comes from:

| Part | File | Lesson |
| :-- | :-- | :-- |
| Better Auth, sign-in, the proxy | `lib/auth.ts`, `app/sign-in/`, `proxy.ts` | Auth in Next.js |
| Roles and permissions, the DAL, the check against IDOR | `lib/permissions.ts`, `lib/dal.ts`, `app/admin/actions.ts` | Authorisation and roles |
| Sanitized HTML, the CSP | `lib/products.ts`, `proxy.ts` | XSS and CSP |
| `Sec-Fetch-Site`, the security headers | `lib/csrf.ts`, `next.config.ts` | CSRF, CORS and the security headers |
| The DTO, `allowScripts` | `lib/users.ts`, `package.json` | Secret and dependency security |

The working project is on GitHub: [examples/auth-security/project](https://github.com/virastack/academy/tree/main/examples/auth-security/project). The application and the 12 tests are there; compare against it when you get stuck.

> [!NOTE]
>
> The project was written with `next@16.4.2`, `better-auth@1.7.12`, `better-sqlite3@13.0.3` and `isomorphic-dompurify@4.6.0`. The tests were run in Chromium against a production build.

## Step 1: Set the project up

```command
npx create-next-app@latest admin-panel --yes
```

```command
npm install better-auth better-sqlite3 isomorphic-dompurify zod server-only
```

`create-next-app` writes `cacheComponents: true` into `next.config.ts`. In this project, **turn it off**: a CSP with a nonce does not work with Partial Prerendering.[^1] Because an admin panel is personal anyway, you lose nothing from the static shell.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: false,
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    authInterrupts: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
```

The `securityHeaders` array is the same list as in the [CSRF, CORS and the security headers](/academy/auth-security/csrf-cors-and-headers) lesson. `authInterrupts` turns on the `forbidden()` function that shows a 403 page; it is experimental for now.[^2]

Call `await connection()` in the root layout. Because the nonce is produced on every request, no page should stay static; otherwise the sign-in form's scripts are left without a nonce and the CSP blocks them.[^1] In a test, without that line `/sign-in` was generated statically and the form did not work.

> [!TIP]
>
> If you use npm 12, during the installation you will see a script warning for `better-sqlite3`, `esbuild` and `unrs-resolver`. In the example project all three are approved in the `allowScripts` field in `package.json`.

## Step 2: The user and the role

The role is a field the user cannot send themselves:[^3]

```ts
// lib/auth.ts
export const auth = betterAuth({
  database: db,
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "customer", input: false },
    },
  },
  plugins: [nextCookies()],
});
```

`npx auth migrate --yes` creates the tables. `scripts/seed.ts` adds three users and three products; one of them deliberately carries an `<img onerror>`.

## Step 3: The permissions and the Data Access Layer

The permissions are in one file, as in the [Authorisation and roles](/academy/auth-security/authorization-and-roles) lesson. `customer`'s list is empty:

```ts
// lib/permissions.ts
const permissions = {
  customer: [],
  editor: ["product:read", "product:update"],
  admin: ["product:read", "product:update", "product:archive", "user:manage"],
} as const satisfies Record<Role, readonly string[]>;
```

`requirePermission` now calls `forbidden()` rather than throwing an `Error`. Next.js returns a 403 status code and shows `app/forbidden.tsx`:[^2]

```ts
// lib/dal.ts
export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();

  if (!hasPermission(user.role, permission)) {
    forbidden();
  }

  return user;
}
```

Every page calls that on its first line: `product:read` for `/admin`, and `user:manage` for `/admin/users`.

## Step 4: The products and the clean HTML

The data layer returns not the table row but the fields the page needs. The description is cleaned here, where it is produced:[^4][^5]

```ts
// lib/products.ts
return rows.map((row) => ({
  id: row.id,
  name: row.name,
  price: row.price,
  description: { __html: DOMPurify.sanitize(row.description) },
}));
```

```tsx
<td dangerouslySetInnerHTML={product.description} />
```

In the test the description `<b>4K</b> panel<img src="x" onerror="...">` was printed with the bold text and without the `onerror`.

## Step 5: The Server Actions

Every action starts with a permission check, then validates the input with Zod. The check on the page does not protect the action; the action can be called directly:[^6]

```ts
// app/admin/actions.ts
export async function setRoleAction(formData: FormData) {
  const currentUser = await requirePermission("user:manage");
  const { id, role } = roleSchema.parse(Object.fromEntries(formData));

  if (id === currentUser.id) {
    throw new Error("You cannot change your own role.");
  }

  setRole(id, role);
  revalidatePath("/admin/users");
}
```

This check stops the last admin making themselves a `customer` and leaving the panel with no owner.

## Step 6: The archiving Route Handler

Archiving is called with `fetch` from a client component. The Route Handler looks first at where the request came from, then at the session, and last at the permission:

```ts
// app/api/admin/products/[id]/archive/route.ts
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (isCrossSiteRequest(request)) {
    return new Response(null, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return new Response(null, { status: 401 });
  }

  const role = isRole(session.user.role) ? session.user.role : "customer";

  if (!hasPermission(role, "product:archive")) {
    return new Response(null, { status: 403 });
  }

  const { id } = await params;
  return archiveProduct(id) ? new Response(null, { status: 204 }) : new Response(null, { status: 404 });
}
```

`isCrossSiteRequest` is the `Sec-Fetch-Site` check from the CSRF lesson.[^7]

## Step 7: The proxy

`proxy.ts` does two jobs. For `/admin`, if there is no cookie it redirects to `/sign-in`; that is only an optimistic check, and the real check is in the DAL.[^8] Then it adds the CSP with a nonce to every page request. The CSP part is the same code as in the [XSS and CSP](/academy/auth-security/xss-and-csp) lesson.

```ts
// proxy.ts
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin") && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // ... the nonce and the Content-Security-Policy
}
```

## Step 8: The tests

As Playwright recommends, every role signs in once in a **setup** project and the session is saved to a file. The tests use that file with `storageState`.[^9]

There is one more reason for that. In production, Better Auth limits `/sign-in/email` requests to **3 requests in 10 seconds**.[^10] In a test, when every test did its own sign-in, the fourth one got a `429`. That limit is free protection against brute force attacks; it is off in the development environment.

| Test | What it proves |
| :-- | :-- |
| A user who has not signed in | `/admin` → `/sign-in` |
| `customer` | The 403 page |
| `editor` | The price is updated; the archive request gets `403`, and `/admin/users` a 403 |
| `admin` | A product is archived and a role is changed |
| XSS | The `onerror` is removed and the script does not run |
| CSRF | A form sent from another site gets a `403` and the product stays where it is |
| The headers | A CSP with a nonce, `DENY`, `nosniff`, and no `X-Powered-By` |
| Role injection | A `"role": "admin"` sent during sign-up is written into the database as `customer` |
| The sign-in limit | Repeated wrong passwords get a `429` |

The CSRF test produces the attacker page on a fake domain *(`https://evil.example`)* with `page.route`. The browser really does send the request from another site.

## Step 9: The final check

```bash
npm run lint
npm run build
npm run test:e2e
```

In the build output every page should appear as `ƒ` *(dynamic)*. `npm audit` reported a vulnerability in the development tools; `npm audit --omit=dev`, on the other hand, showed zero. Read it with the production packages and the development tools kept apart.

## Try it yourself

- Delete the `forbidden()` line from `lib/dal.ts`. Which tests break?
- Delete the "cannot change their own role" check in `setRoleAction` and, as the only admin, make yourself a `customer`. Is there a way to get the panel back?
- Delete the `isCrossSiteRequest` line in the Route Handler and run the CSRF test. Why did it still get a `401`? *(A hint: `SameSite=Lax`.)*
- Make `cacheComponents: true` in `next.config.ts`, take a build and open the sign-in page. What do you see in the console?
- Add an `audit_log` table: who changed what and when, on price and role changes.

## Sources

1. [Next.js: Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy) *(doc)* — Dynamic rendering being required for a nonce, and the incompatibility with Partial Prerendering.
2. [Next.js: forbidden](https://nextjs.org/docs/app/api-reference/functions/forbidden) *(doc)* — The 403 page, `forbidden.tsx` and the experimental `authInterrupts` setting.
3. [Better Auth: Database — Extending core schema](https://www.better-auth.com/docs/concepts/database#extending-core-schema) *(doc)* — `additionalFields` and `input: false`.
4. [Next.js: How to think about data security](https://nextjs.org/docs/app/guides/data-security) *(doc)* — The DTO, the Data Access Layer and re-checking in every Server Action.
5. [OWASP: Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) *(doc)* — `dangerouslySetInnerHTML` and sanitizing with DOMPurify.
6. [OWASP: Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) *(doc)* — Denying by default and checking on every request.
7. [OWASP: Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) *(doc)* — The CSRF check with Fetch Metadata.
8. [Better Auth: Next.js integration](https://www.better-auth.com/docs/integrations/next) *(doc)* — `getSessionCookie` not validating the cookie, and the optimistic check in the proxy.
9. [Playwright: Authentication](https://playwright.dev/docs/auth) *(doc)* — The setup project, `storageState` and a session per role.
10. [Better Auth: Rate Limit](https://better-auth.com/docs/concepts/rate-limit) *(doc)* — The default limit in production, and 3 requests in 10 seconds for `/sign-in/email`.
