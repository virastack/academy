---
title: "Code quality and team standards"
description: "ESLint, Prettier, commit rules and automated checks in CI."
lastVerified: "2026-10-15"
translationKey: "architecture/code-quality"
---

A written rule gets broken; an automated rule does not. This guide ties the team's code standards to tools at three layers: in the editor, at commit time and in CI. While Google's code review guide treats the style guide as the final authority on style, it says that software design is almost never a pure matter of style.[^1] Once you hand the style rules to a tool, review time is left for design.

## Three layers

| Layer | When does it run? | Tool | Can it be skipped? |
| --- | --- | --- | --- |
| The editor | While saving the file | The ESLint and Prettier extensions | Yes, it is a personal setting[^2] |
| The commit | At `git commit` | **Husky** + **lint-staged** + **commitlint** | Yes, with `git commit --no-verify` |
| CI | On every pull request | GitHub Actions | No, if you make the check required[^3] |

All three run the same commands. The difference is their speed and whether they can be skipped: the editor and the hook give you fast feedback, and CI is the last gate.

## Choosing the tools

This is a matter of opinion. What matters is the team agreeing on one tool set and one configuration.

| Approach | What it does | Watch out for |
| --- | --- | --- |
| **ESLint** + **Prettier** | ESLint checks the code quality and Prettier the format. `eslint-config-prettier` turns the conflicting rules off[^4] | `eslint-plugin-prettier` is not recommended: it produces a lot of red squiggles in the editor, is slower than running Prettier directly, and adds an extra layer in between[^4] |
| ESLint only | Does the formatting with ESLint rules and plugins too, fixing on save[^2] | You tie yourself to an opinionated configuration, such as [Anthony Fu](https://antfu.me)'s ready-made ESLint config library[^2] |
| **Biome** | Does the formatting, the linting and the import sorting in one tool; `biome check` runs them all in a single pass[^5] | The ESLint plugin rules are not migrated automatically and are written by hand[^6] |
| **Oxlint** | A Rust-based linter. According to the documentation it is 50-100 times faster than ESLint and holds more than 870 rules[^7] | The speed claim is the documentation's own measurement. It uses tsgo for type-aware linting, and the JS plugins are in alpha[^7] |

Prettier's approach rests on a deliberate constraint: it only *prints* the code, does not transform it, and its priority is keeping the behaviour the same.[^8] Web Dev Simplified's video explains the reason for moving to Biome through speed and a single configuration too.[^9]

The setup in this guide is with ESLint + Prettier, and the commands for Biome are given separately below. For a current comparison, you can look at Elite Dev News's video on ESLint, Biome and Oxlint.[^10]

## Setting ESLint and Prettier up

```bash
pnpm add -D eslint @eslint/js typescript@^6 typescript-eslint eslint-config-prettier prettier
```

> [!WARNING]
>
> `typescript@^6` is deliberate. typescript-eslint currently supports the `>=4.8.4 <6.1.0` range.[^11] In a trial, with TypeScript 7.0 installed, ESLint did not run at all and failed with `typescript-eslint does not support TS 7.0`. Pin the version to 6 until TypeScript 7 support arrives. The project tracks every new TypeScript version in a pinned GitHub issue.[^11]

```js
// eslint.config.mjs
import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default defineConfig([
  globalIgnores(['dist/', '.next/', 'coverage/']),
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  prettier,
])
```

- ESLint looks for an `eslint.config.js`, `.mjs` or `.cjs` file. The file exports an array of config objects, and the `defineConfig` helper comes from the `eslint/config` package.[^12]
- Objects matching the same file are merged, and on a conflict the later object wins.[^12] This is why `prettier` sits last: it turns the conflicting format rules off as the final word.
- An object whose only key is `ignores` applies to the whole configuration. `globalIgnores()` makes that explicit. `node_modules` and `.git` are already ignored.[^12]
- The rules that use type information need a separate setup, covered on typescript-eslint's Typed Linting page.[^13]
- You can enforce the architectural boundaries here too. The `import/no-restricted-paths` zones are in the [Component and code organisation](/academy/architecture/component-organization) guide.

```json
// .prettierrc.json
{ "semi": false, "singleQuote": true }
```

```json
// package.json (scripts)
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check-types": "tsc --noEmit"
  }
}
```

On a faulty file, `pnpm lint` gives output like this:

```text
src/bad.ts
  1:7   error  'unused' is assigned a value but never used  @typescript-eslint/no-unused-vars
  2:17  error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
```

### With Biome

```bash
pnpm add -D -E @biomejs/biome   # -E: pins the version so everyone uses the same one
pnpm exec biome init
pnpm exec biome check           # the formatter + the linter + import sorting
pnpm exec biome check --write   # applies the safe fixes
pnpm exec biome ci              # for CI
```

If you are migrating an existing project, the `biome migrate eslint --write` and `biome migrate prettier --write` commands convert the rules and settings. The migration only takes the rules that are exactly the same; with `--include-inspired` you can add the rules Biome took inspiration from as well. The plugin rules are migrated by hand, and the Prettier output may not be identical.[^6] Afterwards, remove ESLint, Prettier and their plugins.[^6]

## The pre-commit check: Husky and lint-staged

**Husky** ties the git hooks to the project, and **lint-staged** runs a command only on the files entering the commit. The linter does not scan the whole project, so it stays fast.[^2][^14]

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
```

`husky init` creates the `.husky/pre-commit` file and updates the `prepare` script in `package.json`.[^15] Replace the hook's content with lint-staged:

```sh
# .husky/pre-commit
pnpm exec lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,mjs,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": "prettier --write"
  }
}
```

lint-staged appends the matching staged file names to the end of the command as arguments. The `eslint --fix` command runs as `eslint --fix a.ts b.ts`.[^14] If you try to commit a faulty file, the commit is refused:

```text
✖ eslint --fix:
  3:17  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
husky - pre-commit script failed (code 1)
```

> [!WARNING]
>
> Be careful running `tsc` with lint-staged: once the file names are appended, TypeScript can ignore `tsconfig.json` for some inputs. The README's fix is using the function form (`() => 'tsc --noEmit'`), which needs a JS file such as `lint-staged.config.mjs`.[^14] Because type checking slows the commit down, leaving it to CI is usually better.

## Commit message rules

**Conventional Commits** puts the message into a fixed shape: `<type>[optional scope]: <description>`, followed by an optional body and footer.[^16]

| Commit | What it means | The SemVer equivalent |
| --- | --- | --- |
| `fix: ...` | A bug fix | PATCH[^16] |
| `feat: ...` | A new feature | MINOR[^16] |
| `feat!: ...` or a `BREAKING CHANGE:` footer | A backwards-incompatible change | MAJOR[^16] |

Other types such as `docs` and `chore` are free, but they have no special meaning for versioning.[^16]

```bash
pnpm add -D @commitlint/cli @commitlint/config-conventional
```

```js
// commitlint.config.js
export default { extends: ['@commitlint/config-conventional'] }
```

```sh
# .husky/commit-msg
pnpm exec commitlint --edit $1
```

commitlint's Husky v9 guide writes the same hook as `npx --no -- commitlint --edit $1`, and `pnpm exec` is the pnpm equivalent.[^17] A message that does not follow the rules is refused:

```text
$ git commit -m "added stuff"
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
husky - commit-msg script failed (code 1)
```

`git commit -m "feat(cart): add ok constant"`, on the other hand, passes. How Dev You's video shows this setup end to end.[^18]

## CI: the last gate

Because the hooks can be skipped, the same checks have to run in CI too:

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - name: Install pnpm and Node.js
        uses: pnpm/setup@c9883cc79df532ad1a7b81bf9ab944ceb090d65c # v2.0.0
        with:
          runtime: node@24
          cache: true
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm check-types
```

- `pnpm/setup` installs pnpm and Node.js and installs the dependencies. `cache: true` caches the pnpm store. In a CI environment pnpm freezes the lock file automatically, so you do not have to pass a flag.[^19]
- The pnpm version is read from the `packageManager` field in `package.json`, so you do not have to update the workflow.[^19]
- The pinned `pnpm/setup` line and the other versions are taken from the example in the pnpm documentation.[^19] You can pin the actions to a commit SHA too.

The full pipeline, with the test, image and deploy stages beyond lint and type checking, is in the [CI/CD (GitHub Actions)](/academy/production/cicd) lesson.

For the check to really be a gate, turn *required status checks* on in GitHub. A merge is not possible unless the required checks are `successful`, `skipped` or `neutral`. The job names have to be unique across all the workflows; otherwise the check results become ambiguous and PRs can be blocked.[^3] [Anthony Fu](https://antfu.me)'s video sets this pipeline up as a `lint.yml` running per PR, and also shows the Docker-based `act` tool for trying it locally.[^2]

### CI in a monorepo

If you use a [monorepo](/academy/architecture/monorepo), you do not have to run everything on every PR:

```yaml
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      # ... the pnpm/setup step
      - run: pnpm turbo run lint check-types --affected
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

`--affected` runs the tasks only in the packages the change affects. Because it needs the source control history, in a shallow checkout all the packages count as changed, so pull the history with `fetch-depth: 0`.[^20] `TURBO_TOKEN` and `TURBO_TEAM` give access to Remote Cache.[^20]

## Team standards and code review

Once automation has solved the format, human review looks at the design. Practical takeaways from Google's guide:[^1]

- **Move in small but correct steps:** the reviewer should lean towards approving a change that definitely improves the code's health, even if it is not perfect. "There is no such thing as perfect code, only better code."
- **Mark the minor notes:** put the `Nit:` prefix on non-blocking comments, so the author can ignore them.
- **Separate style from design:** on pure style preferences the style guide does not cover, follow the existing code; otherwise leave it to the author. On design matters, look at the engineering principles.
- **Escalate a disagreement in order:** consensus first, then a face-to-face conversation, and failing that the tech lead or the engineering manager. Do not leave the PR waiting.

> [!TIP]
>
> A lint error is feedback for a coding agent too: a rule violation goes red immediately and the agent corrects itself. We covered that in the [Agentic coding](/academy/ai/agentic-coding) guide as "a check the agent can use".

## Try it yourself

1. Set ESLint and Prettier up. Write an `any` and an unused variable on purpose and run `pnpm lint`.
2. Add Husky and lint-staged, try to commit the faulty file and see it refused.
3. Add commitlint. Confirm that `git commit -m "added stuff"` is refused and that `feat(cart): add item` passes.
4. Add the CI workflow, open a faulty PR and see the check go red. Then make the check required in the branch protection.
5. Migrate the same project to Biome with `biome migrate` and look at the difference in speed and output.
6. Watch [Anthony Fu](https://antfu.me)'s [Lint Like a Senior Developer](https://www.youtube.com/watch?v=Kr4VxMbF3LY) video and How Dev You's commitlint video.[^2][^18]

## Sources

1. [Google Engineering Practices: The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html) *(doc)* — The code health principle, the `Nit:` prefixes, the style/design split and resolving disagreements.
2. [Lint Like a Senior Developer w/ eslint + husky + lint staged + github actions](https://www.youtube.com/watch?v=Kr4VxMbF3LY) *(video)* — Lint on save with Anthony Fu's ESLint config in a React/Vite project, pre-commit with Husky, lint-staged and lint per PR in GitHub Actions. March 2025.
3. [GitHub: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) *(doc)* — Required status checks, strict mode and the unique job name warning.
4. [Prettier: Integrating with Linters](https://prettier.io/docs/integrating-with-linters) *(doc)* — The `eslint-config-prettier` recommendation and the `eslint-plugin-prettier` warning.
5. [Biome: Getting Started](https://biomejs.dev/guides/getting-started/) *(doc)* — The setup, `biome init`, `biome check` and `--write`.
6. [Biome: Migrate from ESLint and Prettier](https://biomejs.dev/guides/migrate-eslint-prettier/) *(doc)* — The `biome migrate` commands, their scope and limitations.
7. [Oxc: Linter](https://oxc.rs/docs/guide/usage/linter.html) *(doc)* — Oxlint's speed claim, the rule count, type-aware linting and the JS plugins.
8. [Prettier: Rationale](https://prettier.io/docs/rationale) *(doc)* — Prettier only printing the code, and the priority of preserving the behaviour.
9. [I Will Never Use Prettier or ESLint Again](https://www.youtube.com/watch?v=x5kwmIaPty8) *(video)* — Biome instead of ESLint + Prettier, from Web Dev Simplified. October 2025.
10. [ESLint vs Biome vs Oxlint 2026](https://www.youtube.com/watch?v=vx1MK52weHo) *(video)* — A comparison of ESLint, Biome and Oxlint on speed and use case, from Elite Dev News. September 2026.
11. [typescript-eslint: Dependency Versions](https://typescript-eslint.io/users/dependency-versions) *(doc)* — The supported TypeScript range and the support policy.
12. [ESLint: Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files) *(doc)* — The flat config file names, `defineConfig`, `globalIgnores` and the "the later object wins" rule.
13. [typescript-eslint: Getting Started](https://typescript-eslint.io/getting-started/) *(doc)* — The setup, the `recommended` config and the pointer to Typed Linting.
14. [lint-staged](https://github.com/lint-staged/lint-staged) *(repo)* — The configuration, the staged files being appended to the command, and the `tsc` warning.
15. [Husky: Get started](https://typicode.github.io/husky/get-started.html) *(doc)* — `husky init`, `.husky/pre-commit` and the `prepare` script.
16. [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) *(doc)* — The message shape, `feat` and `fix`, `BREAKING CHANGE` and the SemVer mapping.
17. [commitlint: Local setup](https://commitlint.js.org/guides/local-setup.html) *(doc)* — The `commit-msg` hook with Husky v9.
18. [Conventional Commits with Husky & Commitlint](https://www.youtube.com/watch?v=vOh4mDo47Vg) *(video)* — The commitlint setup, the `commit-msg` hook and messages that break the rules being refused, from How Dev You. August 2024.
19. [pnpm: Continuous Integration](https://pnpm.io/continuous-integration) *(doc)* — GitHub Actions with `pnpm/setup`, the cache and the `packageManager` field.
20. [Turborepo: Constructing CI](https://turborepo.dev/docs/crafting-your-repository/constructing-ci) *(doc)* — `turbo run` in CI, `--affected`, the history requirement and the Remote Cache variables.
