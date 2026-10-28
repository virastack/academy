/**
 * Marks lessons as `published` in curriculum.json once their Markdown has real
 * content, and publishes the parent track when it gains its first lesson.
 *
 * A lesson counts as written when its body (frontmatter, headings, HTML
 * comments and blank lines removed) has at least MIN_BODY_CHARS characters.
 * Add `draft: true` to the frontmatter to keep a written lesson unpublished.
 *
 * Runs over every locale under content/ that has a curriculum.json, so a new
 * translation is picked up as soon as its tree exists. Pass `--locale <code>`
 * to sync one of them on its own.
 *
 * Only promotes; never unpublishes.
 * Usage: `node scripts/sync-curriculum.mjs [--locale <code>] [--check]`
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_ROOT = join(ROOT, "content");
const MIN_BODY_CHARS = 300;
const checkOnly = process.argv.includes("--check");

const localeFlag = process.argv.indexOf("--locale");
const requestedLocale = localeFlag === -1 ? null : process.argv[localeFlag + 1];

if (localeFlag !== -1 && !requestedLocale) {
  console.error("error: --locale needs a code, for example --locale en");
  process.exit(1);
}

/** Locales that actually have a curriculum to sync. */
function findLocales() {
  return readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((locale) => existsSync(join(CONTENT_ROOT, locale, "curriculum.json")))
    .sort();
}

function readLesson(path) {
  const source = readFileSync(path, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const frontmatter = match?.[1] ?? "";
  const body = match ? source.slice(match[0].length) : source;
  const text = body
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n")
    .filter((line) => line.trim() && !/^\s*#{1,6}\s/.test(line))
    .join("\n");

  return {
    draft: /^draft:\s*true\s*$/m.test(frontmatter),
    written: text.length >= MIN_BODY_CHARS,
  };
}

/** Promotes written lessons for one locale. Returns the ids it published. */
function syncLocale(locale) {
  const content = join(CONTENT_ROOT, locale);
  const curriculumPath = join(content, "curriculum.json");
  const curriculum = JSON.parse(readFileSync(curriculumPath, "utf8"));
  const changes = [];

  for (const group of curriculum.groups) {
    for (const track of group.tracks) {
      for (const lessonGroup of track.lessonGroups ?? []) {
        for (const lesson of lessonGroup.lessons) {
          const id = `${track.slug}/${lesson.slug}`;
          const path = join(content, track.slug, `${lesson.slug}.md`);

          if (!existsSync(path)) {
            if (lesson.status === "published") {
              console.warn(`warning: ${locale}/${id} is published but ${id}.md is missing`);
            }
            continue;
          }

          const { draft, written } = readLesson(path);
          if (lesson.status !== "published" && written && !draft) {
            lesson.status = "published";
            changes.push(id);
          }
        }
      }

      const hasPublished = (track.lessonGroups ?? []).some((lessonGroup) =>
        lessonGroup.lessons.some((lesson) => lesson.status === "published"),
      );
      if (track.status !== "published" && hasPublished) {
        track.status = "published";
        changes.push(`${track.slug} (track)`);
      }
    }
  }

  if (changes.length > 0 && !checkOnly) {
    writeFileSync(curriculumPath, `${JSON.stringify(curriculum, null, 2)}\n`);
  }

  return changes;
}

const locales = requestedLocale ? [requestedLocale] : findLocales();

if (requestedLocale && !existsSync(join(CONTENT_ROOT, requestedLocale, "curriculum.json"))) {
  console.error(`error: content/${requestedLocale}/curriculum.json does not exist`);
  process.exit(1);
}

if (locales.length === 0) {
  console.error("error: no locale under content/ has a curriculum.json");
  process.exit(1);
}

let published = 0;

for (const locale of locales) {
  const changes = syncLocale(locale);

  if (changes.length === 0) {
    console.log(`${locale}: curriculum.json is up to date.`);
    continue;
  }

  published += changes.length;
  console.log(`${locale}: published\n${changes.map((id) => `  - ${id}`).join("\n")}`);
}

if (published > 0 && checkOnly) {
  process.exit(1);
}
