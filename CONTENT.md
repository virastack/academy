# Academy content guide

Lessons live as Markdown under `content/<locale>/<track>/<lesson>.md`, one folder
per language. The curriculum tree for a locale (including `coming_soon` lessons
without a body) is `content/<locale>/curriculum.json`. Titles and descriptions
are plain strings in that locale's language.

You don't need to flip `status` by hand. On every push to `main`, the deploy
workflow runs `node scripts/sync-curriculum.mjs`, which marks a lesson
`published` once its Markdown has at least 300 characters of body text
(headings, comments and blank lines don't count) and commits the change. Add
`draft: true` to the frontmatter to keep a written lesson unpublished. Run the
script locally to see the result before pushing.

Turkish (`content/tr`) is the source language: a new lesson is written there
first. English (`content/en`) now covers every track and every lesson. A
locale's pages fall back to the Turkish tree
until its `curriculum.json` exists, and that file lists only the tracks that
have been written, so add tracks to it together with their lessons. A new
Turkish lesson therefore needs its English counterpart in the same pass, and
`node scripts/check-translation.mjs` compares the two trees.

The sync script walks every locale under `content/` that has a
`curriculum.json`, so a new translation needs no change to it or to the deploy
workflow. `node scripts/sync-curriculum.mjs --locale en` syncs one locale on its
own, and `--check` reports what would be published without writing anything.

## Frontmatter

```yaml
---
title: "Giriş"
description: "Frontend test nedir?"
lastVerified: "2026-10-14"
translationKey: "vitest/introduction"
---
```

- `translationKey` is `<track>/<lesson>`, and it is the same in every locale.

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

Lesson prose is in the locale's language. Code is not.

Everything under `examples/` is English: identifiers, UI strings and
comments. One example repo backs every language of a lesson, so Turkish in
there would leave the other language's snippets out of step with the code
its reader is told to compare against.

Comments inside a lesson's own fenced code blocks follow the prose around
them, and so do the UI strings in them. Each locale keeps its own.

```tsx
// examples/ -> English
<button onClick={addToCart}>Add to cart</button>   // the cart opens itself
```

```tsx
// a Turkish lesson's code block -> Turkish comment, English code
<button onClick={addToCart}>Sepete ekle</button>   // sepet kendisi açılır
```

Example data belongs to the reader, not to the source language. Invented
names, currency and number formatting, and the ID, IBAN, tax-number and
phone formats the forms track teaches are chosen to suit the locale's
reader: `tr` teaches the Turkish formats, `en` the European ones. Because
`examples/` serves both, a value that lives in an example project is shared,
and changing it there means updating the snippets in every locale's lesson
in the same pass. [`TRANSLATION.md`](TRANSLATION.md) records the mapping and
the wording each locale uses, so terms don't drift between lessons.

The i18n lesson and the multilingual CI project are the one place Turkish
appears inside an English lesson. They demonstrate i18n with `tr` and `en`,
so a `messages/tr.json` payload and the comments showing what it renders to
are the subject of the lesson, not its prose, and they stay as they are in
every locale. The prose around them is rewritten like any other lesson's.
[`TRANSLATION.md`](TRANSLATION.md) draws the line, and
`scripts/check-translation.mjs` holds the allowed strings per lesson.

## Edit links

Published pages link to:

`https://github.com/virastack/academy/edit/main/content/<locale>/<track>/<lesson>.md`
