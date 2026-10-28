# Restructuring a project

The files for the project lesson in the [architecture guide](https://virastack.com/academy/architecture/restructure-project). The walkthrough is in the guide.

- `starter/`: start here. A store organized by type: `components/`, `hooks/`, `utils/utils.ts`, `types/types.ts`, `../` imports and an `export *` barrel.
- `solution/`: the same application in a feature-based layout. `src/features/products` and `src/features/cart`, the `@/` alias and ESLint rules that enforce the boundaries.

Both folders hold the same Playwright test. Once the move is done the test should still pass; the behaviour must not change.

```bash
cd starter
npm install
npx playwright install chromium
npm run test:e2e   # 2 tests pass
npm run lint       # clean at first; 22 errors once you add the rules
```

In `solution/`, `npm run lint`, `npm run typecheck` and `npm run test:e2e` all pass.
