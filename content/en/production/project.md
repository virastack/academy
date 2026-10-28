---
title: "Get the order panel ready for release"
description: "Validating the environment, logs, error screens, a feature flag, Docker and CI to get a panel ready for production."
lastVerified: "2026-10-22"
translationKey: "production/project"
---

## Scenario

In [the Playwright guide's project](/academy/playwright/project) you wrote the tests for an order panel. The application works but is not ready for production:

- The configuration is not validated; a wrong value goes unnoticed until the moment it is first used.
- The server errors only land in the terminal; they cannot be matched with the error shown to the user.
- Who could not sign in, and when, is not recorded.
- There is no way to open a new feature to one group of users first.
- There is no repeatable way to move the application to a server, and no pipeline that runs on every push.

Your job is to add these one by one. Every step is the application of a lesson in this guide:

| Part | File | Lesson |
| :-- | :-- | :-- |
| Environment variables validated with Zod | `lib/env.ts`, `.env.example` | [Environment variables](/academy/production/environment-variables) |
| Validation at startup, `onRequestError` | `instrumentation.ts`, `instrumentation-node.ts` | [Error monitoring](/academy/production/error-monitoring) |
| Error screens that show an error code | `app/error.tsx`, `app/global-error.tsx` | [Error monitoring](/academy/production/error-monitoring) |
| Structured logs, redacted fields, the sign-in events | `lib/logger.ts`, `app/actions.ts` | [Logging](/academy/production/logging) |
| An order summary opened by percentage | `lib/rollout.ts`, `lib/flags.ts` | [Feature flags and release strategy](/academy/production/feature-flags-and-release-strategy) |
| The standalone output, the health check, Docker | `next.config.ts`, `app/api/health/route.ts`, `Dockerfile` | [Deployment options](/academy/production/deployment-options) |
| The lint, type, test and Docker jobs | `.github/workflows/ci.yml` | [CI/CD](/academy/production/cicd) |
| The security headers and the final check | `next.config.ts`, `tests/production.spec.ts` | [Pre-release checklist](/academy/production/pre-release-checklist) |

The working project is on GitHub: [examples/production/project](https://github.com/virastack/academy/tree/main/examples/production/project). Compare against it when you get stuck.

## Step 1: The starting point

Copy the Playwright project, or start from the [examples/playwright/project](https://github.com/virastack/academy/tree/main/examples/playwright/project) folder. Add three packages:

```command
npm install zod flags pino
```

Make sure the tests pass right now; you will run them again after every following step:

```command
npm test
```

## Step 2: The environment variables

Collect every variable the application reads into a single schema. The ones with no value take their default, and the invalid ones give a clear error:[^1][^2]

```ts
// lib/env.ts
import "server-only";
import { z } from "zod";

const envSchema = z.object({
  APP_ENV: z.enum(["local", "preview", "production"]).default("local"),
  APP_VERSION: z.string().min(1).default("dev"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ORDER_SUMMARY_ROLLOUT: z.coerce.number().int().min(0).max(100).default(0),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Validates the environment variables once and caches them.
 * If a value is missing or invalid it throws, naming the variable and why it failed.
 */
export function getEnv(): Env {
  if (cached) return cached;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${problems}`);
  }

  cached = result.data;
  return cached;
}
```

`ORDER_SUMMARY_ROLLOUT` arrives as text; `z.coerce.number()` turns it into a number and enforces the 0-100 range. Add a template for your teammates:

```bash
# .env.example
# Copy this file as .env.local. Never add the real values to the repository.
# Every variable is validated with Zod in lib/env.ts.

# local | preview | production
APP_ENV=local
# The version shown on the health endpoint and in the logs. In CI the commit SHA is passed.
APP_VERSION=dev
# debug | info | warn | error
LOG_LEVEL=info
# The percentage of users who will see the order summary (0-100)
ORDER_SUMMARY_ROLLOUT=0
```

`create-next-app` ignores all the `.env*` files. Keep the template out of that rule:

```bash
# .gitignore
.env*
!.env.example
```

## Step 3: The logger and validation at startup

The logger adds the service, environment and version to every line, and redacts the password and cookie fields before writing them:[^3]

```ts
// lib/logger.ts
import "server-only";
import pino from "pino";
import { getEnv } from "./env";

export const logger = pino({
  level: getEnv().LOG_LEVEL,
  base: { service: "order-panel", env: getEnv().APP_ENV, version: getEnv().APP_VERSION },
  redact: {
    paths: ["password", "*.password", "cookie", "*.cookie", "headers.cookie", "*.headers.cookie"],
    censor: "[redacted]",
  },
});
```

Run the environment validation as the server starts, not on the first request. Because `process.exit` does not exist in the Edge runtime, put the Node.js-specific code in its own file:[^4]

```ts
// instrumentation-node.ts
import { getEnv } from "./lib/env";

// Runs once as the server starts, and only on the Node.js runtime.
try {
  getEnv();
} catch (error) {
  // If the environment variables are wrong the server exits before taking any traffic.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const { logger } = await import("./lib/logger");
logger.info({ event: "server_started" }, "Server started");
```

In the same file, `onRequestError` logs every error on the server together with its `digest`:[^5]

```ts
// instrumentation.ts
import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { logger } = await import("./lib/logger");
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : undefined;

  logger.error(
    {
      event: "request_error",
      err: error,
      digest,
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routeType: context.routeType,
    },
    "An error occurred while handling the request",
  );
};
```

Try it: after `npm run build`, run `ORDER_SUMMARY_ROLLOUT=150 npm start`. The server should print which variable is invalid and why, and shut down.

## Step 4: The error screens

The root-level `error.tsx` wraps all the pages. On server errors Next.js hides the message and sends only a `digest`; show that to the user as an error code:[^6]

```tsx
// app/error.tsx
"use client";

/** Safely reads the `digest` value Next.js attaches to server errors. */
function getDigest(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error) {
    return typeof error.digest === "string" ? error.digest : undefined;
  }
}

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = getDigest(error);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div role="alert" className="space-y-3 rounded border border-red-300 bg-red-50 p-4">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p>An unexpected error occurred while loading the page. You can try again.</p>
        {digest && (
          <p className="text-sm">
            Error code to pass on to support: <code>{digest}</code>
          </p>
        )}
        <button type="button" onClick={() => retry()} className="underline">
          Try again
        </button>
      </div>
    </main>
  );
}
```

The `error` prop is `unknown`. Check the field itself instead of `instanceof Error`; a server error coming from inside Suspense may not pass that check.

For the errors in the root layout, `global-error.tsx` renders its own `<html>` and `<body>` tags. The global styles are not loaded there:[^6]

```tsx
// app/global-error.tsx
"use client";

// Catches errors in the root layout. It renders its own <html> and <body>;
// globals.css is not loaded here, which is why the styles are inline.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2.5rem 1rem" }}>
        <title>Error | Order panel</title>
        <main role="alert" style={{ maxWidth: "48rem", margin: "0 auto" }}>
          <h1>The app could not be loaded</h1>
          <p>An unexpected error occurred. Try reloading the page.</p>
          <button type="button" onClick={() => retry()}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
```

To try the pipeline end to end, add a page that throws on purpose. `connection()` makes the error throw at request time rather than at build time; in production the page returns a 404:

```tsx
// app/debug/page.tsx
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getEnv } from "@/lib/env";

// A page that throws on purpose, to exercise the error-tracking pipeline end to end.
// Returns 404 in production.
export default function DebugPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <FailingSection />
    </Suspense>
  );
}

async function FailingSection(): Promise<never> {
  await connection();
  if (getEnv().APP_ENV === "production") notFound();
  throw new Error("Test error: thrown on purpose to exercise the error-tracking pipeline.");
}
```

Open `/debug`. The error code on screen and the `digest` in the server log should be the same.

## Step 5: Logging the sign-in events

Failed sign-ins are the first sign of credential attacks. OWASP asks that they always be recorded, and the password never:[^7]

```ts
// app/actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import { SESSION_COOKIE } from "@/lib/session";
import { createSession, deleteSession, findUser } from "@/lib/store";

export type LoginState = {
  error?: string;
  email?: string;
};

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = findUser(email, password);
  if (!user) {
    // Never log the password. The email is enough to spot repeated attempts.
    logger.warn({ event: "login_failed", email }, "Sign-in failed");
    return { error: "Email or password is incorrect.", email };
  }

  logger.info({ event: "login_succeeded", userId: user.id }, "Sign-in succeeded");
  (await cookies()).set(SESSION_COOKIE, createSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  redirect("/orders");
}

export async function logout() {
  const cookieStore = await cookies();
  deleteSession(cookieStore.get(SESSION_COOKIE)?.value);
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
```

## Step 6: The health check

The container platform, the load balancer and the smoke test in CI all ask this endpoint. `connection()` stops the response from being produced and stored at build time; the variables are read on every request:[^1]

```ts
// app/api/health/route.ts
import { connection } from "next/server";
import { getEnv } from "@/lib/env";

export async function GET() {
  await connection();
  const { APP_ENV, APP_VERSION } = getEnv();

  return Response.json(
    { status: "ok", env: APP_ENV, version: APP_VERSION },
    { headers: { "Cache-Control": "no-store" } },
  );
}
```

## Step 7: A feature opened by percentage

The new feature: the count and the total amount above the order list. It will be opened to one group of users first.

The function that places a user in a fixed bucket. The same user gets the same result on every request, and when the percentage grows nobody who was in falls out:

```ts
// lib/rollout.ts
/**
 * Places an id in a stable bucket between 0 and 99 (FNV-1a).
 * The same user lands in the same bucket on every request, so a 10 percent rollout always reaches the same 10 percent.
 */
export function rolloutBucket(id: string, salt: string): number {
  let hash = 0x811c9dc5;
  for (const char of `${salt}:${id}`) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100;
}

export function isInRollout(id: string, salt: string, percentage: number): boolean {
  return rolloutBucket(id, salt) < percentage;
}
```

The flag finds out who the decision is for from the session cookie with `identify`; `decide` applies the percentage:[^8]

```ts
// lib/flags.ts
import "server-only";
import { flag } from "flags/next";
import { getEnv } from "./env";
import { isInRollout } from "./rollout";
import { SESSION_COOKIE } from "./session";
import { readSession } from "./store";

type Entities = { user?: { id: string } };

export const orderSummaryFlag = flag<boolean, Entities>({
  key: "order-summary",
  description: "A count and total-amount summary above the order list",
  defaultValue: false,
  options: [
    { value: false, label: "Off" },
    { value: true, label: "On" },
  ],
  identify({ cookies }) {
    const session = readSession(cookies.get(SESSION_COOKIE)?.value);
    return session ? { user: { id: session.user.id } } : undefined;
  },
  decide({ entities }) {
    if (!entities?.user) return false;
    return isInRollout(entities.user.id, "order-summary", getEnv().ORDER_SUMMARY_ROLLOUT);
  },
});
```

Evaluate the flag on the server, in the component that reads the session, and pass the result to the Client Component as a prop:

```tsx
// app/orders/page.tsx
import { Suspense } from "react";
import { logout } from "@/app/actions";
import { OrdersPanel } from "@/components/orders-panel";
import { orderSummaryFlag } from "@/lib/flags";
import { getCurrentUser } from "@/lib/session";

const roleLabels = { admin: "Admin", viewer: "Viewer" } as const;

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <Suspense fallback={<p>Checking the session...</p>}>
        <OrdersSection />
      </Suspense>
    </main>
  );
}

async function OrdersSection() {
  const user = await getCurrentUser();
  const showSummary = await orderSummaryFlag();

  return (
    <>
      <div className="flex items-center justify-between gap-4 text-sm">
        <p>
          {user.name} <span className="text-gray-700">({roleLabels[user.role]})</span>
        </p>
        <form action={logout}>
          <button type="submit" className="underline">
            Sign out
          </button>
        </form>
      </div>
      <OrdersPanel canCancel={user.role === "admin"} showSummary={showSummary} />
    </>
  );
}
```

`OrdersPanel` takes a new `showSummary` prop and shows the summary above the table:

```tsx
// components/orders-panel.tsx
type OrdersPanelProps = {
  canCancel: boolean;
  showSummary: boolean;
};

// while the table is rendered:
<>
  {showSummary && <OrdersSummary orders={orders.data} />}
  <table className="w-full text-left text-sm">{/* ... */}</table>
</>

function OrdersSummary({ orders }: { orders: Order[] }) {
  const total = orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <p className="text-sm text-gray-700">
      {orders.length} orders, {currency.format(total)} in total
    </p>
  );
}
```

Set `ORDER_SUMMARY_ROLLOUT=100` in `.env.local` and restart the server; the summary should appear. Make it `0` and it should disappear.

## Step 8: The production build and the security headers

`output: "standalone"` collects the files needed to run into `.next/standalone`. In the same file, add the security headers and turn `X-Powered-By` off:[^9][^10]

```ts
// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```

The standalone server does not serve the `public` and `.next/static` folders by itself. Write a small script that copies them after the build:[^9]

```js
// scripts/prepare-standalone.mjs
// An `output: "standalone"` build does not copy the .next/static and public folders.
// This copies them after the build so `node .next/standalone/server.js` can serve them too.
import { cpSync, existsSync } from "node:fs";

cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
if (existsSync("public")) cpSync("public", ".next/standalone/public", { recursive: true });
```

The `package.json` scripts. `start` is no longer `next start` but the standalone server; `postbuild` runs by itself after every `npm run build`:

```json
{
  "dev": "next dev",
  "build": "next build",
  "postbuild": "node scripts/prepare-standalone.mjs",
  "start": "node .next/standalone/server.js",
  "lint": "eslint",
  "typecheck": "next typegen && tsc --noEmit",
  "test": "playwright test"
}
```

## Step 9: The tests

The tests now run against a production build, against the standalone server. `webServer.env` starts the server with known values; the rollout is 100 percent so the summary test passes:

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const adminState = "playwright/.auth/admin.json";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      testIgnore: /.*\.visual\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: adminState },
      dependencies: ["setup"],
    },
    {
      name: "visual",
      testMatch: /.*\.visual\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: adminState },
      dependencies: ["setup"],
      default: false,
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: "3000",
      APP_ENV: "local",
      APP_VERSION: "test",
      ORDER_SUMMARY_ROLLOUT: "100",
    },
  },
});
```

The tests that confirm the release readiness: the health endpoint, the security headers, the flag and the error screen:

```ts
// tests/production.spec.ts
import { expect, test } from "./fixtures";

test("the health endpoint returns the environment and version", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok", env: "local", version: "test" });
});

test("security headers are sent and X-Powered-By is not", async ({ request }) => {
  const response = await request.get("/login");
  const headers = response.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("a user with the flag on sees the order summary", async ({ page, ordersPage }) => {
  await ordersPage.goto();

  await expect(page.getByText("6 orders, €5,422.40 in total")).toBeVisible();
});

test("on a server error the error boundary shows a digest", async ({ page }) => {
  await page.goto("/debug");

  // Next.js's route announcer also carries role="alert", so we narrow by text.
  const alert = page.getByRole("alert").filter({ hasText: "Something went wrong" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/Error code to pass on to support: \S+/);
  await expect(alert).not.toContainText("thrown on purpose");
});
```

Next.js's route announcer also carries `role="alert"`. If you do not narrow the error box by text, the locator resolves to two elements and you get a strict mode error.

The pure function tests that confirm the rollout function's three properties:

```ts
// tests/rollout.spec.ts
// Pure function tests that need no browser. In a real project, move these
// to a unit test runner such as Vitest; they live in Playwright here to keep one tool.
import { expect, test } from "@playwright/test";
import { isInRollout, rolloutBucket } from "../lib/rollout";

const ids = Array.from({ length: 10_000 }, (_, index) => `user-${index}`);

test("the same user always lands in the same bucket", () => {
  expect(rolloutBucket("u1", "order-summary")).toBe(rolloutBucket("u1", "order-summary"));
});

test("0 percent includes nobody and 100 percent everybody", () => {
  expect(ids.some((id) => isInRollout(id, "order-summary", 0))).toBe(false);
  expect(ids.every((id) => isInRollout(id, "order-summary", 100))).toBe(true);
});

test("30 percent includes roughly 30 percent of users", () => {
  const share = ids.filter((id) => isInRollout(id, "order-summary", 30)).length / ids.length;

  expect(share).toBeGreaterThan(0.27);
  expect(share).toBeLessThan(0.33);
});

test("raising the percentage never drops anyone already included", () => {
  const at10 = ids.filter((id) => isInRollout(id, "order-summary", 10));

  expect(at10.every((id) => isInRollout(id, "order-summary", 30))).toBe(true);
});
```

## Step 10: The Docker image

A three-stage image: the dependencies, the build, the runtime. The final image does not hold the source code and all of `node_modules`, and the process runs as the non-root `node` user:[^11][^12]

```dockerfile
# Dockerfile
# syntax=docker/dockerfile:1

# Raise the Node.js version regularly, along with the current LTS.
ARG NODE_VERSION=24-slim

# Stage 1: the dependencies. It runs again only when the package files change.
FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# Stage 2: the build. output: "standalone" collects only the files needed to run.
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: the runtime image. The source code and all of node_modules are not here.
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Run as a non-root user.
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "server.js"]
```

`.dockerignore` keeps the local files, the tests and especially the `.env*` files out of the image:

```text
# .dockerignore
node_modules
.next
.git
.github
.env*
!.env.example
Dockerfile
.dockerignore
npm-debug.log*

# the tests do not enter the image
tests
playwright
playwright.config.ts
playwright-report
test-results
blob-report
```

```command
docker build -t order-panel .
```

```command
docker run --rm -p 3000:3000 -e APP_ENV=preview -e APP_VERSION=1.0.0 order-panel
```

```command
curl http://localhost:3000/api/health
```

The response should be `{"status":"ok","env":"preview","version":"1.0.0"}`. Start the same image with an invalid value; the container should print the error and exit:

```command
docker run --rm -e ORDER_SUMMARY_ROLLOUT=150 order-panel
```

## Step 11: The CI pipeline

Three jobs: `quality` and `e2e` in parallel, and if both pass, `docker` builds the image and runs a smoke test:[^13][^14]

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# When a new push arrives for the same branch, cancel the old run on the pull request.
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

# Let GITHUB_TOKEN only read the repository.
permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - name: Restore Next.js build cache
        uses: actions/cache@v6
        with:
          path: .next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-${{ hashFiles('app/**', 'components/**', 'lib/**') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-
      - run: npx playwright install --with-deps chromium
      - run: npm test
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

  docker:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [quality, e2e]
    steps:
      - uses: actions/checkout@v7
      - name: Build image
        run: docker build -t order-panel:${{ github.sha }} .
      - name: Smoke test
        run: |
          docker run -d --name app -p 3000:3000 \
            -e APP_ENV=preview -e APP_VERSION=${{ github.sha }} \
            order-panel:${{ github.sha }}
          for i in $(seq 1 30); do
            curl -fsS http://localhost:3000/api/health && exit 0
            sleep 1
          done
          docker logs app
          exit 1
```

## Step 12: Verify

```command
npm run lint
```

```command
npm run typecheck
```

```command
npm test
```

The expected result is `27 passed` *(two sign-in setup steps and 25 tests)*. Finally, take the [pre-release checklist](/academy/production/pre-release-checklist) over the project; which items are still open?

## Try it yourself

- With Sentry's free plan, connect `onRequestError` to Sentry as well and confirm that the error from `/debug` appears in the dashboard.
- Log the order cancellation with an `order_cancelled` event; write the viewer's refused request as `authorization_failed`.
- With `ORDER_SUMMARY_ROLLOUT=50`, look at whether the two demo users see the summary. Does the result change when you change the salt?
- Add a `deploy` job to CI that runs on `main` and is bound to the `production` environment; define a reviewer for the environment and watch the job wait for approval.

## Sources

1. [Next.js: Environment Variables](https://nextjs.org/docs/app/guides/environment-variables) *(doc)* — Reading at runtime, `connection()` and `NEXT_PUBLIC_`.
2. [Zod: Coercion](https://zod.dev/api#coercion) *(doc)* — Turning text into a number with `z.coerce`.
3. [pino: Redaction](https://getpino.io/#/docs/redaction) *(doc)* — The `redact` paths and `censor`.
4. [Next.js: Instrumentation](https://nextjs.org/docs/app/guides/instrumentation) *(doc)* — `register` and importing runtime-specific code.
5. [Next.js: instrumentation.js](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation) *(doc)* — The `onRequestError` signature.
6. [Next.js: error.js](https://nextjs.org/docs/app/api-reference/file-conventions/error) *(doc)* — `error`, `digest`, `retry` and `global-error`.
7. [OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) *(doc)* — The events to record and the data not to log.
8. [Flags SDK: Evaluation Context](https://flags-sdk.dev/frameworks/next/evaluation-context) *(doc)* — `identify` and `decide`.
9. [Next.js: output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) *(doc)* — The standalone output and copying the static files.
10. [Next.js: headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers) *(doc)* — The security headers.
11. [Next.js: the with-docker example](https://github.com/vercel/next.js/tree/canary/examples/with-docker) *(doc)* — The official Dockerfile with the standalone output.
12. [OWASP: Node.js Docker Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html) *(doc)* — The non-root user and signals.
13. [Next.js: CI Build Caching](https://nextjs.org/docs/app/guides/ci-build-caching) *(doc)* — Preserving `.next/cache` in CI.
14. [GitHub: Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use) *(doc)* — The token permissions and action security.
