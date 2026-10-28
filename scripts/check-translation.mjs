/**
 * Compares the English lessons of a track against their Turkish sources.
 *
 * The English tree is a rewrite, not a translation, so the prose is expected to
 * differ. Everything structural is expected not to: footnotes, sources,
 * headings, tables, code fences, badges, links and the curriculum entry.
 *
 * Usage: `node scripts/check-translation.mjs [track...]`
 * With no track, checks every track listed in content/en/curriculum.json.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");
const SOURCE_LOCALE = "tr";
const TARGET_LOCALE = "en";

/** Headings whose English wording is fixed by TRANSLATION.md. */
const HEADINGS = new Map([
  ["Kendin dene", "Try it yourself"],
  ["Detaylı öğrenmek için", "Going deeper"],
  ["Kaynaklar", "Sources"],
  ["Senaryo", "Scenario"],
  ["Kurulum", "Setup"],
  ["Hazırlık", "Before you start"],
  ["Testler", "Tests"],
  ["Yaygın hatalar", "Common mistakes"],
  ["Ne zaman gerekmez?", "When you don't need it"],
  ["Ne zaman hangisi", "Which one when"],
  ["Hangisini seçmeli?", "Which one should you pick?"],
  ["Bitti sayılır", "Done when"],
  ["İş akışı", "The workflow"],
]);

/** Turkish-only letters. Anything else is shared with other languages. */
const TURKISH_LETTERS = /[ğĞışŞİ]/;

/** Strings that may legitimately keep Turkish letters in an English lesson. */
const TURKISH_ALLOWED = [
  "Ömer Gülçiçek",
  "Gülçiçek",
  "omergulcicek",
  "Türkçe",
  "Turkish",
];

/** Lessons whose Turkish content is the subject of the lesson. */
/**
 * Turkish strings a particular English lesson may keep, because the string is
 * the lesson's subject rather than its prose: an i18n lesson teaches with a
 * `messages/tr.json` payload, and translating that payload would leave the
 * example demonstrating nothing. Keep this list narrow and per lesson, so the
 * leftover check stays strict everywhere else.
 */
const TURKISH_ALLOWED_IN = new Map([
  [
    "architecture/i18n",
    ["Mağazaya hoş geldiniz", "Sepetiniz boş", "Sepetinizde", "Hoş geldiniz"],
  ],
]);

/**
 * Source URLs that legitimately differ between locales, because the source is
 * documentation that exists in the reader's own language. Every other URL
 * difference is an error.
 */
const URL_OVERRIDES = new Map([
  ["react/setup-and-tooling", new Map([["https://tr.react.dev/learn", "https://react.dev/learn"]])],
]);

const problems = [];
const notes = [];
let checked = 0;

function fail(file, message) {
  problems.push(`${file}: ${message}`);
}

function warn(file, message) {
  notes.push(`${file}: ${message}`);
}

function readCurriculum(locale) {
  const path = join(CONTENT, locale, "curriculum.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Every lesson in a curriculum, flattened, with its track slug. */
function lessonsOf(curriculum) {
  const out = [];
  for (const group of curriculum.groups) {
    for (const track of group.tracks) {
      for (const lessonGroup of track.lessonGroups ?? []) {
        for (const lesson of lessonGroup.lessons) {
          out.push({ track: track.slug, ...lesson });
        }
      }
    }
  }
  return out;
}

function splitFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { keys: [], values: {}, body: source };

  const keys = [];
  const values = {};
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!field) continue;
    keys.push(field[1]);
    values[field[1]] = field[2].replace(/^"(.*)"$/, "$1");
  }

  return { keys, values, body: source.slice(match[0].length) };
}

/** Body with fenced code blocks removed, so markers in code are not counted. */
function withoutCode(body) {
  return body.replace(/^```[\s\S]*?^```/gm, "");
}

function analyze(source) {
  const { keys, values, body } = splitFrontmatter(source);
  const prose = withoutCode(body);
  // An image written inside an inline code span is a code sample, not a content image.
  const proseWithoutInlineCode = prose.replace(/`[^`\n]*`/g, "");

  const headings = [...body.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((match) => ({
    level: match[1].length,
    text: match[2].trim(),
  }));

  const footnotes = [...prose.matchAll(/\[\^(\d+)\]/g)].map((match) => Number(match[1]));

  const sourcesHeading = headings.findIndex((heading) =>
    heading.level === 2 && /^(Kaynaklar|Sources)$/.test(heading.text),
  );
  const sourcesText =
    sourcesHeading === -1
      ? ""
      : body.slice(body.indexOf(`## ${headings[sourcesHeading].text}`));

  const sources = [...sourcesText.matchAll(/^(\d+)\.\s+(.*)$/gm)].map((match) => ({
    index: Number(match[1]),
    urls: [...match[2].matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((url) => url[1]),
    type: match[2].match(/\*\((doc|article|research|repo|video|podcast|book)\)\*/)?.[1] ?? null,
    text: match[2],
  }));

  return {
    keys,
    values,
    body,
    prose,
    headings,
    footnotes,
    sources,
    shape: headings.map((heading) => heading.level).join(""),
    fences: [...body.matchAll(/^```([a-zA-Z-]*)/gm)].map((match) => match[1]).filter((_, i) => i % 2 === 0),
    tables: (body.match(/^\|[\s-:|]+\|$/gm) ?? []).length,
    details: (body.match(/<details>/g) ?? []).length,
    callouts: [...body.matchAll(/^>\s*\[!([A-Z]+)\]/gm)].map((match) => match[1]),
    badges: [...prose.matchAll(/\[!([a-zA-Z]+)\]/g)].map((match) => match[1]).sort(),
    internalLinks: [...body.matchAll(/\]\((\/academy\/[^)\s]+)\)/g)].map((match) => match[1]).sort(),
    // Only prose images: a Markdown image inside a code fence is code, not content.
    images: [...proseWithoutInlineCode.matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)].map((match) => ({
      alt: match[1],
      url: match[2],
    })),
  };
}

function compareLists(file, label, before, after) {
  if (before.length !== after.length) {
    fail(file, `${label}: ${after.length} in en, ${before.length} in tr`);
    return;
  }
  for (const [i, value] of before.entries()) {
    if (after[i] !== value) {
      fail(file, `${label}: item ${i + 1} is "${after[i]}" in en, "${value}" in tr`);
      return;
    }
  }
}

function checkFootnotes(file, lesson) {
  const { footnotes, sources } = lesson;
  const cited = new Set(footnotes);

  if (sources.length === 0) {
    fail(file, "no source list found");
    return;
  }

  for (const [i, item] of sources.entries()) {
    if (item.index !== i + 1) {
      fail(file, `source list is numbered ${item.index} at position ${i + 1}`);
      break;
    }
    if (item.urls.length === 0) fail(file, `source ${item.index} has no link`);
    if (!item.type) fail(file, `source ${item.index} has no type tag`);
  }

  for (const n of cited) {
    if (n < 1 || n > sources.length) fail(file, `[^${n}] has no entry in the source list`);
  }
  for (let n = 1; n <= sources.length; n += 1) {
    if (!cited.has(n)) fail(file, `source ${n} is never cited`);
  }

  let highest = 0;
  for (const n of footnotes) {
    if (n > highest + 1) {
      fail(file, `[^${n}] is cited before [^${highest + 1}]: number sources by first citation`);
      break;
    }
    highest = Math.max(highest, n);
  }
}

function checkPlacement(file, lesson) {
  for (const match of lesson.prose.matchAll(/(.)\[\^\d+\]/g)) {
    const before = match[1];
    if (/[\s(]/.test(before)) {
      fail(file, `footnote marker after "${before === " " ? "a space" : before}": markers follow the punctuation`);
      break;
    }
  }
  for (const match of lesson.prose.matchAll(/\[\^\d+\](\s*[,;]\s*)\[\^\d+\]/g)) {
    fail(file, `consecutive footnotes separated by "${match[1].trim()}": write them back to back`);
    break;
  }
}

function checkTurkishLeftovers(file, lesson, id) {
  const allowedHere = [...TURKISH_ALLOWED, ...(TURKISH_ALLOWED_IN.get(id) ?? [])];
  const lines = lesson.body.split("\n");
  for (const [i, line] of lines.entries()) {
    if (!TURKISH_LETTERS.test(line)) continue;
    let rest = line;
    for (const allowed of allowedHere) rest = rest.replaceAll(allowed, "");
    if (TURKISH_LETTERS.test(rest)) {
      warn(file, `line ${i + 1} still has Turkish letters: ${line.trim().slice(0, 80)}`);
    }
  }
}

function checkLesson(track, slug, trCurriculumEntry, enCurriculumEntry) {
  const id = `${track}/${slug}`;
  const file = `content/${TARGET_LOCALE}/${id}.md`;
  const trPath = join(CONTENT, SOURCE_LOCALE, `${id}.md`);
  const enPath = join(CONTENT, TARGET_LOCALE, `${id}.md`);

  if (!existsSync(trPath)) {
    fail(file, `no Turkish source at content/${SOURCE_LOCALE}/${id}.md`);
    return;
  }
  if (!existsSync(enPath)) {
    fail(file, "missing");
    return;
  }

  checked += 1;
  const tr = analyze(readFileSync(trPath, "utf8"));
  const en = analyze(readFileSync(enPath, "utf8"));

  compareLists(file, "frontmatter keys", tr.keys, en.keys);
  if (en.values.translationKey !== id) {
    fail(file, `translationKey is "${en.values.translationKey}", expected "${id}"`);
  }
  if (en.values.lastVerified !== tr.values.lastVerified) {
    warn(file, `lastVerified is ${en.values.lastVerified}, tr says ${tr.values.lastVerified}`);
  }
  if ("draft" in tr.values !== ("draft" in en.values)) {
    fail(file, "draft flag does not match the Turkish lesson");
  }

  if (enCurriculumEntry) {
    if (en.values.title !== enCurriculumEntry.title) {
      fail(file, `title "${en.values.title}" differs from curriculum "${enCurriculumEntry.title}"`);
    }
    if (en.values.description !== enCurriculumEntry.description) {
      fail(file, `description differs from curriculum:\n    md:   ${en.values.description}\n    json: ${enCurriculumEntry.description}`);
    }
    if (enCurriculumEntry.kind !== trCurriculumEntry?.kind) {
      fail(file, `kind is "${enCurriculumEntry.kind}", tr says "${trCurriculumEntry?.kind}"`);
    }
  } else {
    fail(file, `not listed in content/${TARGET_LOCALE}/curriculum.json`);
  }

  if (en.shape !== tr.shape) {
    fail(
      file,
      `heading structure differs\n    tr: ${tr.headings.map((h) => "#".repeat(h.level) + " " + h.text).join(" | ")}\n    en: ${en.headings.map((h) => "#".repeat(h.level) + " " + h.text).join(" | ")}`,
    );
  } else {
    for (const [i, heading] of tr.headings.entries()) {
      const expected = HEADINGS.get(heading.text);
      if (expected && en.headings[i].text !== expected) {
        fail(file, `heading ${i + 1} is "${en.headings[i].text}", glossary says "${expected}"`);
      }
    }
  }

  if (en.footnotes.length !== tr.footnotes.length) {
    fail(file, `${en.footnotes.length} footnote markers in en, ${tr.footnotes.length} in tr`);
  }
  if (en.sources.length !== tr.sources.length) {
    fail(file, `${en.sources.length} sources in en, ${tr.sources.length} in tr`);
  }
  compareLists(file, "footnote order", tr.footnotes, en.footnotes);
  const overrides = URL_OVERRIDES.get(id);
  compareLists(
    file,
    "source URLs",
    tr.sources.flatMap((item) => item.urls).map((url) => overrides?.get(url) ?? url),
    en.sources.flatMap((item) => item.urls),
  );
  compareLists(
    file,
    "source type tags",
    tr.sources.map((item) => item.type),
    en.sources.map((item) => item.type),
  );

  checkFootnotes(file, en);
  checkPlacement(file, en);

  compareLists(file, "code fence languages", tr.fences, en.fences);
  compareLists(file, "callouts", tr.callouts, en.callouts);
  compareLists(file, "badges", tr.badges, en.badges);
  compareLists(file, "internal links", tr.internalLinks, en.internalLinks);
  compareLists(file, "image urls", tr.images.map((image) => image.url), en.images.map((image) => image.url));

  if (en.tables !== tr.tables) fail(file, `${en.tables} tables in en, ${tr.tables} in tr`);
  if (en.details !== tr.details) fail(file, `${en.details} <details> in en, ${tr.details} in tr`);

  for (const [i, image] of en.images.entries()) {
    if (!image.alt.trim()) fail(file, `image ${i + 1} has no alt text`);
    else if (image.alt === tr.images[i]?.alt) warn(file, `image ${i + 1} still has the Turkish alt text`);
  }

  for (const link of en.internalLinks) {
    const target = link.replace(/^\/academy\//, "").replace(/#.*$/, "");
    const isLesson = existsSync(join(CONTENT, SOURCE_LOCALE, `${target}.md`));
    const isTrack = !target.includes("/") && existsSync(join(CONTENT, SOURCE_LOCALE, target));
    if (!isLesson && !isTrack) {
      fail(file, `internal link ${link} points at no lesson or track`);
    }
  }

  checkTurkishLeftovers(file, en, id);
}

const trCurriculum = readCurriculum(SOURCE_LOCALE);
const enCurriculum = readCurriculum(TARGET_LOCALE);

if (!trCurriculum) {
  console.error(`error: content/${SOURCE_LOCALE}/curriculum.json does not exist`);
  process.exit(1);
}
if (!enCurriculum) {
  console.error(`error: content/${TARGET_LOCALE}/curriculum.json does not exist`);
  process.exit(1);
}

const trLessons = lessonsOf(trCurriculum);
const enLessons = lessonsOf(enCurriculum);
const requested = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const tracks = requested.length > 0 ? requested : [...new Set(enLessons.map((lesson) => lesson.track))];

for (const track of tracks) {
  const inTrack = enLessons.filter((lesson) => lesson.track === track);
  if (inTrack.length === 0) {
    problems.push(`${track}: not listed in content/${TARGET_LOCALE}/curriculum.json`);
    continue;
  }

  const trInTrack = trLessons.filter((lesson) => lesson.track === track);
  compareLists(
    `content/${TARGET_LOCALE}/curriculum.json`,
    `${track} lesson order`,
    trInTrack.map((lesson) => lesson.slug),
    inTrack.map((lesson) => lesson.slug),
  );

  const written = new Set(
    existsSync(join(CONTENT, TARGET_LOCALE, track))
      ? readdirSync(join(CONTENT, TARGET_LOCALE, track)).filter((name) => name.endsWith(".md"))
      : [],
  );

  for (const lesson of inTrack) {
    const hasTurkish = existsSync(join(CONTENT, SOURCE_LOCALE, track, `${lesson.slug}.md`));
    if (!hasTurkish && !written.has(`${lesson.slug}.md`)) continue;
    checkLesson(
      track,
      lesson.slug,
      trInTrack.find((entry) => entry.slug === lesson.slug),
      lesson,
    );
    written.delete(`${lesson.slug}.md`);
  }

  for (const extra of written) {
    problems.push(`content/${TARGET_LOCALE}/${track}/${extra}: not listed in curriculum.json`);
  }
}

for (const note of notes) console.log(`warning: ${note}`);
for (const problem of problems) console.error(`error: ${problem}`);

console.log(
  `\n${checked} lesson${checked === 1 ? "" : "s"} checked in ${tracks.length} track${tracks.length === 1 ? "" : "s"}: ` +
    `${problems.length} error${problems.length === 1 ? "" : "s"}, ${notes.length} warning${notes.length === 1 ? "" : "s"}` +
    ".",
);

process.exit(problems.length > 0 ? 1 : 0);
