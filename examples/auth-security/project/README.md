# A protected admin panel

The working version of the project lesson in the [Auth and security guide](https://virastack.com/academy/auth-security/project). Compare against it when you get stuck.

A small store admin panel: sign-in with an email and a password, the `customer`, `editor` and `admin` roles, role and permission checks, sanitized HTML, a CSRF-protected Route Handler, a CSP with a nonce and the security headers.

## Running it

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Generate the `BETTER_AUTH_SECRET` value in `.env.local` with `openssl rand -base64 32`. The seed creates three users, all with the password `password-1234`:

| Email | Role |
| :-- | :-- |
| `admin@example.com` | admin |
| `editor@example.com` | editor |
| `customer@example.com` | customer |

## The checks

```bash
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

The Playwright tests run against a production build; the CSP and Better Auth's sign-in limit only behave for real there. The tests reset the database with the seed before they start.

| File | What it teaches |
| :-- | :-- |
| `lib/auth.ts` | Better Auth, and a role the user cannot change thanks to `input: false` |
| `lib/permissions.ts` | The role and permission list, `hasPermission` |
| `lib/dal.ts` | The Data Access Layer, `requirePermission` and `forbidden()` |
| `lib/products.ts`, `lib/users.ts` | Returning DTOs, and HTML sanitized with `isomorphic-dompurify` |
| `app/admin/actions.ts` | A permission check and Zod validation in every Server Action |
| `app/api/admin/products/[id]/archive/route.ts` | A CSRF check with `Sec-Fetch-Site`, 401 and 403 |
| `proxy.ts` | Optimistic session redirects and a CSP with a nonce |
| `next.config.ts` | The security headers, `poweredByHeader`, `authInterrupts` |
| `package.json` | The `allowScripts` approvals for npm 12 |
| `e2e/` | A session per role, and tests for XSS, CSRF, the headers, role injection and the sign-in limit |
