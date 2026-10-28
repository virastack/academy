---
title: "Environment variables"
description: "Separating configuration from code, NEXT_PUBLIC_ and validation with Zod."
lastVerified: "2026-10-22"
translationKey: "production/environment-variables"
---

## Configuration is separate from code

Your application runs locally, in a preview environment and in production. The code is the same everywhere; what changes are values such as the database address, an API key or the log level. These are called the **configuration** *(config)*.

The Twelve-Factor App principles Heroku published in 2011 draw that line clearly: configuration is not hard-coded, it is kept in **environment variables**. The principle's practical test is this: if you open-sourced the code base right now, would any credential leak?[^1]

An environment variable works the same way in every operating system and language. It changes from environment to environment without changing the code, and it does not slip into the repository the way a configuration file does.[^1]

## .env files

[!nextjs] loads the `.env*` files into `process.env` by itself:[^2]

```bash
# .env.local
DATABASE_URL=postgres://localhost:5432/orders
LOG_LEVEL=debug
```

When the same variable is defined in more than one place, the first one found wins:[^2]

| Order | Source | Note |
| :-- | :-- | :-- |
| 1 | `process.env` | The real environment variables given when the server starts |
| 2 | `.env.$(NODE_ENV).local` | `.env.production.local`, for example |
| 3 | `.env.local` | Not read while `NODE_ENV=test` |
| 4 | `.env.$(NODE_ENV)` | `.env.development`, for example |
| 5 | `.env` | The shared defaults |

`next dev` makes `NODE_ENV` `development`, and the other commands `production`.[^2] So on the live server, the real environment variables the platform provides come before every file in the repository.

> [!CAUTION]
>
> `create-next-app` adds all the `.env*` files to `.gitignore`. The Next.js documentation says to almost never add these files to the repository.[^2] Once a file carrying a real key has been committed, deleting it from the history is not enough; revoke the key and produce a new one.

To show your teammates which variables are needed, add a worthless template and take only that out of `.gitignore`:

```bash
# .env.example
APP_ENV=local
LOG_LEVEL=info
DATABASE_URL=
```

```bash
# .gitignore
.env*
!.env.example
```

## The variables that reach the browser: NEXT_PUBLIC_

By default, environment variables are read **on the server only**. To use a variable in the browser, you put the prefix `NEXT_PUBLIC_` on its name.[^2]

That prefix is not a permission but a **copying** instruction. During `next build`, Next.js replaces every place `process.env.NEXT_PUBLIC_ANALYTICS_ID` appears with the value at that moment, and the value is embedded in the JavaScript bundle:[^2]

```ts
// Replaced with "abc123" at build time
const analyticsId = process.env.NEXT_PUBLIC_ANALYTICS_ID;

// Not replaced: the variable name is dynamic
const name = "NEXT_PUBLIC_ANALYTICS_ID";
const value = process.env[name];
```

That has two consequences:

1. **Never give a secret `NEXT_PUBLIC_`.** The value is in a file everyone who opens the site downloads.
2. **It does not change after the build.** If you move the same build from preview to production, or run a single [!docker] image in more than one environment, the `NEXT_PUBLIC_` values are frozen as they were at build time.[^2]

## Reading at runtime

A variable without `NEXT_PUBLIC_` is read on the server, but **when** it is read matters. A page prerendered at build time reads the variable at build time and stores the result.

For the value to be read at request time, await `connection()` first. That tells Next.js the part in question depends on the request:[^2]

```ts
// app/api/health/route.ts
import { connection } from "next/server";

export async function GET() {
  await connection();
  return Response.json({ version: process.env.APP_VERSION });
}
```

Request-time APIs such as `cookies()` and `headers()` have the same effect. The Next.js documentation states this route's benefit like this: a single Docker image can be moved from environment to environment with different values.[^2][^3] That is also Twelve-Factor's "build, release, run" separation: you build once, and it is combined with each environment's configuration and run.[^4]

| Variable | When it is read | Where it is used |
| :-- | :-- | :-- |
| `NEXT_PUBLIC_X` | During `next build`, embedded in the bundle | The server and the browser |
| `X`, on a static page | During `next build` | The server only |
| `X`, after `connection()` | On every request | The server only |

## Validating: fail at startup

`process.env.LOG_LEVEL` is always of type `string | undefined`. A typo, a missing value or an invalid number such as `"150"` goes unnoticed until the moment it is first used; and that moment is usually a user's request at midnight.

Validate the variables in a single place with [!zod] *(see [Schemas and validation with Zod](/academy/forms/zod-schema-and-validation))*:

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

- `z.coerce.number()` turns text into a number. Environment variables are always text.[^5]
- `default` defines the optional values. Do not give a default for a required secret; let it fail when it is missing.
- `"server-only"` stops the build if this file is imported into a Client Component *(see [Server and Client Components](/academy/nextjs/server-and-client-components))*.

Run the validation **as the server starts**, not on the first request. Next.js's `register` function runs once as the server starts:[^6]

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
```

```ts
// instrumentation-node.ts
import { getEnv } from "./lib/env";

try {
  getEnv();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
```

`process.exit` does not exist in the Edge runtime. Putting Node.js-specific code in its own file and importing it behind a `NEXT_RUNTIME` check is the route the documentation recommends, and it avoids a build warning.[^6] The result:

```command
ORDER_SUMMARY_ROLLOUT=150 npm start
```

```text
Invalid environment variables:
- ORDER_SUMMARY_ROLLOUT: Too big: expected number to be <=100
```

The server shuts down without taking any traffic. A container platform counts the new version as unhealthy and keeps running the old one.

> [!NOTE]
>
> Without `process.exit`, Next.js still catches the error in `register`, but the server stays up and returns a 500 for every request. Shutting down explicitly stops the error from silently taking traffic.

## Values per environment

`NODE_ENV` can only be `development`, `production` or `test`.[^2] A preview environment is a `production` build too. For the question "which environment am I in?", define your own variable, such as `APP_ENV`.

Twelve-Factor, however, warns against collecting the values into named groups such as `staging` or `qa`: as the number of environments grows, the groups multiply and become hard to manage. Every variable is an independent setting, managed separately for every deploy.[^1] Use `APP_ENV` not to turn behaviour on and off but to tell the environments apart in the logs and the error records.

Where do you give the values from?

| Environment | Where the values live |
| :-- | :-- |
| Local | `.env.local` |
| CI | [!github] Actions secrets and variables *(see [CI/CD](/academy/production/cicd))* |
| [!vercel] | Separately for Development, Preview and Production in the project settings |
| Docker or a server | `docker run -e`, the orchestration tool's secret manager |

## Protecting the secrets

OWASP's secrets management guide recommends keeping the secrets in a central place and managing each one with a lifecycle: creation, regular rotation, revocation and expiry. Because rotation done by hand is error-prone, it should be automated where possible.[^7]

> [!DO]
>
> - Read a secret on the server only; add `import "server-only"` to the module that reads it.
> - Give every environment its own key. A preview environment should not carry the live database key.
> - Revoke a key the moment you suspect it has leaked.

> [!DONT]
>
> - Do not put the `NEXT_PUBLIC_` prefix on a secret.
> - Do not bake a secret into the image with `ENV` or `ARG` in the Dockerfile *(see [Deployment options](/academy/production/deployment-options))*.
> - Do not log the whole of `process.env`.

## Try it yourself

- Add `lib/env.ts` to your project. Give a variable an invalid value and watch the server shut down at startup.
- Define a value with `NEXT_PUBLIC_`, run `next build` and search for the value inside `.next/static`.
- Read `process.env` on a static page, change the value after the build and restart the server. Did the value change? Add `connection()` and try again.
- Write a `.env.example` and edit `.gitignore` so it tracks only that file.

## Going deeper

- **Official docs:** Next.js, "Environment Variables"; the loading order, `NEXT_PUBLIC_` and the test environment.[^2]
- **Article:** Heroku, "The Twelve-Factor App: Config"; the reasoning behind separating configuration from code.[^1]
- **Guide:** OWASP, "Secrets Management Cheat Sheet"; the lifecycle of secrets.[^7]

## Sources

1. [Heroku](https://12factor.net/): [The Twelve-Factor App: III. Config](https://12factor.net/config) *(article)* — 2011, Adam Wiggins. Keeping the configuration in environment variables, the open-source test and the problem with named environment groups.
2. [Next.js: Environment Variables](https://nextjs.org/docs/app/guides/environment-variables) *(doc)* — The `.env` loading order, embedding at build time with `NEXT_PUBLIC_`, and reading at runtime with `connection()`.
3. [Next.js: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting) *(doc)* — Runtime environment variables and using one image in more than one environment.
4. [Heroku](https://12factor.net/): [The Twelve-Factor App: V. Build, release, run](https://12factor.net/build-release-run) *(article)* — 2011, Adam Wiggins. Separating the build, release and run stages.
5. [Zod: Coercion](https://zod.dev/api#coercion) *(doc)* — Turning text into a number with `z.coerce`.
6. [Next.js: Instrumentation](https://nextjs.org/docs/app/guides/instrumentation) *(doc)* — The `register` function and importing runtime-specific code.
7. [OWASP: Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) *(doc)* — Storing and rotating secrets, and responding to a leak.
