# A multi-package project

The working version of the project lesson in the [architecture guide](https://virastack.com/academy/architecture/multi-package-project). Compare against it when you get stuck.

A monorepo set up with a pnpm workspace and Turborepo:

- `apps/store`: the Next.js store (port 3000)
- `apps/admin`: the Vite + React admin panel (port 5173)
- `packages/ui`: `@repo/ui`, shared by both applications (a Just-in-Time package, with Vitest tests)
- `packages/typescript-config`: the shared `tsconfig` files

## Running it

```bash
pnpm install
pnpm dev
```

## The checks

```bash
pnpm build
pnpm check-types
pnpm test
```

Run the same command a second time and Turborepo serves the result from its cache (`FULL TURBO`).
