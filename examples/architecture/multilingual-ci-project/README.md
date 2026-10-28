# A multilingual page and a CI pipeline

The files for the project lesson in the [architecture guide](https://virastack.com/academy/architecture/multilingual-ci-project). The walkthrough is in the guide.

- `starter/`: start here. A single-language product page with its text hard-coded.
- `solution/`: the same page in Turkish and English with next-intl. ESLint, Prettier, type checking, a translation key test (Vitest), Playwright tests and `.github/workflows/ci.yml`.

```bash
cd solution
pnpm install
pnpm exec playwright install chromium
pnpm lint && pnpm format:check && pnpm check-types && pnpm test && pnpm test:e2e
```

`ci.yml` does not run from this folder; GitHub only reads the `.github/workflows` folder at the root of a repository. Copy it to the root of your own.
