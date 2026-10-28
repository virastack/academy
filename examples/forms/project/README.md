# A seller application form

The working version of the project lesson in the [Forms guide](https://virastack.com/academy/forms/project). The lesson has these files written step by step; compare against it when you get stuck.

A three-step application form: the store details and a dynamic product list, the contact details, and payment. React Hook Form manages the form, a Zod schema validates in the browser and in the Server Action alike, and [@virastack/mask](https://virastack.com/mask) formats the VAT number, phone and IBAN fields.

There is no real database. `app/actions.ts` is a Server Action with an artificial delay. Apply with the address `taken@example.com` and the server returns an error.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

> Installing with the `package-lock.json` in this folder works on npm 10 too. Setting the project up from scratch, `@hookform/resolvers` 6.0.0 can give an `ERESOLVE` error on npm 10; use the npm 11 that ships with Node.js 24, or pnpm.

## The checks

```bash
npm run lint
npm run build
npx playwright install chromium
npm test
```

`npm test` takes a production build first, then uses Playwright to exercise step validation and focus, the masks, adding and removing products, values surviving a step back, the IBAN checksum, a field error coming from the server, a successful application, and an axe accessibility scan at every step.
