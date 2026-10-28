# A product admin panel

The working version of the project lesson in the [TanStack Query guide](https://virastack.com/academy/tanstack-query/project). The lesson has these files written step by step; compare against it when you get stuck.

There is no real server. `src/project/api.ts` is a fake in-memory API with an artificial delay. Refresh the page and the data resets.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:5173. The TanStack logo at the bottom right opens the Devtools panel.

## The checks

```bash
npm run lint
npm run build
npx playwright install chromium
npm test
```

`npm test` uses Playwright to exercise listing, pagination, search, a stock update, the infinite comment list and the favourite button's optimistic update (both the successful and the rolled-back one) in the browser.
