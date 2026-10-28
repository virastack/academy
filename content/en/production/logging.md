---
title: "Logging"
description: "Structured logs, what to log and what not to log."
lastVerified: "2026-10-22"
translationKey: "production/logging"
---

## Why do logs exist?

In production there is no debugger and no terminal to watch `console.log` in. When a user says "my order was not cancelled yesterday afternoon", the only evidence you hold is the logs. A good log is one that recorded the answer before the question was asked: who, when, what they did, and what the result was.

## Logs are a stream

The Twelve-Factor principles define a log not as a file but as an **event stream**. The application does not open a log file, does not rotate it and does not know where it goes; it writes every event as a single line to `stdout`. Collecting, combining and sending the stream to a search system is the runtime environment's job.[^1]

That matches [!docker] and the cloud platforms exactly: `docker logs` reads the container's `stdout`, and the platforms carry the same stream into their own log interfaces. You do not need to configure a logger that writes to a file in your application.

## Structured logs

A log line written for a human:

```text
User admin@example.com cancelled order SP-1001
```

The same event, for a machine:

```json
{"level":30,"time":1792639224970,"service":"order-panel","env":"production","version":"a1b2c3d","event":"order_cancelled","orderId":"SP-1001","userId":"u1","msg":"Order cancelled"}
```

With the second one you can write queries such as "count the `order_cancelled` events in the last hour" or "fetch the errors where `version` is a1b2c3d". Log search systems index the JSON fields separately.

> [!TIP]
>
> Give every event a fixed `event` name *(`login_failed`, `order_cancelled`)*. The message text changes over time; as long as the event name does not, the saved queries and alerts do not break.

## A logger with pino

pino is a fast JSON logger for Node.js. [!nextjs] recognises it by default in the list of packages kept out of the server bundle; no extra setting is needed.[^2]

```command
npm install pino
```

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

- `level` decides which levels are not written below it. It comes from an environment variable; `info` in production, and `debug` temporarily while hunting a problem *(see [Environment variables](/academy/production/environment-variables))*.
- `base` holds the fields added to every line. Thanks to `version`, which deploy an error started with is visible in a single query.
- `redact` is covered below.

Usage: the first argument is the fields, the second the message.

```ts
logger.info({ event: "login_succeeded", userId: user.id }, "Sign-in succeeded");
logger.warn({ event: "login_failed", email }, "Sign-in failed");
logger.error({ event: "request_error", err: error, digest }, "An error occurred while handling the request");
```

When you give an `Error` to the `err` field, pino splits it into the `type`, `message` and `stack` fields.

## The levels

| Level | When | Example |
| :-- | :-- | :-- |
| `error` | A request or a job failed, and someone has to look | An uncaught server error, the payment service being unreachable |
| `warn` | An unexpected situation the application got through | A failed sign-in, an external request that succeeded on a retry |
| `info` | Important business events | The server started, an order was cancelled |
| `debug` | The detail you need while hunting a problem | A query's parameters, intermediate values |

`debug` should be off in production; it is both noise and cost. The `error` level is the source of the alerting rules, so do not write expected situations *(such as an invalid form submission)* as `error`.

## Carrying the context: a child logger

To add the same fields *(the request id, the user)* to every line written during a request, use `child`:[^3]

```ts
const requestLogger = logger.child({ requestId: crypto.randomUUID(), userId: user.id });

requestLogger.info({ event: "order_cancel_requested", orderId }, "Cancellation requested");
requestLogger.info({ event: "order_cancelled", orderId }, "Order cancelled");
```

Both lines carry `requestId` and `userId`. Search a request id in the logs and you see that request's whole story in order.

## What to log?

OWASP's logging guide lists the events that definitely have to be recorded for security. The ones that fall to a frontend and a Next.js application:[^4]

- Authentication successes and **failures**: repeated failed sign-ins are an early sign of brute force and credential stuffing attacks.
- Authorisation failures: someone in the viewer role sending a cancel request *(see [Authorisation and roles](/academy/auth-security/authorization-and-roles))*.
- Input validation errors: invalid parameters. OWASP says to treat these not as proof of an attack but as a suspicious event; a faulty client leaves the same trace.
- Session management errors: a tampered session cookie, a token that cannot be verified.
- Application errors and system events: starting, shutting down, configuration errors.

In this guide's project the sign-in Server Action writes two events:

```ts
// app/actions.ts
const user = findUser(email, password);
if (!user) {
  // Never log the password. The email is enough to spot repeated attempts.
  logger.warn({ event: "login_failed", email }, "Sign-in failed");
  return { error: "Email or password is incorrect.", email };
}

logger.info({ event: "login_succeeded", userId: user.id }, "Sign-in succeeded");
```

## What not to log?

According to OWASP, the following should not be written into the logs directly; they should be removed, masked, hashed or encrypted:[^4]

- Session identifiers *(write a hash if you need them)*
- Access tokens
- Passwords
- Database connection strings
- Encryption keys and other secrets
- Bank and card details
- Sensitive personal data such as health information or an identity number
- Data the user did not consent to having collected

> [!CAUTION]
>
> A logging system is usually open to many more people than the application database, and kept for much longer. A password written into a log undoes all the protection of an encrypted database.

The most common mistake is not deliberate: logging a whole object. `logger.info({ request })` writes the cookie headers, and `logger.info({ body })` the password. pino's `redact` option replaces the values at the given paths before writing them:[^5]

```ts
redact: {
  paths: ["password", "*.password", "cookie", "*.cookie", "headers.cookie", "*.headers.cookie"],
  censor: "[redacted]",
},
```

```ts
logger.info({ user: { email: "a@example.com", password: "x" }, headers: { cookie: "session=..." } });
```

```json
{"user":{"email":"a@example.com","password":"[redacted]"},"headers":{"cookie":"[redacted]"}}
```

`*` stands for one level; `*.password` catches `user.password` but not `a.b.password`. Keys containing a hyphen are written with brackets: `headers["set-cookie"]`.[^5] `redact` is a safety net, not a replacement for the habit: pick the fields you log one by one.

> [!NOTE]
>
> In development mode Next.js writes the Server Function calls to the terminal together with their arguments.[^6] That only happens in `next dev` and can be turned off with `logging.serverFunctions: false`. None of the `logging` settings affect a production build.

## Matching with the error code

The `onRequestError` from the [Error monitoring](/academy/production/error-monitoring) lesson logs every server error with a `digest` field. The user passes the error code they saw on screen to the support team, and the team searches the logs by `digest`:

```json
{"level":50,"event":"request_error","digest":"403643587","path":"/debug","routeType":"render","msg":"An error occurred while handling the request"}
```

The same idea generalises: if you add a request id, the version and the environment to every log line, you can tie records that are independent of each other together.

## Readable logs in development

JSON lines are hard to read in a terminal. `pino-pretty` is a transformer for reading only; the application still writes JSON:

```command
npm run dev | npx pino-pretty
```

## Logs, metrics and traces

Logs alone do not answer every question. Google's SRE book lists the **four golden signals** to monitor in a user-facing system: latency, traffic, errors and saturation.[^7] When those are kept as numbers *(metrics)* they can be charted and alerted on; computing them from individual log lines is expensive.

To see which step a request slowed down at, you need a **trace**. Next.js already instruments its own internals with OpenTelemetry, and the documentation recommends OpenTelemetry: your code does not change even if you change provider. The shortest way to start is the `@vercel/otel` package:[^8]

```ts
// instrumentation.ts
import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({ serviceName: "order-panel" });
}
```

For a small project, structured logs and an error monitoring service are usually enough. Add metrics and traces as the traffic grows.

## Try it yourself

- Add pino to your project. Turn the `console.log` lines into log calls with an `event` field.
- Log the failed sign-ins. Make five failed attempts in a row with the same email and look at how it appears in the logs.
- Log a request's headers without `redact` and see the cookie written out in the clear. Then add `redact`.
- Add a request id with `logger.child` in a Route Handler and filter the lines of the same request.

## Going deeper

- **Guide:** OWASP, "Logging Cheat Sheet"; which events, which fields, and what not to log.[^4]
- **Article:** Heroku, "The Twelve-Factor App: Logs"; thinking of logs as an event stream.[^1]
- **Official docs:** pino, "Redaction"; the path syntax and the censor options.[^5]
- **Official docs:** Next.js, "OpenTelemetry"; tracing and `@vercel/otel`.[^8]

## Sources

1. [Heroku](https://12factor.net/): [The Twelve-Factor App: XI. Logs](https://12factor.net/logs) *(article)* — 2011, Adam Wiggins. Treating logs as an event stream written to stdout.
2. [Next.js: serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) *(doc)* — The list of packages not bundled by default.
3. [pino: API](https://getpino.io/#/docs/api) *(doc)* — The logger options, the levels and `logger.child()`.
4. [OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) *(doc)* — The events that have to be recorded, and the data that should not be written into the logs.
5. [pino: Redaction](https://getpino.io/#/docs/redaction) *(doc)* — The `redact` paths, the wildcard, `censor` and `remove`.
6. [Next.js: logging](https://nextjs.org/docs/app/api-reference/config/next-config-js/logging) *(doc)* — The fetch, Server Function and request logs in development mode.
7. [Google](https://sre.google/): [Site Reliability Engineering: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) *(article)* — 2016, Rob Ewaschuk. The four golden signals: latency, traffic, errors, saturation.
8. [Next.js: OpenTelemetry](https://nextjs.org/docs/app/guides/open-telemetry) *(doc)* — Next.js's built-in instrumentation and the setup with `@vercel/otel`.
