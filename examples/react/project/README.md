# A product detail page

The working version of the project lesson in the [React guide](https://virastack.com/academy/react/project). Compare against it when you get stuck.

A product page loaded from a fake API: Suspense and an error boundary, the cart context, a favourite button with `useOptimistic`, a review form with `useActionState`, tabs with `<Activity>` and a sliding cart drawer with `<ViewTransition>`. Every project file lives under `src/project/`.

## Running it

```bash
npm install
npm run dev
```

## The checks

```bash
npm run lint
npm run build
```

`lint` runs the template's Oxlint first and then ESLint with `eslint-plugin-react-hooks`. Oxlint gives two `only-export-components` warnings for `cart.tsx`: they are expected, because the provider and the hooks sit in the same file.
