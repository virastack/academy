# A product catalogue and cart

The working version of the project lesson in the [Zustand guide](https://virastack.com/academy/zustand/project). The lesson has these files written step by step; compare against it when you get stuck.

There is no real server. `src/project/api.ts` is a fake API with an artificial delay. The cart is stored in `localStorage` under the `shop-cart` key.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:5173. With the Redux DevTools extension installed you see the store under the name `ShopStore`.

## The checks

```bash
npm run lint
npm run build
npx playwright install chromium
npm test
```

`npm test` uses Playwright to exercise the filters driving the query, adding to the cart and the total, the stock limit, the cart surviving a page refresh, and the stock warning being derived from the server data.
