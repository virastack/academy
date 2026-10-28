---
title: "Micro frontend"
description: "When you need it, when you don't, and a basic setup with Vite and Module Federation."
lastVerified: "2026-10-15"
translationKey: "architecture/micro-frontend"
---

A micro frontend is an architectural style where frontend applications that can be released independently are combined into a single whole.[^1] Every team owns its own vertical slice (the cart page, say) from the idea to production, while the user sees a single product.[^1] This guide answers the real question first: do you really need this? Then it builds the smallest working setup with **Module Federation** on **Vite**.

## When you need it, and when you don't

A micro frontend is not a code organisation tool but a **deployment** decision. Nx's criterion is clear: use it if independent deployment is a requirement.[^2]

| It makes sense | It does not |
| --- | --- |
| Independent deployment really is a requirement[^2] | The whole frontend is in one team[^2] |
| Several teams release to the same application and waiting for a shared release train costs more than the complexity[^2] | The teams already deploy together[^2] |
| You want to replace an old frontend piece by piece instead of a risky rewrite[^1] | The application is small[^2] |
| The teams want to pick their own technology stacks[^3] | You cannot fund the continuous coordination work[^2] |

If you only want to shorten the build time, combining at runtime is the wrong tool. Nx recommends other routes for that job.[^2]

The same warning is heard on conference stages. At QCon, [Ruben Casas](https://infoxicator.com) recommends starting the decision by asking whether *the problem really exists*. If it does not, you do not need a distributed architecture. If it does, the symptoms are usually these: a fragile application, no fault isolation, slow CI/CD and deploys, unclear team ownership and hard onboarding.[^4] A micro frontend's real gain is team autonomy and time to market. It is not a performance gain, and set up carelessly it can make performance worse.[^4]

You need to know the cost too:

- **Version skew:** the releases are not atomic. The application versions can diverge between deploys, and the contracts between teams turn from compile-time into runtime agreements.[^2]
- **Duplicated weight:** if every package brings its own copy of a dependency, the user downloads React *n* times. Sharing the dependencies, on the other hand, brings the version coupling back.[^1]
- **A hidden monolith:** a global store, or a shell that knows everything, ties the applications back together. The result is a *distributed monolith* combining the bad sides of both approaches.[^3] In the example Casas describes, a team with around 70 micro frontends has a deploy that goes over 5 hours, and rolling back comes very expensive.[^4]
- **Operational load:** separate deploys increase the CI/CD, feature flag and versioning work.[^3]

According to the State of Frontend data, micro frontend usage fell from 75.4% in 2022 to 23.6% in 2024. Module Federation usage, meanwhile, reached 51.8% in 2024, and is often used inside monoliths.[^3]

### Try the cheaper routes first

What classifies an architecture is not the number of repositories, containers or teams but how tightly the pieces are coupled. Pieces that are always deployed together are effectively a monolith.[^3] For most small and medium teams the fastest route is a **modular monolith** with clear module boundaries. You split a module out when a real need appears.[^3]

Casas draws this as a spectrum and recommends moving only as far as the problem requires:[^4]

| Step | What is it? |
| --- | --- |
| A monolith | A single deploy unit. It can be full-stack, frontend or a meta-framework |
| A modular monolith | The internal boundaries are enforced but the application is still deployed as one piece |
| Integrated applications | Independent modules are combined at build time, usually inside a monorepo |
| Micro frontends | Independently deployed applications aligned to business domains |

If the system is decoupled enough, you can also move back along the spectrum. If independent deployment causes more problems than expected, you can pull back to integrated applications.[^4] Zack Jackson, who developed Module Federation at ByteDance, says the same: start with a monorepo, draw clean boundaries as if federation were there, and split later if you need to. A monorepo whose boundaries have blurred is very hard to split afterwards.[^5] His rough measure is to start thinking about federation seriously as you approach 10-15 pieces.[^5]

In practice the steps are these:

1. Draw the boundaries inside the code with a [feature-based folder structure](/academy/architecture/folder-structure).
2. Split the shared code into packages inside a [monorepo](/academy/architecture/monorepo).
3. If independent deployment is still needed, move to micro frontends.

On the academic side, a study reviewing 16 papers also notes that companies shy away from this architecture because they do not know its concepts, its development approaches and its organisational effects.[^6]

## The integration approaches

There are several ways to combine micro frontends:[^1]

| Approach | How it works | Note |
| --- | --- | --- |
| Build time | Every piece is published as a package and compiled together in the shell | It creates a lock-step release process; the author definitely does not recommend it[^1] |
| Server side | The server combines the HTML fragments | Every piece can belong to a different team[^1] |
| An iframe | Every piece runs in an isolated iframe | Style and global isolation are good, routing and deep linking are hard[^1] |
| JavaScript at runtime | The shell calls an entry point each bundle exposes | The author's default choice[^1] |
| Web Components | Every piece defines a custom element | For teams that want to lean on browser standards[^1] |

Module Federation corresponds to the "JavaScript at runtime" row of that table: the shell loads the remote application's modules while running in the browser. The lock-step release problem of build-time combining disappears that way.

## The Module Federation concepts

The Module Federation documentation defines two roles: the **provider**, which offers a component, and the **consumer**, which uses it.[^7] The community and this guide name the same roles **remote** (the remote application) and **host** (the shell).

| Concept | What it means |
| --- | --- |
| `name` | The application's unique name in the federation |
| `exposes` | The modules the remote opens outwards (`'./CartWidget': './src/cart-widget.tsx'`)[^8] |
| `remotes` | The addresses of the remotes the host will load[^7] |
| `shared` | The dependencies to be shared as a single copy between the host and the remote[^7] |
| `remoteEntry.js` | The remote's entry file. The host connects to the remote through it[^9] |

The remote's entry point can be an `mf-manifest.json` too.[^7] In the Vite plugin, `manifest: true` produces that file as well.[^9]

## The setup with Vite

The example scenario: an e-commerce shell (`shell`, the host) will load the cart widget from a separate application (`cart`, the remote). Both applications are ordinary **Vite** + React projects. As in the [monorepo](/academy/architecture/monorepo) guide, they can live in the same workspace as `apps/shell` and `apps/cart`.

Install the plugin in both applications:[^8]

```bash
pnpm add -D @module-federation/vite
```

The setup in this guide was tried with Vite 8, React 19 and `@module-federation/vite` 1.23, in both `dev` and `build` + `preview` mode. The plugin supports Vite 5, 6, 7 and 8.

> [!WARNING]
>
> Many guides use `@originjs/vite-plugin-federation`. That is a different plugin, with different options and behaviour.[^10] This guide goes with the Module Federation team's official plugin, `@module-federation/vite`.

### The remote: the cart

```ts
// apps/cart/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

export default defineConfig({
  server: { port: 5174, origin: 'http://localhost:5174' },
  plugins: [
    react(),
    federation({
      name: 'cart',
      filename: 'remoteEntry.js',
      exposes: {
        './CartWidget': './src/cart-widget.tsx',
      },
      shared: {
        react: { singleton: true },
        'react/': { singleton: true },
        'react-dom': { singleton: true },
        'react-dom/': { singleton: true },
      },
    }),
  ],
})
```

```tsx
// apps/cart/src/cart-widget.tsx
export default function CartWidget({ count }: { count: number }) {
  return <button>Cart ({count})</button>
}
```

The `server.origin` setting is needed in the remote. That way the dev server gives the file addresses as full URLs the host can understand.[^9]

### The host: the shell

```ts
// apps/shell/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

export default defineConfig({
  server: { port: 5173 },
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        cart: {
          type: 'module',
          name: 'cart',
          entry: 'http://localhost:5174/remoteEntry.js',
        },
      },
      shared: {
        react: { singleton: true },
        'react/': { singleton: true },
        'react-dom': { singleton: true },
        'react-dom/': { singleton: true },
      },
    }),
  ],
})
```

Load the remote with a normal dynamic import. `React.lazy` and `Suspense` leave the loading state to React and let you use the remote component like ordinary JSX.[^10]

```tsx
// apps/shell/src/main.tsx
import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

const CartWidget = lazy(() => import('cart/CartWidget'))

createRoot(document.getElementById('root')!).render(
  <Suspense fallback="Loading...">
    <CartWidget count={2} />
  </Suspense>,
)
```

Run it: start both applications with `dev` and open `localhost:5173`. The cart widget appears inside the shell.

### Type support

Without the remote's types, TypeScript cannot find the `cart/CartWidget` module (`TS2307`). Module Federation produces the types automatically and the consuming application downloads them while running. Pointing at that folder in the consumer's `tsconfig.json` is enough:[^11]

```json
// apps/shell/tsconfig.json
{
  "compilerOptions": {
    "paths": { "*": ["./@mf-types/*"] }
  },
  "include": ["src", "@mf-types"]
}
```

`@mf-types` is a generated folder; add it to `.gitignore`. If the types do not arrive, start with `FEDERATION_DEBUG=true` and look at the `.mf/typesGenerate.log` file.[^11]

## Shared dependencies

The `shared` section is a micro frontend's most fragile point. Three options are enough:[^12]

- **`singleton: true`:** only one version is loaded in the sharing scope. If the host and the remote want different versions, the higher one is loaded and the lower side gets a warning in the console.[^12] This is required for libraries that have to be a single copy, such as React.
- **`requiredVersion`:** the version range wanted. If the available version is below it, a warning appears in the console. Its default is the application's own dependency version.[^12]
- **`eager`:** loads the shared module immediately, but because it embeds it in the entry file it grows the size, so use it carefully.[^12]

Share only what really has to be a single copy, the UI framework for example. A library that is not shared enters every application's bundle, while the shared ones have to be managed strictly.[^2] Keys ending with `/`, such as `'react/'`, share the subpaths such as `react/jsx-runtime` too.[^8]

## What to watch out for

- **The remote's type:** write `type: 'module'` for remotes produced with Vite. Without it the plugin falls back to `"var"` and warns.[^9]
- **Do not touch the chunk settings:** the plugin manages the chunk graph itself. `codeSplitting: false` is ignored, and in Vite 8 and later `manualChunks` is ignored with a warning.[^9]
- **Old browsers:** if you target below Chrome 89, you have to use the `vite-plugin-top-level-await` plugin.[^8]
- **Do not hard-code the address:** `localhost:5174` is for local development only. Read it from a variable that changes with the environment; otherwise you have to change the addresses by hand at deploy time.[^10] A more advanced pattern: instead of writing the remote addresses into the build settings, read them from a framework-agnostic JSON discovery schema that CI/CD produces.[^13] Mezzalira does not find statically embedding the remote links into configuration files, as webpack does, suitable for production. The discovery schema also allows a canary release on a CDN and at the edge (directing 10% of the traffic to a new version, say) and a fast rollback.[^14]
- **Start coarse:** give the teams large domains first and split later if you need to. Do not split domains that rarely change into a large number of micro frontends.[^13] Rather than putting many small pieces on the same page, starting with first-level URL routing (`/catalog`, say) is more effective.[^14]
- **Keep the shell thin:** the shell should be domain-agnostic and stable, and should not hold application logic.[^13] It should stay a plain structure responsible only for the first-level routing.[^15]
- **Do not mix different frameworks for long:** Mezzalira calls that "micro frontend anarchy". A mixture is only acceptable as a temporary transition state.[^16] Zack Jackson also says multiple frameworks bring disorder.[^5]
- **Do not abstract early:** according to Mezzalira, a shared library is usually used in only two places.[^16]
- **Type safety is hard with dynamic remotes:** because the remotes are loaded at runtime, they cannot be analysed statically. ByteDance solved that with a type engine that runs during development.[^5]
- **The deploy order:** releasing the remote again makes it load in its current form without recompiling the host.[^10] The cost of that independence can be incompatible versions meeting and failing only in production.[^2]
- **The problem is not only architectural:** the source of the friction is usually a mismatch between the architecture, the engineering culture and the team structure. Changing only the architecture does not solve the problems; the teams' autonomy in decision-making has to be supported too.[^14][^15]
- **Plan the CSS isolation:** loading shared libraries (CSS, analytics, UI) at runtime is risky. Mezzalira sees prefix/suffix rules or tools such as Tailwind as suitable solutions for preventing the clashes.[^15]
- **Automate the governance:** add "fitness functions" to CI/CD: checks such as a bundle size budget and dependency updates. That way the code goes live fast and safely.[^14][^15]
- **Keep the communication to a minimum:** if the applications have to talk, use a custom event, a callback passed from above, or the URL. Shared state and a shared data model create heavy coupling.[^1] Mezzalira too recommends staying away from global state (global state breaks the encapsulation) and using event-based communication, and a query string, a cookie or an API for transient data.[^13]
- **Cut the teams vertically:** build the teams around product slices such as the cart, not around technical skills such as styling or forms.[^1]

> [!NOTE]
>
> According to the documentation, there is no hot update yet for consumed remotes in the Vite integration.[^8] You may have to reload the host page on a change in the remote.

## Moving an existing application piece by piece

If you have a large monolith, the route Mezzalira recommends is the *strangler* approach: route the requests through edge compute or a CDN. The pages that have moved go to the new micro frontend, and the rest stay in the old monolith.[^16] Decide the goal first (team autonomy, scalability, speed), then pick the library. Start with a vertical slice and finish a single micro frontend end to end, design, tests, deploy and observability included.[^16] You can do the rollout gradually by percentage of users, by country or by browser, and roll back by changing an external configuration rather than deploying the code again. The biggest drawback of this approach is that moving between an old and a new page requires a full page reload.[^16]

> [!NOTE]
>
> The same idea works on mobile too. In [Jack Herrington](https://jackherrington.com)'s React Native video, a cart feature is shared between two applications at runtime with Module Federation, with no App Store update needed. The setup is done with Re.Pack and Rspack.[^17] Because this guide is web- and Vite-focused, we are not going into mobile.

## Try it yourself

1. Create the `shell` and `cart` applications above and run both with `dev`. Confirm that the cart widget appears in the shell.
2. Change the text of the button inside `cart`. See it updated on a page reload, without recompiling the shell.
3. Delete the `react` line from the `shared` setting inside `shell` and try again. Look at the console warnings and the loaded bundle sizes in the network tab.
4. Remove the `paths` setting from `tsconfig.json` and see the `TS2307` error. Then add it back and confirm the error is gone.
5. Ask yourself: do two teams in this application really need to deploy independently? If your answer is no, turn this setup into a modular monolith.
6. Watch Mezzalira's *The Dark Side of Micro-Frontends* talk (29 min) and mark the anti-patterns in your own setup.[^13] Then compare it with the *Why Your Micro-Frontends are a Distributed Monolith* talk.[^14]

## Sources

1. [Martin Fowler: Micro Frontends](https://martinfowler.com/articles/micro-frontends.html) *(article)* — The definition, the benefits, the integration approaches, dependency duplication and the cost of communication. The author is Cam Jackson, 2019.
2. [Nx: Micro Frontend Architecture](https://nx.dev/concepts/module-federation/micro-frontend-architecture) *(doc)* — When it makes sense, version skew and the shared dependency risks.
3. [heise: Why many teams are better off with monoliths than with micro front ends](https://www.heise.de/en/background/Why-many-teams-are-better-off-with-monoliths-than-with-micro-front-ends-10639162.html) *(article)* — The modular monolith, the distributed monolith and the usage statistics.
4. [Ruben Casas: Micro Frontends, the Evolution of Frontend Architecture (QCon London 2023)](https://www.infoq.com/presentations/evolution-micro-frontend) *(video)* — The spectrum from the monolith to micro frontends, the decision criteria and the distributed monolith example with 70 micro frontends. 43 min.
5. [Syntax #860: Module Federation Microfrontends with ByteDance's Zack Jackson](https://syntax.fm/show/860/module-federation-microfrontends-with-bytedance-s-zack-jackson/transcript) *(podcast)* — From Module Federation's creator: when it adds value, starting with a monorepo, and type safety.
6. [Moraes et al.: Micro Frontend-Based Development (ICEIS 2024)](https://scitepress.org/PublishedPapers/2024/126273) *(research)* — A systematic review of 16 studies and a comparison of three approaches in a case study.
7. [Module Federation: Quick Start](https://module-federation.io/guide/start/quick-start.html) *(doc)* — The provider/consumer roles, `remotes`, `shared` and the manifest.
8. [Module Federation: the Vite integration](https://module-federation.io/integrations/build-tool/vite) *(doc)* — The setup, the `exposes` and `shared` examples and the browser target note.
9. [module-federation/vite](https://github.com/module-federation/vite) *(repo)* — The host and remote configuration, `server.origin`, `type: 'module'`, the manifest and the chunk constraints.
10. [freeCodeCamp: How to Build Micro Frontends in React with Vite and Module Federation](https://www.freecodecamp.org/news/how-to-build-micro-frontends-in-react-with-vite-and-module-federation/) *(article)* — The `React.lazy` and `Suspense` pattern. Because it uses `@originjs/vite-plugin-federation`, its configuration differs from this guide's.
11. [Module Federation: Type Prompt](https://module-federation.io/guide/basic/type-prompt.html) *(doc)* — The automatic generation of the remote types, the `paths` setting and troubleshooting.
12. [Module Federation: shared](https://module-federation.io/configure/shared.html) *(doc)* — The `singleton`, `requiredVersion` and `eager` options.
13. [Luca Mezzalira: The Dark Side of Micro-Frontends (React Advanced 2025)](https://gitnation.com/contents/building-micro-frontends) *(video)* — Starting coarse, a thin shell, global state, the discovery schema and governance. 29 min.
14. [Luca Mezzalira: Why Your Micro-Frontends are a Distributed Monolith](https://www.youtube.com/watch?v=CpBP4FInj0g) *(video)* — Starting coarse, first-level URL routing, canary and rollback with a discovery schema, avoiding global state, and governance with fitness functions.
15. [Micro-Frontends Author Luca Mezzalira on What Most Teams Get Wrong](https://www.youtube.com/watch?v=PbSYWBx-gVw) *(video)* — Handling the organisation and the culture together with the architecture, a plain application shell, CSS isolation and automated governance.
16. [Luca Mezzalira: Lessons Learned in Migrating to Micro-Frontends (QCon San Francisco)](https://infoq.com/presentations/migration-micro-frontend) *(video)* — The strangler migration, a gradual release with the edge/CDN, and the warnings about framework mixing and early abstraction. 53 min.
17. [Jack Herrington: Micro-Frontends in React-Native!](https://www.youtube.com/watch?v=Lp-5wSsd5Do) *(video)* — Runtime sharing between React Native applications with Module Federation, and the Re.Pack and Rspack setup.
