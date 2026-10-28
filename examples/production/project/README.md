# The orders panel, ready to ship

The working version of the project lesson in the [Getting ready for production guide](https://virastack.com/academy/production/project). The lesson takes the orders panel from the [Playwright guide](https://virastack.com/academy/playwright/project) and gets it ready to ship step by step; compare against it when you get stuck.

The application itself is the same: a sign-in page, a session cookie, an orders table loaded with TanStack Query and an admin cancelling an order. What this version adds:

| File | What it teaches |
| :-- | :-- |
| `lib/env.ts`, `.env.example` | Validating the environment variables with Zod |
| `instrumentation.ts`, `instrumentation-node.ts` | Validating at startup, and logging server errors with `onRequestError` |
| `lib/logger.ts` | Structured JSON logs with pino, and redacting sensitive fields |
| `app/error.tsx`, `app/global-error.tsx` | Error boundaries that show the user an error code *(the digest)* |
| `app/debug/page.tsx` | A page that throws on purpose, to exercise the error-tracking pipeline *(a 404 in production)* |
| `app/api/health/route.ts` | The health check and the version information |
| `lib/flags.ts`, `lib/rollout.ts` | A feature rolled out by percentage with the Flags SDK *(the order summary)* |
| `next.config.ts` | `output: "standalone"`, the security headers |
| `Dockerfile`, `.dockerignore` | A multi-stage image that runs as a non-root user |
| `.github/workflows/ci.yml` | Lint, type checking, the end-to-end tests and a Docker smoke test |
| `tests/production.spec.ts`, `tests/rollout.spec.ts` | The readiness tests |

The demo accounts, with the password `password123`:

| Email | Role |
| :-- | :-- |
| admin@example.com | Admin, can cancel an order that is being prepared |
| viewer@example.com | Viewer, can only look |

## Running it

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. To see the order summary, set `ORDER_SUMMARY_ROLLOUT=100` in `.env.local` and restart the server.

## The production build

```bash
npm run build
npm start
```

After `npm run build`, the `postbuild` script copies the static files into `.next/standalone`. `npm start` runs `node .next/standalone/server.js` directly; `next start` is not used.

## The tests

```bash
npx playwright install chromium
npm test
```

The tests run against the production build. `playwright.config.ts` starts the server with `ORDER_SUMMARY_ROLLOUT=100`.

## Docker

```bash
docker build -t order-panel .
docker run --rm -p 3000:3000 -e APP_ENV=preview -e APP_VERSION=1.0.0 order-panel
curl http://localhost:3000/api/health
```

The same image runs in every environment with different environment variables. Give it an invalid value and the container writes which variable is wrong as it starts and exits:

```bash
docker run --rm -e ORDER_SUMMARY_ROLLOUT=150 order-panel
```

## The environment variables

| Variable | Default | What it is |
| :-- | :-- | :-- |
| `APP_ENV` | `local` | `local`, `preview` or `production`. In `production`, `/debug` returns a 404 |
| `APP_VERSION` | `dev` | The version shown on the health endpoint and on every log line |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn` or `error` |
| `ORDER_SUMMARY_ROLLOUT` | `0` | The percentage of users who will see the order summary |
