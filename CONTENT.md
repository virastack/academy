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

## Edit links

Published pages link to:

`https://github.com/virastack/academy/edit/main/content/tr/<track>/<lesson>.md`
