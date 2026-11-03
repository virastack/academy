---
name: academy-lesson
description: Writes, edits, shortens, renames, translates or reviews a ViraStack Academy lesson or project lesson in this repository (content/tr, content/en, curriculum.json, examples/). Covers structure, length, sources and footnotes, badges, emphasis, slugs and the English counterpart. Use for any Academy lesson or curriculum change.
---

# Academy lesson

ViraStack Academy is an up-to-date React frontend roadmap: short lessons, curated sources, no unnecessary detail. A lesson explains the essentials in plain Turkish and points to the best sources for going deeper. It is not a translation of the docs.

The site (`virastack.com`) clones this repository's `main` branch at build time. A change is not live until it is pushed.

## Before writing

1. Read `CONTENT.md` (authoring syntax), `TRANSLATION.md` (English wording) and `content/tr/curriculum.json` (where the lesson sits).
2. Read two or three published lessons in the same track and one in a recent track (`tanstack-query`, `zustand`, `vitest`) to match tone and length.
3. Read the lessons before and after this one. Do not repeat them; link to them.
4. Research from primary sources first (official docs, release notes), then recognized engineers. Verify every version, API name and number against the current docs. Note the date you verified.
5. Pick one concrete running example for the whole lesson (a cart, a product list, a stock form). Reuse the track's existing domain when there is one.

## Files and curriculum

- Turkish is the source: `content/tr/<track>/<lesson>.md`. Its English counterpart `content/en/<track>/<lesson>.md` is written in the same pass, with the same `translationKey`, and listed in `content/en/curriculum.json`. Both trees cover every lesson; keep it that way.
- Curriculum shape: `groups[] → tracks[] → lessonGroups[] → lessons[]`. A lesson entry is `{ "slug", "title", "description", "status", "kind" }`; `kind` is `lesson` or `project`. `title` and `description` are plain strings in the locale's language.
- Slugs (track and lesson) are English kebab-case. The file name equals the slug. Internal links are `/academy/<track>/<lesson>`.
- Group `id` values are not URLs. Keep the existing Turkish ids (`temeller`, `react-ekosistemi`, `state-ve-veri-yonetimi`, `test-ve-kalite`, `ileri-seviye`, `takim-ve-sektor`).
- Status: a new lesson starts as `coming_soon` with no body. On push, `scripts/sync-curriculum.mjs` flips it to `published` once the body has 300+ characters. `draft: true` in frontmatter keeps a written lesson unpublished.
- A new track also needs its icon in virastack.com `src/features/academy/constants/track-icon.constants.ts`. A lesson in an existing track needs no site change.
- Images: `assets/<track>/<lesson>/<name>.png`, referenced by `https://raw.githubusercontent.com/virastack/academy/main/assets/<track>/<lesson>/<name>.png`. Alt text is a full sentence describing what the image shows.
- Project code: `examples/<track>/<project>/` (or `starter/` and `solution/`), with passing tests and a README.

## Renaming a lesson

`git mv` the file in both locales. Update the slug in both curricula, the `translationKey` in both files, and every internal link that contains the old slug. Do not touch the body otherwise. No redirect is added: the old address returns 404.

## Frontmatter

```yaml
---
title: "Mutation ve invalidation"
description: "useMutation, invalidation, cevapla güncelleme ve callback'lerin yeri."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/mutations-and-invalidation"
---
```

- `title`: sentence case, short, same as the curriculum title.
- `description`: one line, same as the curriculum description. No footnotes, badges or Markdown (it is shown raw on cards and in meta tags).
- `lastVerified`: the date you checked the facts. Update it whenever you re-verify.
- `translationKey`: `<track>/<lesson>`, identical in every locale.

## Lesson structure

Open with the first `##` section directly, or with one or two short paragraphs that state the problem. No "in this lesson we will" intros.

1. `##` concept sections, one idea each, ordered from the simplest use to the edge cases.
2. `## Kendin dene`: 3 to 5 bullet tasks the reader can do in a few minutes, on the lesson's own example. Each ends with something to observe (*"Network sekmesinde kaç istek görüyorsunuz?"*). Required in hands-on technical lessons. Summary and concept tracks (`web-fundamentals`, `principles`, `glossary`, `performance-accessibility`, the pattern lessons in `architecture`) may leave it out, as they do today.
3. `## Detaylı öğrenmek için` (optional): 2 to 4 bullets, each pointing to one of the lesson's sources.
4. `## Kaynaklar`: the numbered source list. Always last.

Section names already in use: `Ne zaman gerekmez?`, `Ne zaman hangisi`, `Yaygın hatalar`, `Kurulum`.

## Length and depth

- New lessons: 600 to 1,000 words of prose (code blocks and Kaynaklar excluded), hard cap 1,200. If a topic needs more, split it into two lessons.
- Summary lessons (Web Fundamentals style): about 700 words.
- 6 to 10 sources is normal, up to 15 is fine. More than 15 means the lesson is too broad.
- Some existing lessons are longer (the longest `ai` and `architecture` lessons pass 1,800 words). Do not shorten them unless asked; do not use them as the length model.
- Code is about 20 to 35 percent of a technical lesson. A conceptual lesson can have less.
- Go shallow and correct: what it is, when to use it, the one or two traps that bite in practice, and a link out for the rest. Put rare details in `<details>` or leave them to the sources.
- One example per idea. Prefer topics a working frontend developer will use next week.

## Voice and language

- Turkish, addressed to the reader with the plural/polite form (*kullanın, görün, deneyin*). This is Academy's own voice; the rest of the site uses *sen*, so never copy site copy in unchanged.
- Short sentences, one idea per sentence. Paragraphs of 2 to 4 sentences.
- Keep established English terms (*cache, query key, mutation, hook, agent, client, worktree*) and inflect them with an apostrophe (*query key'e, agent'ın*). Never *ajan*, *istemci* or *başsız*.
- No filler, no hype, no emojis in prose. `// ❌` and `// ✅` only as code comments in before/after snippets.
- Write "Yapay Zekâ" in titles as the curriculum does.
- Code, file, variable, component and branch names are English, and so are UI strings inside `examples/`. Comments under `examples/` are English. Comments and UI strings inside a lesson's own code blocks follow the locale's prose. Domain data (TRY, `tr-TR` formatting, TCKN, IBAN, phone formats, names) follows `CONTENT.md` and `TRANSLATION.md`.

## Emphasis

- **Bold**: a key term where it is defined (*Subagent, **kendi context penceresi olan yardımcı bir agent'tır***), the word that carries a contrast (*yalnızca **ekranda olan** sorgular*), and the first column of decision tables. At most a few per section. Never a whole sentence.
- *Italic in parentheses*: every explanatory parenthesis is italic, parentheses included: `*(ekleme, güncelleme, silme)*`, `*(bkz. [Ders adı](/academy/track/lesson))*`.
- *Italic in quotes*: example prompts, things a user says, short quotes from a source: `*"Sepet toplamı yanlış çıkıyor, düzelt"*`.
- `Inline code`: every identifier, file name, command, flag, key and literal value.
- Never combine bold and italic.

## Headings

- Sentence case: `## Playwright test agents`, not `## Playwright Test Agents`.
- Numbered step headings keep the verb lowercase: `### 1. planla`. Project steps: `## Adım 1: Projeyi kurun`.
- `##` and `###` only. No badges, links or footnotes in headings.

## Badges

- Write tools, libraries, products and companies as badge tokens in prose: `[!react]`, `[!nextjs]`, `[!tanstack-query]`, `[!claudeCode]`, `[!anthropic]`.
- Tokens are case-sensitive and must match the allowlist exactly: libraries are kebab-case (`tanstack-start`, `react-hook-form`), products are camelCase (`claudeCode`, `geminiCli`, `chatGpt`). The allowlist is virastack.com `src/features/academy/constants/badge.constants.ts`. An unknown token renders as plain text, so check the list and write the plain name when the tool is missing.
- Use the badge where the tool is named in running text, not in code, headings, link text or Kaynaklar.
- In a table with logos, start the cell with the badge: `| 1. | [!anthropic] Anthropic |`.
- Testing Library queries: `[!getBy]`, `[!queryBy]`, `[!findBy]`.
- This syntax is Academy's own. Release notes and site copy use other syntaxes; do not mix them in.

## Callouts and other blocks

Callout syntax (the blank `>` line after the type is required):

```md
> [!TIP]
>
> Prefer queries by role and name.
```

- `[!TIP]` a better habit, `[!NOTE]` useful context, `[!WARNING]` a common bug, `[!CAUTION]` something that breaks production, leaks data or costs money, `[!DO]` / `[!DONT]` paired bullet lists.
- At most two or three callouts per lesson. A callout never repeats an idea already explained.
- Tables for comparisons and "when to use which". Use `| :-- |` alignment and short cells.
- Install commands go in a ` ```command ` fence (rendered as package-manager tabs).
- `<details><summary>…</summary><ul><li>…</li></ul></details>` for optional depth.
- Every code fence has a language. Snippets are minimal, typed and runnable in the lesson's context.

## Links

- Internal links use the site path and point to an existing lesson. Link the previous lesson instead of re-explaining it.
- A person named in prose links to their personal site the first time: `[TkDodo](https://tkdodo.eu/)`. Never to a social profile when they have a site.
- External links in prose are rare; footnotes do that job.

## Footnotes

- Every factual claim, number, recommendation from a source or API behavior gets a footnote `[^n]` that maps to item `n` in Kaynaklar. Do not write `[^n]:` definitions.
- After the punctuation: `…durumundadır.[^1]`. Several back to back, ascending, no commas: `[^2][^5]`.
- Sources are numbered in order of first citation. Every source is cited at least once and every `[^n]` has a source.

## Sources

Only three kinds are accepted (the public `/academy/sources` policy):

1. **Official documentation**: docs, guides, release notes and blogs from the team that builds the tool or standard (react.dev, nextjs.org, tanstack.com, MDN, W3C, code.claude.com).
2. **Recognized engineer**: a maintainer, core team member, or an engineer who regularly speaks at major conferences (TkDodo, Kent C. Dodds, Dan Abramov, Addy Osmani, Josh Comeau).
3. **Independent institution**: universities, standards bodies, engineering publications not tied to a commercial tool (web.dev, V8 blog, Google Research, OWASP).

Reject unknown personal blogs, anonymous Medium or dev.to posts, SEO content farms, vendor marketing pages, AI-generated summaries, Q&A and interview-prep sites, and anything without a clear author or publisher. Prefer the primary source and the newest source that is still correct. Open every link.

Kaynaklar format, one line each:

```md
1. [TanStack Query: Mutations](https://tanstack.com/...) *(doc)* — `useMutation`, durumlar ve callback sırası.
2. [TkDodo](https://tkdodo.eu/): [Mastering Mutations in React Query](https://tkdodo.eu/blog/...) *(article)* — 9 Ekim 2021. Promise döndürmek, `mutate` ile `mutateAsync`.
3. [web.dev: The performance effects of too much lazy loading](https://web.dev/...) *(research)* — Felix Arntz ve Rick Viscomi. LCP'ye etkisi.
```

- Title: `Site or project: Page title`. For a recognized engineer's own site: `[Name](site): [Title](url)`. Titles stay in their original language.
- Type tag: `*(doc)*`, `*(article)*`, `*(research)*`, `*(repo)*`, `*(video)*`, `*(podcast)*` or `*(book)*`.
- After the em dash: the publish date in Turkish for articles, videos and talks (`9 Ekim 2021.`), then one short phrase on what the reader gets.

`Detaylı öğrenmek için` bullets:

```md
- **Resmi doküman:** "Mutations"; durumlar, callback sırası ve offline mutation.[^1]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "Mastering Mutations in React Query"; callback'lerin yeri.[^2]
```

Labels: `Resmi doküman`, `Yazı`, `Konuşma`, `Video`, `Kitap`, `Rehber`.

## Project lessons

- `kind: "project"`, usually the last lesson of a track or lesson group.
- `## Senaryo`: what the reader builds, as a short bullet list of behaviors, then one line saying the goal is the pieces working together, not design.
- A table `| Parça | Dosya | Ders |` mapping each part to its file and the lesson it comes from.
- A link to the code (`https://github.com/virastack/academy/tree/main/examples/<track>/<project>`) and a note that its tests can be used to compare.
- Steps as `## Adım N: …`. Show only the critical code; link to the repo for the rest.
- The example installs, builds and passes its tests before the lesson is published. A `starter` fails its tests in the expected places.

## English counterpart

The English lesson is a rewrite, not a translation. `TRANSLATION.md` fixes what never changes (footnotes, sources, headings, tables, badges, links) and the recurring English wording. Settle a new recurring phrase there before using it.

## Final check

- [ ] Frontmatter complete; `description` matches the curriculum and has no Markdown.
- [ ] Prose within the length target; no repeated explanation, no second example of the same idea.
- [ ] Every claim footnoted; footnotes after punctuation, ascending, no commas; every source cited.
- [ ] Every source meets the three criteria and opens; dates on articles and videos.
- [ ] Badge tokens match the allowlist exactly; none in headings, links or Kaynaklar.
- [ ] Explanatory parentheses italic; bold only for definitions and contrast; no `***`.
- [ ] Headings in sentence case; `examples/` fully English.
- [ ] Internal links point to existing `/academy/<track>/<lesson>` paths.
- [ ] `Kendin dene` present where the track uses it.
- [ ] English counterpart written; `node scripts/check-translation.mjs <track>` passes.
- [ ] `node scripts/sync-curriculum.mjs --check` shows the expected status.
- [ ] Show the diff and get approval. Commit and push only when asked.
