# AI shopping assistant

There are two folders:

- `starter/`: an empty skeleton. You fill in the `TODO` places.
- `solution/`: the working solution. Compare against it when you get stuck.

## The mock model

Because real models cost money, the project runs with the mock model in `src/lib/fake-model.ts` by default. No key is needed and the tests always give the same result.

To try it with a real model (which is billed), add a `.env.local` to the project root:

```
AI_MODEL=<the AI Gateway model name>
AI_GATEWAY_API_KEY=<your key>
```

The tests are written against the mock model. The real-model path was not tested.

## Running it

```bash
cd starter   # or solution
npm install
npx playwright install chromium
npm test
```

You can open the interface with `npm run dev` (http://localhost:3000).
