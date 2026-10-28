---
title: "Monorepo"
description: "Shared packages and a common UI library with a pnpm workspace and Turborepo."
lastVerified: "2026-10-15"
translationKey: "architecture/monorepo"
---

A monorepo is more than one application and package living in a single repository. You share the common UI components, the TypeScript settings and the types without splitting them into separate repositories. The coordination cost between teams drops, and you can update a package and the applications that use it in a single change.[^1] This guide sets the most common pair in frontend up: **pnpm** workspaces, which link the packages together, and **Turborepo**, which orders the tasks and caches them.

## When a monorepo?

| A monorepo makes sense | Separate repositories make sense |
| --- | --- |
| There are applications that evolve together, plus shared UI, type and config packages[^2] | The projects are products independent of each other[^2] |
| You want to share the shared code without publishing it to npm | Strict isolation is needed[^2] |
| You want one change to update the package and all its consumers in one PR | The team has no CI maturity[^2] |

The hard part of the move is usually not technical but organisational: the teams have to accept working in the same repository.[^1]

The extreme example is Google: it uses one enormous single repository as a single shared source of truth for tens of thousands of developers. The Communications of the ACM article describes this model's advantages and trade-offs, along with the systems and workflows that make it possible.[^3] The frontend equivalent of the trade-off is size: as the code grows, the build, the tests and version control slow down, and the editor gets heavy.[^4] This guide's measure is roughly this: if there are three or more deployable applications, a few shared packages and more than one team working in the code base, a monorepo makes sense. For a single application and a team of fewer than about 10 people, it is early. In [Fireship](https://fireship.io)'s words, a monorepo "might be overkill for your blog".[^4]

For the cases where teams want independent release cycles, see the [Micro frontend](/academy/architecture/micro-frontend) guide.

## Two tools, two jobs

|  | pnpm workspaces | Turborepo |
| --- | --- | --- |
| Its job | Discovers the packages, links them together, keeps a single lockfile[^5] | Orders the tasks, runs them in parallel, caches the results[^6][^7] |
| Its config file | `pnpm-workspace.yaml` | `turbo.json` |

Turborepo is built on top of the package manager's workspace feature.[^8] Downloading, symlinking and resolving the dependencies is still the package manager's job.[^9] An alternative doing the same job is **Nx**, which also offers mechanisms for enforcing architectural boundaries.[^10] Fireship's comparison sums the difference up well: both produce a dependency graph, cache the outputs and run the tasks in parallel. Nx is older and broader (code generation, plugins, distributed task running), while Turborepo is newer and minimal and is easily added to an existing workspace.[^4] (The video is from 2021; the tool details have changed, the concepts hold.)

## The structure

```text
repo/
├── apps/
│   ├── web/                  # the Next.js application
│   └── admin/                # the second application
├── packages/
│   ├── ui/                   # @repo/ui
│   ├── typescript-config/    # @repo/typescript-config
│   └── eslint-config/        # @repo/eslint-config
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

The Turborepo documentation recommends collecting the applications and services under `apps/` and the libraries and tools under `packages/`.[^8] [Anthony Shew](https://www.youtube.com/@anthonyshewww)'s video has the same skeleton: the workspaces tie the pieces under `apps` and `packages` into one graph, and every package gets its own `package.json`, an `exports` field for the API it opens outwards, and its own `scripts` field.[^11]

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// package.json (the root)
{
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

- Every folder under `apps/*` and `packages/*` that has a `package.json` is a package. Nested packages (`apps/a` and `apps/a/b`) are not supported.[^8]
- The lockfile is required. Turborepo works out the dependencies between the internal packages from it.[^8]
- Only repository management tools go in the root directory (`turbo`, `husky`, `lint-staged`). The application dependencies are written into the package that uses them.[^9] According to the warning in [Tally Barak](https://tallybarak.com)'s DevOps.js talk, dependencies hoisted to the root can hide missing declarations, and the error only comes out at deploy time.[^12]

## Shared packages

An application adds an internal package the way it would a package from npm. Instead of a version you write the package manager's workspace syntax:[^13]

```json
// apps/web/package.json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

With the `workspace:` protocol, pnpm refuses to resolve to anything but the local workspace package. No other version comes down from the registry by accident.[^5] Use a scoped prefix in the package name. The Turborepo documentation uses `@repo`, because it is a namespace that cannot be taken on npm.[^8]

If many packages use the same dependency, you can use pnpm catalogs to keep the version in one place (pnpm 9.5 and later):[^9]

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"

catalog:
  react: ^19.0.0
  react-dom: ^19.0.0
```

```json
// apps/web/package.json and packages/ui/package.json
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

Catalogs gain you three things: every dependency has a single version in the workspace, an update is a one-line change in `pnpm-workspace.yaml` alone, and no merge conflicts appear in the `package.json` files.[^14]

Two rules will do while designing the packages:

- **One purpose per package:** `@repo/ui` holds all the shared UI components, and `@repo/typescript-config` the TypeScript settings.[^15]
- **Applications do not hold shared code.** Put the shared code in its own package and let the applications depend on it. Applications are the end of the package graph.[^15]

## The shared UI package

There are two ways to compile an internal package:[^13]

|  | **Just-in-Time** | **Compiled** |
| --- | --- | --- |
| How it works | It exports the TypeScript files directly, and the application's bundler compiles them | It is compiled with `tsc` into a `dist` folder |
| Configuration | Very little | More |
| The Turborepo cache | Cannot be cached, because the package has no `build` step of its own | The build outputs are cached with `outputs` |
| When | If the applications use a modern bundler such as Turbopack, webpack or Vite | If a tool that cannot compile TypeScript also uses the package |

For a UI package shared between [!nextjs] and Vite applications, Just-in-Time is the option that starts with the least configuration. If you are happy with the applications' build time, losing the cache is not a problem.[^13]

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "exports": {
    "./button": "./src/button.tsx",
    "./card": "./src/card.tsx"
  },
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "check-types": "tsc --noEmit"
  }
}
```

```tsx
import { Button } from "@repo/ui/button"
```

Defining `exports` per file lets you avoid tying the package to a single barrel file. Barrel files are hard for compilers and bundlers.[^8] This is the package-level version of the `index.ts` discussion from [the previous guide](/academy/architecture/folder-structure).

> [!WARNING]
>
> **You cannot use `paths` inside a Just-in-Time package.** Because the consumer compiles the package, TypeScript's `compilerOptions.paths` setting does not work. Use Node.js subpath imports instead: write `"imports": { "#*": "./src/*" }` in `package.json` and import as `#utils.ts` in the code.[^16] Inside the application you keep using the `@/` alias.

Share the TypeScript settings too. Under `packages/typescript-config` live `base.json` and variants such as `nextjs.json` and `react-library.json`, and every package picks one of them with `extends` in its own `tsconfig.json`:[^16]

```json
// apps/web/tsconfig.json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

You usually do not need a `tsconfig.json` in the root directory. A change in the root invalidates every task's cache.[^16]

**If you use shadcn/ui**, the CLI knows about monorepos. `pnpm dlx shadcn@latest init --monorepo` sets up two workspaces (`web` and `ui`) and Turborepo. When you run `add button` inside `apps/web`, the component lands under `packages/ui` and the import paths are updated. The components are imported as `@workspace/ui/components/button`.[^17] Every workspace has to have a `components.json`, and `style`, `iconLibrary` and `baseColor` have to be the same in both. In Tailwind CSS v4 the `tailwind.config` field inside `components.json` is left empty.[^17] shadcn sets the package up under the name `@workspace/ui`, which has the same role as `@repo/ui` in this guide: if you use shadcn, keep its name.

## turbo.json: tasks and the cache

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "!.next/dev/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "check-types": {
      "dependsOn": ["^check-types"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

Every `tasks` key runs the script with the same name in the packages' `package.json`.[^6]

- **`^build`:** runs a package's dependencies' `build` task before the package itself. `web` is compiled after `@repo/ui` has finished.[^6]
- **`outputs`:** says which files are cached. Without it, Turborepo does not cache the files and a run restored from the cache does not bring them back.[^6][^7]
- **`dev`:** because it is a task that never finishes, it takes `persistent: true` and `cache: false`.[^6]

> [!WARNING]
>
> Writing `"build": {}` is not enough: the tasks then run in parallel with no order and the outputs are not cached, which leads to errors quickly.[^6]

The cache rests on a fingerprint of the inputs. If the same fingerprint comes again, Turborepo does not redo the work and restores the result from the cache.[^7] The local cache lives in the `.turbo/cache` folder. If you turn Remote Cache on with `npx turbo login` and `npx turbo link`, your teammates and CI share the same cache.[^7] Updating a dependency in the root `package.json` invalidates every task's cache, which is the practical reason for keeping the root directory thin.[^7]

For `check-types`, `^check-types` gives the right cache behaviour but does not run the tasks in parallel. For both correctness and parallelism, the Turborepo documentation recommends the Transit Node pattern.[^6]

## Running tasks

```bash
turbo run build                 # every package
turbo run build --filter=web... # web and its dependencies
turbo run build --filter=...ui  # ui and the packages that use it
turbo run build test lint       # several tasks, in parallel where possible
```

`...` at the end covers the dependencies, and at the start the dependents.[^18] While changing a package, with `--filter=...ui` you can see that everything using it still compiles.[^18]

> [!WARNING]
>
> Write the `turbo` commands only in the root `package.json`. Write them in the packages' own scripts and `turbo` calls itself recursively.[^18]

> [!TIP]
>
> If you notice yourself writing `../` to reach another package, stop. Add that package as a dependency and import it by its name.[^8] Shew too counts reaching modules by package name rather than by file path as critical for keeping the monorepo's order.[^11]

## CI and Docker

The cache's real value comes out in CI. In [Michael Guay](https://www.youtube.com/@mguay)'s video, a Next.js frontend and a NestJS backend are set up in one workspace with pnpm and Turborepo. The TypeScript and ESLint settings and the DTO types live in shared packages. Once Vercel Remote Cache is connected in the GitHub Actions pipeline, previously compiled outputs come from the cache without being compiled again.[^19] Shew's video shows the same effect: with Remote Cache, the deployment processes in CI/CD come down to seconds.[^11] According to Turborepo's Docker guide, the credentials (`TURBO_TEAM`, `TURBO_TOKEN`) are passed as build arguments. Because they are used only during the build stage, they do not enter the final image.[^20]

While putting an application in Docker in a monorepo, the problem is this: an unrelated change in one application's lock file can needlessly invalidate another application's Docker build.[^20] `turbo prune` produces a small copy containing the workspaces the target application needs and a pruned lock file:[^20]

```bash
turbo prune web --docker
```

The `--docker` flag splits the output in two: `out/json` holds only the `package.json` files (they change rarely, for the dependency installation) and `out/full` the source code. The pruned lock file sits at the root of `out/`.[^21] In a multi-stage Dockerfile you install the dependencies with `json` and the lock file first, then compile with `full`. That way the installation layer stays in the cache as long as the dependencies do not change.[^20] For the full Dockerfile, see Turborepo's Docker guide.

## Try it yourself

1. Create an example repository with `pnpm dlx create-turbo@latest`. Examine the `workspace:*` link between `apps/web` and `packages/ui`.
2. Run `turbo run build` twice. See the result coming from the cache the second time.
3. Change a component inside `packages/ui` and run `turbo run build --filter=...ui`. Look at which packages are compiled again.
4. Delete `outputs` from `turbo.json` and try again. See that a build restored from the cache does not bring the files back.
5. Watch Fireship's [Monorepos: Turborepo vs Nx](https://www.youtube.com/watch?v=9iU_IE6vnJ8) video (9 min). Then look at the versioning and dependency installation sections of [Tally Barak](https://tallybarak.com)'s *1001 Packages* talk (24 min).[^12] For a more conversational introduction, Syntax's monorepo episode is good too: on workspaces, pnpm, Turborepo, Nx, Lerna and Rush.[^22]
6. To start from scratch there is [Anthony Shew](https://www.shew.dev)'s [How to structure a JS/TS monorepo](https://www.youtube.com/watch?v=TeOSuGRHq7k) video, and to see only the pnpm side there is Code with tkssharma's [PNPM Workspaces Deep Dive](https://www.youtube.com/watch?v=2cW7aQ7CQcA). In the second one an `api` and a `utils` package are set up with `pnpm-workspace.yaml` and linked with `workspace:`.[^23]
7. If you have an application, run `turbo prune <app> --docker` and look at the `out/json` and `out/full` folders.[^21]

## Sources

1. [The New Stack: The Case for (and Against) Monorepos on the Frontend](https://thenewstack.io/the-case-for-and-against-monorepos-on-the-frontend/) *(article)* — The monorepo's effect on the cost of collaboration in frontend, and the organisational side of the move.
2. [Graphite: When to use a monorepo](https://graphite.com/guides/when-to-use-monorepo) *(article)* — The cases where a monorepo suits and where it does not.
3. [Rachel Potvin and Josh Levenberg: Why Google Stores Billions of Lines of Code in a Single Repository](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/) *(research)* — The reasoning, advantages and trade-offs of Google's single-repository model. Communications of the ACM, 2016.
4. [Fireship: Monorepos, How the Pros Scale Huge Software Projects // Turborepo vs Nx](https://www.youtube.com/watch?v=9iU_IE6vnJ8) *(video)* — The monorepo's benefit and the cost of size, the Nx and Turborepo comparison, and a `create-turbo` demo. 9 min, 2021.
5. [pnpm: Workspace](https://pnpm.io/workspaces) *(doc)* — `pnpm-workspace.yaml`, the `workspace:` protocol and the single lockfile.
6. [Turborepo: Configuring tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks) *(doc)* — `tasks`, `dependsOn`, `^`, `outputs` and running in parallel.
7. [Turborepo: Caching](https://turborepo.dev/docs/crafting-your-repository/caching) *(doc)* — The fingerprint-based cache, Remote Cache and the global hash inputs.
8. [Turborepo: Structuring a repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) *(doc)* — The `apps/` and `packages/` structure, a package's anatomy, `exports` and the `@repo` prefix.
9. [Turborepo: Managing dependencies](https://turborepo.dev/docs/crafting-your-repository/managing-dependencies) *(doc)* — Installing a dependency in the package that uses it, few dependencies in the root, and keeping the versions in step.
10. [Nx: Enforce module boundaries](https://nx.dev/docs/features/enforce-module-boundaries.md) *(doc)* — Nx's mechanisms for enforcing architectural boundaries.
11. [Anthony Shew: How to structure a JS/TS monorepo, From Zero to Turbo](https://www.youtube.com/watch?v=TeOSuGRHq7k) *(video)* — The workspaces, the `apps` and `packages` structure, `exports`, reaching code by package name, the Turborepo tasks and Remote Cache.
12. [Tally Barak: 1001 Packages, Strategies for Managing Monorepos (DevOps.js Conf 2022)](https://gitnation.com/contents/1001-packages-strategies-for-managing-monorepos) *(video)* — Installing packages, linking, the build strategies, the hoisting warning and versioning. 24 min.
13. [Turborepo: Internal Packages](https://turborepo.dev/docs/core-concepts/internal-packages) *(doc)* — Using `workspace:*`, and the Just-in-Time and Compiled package strategies.
14. [pnpm: Catalogs](https://pnpm.io/catalogs) *(doc)* — Keeping the versions in one place with the `catalog:` protocol.
15. [Turborepo: Creating an Internal Package](https://turborepo.dev/docs/crafting-your-repository/creating-an-internal-package) *(doc)* — The steps for creating a package, single-purpose packages, and not holding shared code in applications.
16. [Turborepo: TypeScript](https://turborepo.dev/docs/guides/tools/typescript) *(doc)* — The shared `tsconfig` package, Node.js subpath imports, and not needing a root `tsconfig`.
17. [shadcn/ui: Monorepo](https://ui.shadcn.com/docs/monorepo) *(doc)* — `init --monorepo`, the `packages/ui` structure and the `components.json` requirements.
18. [Turborepo: Running tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks) *(doc)* — `turbo run`, the `--filter` patterns and use in the root scripts.
19. [Michael Guay: Learn Turborepo By Example, Code Sharing, Distributed Cache, & More!](https://www.youtube.com/watch?v=nx-cj3dqWNE) *(video)* — Setting Next.js and NestJS up in one workspace, the shared packages, GitHub Actions and Vercel Remote Cache, and Docker with `turbo prune`.
20. [Turborepo: Docker](https://turborepo.dev/docs/guides/tools/docker) *(doc)* — Why a Docker build breaks in a monorepo, `turbo prune --docker`, the multi-stage Dockerfile and the Remote Cache arguments.
21. [Turborepo: prune](https://turborepo.dev/docs/reference/prune) *(doc)* — The `turbo prune` syntax, the `--docker` output (`json/`, `full/`, the pruned lock file) and the options.
22. [Syntax #426: Monorepos! Workspaces, pnpm, turborepo + more!](https://syntax.fm/show/426/monorepos-workspaces-pnpm-turborepo-more) *(podcast)* — Monorepo experience from Wes Bos and Scott Tolinski, the shared dependencies and the tools. January 2022.
23. [Code with tkssharma: PNPM Workspaces Deep Dive, Fast Monorepo Setup](https://www.youtube.com/watch?v=2cW7aQ7CQcA) *(video)* — Setting `pnpm-workspace.yaml` up, creating a sub-package and adding a local dependency with `workspace:`.
