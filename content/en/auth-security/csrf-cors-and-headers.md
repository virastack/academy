---
title: "CSRF, CORS and the security headers"
description: "Preventing CSRF with SameSite, what CORS does, and the basic HTTP security headers."
lastVerified: "2026-10-22"
translationKey: "auth-security/csrf-cors-and-headers"
---

When the browser makes a request to a site, it adds that site's cookies by itself. **CSRF** *(Cross-Site Request Forgery)* uses that: while the user is on another site, that site submits a form to your site in the background. Because the cookie is added, the server thinks the user made the request themselves.[^1]

```html
<!-- attacker.example -->
<form action="https://shop.example/api/transfer" method="POST">
  <input name="to" value="attacker" />
</form>
<script>document.forms[0].submit()</script>
```

> [!NOTE]
>
> The code in this lesson was tested in Chromium with `next@16.4.2`. The attacker page ran on `127.0.0.1:4000` and the application on `localhost:3123`; the browser counts those two as different sites.

## SameSite: the first defence

In the [Sessions, cookies and JWT](/academy/auth-security/sessions-cookies-and-jwt) lesson we gave the session cookie `SameSite=Lax`. `Lax` stops the cookie being added to a `POST` request coming from another site.[^1]

In the test the attacker page submitted the form above. The request reached the server but there was no cookie; the user was not recognised.

`SameSite` is not enough on its own:[^1][^2]

- **A site is not an origin.** `blog.shop.example` and `shop.example` count as the same site. If there is a hole on one subdomain, `SameSite` does not protect you.
- **`Lax` allows redirects arriving with `GET`.** If you do something that changes state with a `GET`, the cookie is sent.
- **Older browsers** do not support `SameSite`.

> [!DONT]
>
> - Do not do deletions, purchases or setting changes with a `GET` request. OWASP forbids it explicitly.[^2]

## Server Actions protect themselves

[!nextjs] Server Actions are only called with `POST`. Next.js also compares the request's `Origin` header with the site's `Host` header. If they do not match, it stops the operation.[^3]

In the test the attacker page copied the hidden action id from the real form and sent the same request. The server refused it with an `Invalid Server Actions request` error. The same form worked when submitted from the application's own page.

If your application is behind a reverse proxy and the domain in the address bar reaches the server differently, you add that domain to the `allowedOrigins` list.[^4]

> [!WARNING]
>
> A request with no `Origin` header at all is not refused; only a warning is logged.[^4] Modern browsers send that header on a `POST`; but do not count this check as your only defence.

## Protecting a Route Handler

In a Route Handler that check does **not** exist. In the test the attacker page's form reached `/api/transfer` and returned `200`. Because the cookie was not sent thanks to `SameSite`, there was no harm, but a cookie using `SameSite=None`, or a subdomain on the same site, opens that door.

OWASP recommends the **Fetch Metadata** headers for modern browsers. The browser adds `Sec-Fetch-Site` to every request and the page code cannot change its value: `same-origin`, `same-site`, `cross-site` or `none`.[^2] All the major browsers have been sending that header since March 2023.[^2]

```ts
// lib/csrf.ts
export function isCrossSiteRequest(request: Request) {
  const site = request.headers.get("sec-fetch-site");

  if (site) {
    return site !== "same-origin";
  }

  // An older browser: look at the Origin header
  const origin = request.headers.get("origin");
  return origin !== null && origin !== new URL(request.url).origin;
}
```

```ts
// app/api/transfer/route.ts
import { isCrossSiteRequest } from "@/lib/csrf";

export async function POST(request: Request) {
  if (isCrossSiteRequest(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  // ...
}
```

In the test the same attack got a `403` with this check. OWASP counts falling back to the `Origin` check as required for older browsers that do not send `Sec-Fetch-Site`.[^2]

## What CORS does and does not do

By default the browser does not let a page **read** a response coming from another origin. That is called the *same-origin policy*. **CORS** *(Cross-Origin Resource Sharing)* lets the server say "this origin may read my response".[^5][^6]

The most common misconception is thinking CORS is a firewall. CORS does not stop **the request being sent**; it only stops the response being read. [Jake Archibald](https://jakearchibald.com/) shows that an ordinary `POST`, such as a form submission, is sent with no preflight.[^6] The CSRF attack above works for that reason, whatever the CORS setting is.

Only requests using custom headers, a JSON body or methods such as `PUT` and `DELETE` ask permission first with an `OPTIONS`.[^5][^6]

If you have to open an API for another site to read, keep an allowlist:

```ts
// app/api/products/route.ts
const allowedOrigins = ["https://partner.example.com"];

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !allowedOrigins.includes(origin)) {
    return { Vary: "Origin" };
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function GET(request: Request) {
  const products = await getProducts();
  return Response.json(products, { headers: corsHeaders(request.headers.get("origin")) });
}
```

In the test the page on the allowed origin read the list. The page on a disallowed origin got a `Failed to fetch` error.

> [!DONT]
>
> - Do not write the incoming `Origin` value straight back without checking it. Used together with cookies, that lets any site read the user's data.[^6][^7]
> - Do not forget the `Vary: Origin` header. Without it a CDN can serve the response given to one origin to another.[^6]

## The security headers

A few HTTP headers tighten the browser's behaviour against known attacks. The ones OWASP recommends:[^7]

| Header | Value | What it is for |
| :-- | :-- | :-- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | The site is only reached over HTTPS |
| `X-Content-Type-Options` | `nosniff` | The browser does not guess the file type |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | The full URL is not sent to other sites |
| `X-Frame-Options` | `DENY` | The page cannot be put inside an `iframe` *(clickjacking)* |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Unused browser features are turned off |

In Next.js these headers are given inside `next.config.ts`:[^8]

```ts
// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
```

`poweredByHeader: false` removes the `X-Powered-By: Next.js` header. OWASP recommends deleting that header.[^7] We added the CSP with `proxy.ts` in the previous lesson, [XSS and CSP](/academy/auth-security/xss-and-csp). The `frame-ancestors 'none'` there is the modern equivalent of `X-Frame-Options`.[^7]

> [!WARNING]
>
> Try HSTS with a short `max-age` first. If something goes wrong with the certificate, users cannot reach the site for the duration of the `max-age`.[^7]

> [!TIP]
>
> OWASP recommends [Mozilla Observatory](https://observatory.mozilla.org/) for checking the headers.[^7]

## Try it yourself

- Open two servers on two different addresses *(`localhost` and `127.0.0.1`)*. Submit a form from one to the other and read the `Sec-Fetch-Site` value in DevTools > **Network**.
- Make your session cookie `SameSite=None; Secure` and repeat the same attack. Delete the check in the Route Handler and compare the results.
- List your own site's headers with `curl -I` and compare them with the table.

## Going deeper

- **Official docs:** the OWASP CSRF Prevention Cheat Sheet; Fetch Metadata, the `Origin` check, tokens and `SameSite`.[^2]
- **Article:** Jake Archibald, "How to win at CORS"; the history of CORS, requests with cookies, preflights and an interactive CORS playground.[^6]
- **Official docs:** the OWASP HTTP Security Response Headers Cheat Sheet; the recommended value for every header.[^7]

## Sources

1. [MDN: Cross-site request forgery (CSRF)](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF) *(doc)* — How the attack works, the `SameSite` values, `Lax`'s weak spots, and the difference between a site and an origin.
2. [OWASP: Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) *(doc)* — Fetch Metadata, the `Sec-Fetch-Site` support, the requirement to fall back to `Origin`, not changing state with a `GET`, and `SameSite`'s limits.
3. [Next.js: How to think about data security — Allowed origins](https://nextjs.org/docs/app/guides/data-security#allowed-origins-advanced) *(doc)* — Server Actions being limited to `POST`, and the `Origin`-`Host` comparison.
4. [Next.js: serverActions](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) *(doc)* — `allowedOrigins`, the reverse proxy case, and a request with no `Origin` passing with a warning.
5. [MDN: Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) *(doc)* — The same-origin policy, simple requests, preflights and requests with cookies.
6. [Jake Archibald](https://jakearchibald.com/): [How to win at CORS](https://jakearchibald.com/2021/cors/) *(article)* — October 12, 2021. CORS protecting the reading of the response, form-like requests going without a preflight, the `*` ban on requests with cookies, and `Vary`.
7. [OWASP: HTTP Security Response Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) *(doc)* — HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options` and `frame-ancestors`, `Permissions-Policy`, `X-Powered-By`, the CORS recommendation and Mozilla Observatory.
8. [Next.js: headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers) *(doc)* — Defining headers inside `next.config`, and the `source` matching.
