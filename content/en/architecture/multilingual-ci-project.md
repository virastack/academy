---
title: "A multilingual page and a CI pipeline"
description: "Translating an existing page into two languages and tying the lint, type and test checks to CI."
lastVerified: "2026-10-22"
translationKey: "architecture/multilingual-ci-project"
---

## Scenario

You have a single-language product page. The name, price, stock and update date are hard-coded in Turkish. Your task:

- Serve the page in Turkish and English: `/tr` and `/en`.
- Redirect `/` according to the browser language.
- Run the lint, format, type and test checks on GitHub Actions for every pull request.

| Part | File | Lesson |
| :-- | :-- | :-- |
| Routing, messages, formatting | `src/i18n/`, `messages/`, `src/proxy.ts` | [Multiple languages (i18n)](/academy/architecture/i18n) |
| ESLint, Prettier, CI | `eslint.config.mjs`, `.github/workflows/ci.yml` | [Code quality and team standards](/academy/architecture/code-quality) |
| End-to-end testing | `e2e/i18n.spec.ts` | [!playwright] |

The starter and the solution are on GitHub: [examples/architecture/multilingual-ci-project](https://github.com/virastack/academy/tree/main/examples/architecture/multilingual-ci-project).

> [!NOTE]
>
> The project was written with `next@16.4.2`, `next-intl@4.14.9`, `pnpm@10.28.0`, `vitest@5.0.5` and `@playwright/test@1.64.1`. `cacheComponents` was left on.

## Step 1: Extract the text

Start by finding every piece of text on the page. There are five in `starter/src/app/page.tsx`: the product name, the price, the stock, the date and the button. The title and the description sit in `layout.tsx` as well.

The product name comes from data; it is not interface copy. Put it in the data rather than in a `messages/` file:

```ts
// src/data/product.ts
export const product = {
  name: { tr: "Mekanik Klavye", en: "Mechanical Keyboard" },
  price: 2499.9,
  stock: 3,
  updatedAt: new Date("2026-10-15T21:00:00Z"),
};
```

## Step 2: Set up next-intl

```command
pnpm add next-intl
```

The setup is the same as in [Multiple languages (i18n)](/academy/architecture/i18n): `routing.ts`, `navigation.ts`, `request.ts`, `proxy.ts` and the `app/[locale]/` folder.[^1] The one addition is the time zone in `request.ts`:

```ts
// src/i18n/request.ts
return {
  locale,
  timeZone: "Europe/Istanbul",
  messages: (await import(`../../messages/${locale}.json`)).default,
};
```

Without a time zone, the date is written in the server's time zone.[^2] The product was updated at 21:00 on October 15 UTC; in Istanbul that is October 16.

## Step 3: Write the messages

```json
// messages/tr.json
"ProductPage": {
  "price": "Fiyat: {price, number, ::currency/TRY}",
  "stock": "{count, plural, =0 {Stokta yok} other {Son # ürün}}",
  "updated": "Güncelleme tarihi: {date, date, long}",
  "addToCart": "Sepete ekle"
}
```

```json
// messages/en.json
"ProductPage": {
  "price": "Price: {price, number, ::currency/EUR}",
  "stock": "{count, plural, =0 {Out of stock} one {Last one left} other {Only # left}}",
  "updated": "Updated on {date, date, long}",
  "addToCart": "Add to cart"
}
```

- **Plurals:** Turkish uses the singular noun with a number, so it needs no `one` branch. English writes `one` separately.[^3]
- **Currency:** the Turkish message uses `TRY` and the English one `EUR`. Because the currency sits inside the message, each language can carry its own. In a trial run Turkish produced `₺2.499,90` and English `€2,499.90`: both the currency and the format changed with the locale.[^4] In a real store it is the user's market that decides the currency, not the language; changing both together here is a way to show the two formats in one example.

## Step 4: The page and the locale switcher

```tsx
// src/app/[locale]/page.tsx
const t = useTranslations("ProductPage");
const locale = useLocale() as Locale;

<h1>{product.name[locale]}</h1>
<p data-testid="price">{t("price", { price: product.price })}</p>
<p data-testid="stock">{t("stock", { count: product.stock })}</p>
```

The locale switcher uses the `Link` from `@/i18n/navigation`: `<Link href="/" locale="en">EN</Link>`.[^1] The title and the description are translated inside `generateMetadata` with `getTranslations("Metadata")`.

```command
pnpm build && pnpm start
curl -I -H "Accept-Language: en-US" http://localhost:3000/
```

The response should carry `location: /en`. The `link` header on the `/tr` response shows `hreflang="tr"`, `hreflang="en"` and `x-default`.

## Step 5: Write the checks

Every check CI will run should be a local script first:

```json
// package.json
"scripts": {
  "lint": "eslint",
  "format:check": "prettier --check .",
  "check-types": "next typegen && tsc --noEmit",
  "test": "vitest run",
  "test:e2e": "playwright test"
}
```

`check-types` runs `next typegen` first. On a clean checkout the `PageProps` and `LayoutProps` types have not been generated yet, so `tsc` on its own fails.

**The missing-translation test.** The most common mistake is a key added to one language and not the other. A small Vitest test compares the keys of the two files:

```ts
// src/i18n/messages.test.ts
test("every locale has the same message keys", () => {
  expect(keys(en).sort()).toEqual(keys(tr).sort());
});
```

In a trial run, deleting `addToCart` from `en.json` turned the test red.

**The end-to-end test.** Playwright opens `/tr`, checks the values and clicks the `EN` link.

> [!WARNING]
>
> With `cacheComponents` on, Next.js does not remove the previous page; it hides it with `<Activity>` as `display: none` and keeps it in the DOM.[^5] After switching language, `getByTestId("price")` found two elements: the visible English one and the hidden Turkish one. Because `getByRole` skips hidden elements, scope the checks to the visible `<main>`:
>
> ```ts
> const main = page.getByRole("main");
> await expect(main.getByTestId("price")).toHaveText("Price: €2,499.90");
> ```

## Step 6: Wire it to CI

```yaml
# .github/workflows/ci.yml
jobs:
  quality:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/setup@c9883cc79df532ad1a7b81bf9ab944ceb090d65c # v2.0.0
        with:
          runtime: node@24
          cache: true
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm check-types
      - run: pnpm test

  e2e:
    runs-on: ubuntu-24.04
    steps:
      # checkout and pnpm/setup are the same
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
```

- `pnpm/setup` installs pnpm and Node.js and runs `pnpm install` itself.[^6]
- The two jobs run in parallel. The fast checks do not wait for the long browser test.
- When a test fails the report is uploaded as an artifact; the example in the Playwright docs does the same.[^7]
- `playwright.config.ts` has `forbidOnly: !!process.env.CI`: a forgotten `test.only` breaks CI.[^8]

Finally, make the `quality` and `e2e` jobs *required status checks* on GitHub. That way nothing can be merged until the checks pass.[^9]

> [!NOTE]
>
> Every command in this workflow was tried locally and on a clean install. It was not run on GitHub Actions; look at the output on your first PR.

## Try it yourself

- Add German: create `messages/de.json` with a key missing and watch the test catch it.
- Set `localePrefix: "as-needed"`. Which URLs do you have to change in the Playwright tests?
- Break the formatting on purpose in a PR and watch the `format:check` step turn red.

## Sources

1. [next-intl: App Router with i18n routing](https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing) *(doc)* — `routing.ts`, `proxy.ts`, `navigation.ts`, `request.ts` and the `[locale]` segment.
2. [next-intl: Configuration](https://next-intl.dev/docs/usage/configuration) *(doc)* — `timeZone`, `messages` and `formats` inside `getRequestConfig`.
3. [next-intl: Messages](https://next-intl.dev/docs/usage/messages) *(doc)* — The ICU argument syntax, the `plural` categories and exact matches.
4. [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat) *(doc)* — The `currency` and `currencyDisplay` options.
5. [Next.js: Preserving UI state](https://nextjs.org/docs/app/guides/preserving-ui-state) *(doc)* — Previous pages being hidden with `<Activity>` and kept in the DOM under `cacheComponents`.
6. [pnpm: Continuous Integration](https://pnpm.io/continuous-integration) *(doc)* — GitHub Actions with `pnpm/setup`, caching and the `packageManager` field.
7. [Playwright: Setting up CI](https://playwright.dev/docs/ci-intro) *(doc)* — The GitHub Actions workflow, installing browsers and uploading the report as an artifact.
8. [Playwright: Test configuration](https://playwright.dev/docs/test-configuration) *(doc)* — `forbidOnly` and the options set according to CI.
9. [GitHub: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) *(doc)* — Required status checks and the unique-job-name warning.
