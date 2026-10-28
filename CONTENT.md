# Academy content guide

Lessons live as Markdown under `content/tr/<track>/<lesson>.md`.
The curriculum tree (including `coming_soon` lessons without a body) is
`content/tr/curriculum.json`. Titles and descriptions are plain Turkish strings.

You don't need to flip `status` by hand. On every push to `main`, the deploy
workflow runs `node scripts/sync-curriculum.mjs`, which marks a lesson
`published` once its Markdown has at least 300 characters of body text
(headings, comments and blank lines don't count) and commits the change. Add
`draft: true` to the frontmatter to keep a written lesson unpublished. Run the
script locally to see the result before pushing.

Do not add Markdown or `curriculum.json` under `content/en`. English copies are
not maintained yet.

## Frontmatter

```yaml
---
title: "Giriş"
description: "Frontend test nedir?"
lastVerified: "2026-10-14"
translationKey: "vitest/introduction"
---
```

- `translationKey` is `<track>/<lesson>`.

## Callouts

```md
> [!TIP]
>
> Prefer queries by role and name.

> [!WARNING]
>
> Avoid querying by class names.

> [!CAUTION]
>
> This fails in production.
```

Do / don't lists:

```md
> [!DO]
>
> - Query by accessible name.

> [!DONT]
>
> - Query by CSS class.
```

## Inline badges

Allowlisted tokens render as branded badges on the site. Unknown names stay as
plain text.

Examples: `[!cursor]`, `[!vitest]`, `[!getBy]`, `[!react]`, `[!claude]`.

Product / library / query sets match the ViraStack Academy UI allowlist.

## Tables with logos

Start a cell with a badge token:

```md
| Rank | Company |
| --- | --- |
| 1. | [!anthropic] Anthropic |
```

## Commands

Use a `command` fence for package-manager install snippets (rendered as tabs on
the site):

````md
```command
npm install vitest
```
````

## Details

```html
<details>
<summary>Derinlemesine</summary>

<ul>
<li>Item one</li>
</ul>

</details>
```

## Embeds

````md
```testing-playground
{
  "title": "Query playground",
  "src": "https://testing-playground.com/embed",
  "markup": "<button>Add</button>",
  "query": "screen.getByRole('button')"
}
```
````

## Language in code

Lesson prose is Turkish. Code is not.

Everything under `examples/` is English: identifiers, UI strings and
comments. One example repo backs every language of a lesson, so Turkish in
there would leave the other language's snippets out of step with the code
its reader is told to compare against.

Comments inside a lesson's own fenced code blocks stay Turkish. They are
read as part of the Turkish paragraph around them, and each language's
lesson keeps its own.

```tsx
// examples/ -> English
<button onClick={addToCart}>Add to cart</button>   // the cart opens itself
```

```tsx
// a lesson code block -> Turkish comment, English code
<button onClick={addToCart}>Add to cart</button>   // sepet kendisi açılır
```

Some strings are domain data rather than interface copy, and they stay as
they are in both places: `TRY` and `tr-TR` number and currency formatting,
the Turkish ID, IBAN, tax-number and phone formats the forms track teaches,
and people's names. The i18n lesson and the multilingual CI project are
exempt altogether, since Turkish is one of the two locales they
demonstrate.

## Edit links

Published pages link to:

`https://github.com/virastack/academy/edit/main/content/tr/<track>/<lesson>.md`
