---
title: "A multi-package project"
description: "Setting up a shared UI package and two applications inside a monorepo."
lastVerified: "2026-10-22"
translationKey: "architecture/multi-package-project"
---

## Scenario

A store has two applications: the shop the customer sees and the admin panel the team uses. Both have to use the same button and the same price format. Instead of copying the code, you are going to keep it in a single package.

| Part | Folder | Tool |
| :-- | :-- | :-- |
| The shop | `apps/store` | [!nextjs] |
| The admin panel | `apps/admin` | [!vite] + [!react] |
| The shared UI | `packages/ui` (`@repo/ui`) | A Just-in-Time package, [!vitest] |
| The shared TypeScript settings | `packages/typescript-config` | [!typescript] |
| The tasks and the cache | `turbo.json` | [!turborepo] |

The concepts were covered in the [Monorepo](/academy/architecture/monorepo) lesson. Here you will set them all up together and see them work.

The working project is on GitHub: [examples/architecture/multi-package-project](https://github.com/virastack/academy/tree/main/examples/architecture/multi-package-project).

> [!NOTE]
>
> The project was written with `pnpm@10.28.0`, `turbo@2.11.10`, `next@16.4.2`, `vite@8.3.5` and `vitest@5.0.5`.

## Step 1: The root directory

```text
store-monorepo/
├── apps/
│   ├── store/
│   └── admin/
├── packages/
│   ├── ui/
│   └── typescript-config/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"

catalog:
  react: 19.3.0
  react-dom: 19.3.0
  "@types/react": ^19
  "@types/react-dom": ^19
  typescript: ^5
```

With `catalog`, the React and TypeScript versions live in one place. The packages write `"react": "catalog:"` instead of a version.[^1] That is how three packages are stopped from drifting to three different React versions.

The root `package.json` holds only `turbo`. The application dependencies are written into the package that uses them.[^2]

```json
// package.json
{
  "private": true,
  "packageManager": "pnpm@10.28.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "check-types": "turbo run check-types",
    "test": "turbo run test"
  },
  "devDependencies": { "turbo": "^2.11.10" }
}
```

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "!.next/dev/**", "dist/**"]
    },
    "check-types": { "dependsOn": ["^check-types"] },
    "test": { "dependsOn": ["^test"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

`outputs` covers both applications' output: Next.js writes to `.next/` and Vite to `dist/`.[^3]

## Step 2: The shared TypeScript settings

Inside `packages/typescript-config` there are two files: `base.json` and `nextjs.json`, which extends it. Every package picks one of them in its own `tsconfig.json`.[^4]

```json
// packages/typescript-config/base.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true
  }
}
```

Why is `allowImportingTsExtensions` in `base.json`? The UI package is going to use imports with an extension, such as `#format-price.ts`. In a Just-in-Time package the type checking runs in the consumer too; the package's code enters the application's `tsc` run.[^5] When I put the setting in the UI package alone, the admin panel gave this error:

```text
../../packages/ui/src/price.tsx(1,29): error TS5097: An import path can only end with a '.ts'
extension when 'allowImportingTsExtensions' is enabled.
```

## Step 3: The UI package

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "type": "module",
  "exports": {
    "./button": "./src/button.tsx",
    "./price": "./src/price.tsx",
    "./styles.css": "./src/styles.css"
  },
  "imports": {
    "#*": "./src/*"
  },
  "scripts": {
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

- **`exports`:** every file is its own entry. There is no single barrel file; the application writes `@repo/ui/button`.[^6]
- **No `build` script:** the package gives the TypeScript as it is, and the application's bundler compiles it. This is a Just-in-Time package.[^5]
- **`imports`:** a `paths` alias such as `@/` does not work inside the package, because the consumer compiles the code. Node.js subpath imports are used instead.[^4]

```tsx
// packages/ui/src/price.tsx
import { formatPrice } from "#format-price.ts";

export function Price({ value }: { value: number }) {
  return <span className="ui-price">{formatPrice(value)}</span>;
}
```

The styles are part of the package too: the `styles.css` file is opened outwards with `exports` and both applications import it.

## Step 4: Connect them to the applications

```json
// apps/store/package.json and apps/admin/package.json
{
  "dependencies": {
    "@repo/ui": "workspace:*",
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

`workspace:*` guarantees the package comes from the workspace and not from the registry.[^7]

```tsx
// apps/store/src/components/add-to-cart.tsx
"use client";

import { Button } from "@repo/ui/button";
```

```tsx
// apps/admin/src/app.tsx
import { Button } from "@repo/ui/button";
import { Price } from "@repo/ui/price";
```

Neither application needed any extra setting. Turbopack compiles the workspace packages itself; `transpilePackages` is only needed for uncompiled packages coming from `node_modules`, and for cases such as webpack and the Pages Router.[^8] Vite compiled the TypeScript source directly too.

> [!WARNING]
>
> There is no `"use client"` in the `Button` file, because it holds no state itself. The component that passes `onClick`, on the other hand, has to be a Client Component. That is why `add-to-cart.tsx` is a separate file in the shop.

## Step 5: Test the package

The tests sit next to the package. Whoever changes the package runs its test too.

```tsx
// packages/ui/src/button.test.tsx
test("Price formats the amount in euros", () => {
  render(<Price value={2499} />);

  expect(screen.getByText("€2,499.00")).toBeTruthy();
});
```

```command
pnpm install
pnpm turbo run build check-types test
```

All six tasks should pass: two `build`s, three `check-types` and one `test`. Turborepo runs the tasks that do not depend on each other in parallel.[^9]

## Step 6: See the cache and the filter

Run the same command a second time:

```text
 Tasks:    6 successful, 6 total
Cached:    6 cached, 6 total
  Time:    14ms >>> FULL TURBO
```

Because no input changed, Turborepo did not redo the work and brought the result from the cache.[^10]

Now change a line in `packages/ui/src/styles.css` and compile only the things that use the UI:[^9]

```command
pnpm turbo run build --filter=...@repo/ui
```

```text
   • Packages in scope: @repo/ui, admin, store
admin:build: cache miss, executing 65b696c8bcb51874
store:build: cache miss, executing cb587f335c67df93
```

Finally, change a heading inside `apps/admin` only and run `pnpm build`. The admin panel is compiled again and the shop comes from the cache:

```text
admin:build: cache miss, executing b61e7c14bf8626b5
store:build: cache hit, replaying logs cb587f335c67df93
```

> [!TIP]
>
> `pnpm dev` opens both development servers together: the shop on `localhost:3000` and the panel on `localhost:5173`. A change you make in the UI package shows up in both immediately.

## Try it yourself

- Add a `Card` component to `@repo/ui`. Write its new line into `exports` and use it in both applications.
- Delete the `outputs` field from `turbo.json`, take two builds, then delete the `.next` folder and run a third. Does a build restored from the cache bring the files back?
- Turn the UI package into a Compiled package: compile it into `dist/` with `tsc`, point `exports` at `dist`, and see the `build` task being cached.[^5]
- Make a type error on purpose inside `packages/ui/src/price.tsx`. Look at which packages the error shows up in in the `pnpm check-types` output.

## Sources

1. [pnpm: Catalogs](https://pnpm.io/catalogs) *(doc)* — Keeping the versions in one place with the `catalog:` protocol.
2. [Turborepo: Managing dependencies](https://turborepo.dev/docs/crafting-your-repository/managing-dependencies) *(doc)* — Installing a dependency in the package that uses it, and few dependencies in the root.
3. [Turborepo: Configuring tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks) *(doc)* — `dependsOn`, `^`, `outputs` and the `persistent` tasks.
4. [Turborepo: TypeScript](https://turborepo.dev/docs/guides/tools/typescript) *(doc)* — The shared `tsconfig` package, and Node.js subpath imports instead of `paths`.
5. [Turborepo: Internal Packages](https://turborepo.dev/docs/core-concepts/internal-packages) *(doc)* — Just-in-Time and Compiled packages, and type errors in an internal package showing up in the consumer.
6. [Turborepo: Structuring a repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) *(doc)* — The `apps/` and `packages/` structure, per-file `exports` and the `@repo` prefix.
7. [pnpm: Workspace](https://pnpm.io/workspaces) *(doc)* — The `workspace:` protocol and the single lockfile.
8. [Next.js: transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages) *(doc)* — Turbopack compiling the workspace packages itself, and the cases where the setting is needed.
9. [Turborepo: Running tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks) *(doc)* — Selecting the dependent packages with `--filter` and `...`.
10. [Turborepo: Caching](https://turborepo.dev/docs/crafting-your-repository/caching) *(doc)* — The inputs' fingerprint and restoring from the cache.
