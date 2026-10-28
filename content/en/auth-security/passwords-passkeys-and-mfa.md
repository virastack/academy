---
title: "Passwords, passkeys and 2FA"
description: "The sign-in form, storing a password on the server, passkeys and two-step verification."
lastVerified: "2026-10-18"
translationKey: "auth-security/passwords-passkeys-and-mfa"
---

To prove their identity, a user can use three kinds of thing: something they **know** *(a password)*, something they **have** *(a phone, a security key)* or something they **are** *(a fingerprint, a face)*.[^1] In this lesson we start with passwords and move on to two-step verification and to passkeys, which are starting to replace passwords.

> [!NOTE]
>
> The code in this lesson was tried on Node 22 with `@node-rs/argon2@2.2.2` and `@simplewebauthn/browser` / `@simplewebauthn/server` version 14, using Chromium's virtual authenticator.

## The sign-in form

The browser and the password manager only recognise your form if you mark it up correctly. The `autocomplete` values matter for that reason:[^2][^3]

```html
<form action="/login" method="post">
  <label for="email">Email</label>
  <input id="email" name="email" type="email" autocomplete="username" required />

  <label for="password">Password</label>
  <input
    id="password"
    name="password"
    type="password"
    autocomplete="current-password"
    required
  />

  <button type="submit">Sign in</button>
</form>
```

| Value | Where |
| :-- | :-- |
| `username` | The email or username field |
| `current-password` | The password on the sign-in form |
| `new-password` | The sign-up and change-password forms; the browser can suggest a strong password |
| `one-time-code` | A one-time code arriving by SMS, email or from an app |

The other recommendations from [Sam Dutton](https://samdutton.com/)'s sign-in form guide: keep the sign-in in its own `<form>`, add a show/hide password control, and do not make the user type the email or the password twice.[^2]

> [!DONT]
>
> - Do not block pasting in the password field.
> - Do not use random `id` or `name` values that break the password manager's autofill.

NIST and OWASP both ask that password managers and pasting be allowed.[^4][^5]

## Password rules

NIST SP 800-63B-4, the United States' digital identity standard, was finalised in July 2025. It removes most of the rules we are used to, such as "one capital letter, one symbol":[^4]

| Rule | What NIST says |
| :-- | :-- |
| Minimum length | 15 characters if the password is used on its own; 8 together with 2FA |
| Maximum length | Allow at least 64 characters |
| Required characters | Do not impose rules such as a capital letter, a digit or a symbol |
| Periodic change | Do not force it; only make them change if the password has leaked |
| A blocklist | Compare the new password against commonly used and leaked passwords |

OWASP's Authentication Cheat Sheet uses the same thresholds.[^5] [Pilcrow](https://pilcrowonpaper.com/) is more relaxed: at least 8-10 characters, no complexity rule, and a leaked-password check.[^6]

### Checking for a leaked password

[Troy Hunt](https://www.troyhunt.com/)'s Have I Been Pwned service offers the passwords seen in breaches through an API that needs no key. You do not send the password: you send only the first 5 characters of its SHA-1 hash and look for the rest in the returned list *(k-anonymity)*.[^7]

```ts
import { createHash } from "node:crypto";

export async function isPwnedPassword(password: string) {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
  });
  const body = await response.text();

  return body
    .split(/\r?\n/)
    .some((line) => line.startsWith(suffix) && !line.endsWith(":0"));
}
```

`Add-Padding` adds fake lines with a count of `0` to the response, so someone watching the network cannot guess the hash from the response's size. You have to skip those lines.[^7]

## Storing the password on the server

A password is **never** written into the database in plain text or in a reversible form *(encryption)*. It goes through a one-way and deliberately slow **hash** function. A random **salt** is added to every password, so the same passwords produce different hashes and cannot be cracked with ready-made tables *(rainbow tables)*.[^8]

| Algorithm | OWASP's recommendation |
| :-- | :-- |
| Argon2id | The first choice; at least 19 MiB of memory, 2 iterations, 1 degree of parallelism |
| scrypt | If Argon2id is not available |
| bcrypt | Only on older systems; it uses the password's first 72 bytes |

```ts
import { hash, verify } from "@node-rs/argon2";

const passwordHash = await hash(password);
// $argon2id$v=19$m=19456,t=2,p=1$s7yr5VbPNOMtc2PzyrKZOA$Mo9MjWu2...

const isValid = await verify(passwordHash, attempt);
```

`@node-rs/argon2`'s defaults turned out to be the same as the values OWASP recommends *(`m=19456` KiB = 19 MiB, `t=2`, `p=1`)*. The salt is produced by the library and written inside the hash string.

> [!TIP]
>
> You do not have to write the password handling yourself. An auth library brings it ready; the options are in the auth in Next.js lesson.

### Brute force and the error messages

Put a **rate limit** on every endpoint that checks a password. OWASP recommends tying the failed attempt counter to the account rather than to the IP address. Locking the account completely, on the other hand, can let an attacker keep the user out.[^5] [Pilcrow](https://pilcrowonpaper.com/) recommends one attempt per minute per user as a starting point.[^6]

OWASP asks for a single message on a sign-in failure that does not reveal whether the account exists: "Email or password is incorrect." Otherwise the attacker learns which email addresses are registered *(user enumeration)*.[^5]

## Two-step verification

So an attacker cannot get in even if the password leaks, a second factor is asked for *(2FA or MFA)*. The options are not equally safe:[^1]

| Method | Note |
| :-- | :-- |
| An SMS code | Easy but weak; open to SIM swapping and phishing. NIST counts it as "restricted" |
| An authenticator app *(TOTP)* | A code that changes every 30 seconds; cheap and widespread, but the code can still be typed into a fake site |
| A passkey or a security key | Phishing-resistant; the key never leaves the device |

While setting 2FA up, give the user one-time **recovery codes**. OWASP reminds you that the flows for bypassing or resetting 2FA are a target for an attacker too.[^1]

## Passkeys

A passkey is a key that replaces the password and is stored on the device. The user unlocks it with a fingerprint, a face or the device PIN.[^9] Behind it is the browsers' **Web Authentication API** *(WebAuthn)* standard:[^10]

1. During registration the device produces a key pair. The **private key** stays on the device, and the **public key** is saved to the server.
2. At sign-in the server sends a random **challenge**. The device signs it with the private key.
3. The server verifies the signature with the public key.

Because the server holds only the public key, even if the database leaks it cannot be used to sign in. The signature is tied to the site's domain; a fake sign-in page cannot get a valid signature.[^10] In a test, trying to use a passkey registered for `localhost` from the address `127.0.0.1` made the browser raise a `SecurityError` before it even reached the signing stage.

Passkeys are synchronised between devices through an Apple, Google or password manager account, and the synchronising service cannot see the private key.[^9]

### A passkey in the form

The easiest route, without disturbing the user's habits, is adding the passkey to the existing sign-in form. Once the `webauthn` value is added to the username field, the browser also shows the registered passkeys in the autofill list *(conditional UI)*:[^11][^3]

```html
<input id="email" name="email" autocomplete="username webauthn" />
```

WebAuthn's raw API makes you deal with binary data. On the [!react] side, a library such as SimpleWebAuthn shortens the job:[^12]

```ts
import { startAuthentication } from "@simplewebauthn/browser";

const optionsJSON = await fetch("/api/passkey/login-options").then((res) =>
  res.json(),
);

const response = await startAuthentication({
  optionsJSON,
  useBrowserAutofill: true,
});

await fetch("/api/passkey/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(response),
});
```

Producing the challenge and verifying the incoming signature is always the server's job *(`@simplewebauthn/server`)*. The browser only mediates between the device and the server.

> [!WARNING]
>
> A user can lose all their devices. Adding passkeys means having to think about the account recovery route: a second passkey, recovery codes or a verified email address.[^1]

## Try it yourself

- Add the right `autocomplete` values to your own sign-in form and see the browser's password suggestion on the sign-up form.
- Create a passkey on the [webauthn.io](https://webauthn.io/) demo site and sign in with it; then look at how the passkey appears in your browser's or your operating system's password manager.
- Call `isPwnedPassword("password123")` and look at the result; then try a long, random password.

## Going deeper

- **Guide:** the "Passwords" and "Passkeys" pages of [Pilcrow](https://pilcrowonpaper.com/)'s auth book.[^6]
- **Official docs:** OWASP's Password Storage and Multifactor Authentication cheat sheets.[^8][^1]
- **Talk:** Clemens Hübner, "Passwordless future: WebAuthn and Passkeys in practice" *(WeAreDevelopers World Congress 2023, 32 min)*; the weaknesses of SMS and TOTP, how WebAuthn works and the recovery flows.[^13]
- **Official docs:** passkeys.dev; the guide to adding a passkey to an existing site.[^9]

## Sources

1. [OWASP: Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html) *(doc)* — The kinds of factor; the pros and cons of SMS, TOTP, a security key and a passkey; and the recovery codes.
2. [Sam Dutton](https://samdutton.com/): [Sign-in form best practices](https://web.dev/articles/sign-in-form-best-practices) *(article)* — The `autocomplete` values, a separate form, show/hide password and not asking twice.
3. [MDN: HTML attribute autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete) *(doc)* — The `username`, `current-password`, `new-password`, `one-time-code` and `webauthn` values.
4. [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) *(doc)* — The password length, the ban on character rules and periodic changes, the blocklist, pasting and password managers.
5. [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) *(doc)* — The password length, allowing pasting, the generic error message and the measures against brute force.
6. [Pilcrow](https://pilcrowonpaper.com/): [Passwords](https://auth.pilcrowonpaper.com/passwords) *(article)* — The length, the leaked-password check, Argon2id and the rate limit recommendations.
7. [Have I Been Pwned: Pwned Passwords API](https://haveibeenpwned.com/API/v3#PwnedPasswords) *(doc)* — Searching with the hash's first 5 characters, no API key being needed, and `Add-Padding`.
8. [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) *(doc)* — The difference between hashing and encryption, the salt, and the Argon2id, scrypt and bcrypt parameters.
9. [passkeys.dev: What are passkeys?](https://passkeys.dev/docs/intro/what-are-passkeys/) *(doc)* — The definition of a passkey, it being site-specific, and the synchronisation.
10. [MDN: Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API) *(doc)* — The key pair, the registration and sign-in steps with a challenge, and the signature tied to the domain.
11. [Eiji Kitamura: Sign in with a passkey through form autofill](https://web.dev/articles/passkey-form-autofill) *(article)* — `autocomplete="username webauthn"` and `mediation: "conditional"`.
12. [SimpleWebAuthn: @simplewebauthn/browser](https://simplewebauthn.dev/docs/packages/browser) *(doc)* — `startRegistration`, `startAuthentication` and `useBrowserAutofill`.
13. [Clemens Hübner: Passwordless future: WebAuthn and Passkeys in practice](https://www.wearedevelopers.com/videos/810-passwordless-future-webauthn-and-passkeys-in-practice) *(video)* — WeAreDevelopers World Congress 2023; the weaknesses of passwords and 2FA, and using WebAuthn and passkeys in practice.
