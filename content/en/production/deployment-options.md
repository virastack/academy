---
title: "Deployment options"
description: "A Node.js server, Docker, static output and platform adapters."
lastVerified: "2026-10-22"
translationKey: "production/deployment-options"
---

## Four routes

[!nextjs] can be deployed in four ways:[^1]

| Option | Feature support | When |
| :-- | :-- | :-- |
| A Node.js server | All of them | If you have a server, or a platform that runs Node.js |
| A [!docker] container | All of them | If you use a cloud that runs containers, or Kubernetes |
| Static output | Limited | When there is no feature that needs a server; any web server serves the HTML, CSS and JS files |
| An adapter | Varies by platform | A build adapted to the platform's own infrastructure |

The Next.js documentation states the minimum requirement in a single sentence: to run Next.js it is enough for the platform to provide **a Node.js server**. A single `next start` process runs every feature correctly, Server Components, Server Actions, Cache Components, the proxy and `after()` included.[^2]

## Adapters and platforms

Platforms adapt Next.js to their own infrastructure with the Deployment Adapter API. An adapter that is open source and runs the Next.js compatibility test suite is called a **verified** adapter. As this guide was written, the verified adapters are [!vercel] and Bun; Cloudflare and Netlify are working on their own.[^1][^2]

The documentation separates two notions:[^2]

- **Functional correctness:** does every feature work correctly? The test suite is the measure of that; it passes or it does not.
- **Performance correctness:** do the features work with the best performance? The static shell being served from a CDN, for example. This is a spectrum, and the platforms differ here.

To deploy on Vercel, connecting the repository is enough; every pull request becomes a preview address and `main` the live environment. On your own server, you have to set those things up yourself. The rest of this lesson covers that work.

## A Node.js server

The plainest route is the two scripts in `package.json`:[^1]

```command
npm run build
npm run start
```

`next build` compiles the application and `next start` starts the production server. The source code and all of `node_modules` have to be on the server.

## Standalone output

`output: "standalone"` collects only the files needed to run into the `.next/standalone` folder during the build. Only the required files of the packages in use are copied; the folder can be deployed on its own, without installing `node_modules`:[^3]

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

In the folder there is a small `server.js` used in place of `next start`. Watch out for two things:[^3]

1. The `public` and `.next/static` folders are **not copied**; the documentation expects them to be served from a CDN ideally. If the server itself is going to serve them, copy them by hand:

   ```command
   cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
   ```

2. The port and the address are given with the `PORT` and `HOSTNAME` environment variables:

   ```command
   PORT=8080 HOSTNAME=0.0.0.0 node .next/standalone/server.js
   ```

> [!WARNING]
>
> If you run `next start` with `output: "standalone"`, Next.js warns you: `"next start" does not work with "output: standalone" configuration`. This is why the `start` script in this guide's project is `node .next/standalone/server.js`, with a small `postbuild` script that copies the static files.

## A Docker image

The Docker documentation recommends a **multi-stage** build: every `FROM` starts a new stage, and only the files needed to run are copied into the final image. The image shrinks, and the build tools and the source code do not stay in the final image.[^4][^5] Next.js's official Docker example uses this structure with the standalone output:[^6]

```dockerfile
# syntax=docker/dockerfile:1
ARG NODE_VERSION=24-slim

# Stage 1: the dependencies. It runs again only when the package files change.
FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# Stage 2: the build.
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Stage 3: the runtime image.
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "server.js"]
```

The reasoning, line by line:

- **Copying the package files first:** Docker caches every step. If the source code changed but `package-lock.json` did not, `npm ci` does not run again.[^5]
- **`node:24-slim`:** pin the tag; `node:latest` moves to a new version silently one day. OWASP's Node.js Docker guide also recommends explicit, fixed image tags.[^7]
- **`USER node`:** the Node.js images come with a non-root `node` user. Not running the container as root limits the privileges an attacker holds when a vulnerability is found.[^7]
- **`CMD ["node", "server.js"]`:** the exec form starts the process without a shell, and the signals reach the process directly. `npm start`, on the other hand, does not pass signals such as `SIGTERM` on to the Node.js process.[^7]
- **`HEALTHCHECK`:** Docker checks regularly whether the application really responds. A slim image has no `curl`; Node.js's own `fetch` is enough.

`.dockerignore` keeps unnecessary files out of the build context.[^5] The local `node_modules`, `.next`, the tests and especially the `.env*` files should not enter the image:

```text
# .dockerignore
node_modules
.next
.git
.env*
!.env.example
tests
playwright-report
```

```command
docker build -t order-panel .
docker run --rm -p 3000:3000 -e APP_ENV=preview -e APP_VERSION=1.0.0 order-panel
```

The environment variables are given at runtime with `docker run -e`. The same image runs with different values in preview and in production *(see [Environment variables](/academy/production/environment-variables))*.

> [!CAUTION]
>
> Do not pass a secret with `ARG` or `ENV` in the Dockerfile. The Docker documentation says those stay in the final image.[^8] If you need a key during the build *(for a private npm registry, say)*, use `RUN --mount=type=secret`; the secret is then visible only for the duration of that command.

## The health check

A container platform, a load balancer or Docker's `HEALTHCHECK` asks whether the application is up through an HTTP endpoint:

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

- `connection()` stops the response from being produced and stored at build time. A health check really has to run every time.
- The `version` field shows which version is running in production with a single command. It is the shortest way to tell whether a deploy went out.
- Keep the endpoint light. If every check makes a database query, the health check creates load.

## What to watch for on your own server

Next.js's self-hosting guide asks for the following:[^9]

| Topic | What to do |
| :-- | :-- |
| A reverse proxy | Do not expose the server directly to the internet; put a reverse proxy such as nginx in front of it. Let that handle malformed requests, slow-connection attacks, body size limits and rate limiting |
| Streaming | nginx buffers the responses. For streaming to work, turn the buffering off with the `X-Accel-Buffering: no` header, and make sure the load balancer supports a chunked response too |
| More than one server | Pin the Server Function encryption key with `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`; otherwise one server cannot decrypt what another encrypted |
| Version skew | In a rolling deploy, an old client can reach a new server. If you define a `deploymentId`, Next.js notices the mismatch and does a full page reload |
| The cache | The cache is on each server's own disk by default. With more than one server, a shared cache handler is needed |
| Shutdown | Send `SIGTERM` and wait. The server finishes the in-flight requests and the pending `after()` work and then shuts down; the documentation recommends a 10-30 second grace period |

In this guide's project image, `docker stop` shuts down cleanly in under a second: the Next.js server listens for `SIGTERM` itself, and because the process is started directly with `node`, the signal reaches it.

## Which one should you pick?

| Situation | The recommendation |
| :-- | :-- |
| A first project, a small team, and no wish to deal with infrastructure | A platform with a verified adapter |
| The company has Kubernetes or a container infrastructure | Docker + the standalone output |
| A single virtual server | A Node.js server, nginx in front, and systemd or Docker as the process manager |
| A blog, documentation, no server features | Static output |

## Try it yourself

- Add `output: "standalone"` to your project, take a build and compare the size of the `.next/standalone` folder with `node_modules`.
- Write the Dockerfile and build the image. Look at its size with `docker image ls`; reduce the multi-stage structure to a single stage and see the difference.
- Start the container and watch its health with `docker inspect -f '{{.State.Health.Status}}'`.
- Make `CMD` into `npm start` and measure how long `docker stop` takes; then put it back.

## Going deeper

- **Official docs:** Next.js, "Deploying" and "Deploying to Platforms"; the options, the adapters and the feature requirements.[^1][^2]
- **Official docs:** Next.js, "Self-Hosting"; the reverse proxy, the cache, version skew and shutdown.[^9]
- **Official docs:** Docker, "Building best practices"; multi-stage builds, the cache and `.dockerignore`.[^5]
- **Guide:** OWASP, "Node.js Docker Cheat Sheet"; the non-root user, signals and secrets.[^7]

## Sources

1. [Next.js: Deploying](https://nextjs.org/docs/app/getting-started/deploying) *(doc)* — A Node.js server, Docker, static output, the adapters and the verified adapters.
2. [Next.js: Deploying to Platforms](https://nextjs.org/docs/app/guides/deploying-to-platforms) *(doc)* — The minimum requirement, functional and performance correctness, and the feature matrix.
3. [Next.js: output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) *(doc)* — `output: "standalone"`, `server.js`, copying the static files, `PORT` and `HOSTNAME`.
4. [Docker: Multi-stage builds](https://docs.docker.com/build/building/multi-stage/) *(doc)* — Several `FROM`s, and copying files between stages.
5. [Docker: Building best practices](https://docs.docker.com/build/building/best-practices/) *(doc)* — Multi-stage builds, using the cache, `.dockerignore` and pinning the image tags.
6. [Next.js: the with-docker example](https://github.com/vercel/next.js/tree/canary/examples/with-docker) *(doc)* — The official three-stage Dockerfile with the standalone output.
7. [OWASP: Node.js Docker Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html) *(doc)* — Fixed image tags, the non-root user, `npm start` and signals, and multi-stage builds.
8. [Docker: Build secrets](https://docs.docker.com/build/building/secrets/) *(doc)* — `ARG` and `ENV` staying in the image, and secret mounts.
9. [Next.js: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting) *(doc)* — The reverse proxy, streaming, the encryption key, `deploymentId`, the cache and shutdown.
