---
title: "Feature-Sliced Design"
description: "A frontend architecture with layers, slices and a one-way import rule."
lastVerified: "2026-10-25"
translationKey: "architecture/feature-sliced-design"
---

In the [Folder structure and naming](/academy/architecture/folder-structure) guide we saw arranging by feature. **Feature-Sliced Design** *(FSD)* adds rules on top of that: which layer a piece of code belongs to and what it can import. This guide covers FSD's model briefly, and shows its adaptation to Next.js and its use in [!virastack] Start.

## The layers

FSD is an architectural method for frontend applications: a set of rules and conventions aimed at keeping a project understandable and stable while the business requirements change.[^1] The code is split into **layers**. From the top down:[^1][^2]

| Layer | What it holds |
| --- | --- |
| **app** | The code that runs the application: the routing, the entry point, the global styles, the providers |
| **pages** | The screens or routes, usually one slice per page |
| **widgets** | Large, self-contained interface blocks used on more than one page |
| **features** | The interactions that give the user business value |
| **entities** | The business concepts the product works with *(a user, a product)* |
| **shared** | Basic code with no business logic: the API client, the UI kit, the helpers, the configuration |

There used to be a **processes** layer too. The specification now recommends not using it and moving its content into `features` and `app`.[^2] Not all the layers are required: most projects use at least `shared`, `pages` and `app`, while `widgets` and `entities` are optional.[^2]

## Slices and segments

Every layer is split into **slices**. A slice groups the code by business domain, and its name is free. `app` and `shared` have no slices. Inside a slice, the code is split into **segments** by technical purpose. The common names are `ui`, `api`, `model` *(the schema, the store, the business logic)*, `lib` and `config`, but they are not a standard.[^1]

```text
features/
  add-to-cart/
    ui/
    api/
    model/
    index.ts
```

## One rule: import downwards

A module in one layer can only import from the layers below it. Slices in the same layer cannot import each other either.[^1][^2] So `features` knows about `entities` and `shared`; never the other way round.

Every slice opens a **public API** to the outside, usually an `index` file. The code outside reaches the slice only through that, so when the slice's internal structure changes, the rest of the code is unaffected.[^3] Two warnings: `export *` hides what the slice offers and can leak internal detail, and relative imports should be used inside a slice and absolute ones between slices.[^3]

> [!TIP]
>
> According to the documentation, `index` files can make tree shaking harder in `shared/ui` and `shared/lib`.[^3] That discussion is in the "Import rules" section of the [Folder structure and naming](/academy/architecture/folder-structure) guide.

## With Next.js

[!nextjs]'s `app` and `pages` names clash with the FSD layers. The FSD documentation recommends renaming the two layers `_app` and `_pages`, and keeping Next.js's `app/` folder in the project root. The route files then become thin files that re-export the FSD code:[^4]

```text
app/                     # the Next.js routes (the root)
  example/page.tsx       # re-exported from @/_pages/example
src/
  _app/  _pages/  widgets/  features/  entities/  shared/
```

If a slice holds both client and server-only modules, you are advised to put the server-specific exports in `index.server.ts` rather than in `index.ts`.[^4]

## In ViraStack Start

[!virastack] Start's templates (Next.js and TanStack Start) come with a "Feature-Sliced" structure. According to ViraStack AI's architecture rule, code starts under `features/<feature>/` first. Every feature holds segments such as `api`, `components`, `hooks`, `schemas`, `stores` and `types`, plus an `index.ts` *(the public API)*. Features do not import each other, and from the outside they are reached only through `index.ts`. The route files only load the data and render a feature component.[^5]

The difference from FSD's full model is this: there are no `pages`, `widgets` or `entities` layers, and the shared code sits in flat folders under `src/`. So Start uses FSD's **slice and public API** idea in a simplified form. Because FSD can be adopted incrementally, that partial use is legitimate; the layer rule can be added if the team and the code grow.[^1] This comparison is this guide's own reading.

## When you don't need it

> [!CAUTION]
>
> The FSD documentation's own advice: if your existing architecture works, changing it may not be worth it. The method is for applications, not for libraries. The sign to move is the architecture starting to cause problems: the project has become tangled enough to slow down adding features, or a large number of new people have joined the team.[^1]
>
> In a small project, feature folders and the one-way import rule are usually enough. Add the layer rule once the need appears.

## Sources

1. [Feature-Sliced Design: Overview](https://feature-sliced.design/docs/get-started/overview) *(doc)* — The definition of FSD, the layers, slices and segments, the import rule, incremental adoption and when it is not needed.
2. [Feature-Sliced Design: Layers](https://feature-sliced.design/docs/reference/layers) *(doc)* — The layers' jobs, `processes` being retired, the optional layers and the import rule.
3. [Feature-Sliced Design: Public API](https://feature-sliced.design/docs/reference/public-api) *(doc)* — A slice's outward contract, the `export *` and circular import warnings, and the tree shaking effect of `index` files.
4. [Feature-Sliced Design: Usage with Next.js](https://feature-sliced.design/docs/guides/tech/with-nextjs) *(doc)* — The `app` and `pages` clash, the `_app` and `_pages` names, the `app/` folder in the root, and `index.server.ts`.
5. [ViraStack AI: architecture.mdc](https://github.com/virastack/ai/blob/main/templates/rules/architecture.mdc) *(repo)* — The folder tree in the Start templates, the `features/<feature>/` segments and the import rules.
