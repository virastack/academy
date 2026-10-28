---
title: "OAuth and OIDC flows"
description: "The authorization code flow and PKCE, access and ID tokens, and how 'Sign in with Google' works."
lastVerified: "2026-10-18"
translationKey: "auth-security/oauth-and-oidc"
---

When you press the "Sign in with [!google] Google" button, two standards work together behind the scenes: **OAuth 2.0** and **OpenID Connect** *(OIDC)*, which is built on top of it. In this lesson you will see what each of them is for, which flow should be used today and where the tokens should live.

## What OAuth solves

Before OAuth, if an application wanted to reach your Gmail contacts it would ask you for your Gmail password. OAuth came about to solve that problem: without sharing their password, the user grants an application **limited and revocable** access.[^1]

There are four roles in the flow:[^2]

| Role | Example |
| :-- | :-- |
| The resource owner | The user |
| The client | Your application |
| The authorization server | Google, GitHub or your own identity provider *(Auth0, Keycloak…)* |
| The resource server | The API to be reached *(the Google Calendar API, for example)* |

> [!NOTE]
>
> OAuth is an **authorization** protocol: it says "this application can reach that API with this scope". It does not say who the user is. For authentication you need OIDC.

## The Authorization Code flow

This is the flow recommended today for every OAuth sign-in that starts in a browser:[^2][^3]

1. The application redirects the user to the authorization server's sign-in page.
2. The user signs in there and approves the requested permissions *(the scopes)*.
3. The authorization server sends the user back to the `redirect_uri` with a short-lived **authorization code**.
4. The application sends that code to the authorization server and receives an **access token** in return.
5. The application makes a request to the API with the access token.

The first redirect is a URL:

```text
https://auth.example.com/authorize
  ?response_type=code
  &client_id=shop-web
  &redirect_uri=https://shop.example.com/callback
  &scope=openid profile email
  &state=af0ifjsldkj
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
```

The return is a URL too:

```text
https://shop.example.com/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj
```

The code is useless on its own; it has to be exchanged for a token. The `state` value is there to check that the returning response belongs to the flow you started *(CSRF protection)*.[^3]

## PKCE

**PKCE** *(Proof Key for Code Exchange, pronounced "pixy")* stops someone who intercepts the authorization code from exchanging it for a token.[^4]

1. The application produces a random `code_verifier` and stores it.
2. It adds that value's SHA-256 hash to the first redirect as the `code_challenge`.
3. While exchanging the code for a token, it sends the original `code_verifier`. The authorization server compares the hashes.

An attacker who catches the code in transit does not hold the `code_verifier`, so they cannot use the code.[^5] Producing it with the Web Crypto API takes a few lines:

```ts
function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createCodeVerifier() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(digest));
}
```

The call `createCodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")` gave the same result as the example in RFC 7636: `E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM`.[^5] In a real project you do not write this yourself; the auth library does. Even so, make sure your library uses PKCE.

## The flows no longer used

RFC 9700 *(January 2025)*, which collects the OAuth 2.0 security recommendations, explicitly drops some of the old flows:[^3]

| Flow | Status |
| :-- | :-- |
| Implicit *(`response_type=token`)* | Do not use it; the token comes back in the URL and can leak |
| Resource Owner Password Credentials | MUST NOT be used; the application still sees the user's password |
| Authorization code + PKCE | The recommended flow for every client, browser and mobile applications included |

RFC 9700 also asks that the `redirect_uri` be checked with an exact match and that the access token be bound to a particular API *(the audience)*.[^3] OAuth 2.1, which collects these changes into one document, is still at the draft stage.[^6]

## OpenID Connect

OIDC adds a thin identity layer on top of OAuth. The flow is the same; the difference is that `openid` is requested among the scopes and that an **ID token** comes back alongside the access token.[^7][^8]

An ID token is a JWT *(we saw JWTs in the [Sessions, cookies and JWT](/academy/auth-security/sessions-cookies-and-jwt) lesson)*. It states who signed in, when and for which application:[^8]

```json
{
  "iss": "https://auth.example.com",
  "sub": "248289761001",
  "aud": "shop-web",
  "exp": 1792323192,
  "iat": 1792319592,
  "nonce": "n-0S6_WzA2Mj",
  "email": "jane@example.com"
}
```

| Claim | What it means |
| :-- | :-- |
| `iss` | The identity provider that produced the token |
| `sub` | The user's permanent identifier at that provider; it does not change even if the email does |
| `aud` | Which application *(`client_id`)* the token was produced for |
| `nonce` | Ties the request to the ID token; prevents a replay attack |

Match the user in your database not by email but by the `iss` + `sub` pair.[^8]

### Access token and ID token

The two tokens are often confused. The rule on oauth.net is short: an ID token is not sent to an API, and a client does not read an access token.[^9]

| | Access token | ID token |
| :-- | :-- | :-- |
| Who it is for | The API *(the resource server)* | Your application *(the client)* |
| What it says | "This request is authorised with this scope" | "This user has just signed in" |
| Its format | Varies by provider; opaque to the client | Always a JWT |

## Where the token should live

RFC 10017, published in August 2026, describes three architectures for browser applications and puts them in order of safety.[^10] [Aaron Parecki](https://aaronparecki.com/) and [Philippe De Ryck](https://pragmaticwebsecurity.com/about) are among the document's authors.

| Architecture | How it works | The recommendation |
| :-- | :-- | :-- |
| Backend for Frontend *(BFF)* | The server runs the OAuth flow; the tokens stay on the server and the browser only holds an `HttpOnly` session cookie | Strongly recommended for business applications and applications handling personal data |
| A token-mediating backend | The server receives the token but hands the access token to the browser | Only if a BFF is not possible |
| An OAuth client in the browser | The whole flow and the tokens are in the browser | Open to all the attacks the document describes |

The reasoning is simple: a malicious script running on the page has the same privileges as the application's own code. If the token is in the browser, it can steal it or obtain a new one.[^10] In a framework with a server, such as [!nextjs], a BFF is the natural structure anyway. Libraries such as Auth.js and Better Auth run the OAuth flow on the server and give the browser only a session cookie.

> [!TIP]
>
> As a rule: run the OAuth flow on the server, do not give an access token to the browser, and recognise the user with the `HttpOnly` cookie you saw in the first lesson.

## Try it yourself

- Keep DevTools > **Network** open while signing in, and find the `authorize` request on a site that does "Sign in with Google". Look at the `response_type`, `scope` and `state` parameters; on sites using PKCE you will see `code_challenge` too.
- Run the `createCodeChallenge` function above in the browser console and obtain the example value from RFC 7636.
- Open your own identity provider's `/.well-known/openid-configuration` address; find the `authorization_endpoint`, `token_endpoint` and the supported `code_challenge_methods_supported` fields.

## Going deeper

- **Video:** [David Neal](https://reverentgeek.com/), "An Illustrated Guide to OAuth and OpenID Connect" *(16 min)*; the flow explained with drawings.[^2]
- **Talk:** [Aaron Parecki](https://aaronparecki.com/), "Why Do We Really Need OAuth?" *(OWASP NZ 2022)*; the problem OAuth solves and today's flows.[^1]
- **Official docs:** RFC 10017, OAuth 2.0 for Browser-Based Applications; the BFF and the attack scenarios in the browser.[^10]
- **Official docs:** RFC 9700, OAuth 2.0 Security Best Current Practice.[^3]

## Sources

1. [Aaron Parecki](https://aaronparecki.com/): [Why Do We Really Need OAuth?](https://www.youtube.com/watch?v=wlUCF4Y9T6k) *(video)* — OWASP NZ 2022; the password-sharing problem and how OAuth came about.
2. [David Neal](https://reverentgeek.com/): [An Illustrated Guide to OAuth and OpenID Connect](https://developer.okta.com/blog/2019/10/21/illustrated-guide-to-oauth-and-oidc) *(article)* — A step-by-step account of the roles and the authorization code flow, the `openid` scope and the ID token; the [video version](https://www.youtube.com/watch?v=t18YB3xDfXI).
3. [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700) *(doc)* — PKCE being required, dropping the implicit and password grants, an exactly matching `redirect_uri`, `state` and the audience restriction.
4. [oauth.net: PKCE](https://oauth.net/2/pkce/) *(doc)* — The `code_verifier` and `code_challenge`, and the attacks PKCE prevents.
5. [RFC 7636: Proof Key for Code Exchange](https://www.rfc-editor.org/rfc/rfc7636) *(doc)* — The S256 transformation, the `code_verifier` length and the authorization code interception attack.
6. [IETF Datatracker: The OAuth 2.1 Authorization Framework](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/) *(doc)* — The draft's current version and status.
7. [OpenID Foundation: How OpenID Connect Works](https://openid.net/developers/how-connect-works/) *(doc)* — OIDC's identity layer on top of OAuth 2.0, the ID token and UserInfo.
8. [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) *(doc)* — The ID token definition, the required claims, `nonce` and the `openid` scope.
9. [oauth.net: ID Tokens vs Access Tokens](https://oauth.net/id-tokens-vs-access-tokens/) *(article)* — An ID token not being sent to an API, and an access token not being read by the client.
10. [RFC 10017: OAuth 2.0 for Browser-Based Applications](https://datatracker.ietf.org/doc/html/rfc10017) *(doc)* — The BFF, token-mediating backend and browser client architectures, and the malicious JavaScript scenarios.
