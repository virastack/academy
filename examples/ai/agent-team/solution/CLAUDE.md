# Cart

- React 19, TypeScript, Tailwind CSS v4. Do not add another library.
- The money calculations are pure functions under `src/lib/`. Components do not calculate; they call those functions.
- Always show prices with `formatPrice`.
- Unit tests live in `src/**/*.test.ts(x)` (Vitest), and end-to-end tests in `e2e/` (Playwright).
- The commands: `npm run test:unit`, `npm run test:e2e`, `npm run build`.
- A new feature does not start without `SPEC.md`. Use the `/feature-team` skill for the team flow.
