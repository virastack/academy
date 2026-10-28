---
title: "Sessions, cookies and JWT"
description: "The difference between a server session and a JWT, the cookie flags, and where to store the token."
lastVerified: "2026-10-18"
translationKey: "auth-security/sessions-cookies-and-jwt"
---

## Why a session is needed

HTTP handles every request independently of the others. For the server to recognise a user on the next request after they sign in, the browser has to send a value saying "this is me" with every request. Producing and verifying that value is called **session management**.[^1]

The Next.js documentation splits the job into three parts:[^2]

| Concept | The question |
| :-- | :-- |
| Authentication | Is the user who they say they are? |
| Session management | How is the signed-in state preserved between requests? |
| Authorization | Which pages and data can the user reach? |

This lesson is about the middle part. There are two common ways to hold a session: a **server session** and a **JWT**.

## A server session

When the user signs in, the server produces a random session identifier *(a session ID)*, saves it in the database and sends it to the browser in a cookie. The browser sends that cookie back with every following request, and the server looks the identifier up in the database.[^3]

```http
HTTP/1.1 200 OK
Set-Cookie: __Host-session=k7Qp2v...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
```

The cookie holds no information about the user at all; it holds only an unguessable key. OWASP asks that this identifier have at least 64 bits of entropy and be produced with a secure random number generator.[^4] [Pilcrow](https://pilcrowonpaper.com/) also recommends saving the secret value into the database as a hash.[^3]

Its biggest advantage is that the control is on the server: deleting the session from the database signs the user out immediately. Features such as "sign out of all devices" are easy for that reason.[^5]

## JWT

A **JSON Web Token** is a piece of text made of three parts separated by dots: the header, the payload and the signature. The first two parts are JSON encoded with Base64URL.[^6]

```text
eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiY3VzdG9tZXIiLCJzdWIiOiJ1c2VyXzQyIiwiaWF0IjoxNzkyMzE5NTkyLCJleHAiOjE3OTIzMjA0OTJ9.taq0IJqNLhO36wrUVbxqry0i_t9l5cN5NhM7WXD4vTU
```

The part up to the first dot is the header, the part up to the second dot the payload, and what follows the signature.

The fields in the payload are called **claims**. The standard ones are short names such as `sub` *(who)*, `exp` *(when it expires)*, `iat` *(when it was produced)*, `iss` *(who produced it)* and `aud` *(who it is for)*.[^7]

Unlike a server session, a JWT **carries the information itself**. The server does not go to the database on every request; it only checks the signature. The signature guarantees that the payload was not changed.[^6]

> [!WARNING]
>
> A signed JWT is not encrypted. Anyone who gets hold of the token can read the payload. Do not put information such as an email address, a phone number or a password into the payload; the user id and the role are enough.[^6][^2]

You can try this with the [jose](https://github.com/panva/jose) library:

```ts
import { SignJWT, decodeJwt, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

const token = await new SignJWT({ role: "customer" })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject("user_42")
  .setIssuedAt()
  .setExpirationTime("15m")
  .sign(secret);

// No key is needed to read the payload
console.log(decodeJwt(token));
// { role: "customer", sub: "user_42", iat: 1792319592, exp: 1792320492 }

// One is needed to verify it
const { payload: session } = await jwtVerify(token, secret, {
  algorithms: ["HS256"],
});
```

If you make the `role` value in the payload `admin` and send the token again, `jwtVerify` fails with `signature verification failed`. Writing `"alg": "none"` in the header and deleting the signature does not work either, because the `algorithms` list only accepts `HS256`. RFC 8725, which collects the security recommendations for JWT, asks for exactly that: the library has to take the acceptable algorithms from you, and has to reject the whole token if even one of the checks fails.[^8]

## Which one should you pick

| | A server session | A JWT |
| :-- | :-- | :-- |
| Where the information is | In the database | Inside the token |
| On every request | A database query | Only a signature check |
| Early revocation | Deleting the record is enough | Valid until it expires; a separate deny list is needed for revocation |
| Size | A short identifier | Grows with the claims; the cookie limit is around 4 KB[^5] |
| Where it fits | A web application with its own server | Short-lived authorisation between services, an OAuth access token |

The Auth.js documentation states the difference plainly: invalidating a JWT before it expires is not possible, while a database session can be changed or deleted at any moment.[^5] Auth.js picks a JWT by default when no database is configured, but it does not just sign the token: it **encrypts** it with a server-specific key and puts it in an `HttpOnly` cookie.[^5]

[Randall Degges](https://www.rdegges.com/)'s "JWTs Suck" presentation reaches the same conclusion: for a web application in the browser, a classic session cookie is usually simpler and safer. If you are going to use a JWT, keep its lifetime short.[^9]

> [!TIP]
>
> In a React or Next.js application with your own server, the default choice is: a session identifier, or encrypted session data, inside an `HttpOnly` cookie. Move to managing a JWT by hand only when you really need to.

## The cookie flags

Whichever route you pick, the value most likely travels inside a cookie. The cookie's safety is decided by the flags in the `Set-Cookie` header:[^1]

| Flag | What it does |
| :-- | :-- |
| `HttpOnly` | JavaScript cannot read the cookie; it does not appear in `document.cookie` |
| `Secure` | The cookie is only sent on HTTPS requests |
| `SameSite=Lax` | It is not sent on a form or image request from another site; it is sent when you arrive by clicking a link |
| `SameSite=Strict` | It is not sent on any request coming from another site |
| `Max-Age` | How many seconds the cookie lives; it takes precedence over `Expires` |
| `Path=/` | Valid on all the site's paths |
| The `__Host-` prefix | The browser accepts the cookie only if it is `Secure`, has `Path=/` and no `Domain`; the cookie does not leak to subdomains |

OWASP counts `Secure` and `HttpOnly` as required for a session cookie; it asks for `Strict` or `Lax` for `SameSite` and recommends the `__Host-` prefix.[^4] [Pilcrow](https://pilcrowonpaper.com/), on the other hand, prefers `Lax`, because `Strict` makes a user arriving by clicking a link from another site look signed out.[^10]

When a page sending the two cookies below was opened in Chromium, `document.cookie` returned only `theme=dark`; `session_id` appears in DevTools but cannot be read from JavaScript:

```http
Set-Cookie: session_id=abc123; HttpOnly; SameSite=Lax; Path=/
Set-Cookie: theme=dark; SameSite=Lax; Path=/
```

In [!nextjs] you write the cookie on the server with the `cookies()` API, with the same flags:[^2]

```ts
import { cookies } from "next/headers";

const cookieStore = await cookies();
cookieStore.set("session", session, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  expires: expiresAt,
});
```

## Where to store the token

This is the most debated question. OWASP's answer is clear: do not put the session identifier or the token in `localStorage` or `sessionStorage`, because every piece of JavaScript running on the page can reach them.[^4][^11]

| Where | Can it be stolen with XSS | Note |
| :-- | :-- | :-- |
| `localStorage` | Yes | It is not deleted even when the browser closes; a single XSS hole sends the token away |
| An `HttpOnly` cookie | No | The browser sends it automatically; `SameSite` and extra measures are needed against CSRF |

`HttpOnly` is not a magic shield. As [Pilcrow](https://pilcrowonpaper.com/) reminds you, on a page with an XSS hole the attacker cannot read the cookie but can make requests on the user's behalf. What `HttpOnly` gives you is preventing the token from being **copied and used elsewhere**.[^10] The real measures against XSS are in the XSS and CSP lesson.

For applications that run in the browser and send a token to another API, the current recommendation is the **Backend for Frontend** *(BFF)* pattern: the tokens stay on the server and the browser only carries an `HttpOnly` session cookie.[^4] [Philippe De Ryck](https://pragmaticwebsecurity.com/about)'s LocoMocoSec talk covers these trade-offs between cookies and tokens.[^12]

## The session's lifecycle

| Moment | What you do |
| :-- | :-- |
| Sign-in | Produce a new session identifier; do not keep using the one from before the sign-in *(session fixation)*[^4] |
| Use | End the session after a certain period of inactivity *(an idle timeout)*; and set an overall upper limit too *(an absolute timeout)*[^4] |
| Sign-out | Delete the session **on the server**; deleting the cookie alone does not invalidate a stolen copy[^4] |

OWASP finds an inactivity period of 15-30 minutes reasonable for low-risk applications.[^4] In applications that stay open for a long time, the session is extended as it is used, and for sensitive operations such as changing a password the user is asked to authenticate again.[^13]

## Try it yourself

- On a site you are signed in to, open DevTools > **Application** > **Cookies**. Look at the session cookie's `HttpOnly`, `Secure` and `SameSite` columns.
- In the same page's console, type `document.cookie`; see that the `HttpOnly` cookie is not in the list.
- Change the payload of the example token on [jwt.io](https://www.jwt.io/) and see that the signature is invalid.

## Going deeper

- **Guide:** [Pilcrow](https://pilcrowonpaper.com/)'s auth book; short, clear pages on sessions, cookies and browser storage.[^3][^10]
- **Official docs:** the OWASP Session Management Cheat Sheet; the identifier length, the cookie flags and the timeout recommendations.[^4]
- **Talk:** [Philippe De Ryck](https://pragmaticwebsecurity.com/about), "The truth about cookies, tokens and APIs" *(LocoMocoSec 2019, 38 min)*.[^12]
- **Slides:** [Randall Degges](https://www.rdegges.com/), "JWTs Suck"; a point-by-point comparison of a JWT with a session cookie.[^9]
- **Official docs:** the Next.js Authentication guide; stateless and database sessions, and the cookie settings.[^2]

## Sources

1. [MDN: Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) *(doc)* — Cookies for session management, `Max-Age`, `Secure`, `HttpOnly`, `SameSite` and the `__Host-` prefix.
2. [Next.js: How to implement authentication](https://nextjs.org/docs/app/guides/authentication) *(doc)* — The authentication, session management and authorization split; stateless and database sessions, and the recommended settings with `cookies()`.
3. [Pilcrow](https://pilcrowonpaper.com/): [Sessions](https://auth.pilcrowonpaper.com/sessions) *(article)* — The server-side session record, a random and hashed secret value, the lifetime and re-authentication.
4. [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) *(doc)* — 64 bits of entropy, the required cookie flags, `__Host-`, renewing the identifier after a sign-in, the timeouts, signing out on the server and the web storage warning.
5. [Auth.js: Session strategies](https://authjs.dev/concepts/session-strategies) *(doc)* — A comparison of JWT and database sessions, the encrypted JWT cookie and the early revocation problem.
6. [JWT.io: Introduction to JSON Web Tokens](https://www.jwt.io/introduction) *(doc)* — The header, payload and signature structure, and a signed token not being encrypted.
7. [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519) *(doc)* — The definition of a JWT and the registered claims such as `iss`, `sub`, `aud`, `exp` and `iat`.
8. [RFC 8725: JWT Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725) *(doc)* — Passing an algorithm list, the `none` algorithm, all the checks having to pass, and the `iss`/`aud` check.
9. [Randall Degges](https://www.rdegges.com/): [JWTs Suck](https://speakerdeck.com/rdegges/jwts-suck) *(article)* — A comparison of a JWT with a session cookie on convenience, security, revocation and scaling.
10. [Pilcrow](https://pilcrowonpaper.com/): [Browser client-side storage](https://auth.pilcrowonpaper.com/browser-client-side-storage) *(article)* — Cookies and Web Storage, and what `HttpOnly` does and does not prevent.
11. [OWASP: HTML5 Security Cheat Sheet — Local Storage](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage) *(doc)* — The recommendation not to keep a session identifier in local storage.
12. [Philippe De Ryck](https://pragmaticwebsecurity.com/about): [The truth about cookies, tokens and APIs](https://www.youtube.com/watch?v=-zD11ubPsFM) *(video)* — LocoMocoSec 2019; the CSRF and XSS trade-offs of cookie- and token-based sessions.
13. [Pilcrow](https://pilcrowonpaper.com/): [Auth sessions](https://auth.pilcrowonpaper.com/auth-sessions) *(article)* — The session lifetime, extending it as it is used, and separate verification for sensitive operations.
