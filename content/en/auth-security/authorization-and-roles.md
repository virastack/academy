---
title: "Authorisation and roles"
description: "Checking roles and permissions, and protecting pages, APIs and Server Actions."
lastVerified: "2026-10-18"
translationKey: "auth-security/authorization-and-roles"
---

Authentication answers "who are you?". **Authorization** answers "are you allowed to do this?". Not every signed-in user can do everything: a customer only sees their own order, an editor updates products, an admin manages users.

The subject looks small, but *Broken Access Control* is **first** in OWASP Top 10:2025. Some kind of access control flaw was found in 100% of the applications OWASP tested.[^1]

> [!NOTE]
>
> The code in this lesson was built on the project from the [Auth in Next.js](/academy/auth-security/auth-in-nextjs) lesson and tested in Chromium with `next@16.4.2` and `better-auth@1.7.10`.

## 401, 403 and 404

| Status | What it means | When |
| :-- | :-- | :-- |
| `401 Unauthorized` | Who you are is not established | There is no session, or it is invalid |
| `403 Forbidden` | I know who you are but you have no permission | Signing in again does not change the result |
| `404 Not Found` | There is no such record | Instead of 403, when you do not want to reveal even that the record exists |

MDN says that if you do not want to show an unauthorised user that the resource exists, you can return a 404 instead of a 403.[^2]

## Roles and permissions

The most common model is **RBAC** *(role-based access control)*: every user has a role and every role a list of permissions.[^3] Checking the **permission** rather than the role in the code saves you from changing every `if` line when a new role is added:

```ts
// lib/permissions.ts
export type Role = "customer" | "editor" | "admin";

const permissions = {
  customer: ["order:read-own"],
  editor: ["order:read-own", "product:update"],
  admin: ["order:read-own", "order:read-all", "product:update", "user:manage"],
} as const satisfies Record<Role, readonly string[]>;

export type Permission = (typeof permissions)[Role][number];

export function hasPermission(role: Role, permission: Permission) {
  return (permissions[role] as readonly string[]).includes(permission);
}
```

Because the `Permission` type is derived from the list, a permission that does not exist, such as `hasPermission(user.role, "order:delete-all")`, is a TypeScript error.

RBAC alone cannot answer "does this order belong to this user?". This is why OWASP finds the **ABAC** *(attribute-based)* model, which looks at attributes such as the record's owner, the team or the time, and the **ReBAC** *(relationship-based)* model, which looks at relationships, more flexible.[^3] In practice most applications use both together: the role decides the general permission, and the ownership check decides a single record.

## Who decides the role

The role must not live somewhere the user can change. In Better Auth the role is added to the user table with `input: false`, so it cannot be sent with a sign-up or update request:[^4]

```ts
// lib/auth.ts
export const auth = betterAuth({
  // ...
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "customer",
        input: false,
      },
    },
  },
});
```

In a test, `"role": "admin"` was added to the sign-up request. The request succeeded but `customer` was written into the database.

> [!DONT]
>
> - Do not keep the role in `localStorage`, in the URL *(`?isAdmin=true`)* or in a field the client sends, and do not trust it.[^5]
> - Do not just hide the button and leave the operation unprotected.

## Collecting the check in one place

One more helper is added to the Data Access Layer from the previous lesson. It reads the role from the session, that is from the server, on every request:

```ts
// lib/dal.ts
import "server-only";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role as Role,
  };
}

export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();

  if (!hasPermission(user.role, permission)) {
    throw new Error("Forbidden");
  }

  return user;
}
```

A page or a component now starts with `await requirePermission("user:manage")`. OWASP's two basic rules are applied by themselves in this structure: **deny by default** and **check on every request**.[^3]

## Protecting a Server Action

The Next.js documentation states it plainly: Server Actions can be called with a direct POST request, independently of your interface. The sign-in check on the page does not protect the action inside that page; every action has to do its own check.[^5]

The most common mistake is doing the sign-in check and forgetting the **ownership** check. The user sends someone else's order number and the operation goes through. That is called **IDOR** *(Insecure Direct Object Reference)*.[^6]

```ts
// lib/orders.ts
import "server-only";

export async function cancelOrder(orderId: string) {
  const user = await getCurrentUser();
  const order = await db.order.findUnique({ where: { id: orderId } });

  const canCancel =
    order && (order.userId === user.id || hasPermission(user.role, "order:read-all"));

  if (!canCancel) {
    throw new Error("Not found");
  }

  await db.order.update({ where: { id: orderId }, data: { status: "cancelled" } });
}
```

```ts
// app/orders/actions.ts
"use server";

import { cancelOrder } from "@/lib/orders";

export async function cancelOrderAction(orderId: string) {
  await cancelOrder(orderId);
}
```

The action stays thin; the sign-in, ownership and role checks are in the Data Access Layer.[^5] The test results:

| Who | The operation | The result |
| :-- | :-- | :-- |
| Felix *(customer)* | Cancelling Jane's order | An error; the order stayed `open` |
| Jane *(customer)* | Cancelling her own order | Succeeded |
| Felix *(after being made admin)* | Cancelling Jane's order | Succeeded |

> [!TIP]
>
> Random, unguessable identifiers *(UUIDs)* make IDOR harder but do not solve it. OWASP asks for a separate authorisation check for every object.[^6]

## Protecting a Route Handler

A Route Handler is a public API endpoint too. The session is checked first, then the permission:[^7]

```ts
// app/api/orders/[id]/route.ts
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return new Response(null, { status: 401 });
  }

  if (!hasPermission(session.user.role as Role, "order:read-all")) {
    return new Response(null, { status: 403 });
  }

  const { id } = await params;
  // ...
}
```

In the test, a request with no sign-in got `401`, a customer `403` and an admin `200`.

## Showing it in the interface

Not showing a button the user cannot use is good experience, but it is **not security**. OWASP says client-side access control must never be relied on.[^3] The "Security meets Usability" talk at React Summit 2025 makes the same distinction: the permission check in the frontend is for the user experience, and the real check has to be in the backend.[^8]

```tsx
async function OrderActions({ orderId }: { orderId: string }) {
  const user = await getCurrentUser();

  if (!hasPermission(user.role, "order:read-all")) {
    return null;
  }

  return <CancelOrderButton orderId={orderId} />;
}
```

This component hides the button. The real protection is the check inside `cancelOrder`.

## Try it yourself

- Delete the ownership check in a Server Action, sign in as a second user, send the first user's record id, and see the operation go through.
- Find a Server Action request in DevTools > **Network**, right-click and copy it with **Copy as fetch**, and send it again from the console with a different id.
- Add a new role to the `permissions` object and count how many files you have to change.

## Going deeper

- **Official docs:** the OWASP Authorization Cheat Sheet; deny by default, least privilege and a comparison of RBAC, ABAC and ReBAC.[^3]
- **Official docs:** the Next.js Data Security guide; Server Actions being directly callable, the IDOR example and the checklist.[^5]
- **Talk:** Samhitha Rama Prasad, "Security meets Usability: Crafting Dynamic and Granular Access Control Solutions" *(React Summit 2025, 21 min)*.[^8]
- **Official docs:** OWASP A01:2025 Broken Access Control.[^1]

## Sources

1. [OWASP Top 10:2025 — A01 Broken Access Control](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/) *(doc)* — First place, 100% of the applications tested, IDOR, privilege escalation and the measures.
2. [MDN: 403 Forbidden](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/403) *(doc)* — Its difference from 401 and the option of returning a 404 instead of a 403.
3. [OWASP: Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) *(doc)* — Least privilege, denying by default, checking on every request, RBAC and ABAC/ReBAC, and not trusting client-side checks.
4. [Better Auth: Database — Extending core schema](https://www.better-auth.com/docs/concepts/database#extending-core-schema) *(doc)* — `additionalFields`, `defaultValue` and `input: false` so the user cannot set the role.
5. [Next.js: How to think about data security](https://nextjs.org/docs/app/guides/data-security) *(doc)* — Server Actions being callable with a direct POST, re-checking in every action, the IDOR example, not trusting `searchParams`, and mutations through the DAL.
6. [OWASP: Insecure Direct Object Reference Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html) *(doc)* — The definition of IDOR, an example, and random identifiers not being enough on their own.
7. [Next.js: How to implement authentication — Route Handlers](https://nextjs.org/docs/app/guides/authentication#route-handlers) *(doc)* — The session and role check in a Route Handler, and 401 and 403.
8. [Samhitha Rama Prasad: Security meets Usability](https://gitnation.com/contents/security-meets-usability-crafting-dynamic-and-granular-access-control-solutions) *(video)* — React Summit 2025; RBAC and ABAC, a permission system in React, and the check being required in the backend.
