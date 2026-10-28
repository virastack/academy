---
title: "XSS and CSP"
description: "dangerouslySetInnerHTML, unsafe URLs and Content Security Policy."
lastVerified: "2026-10-22"
translationKey: "auth-security/xss-and-csp"
---

**XSS** *(Cross-Site Scripting)* is an attacker running their own JavaScript on your page. Because the code runs on your domain, it can make requests with the user's session, read the data on the page and change the form.[^1]

Malicious content arrives two ways. If a parameter in the URL is printed onto the page, the attacker sends the link to the victim. If a comment is saved into the database and shown to everybody, that is called **stored** XSS; everyone who opens the page is affected.[^1]

> [!NOTE]
>
> The code in this lesson was tested in Chromium with `next@16.4.2`, `react@19.3.1` and `isomorphic-dompurify@4.6.0`.

## React protects you most of the time

Every value written inside JSX is encoded as text *(output encoding)*. A `<` becomes `&lt;`, and the browser shows it as writing rather than as a tag.[^1]

```tsx
<p>{bio}</p>
```

In a test the `bio` value was given as `<img src=x onerror="...">`. That text appeared on the page exactly as writing, and the code did not run.

OWASP also writes that modern frameworks reduce XSS bugs. But it lists the holes too: `dangerouslySetInnerHTML`, unchecked URLs and the escape hatches that touch the DOM directly.[^2]

## dangerouslySetInnerHTML

This prop turns React's encoding off and prints the text as HTML. The React documentation says that opening an XSS hole with it is "very easy" when it is used with untrusted content.[^3]

```tsx
// ❌ HTML coming from the user is printed directly
<div dangerouslySetInnerHTML={{ __html: post.content }} />
```

If you have to print HTML *(Markdown output, a rich text editor)*, **sanitize** it first. Sanitizing strips the dangerous parts out of the HTML and leaves the safe part. OWASP recommends DOMPurify for that job.[^2] [!react] React does not clean the content itself; that is the developer's job.[^4]

DOMPurify needs a DOM to work. Because there is no DOM on the server, calling `dompurify` directly in a Server Component or during SSR raises an error.[^5] In a test, even in a `"use client"` component the error `sanitize is not a function` appeared during the SSR stage. `isomorphic-dompurify`, a wrapper that works on the server too, uses jsdom behind the scenes:[^6]

```command
npm install isomorphic-dompurify
```

```tsx
// components/post-body.tsx
import DOMPurify from "isomorphic-dompurify";

export function PostBody({ html }: { html: string }) {
  const markup = { __html: DOMPurify.sanitize(html) };

  return <div dangerouslySetInnerHTML={markup} />;
}
```

In the test the input `<b>Hello</b><img src=x onerror="...">` was printed as `<b>Hello</b><img src="x">`. The bold text stayed and the `onerror` was removed.

> [!TIP]
>
> The React documentation recommends creating the `{ __html }` object as close as possible to where the HTML is produced. That way, which variable carries HTML is clearly visible in the code.[^3]

> [!WARNING]
>
> Keep DOMPurify and the jsdom on the server up to date. As browsers change, new bypasses are found.[^2][^5]

The same rule holds while printing a model's output in the interface: it is in the [Security and cost](/academy/ai/security-and-cost) lesson.

## Unsafe URLs

Turning a website address the user entered into a link looks innocent. But if the address starts with `javascript:`, the code runs when it is clicked.

React 19 blocks `javascript:` addresses inside `href` and `src`.[^2] In a test `<a href="javascript:...">` was written, and React replaced the address with a harmless value that only throws an error when clicked. OWASP adds that this does not replace application-specific URL checking.[^2] Other schemes such as `data:` and the open redirect problem are still yours. So check the schemes you allow explicitly:

```tsx
function isSafeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function WebsiteLink({ href }: { href: string }) {
  if (!isSafeUrl(href)) {
    return null;
  }

  return (
    <a href={href} rel="noopener noreferrer">
      Website
    </a>
  );
}
```

> [!DONT]
>
> - Do not print user data with `innerHTML`, `outerHTML` or `document.write`. Those are the most dangerous points in the DOM.[^1]
> - Do not use `eval`, `new Function` or a `setTimeout` that takes a string.

## Content Security Policy

Despite all the measures, a hole can remain. **CSP** *(Content Security Policy)* is an HTTP header that tells the browser which scripts it may run. MDN describes it as a second line of defence: the first defence is encoding and sanitizing, and CSP steps in when those miss something.[^1]

### Not an allowlist but a nonce

In the old method, trusted domains are listed. Google's 2016 study, which examined 26,011 different policies, showed that **94.72% of them could be bypassed**. The reason was that the popular allowed domains held scripts an attacker could use.[^7]

The recommended method is a **strict CSP**. The server produces a random **nonce** on every request. Only the scripts carrying that value run. `'strict-dynamic'`, meanwhile, also allows the scripts a trusted script loads.[^8] A `<script>` tag the attacker adds does not run, because it does not know the nonce. Inline event handlers *(`onerror`, `onclick`)* and `javascript:` addresses are blocked entirely too.[^1]

### CSP in Next.js

[!nextjs] Next.js recommends producing the nonce inside `proxy.ts`:[^9]

```ts
// proxy.ts
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}
```

Next.js reads the nonce from the header and adds it to its own scripts automatically. In a test all 9 scripts on the page carried the nonce.[^9] On the same page, an `<img onerror>` printed with `dangerouslySetInnerHTML` without being cleaned did not run; a "Refused to execute inline event handler" error appeared in the console.

Four things you should know:[^9]

- The nonce changes on every request. So pages with a CSP **cannot be statically generated** and are rendered dynamically. Call `await connection()` on the page if you need to.
- For the same reason the nonce is incompatible with **Partial Prerendering** *(`cacheComponents: true`)*: the scripts in the pre-generated shell cannot get the nonce.
- In the development environment React uses `eval` for debugging; `'unsafe-eval'` is added there only.
- `frame-ancestors 'none'` stops your page being put inside an `iframe` on another site. It is covered together with the security headers in the next lesson.

### Report first, then enforce

Putting a CSP straight into production can break an analytics script or a third-party widget. Publish it with the `Content-Security-Policy-Report-Only` header first. The browser blocks nothing and only reports what it would block. Once there are no problems left, move to the real header.[^8]

> [!TIP]
>
> In Chromium-based browsers, the `require-trusted-types-for 'script'` directive blocks plain text being assigned to points such as `innerHTML` entirely. OWASP counts it among the few measures that remove DOM XSS as a class.[^2] [Philippe De Ryck](https://pragmaticwebsecurity.com/about) explains how to use it together with DOMPurify in React.[^4]

## Try it yourself

- On a page, print a value coming from `searchParams` both with `{value}` and with `dangerouslySetInnerHTML`. Open the address `?q=<img src=x onerror=alert(1)>` and see the difference.
- Add `proxy.ts` and open the same address again. Find the CSP error in DevTools > **Console**.
- Search for `<script` tags in your page's source and check that they all carry a `nonce`.

## Going deeper

- **Official docs:** the OWASP XSS Prevention Cheat Sheet; the framework holes, sanitizing and where CSP sits.[^2]
- **Article:** Lukas Weichselbaum, "Mitigate cross-site scripting with a strict CSP"; building a policy with nonces and hashes, and a step-by-step migration.[^8]
- **Article:** Philippe De Ryck, "Securing SPAs with Trusted Types"; DOM XSS and Trusted Types in React.[^4]
- **Research:** "CSP Is Dead, Long Live CSP!"; why allowlist CSPs did not work.[^7]

## Sources

1. [MDN: Cross-site scripting (XSS)](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS) *(doc)* — The kinds of XSS, output encoding, the dangerous DOM APIs, CSP being a second defence, and what a strict CSP blocks.
2. [OWASP: Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) *(doc)* — The framework holes, React 19's `javascript:` block and its limit, the DOMPurify recommendation and keeping it current, and Trusted Types.
3. [React: Dangerously setting the inner HTML](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html) *(doc)* — The prop's risk and the advice to create the `{ __html }` object where the HTML is produced.
4. [Philippe De Ryck](https://pragmaticwebsecurity.com/about): [Securing SPAs with Trusted Types](https://auth0.com/blog/securing-spa-with-trusted-types/) *(article)* — June 15, 2021. React not cleaning the content, DOMPurify and the Trusted Types policies.
5. [DOMPurify](https://github.com/cure53/DOMPurify) *(repo)* — The usage, the DOM requirement on the server and the warning about keeping jsdom current.
6. [isomorphic-dompurify](https://github.com/kkomelin/isomorphic-dompurify) *(repo)* — Using DOMPurify the same way on the server and the client; the Next.js example.
7. [Google: CSP Is Dead, Long Live CSP!](https://research.google.com/pubs/pub45542.html) *(research)* — Weichselbaum, Spagnuolo, Lekies and Janc, ACM CCS 2016. 94.72% of 26,011 policies being bypassable, and the nonce-based approach.
8. [Lukas Weichselbaum](https://research.google/people/lukasweichselbaum/): [Mitigate cross-site scripting (XSS) with a strict CSP](https://web.dev/articles/strict-csp) *(article)* — Last updated September 13, 2024. The nonce, `'strict-dynamic'`, `object-src` and `base-uri`, and the migration with Report-Only.
9. [Next.js: Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy) *(doc)* — The nonce with `proxy.ts`, the automatic nonce insertion, dynamic rendering being required, and `'unsafe-eval'` in development.
