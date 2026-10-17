/**
 * Marks lessons as `published` in curriculum.json once their Markdown has real
 * content, and publishes the parent track when it gains its first lesson.
 *
 * A lesson counts as written when its body (frontmatter, headings, HTML
 * comments and blank lines removed) has at least MIN_BODY_CHARS characters.
 * Add `draft: true` to the frontmatter to keep a written lesson unpublished.
 *
 * Only promotes; never unpublishes. Usage: `node scripts/sync-curriculum.mjs [--check]`
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content/tr");
const CURRICULUM = join(CONTENT, "curriculum.json");
const MIN_BODY_CHARS = 300;
const checkOnly = process.argv.includes("--check");

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

const curriculum = JSON.parse(readFileSync(CURRICULUM, "utf8"));
const changes = [];

for (const group of curriculum.groups) {
  for (const track of group.tracks) {
    for (const lessonGroup of track.lessonGroups ?? []) {
      for (const lesson of lessonGroup.lessons) {
        const id = `${track.slug}/${lesson.slug}`;
        const path = join(CONTENT, track.slug, `${lesson.slug}.md`);

        if (!existsSync(path)) {
          if (lesson.status === "published") {
            console.warn(`warning: ${id} is published but ${id}.md is missing`);
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

if (changes.length === 0) {
  console.log("curriculum.json is up to date.");
  process.exit(0);
}

console.log(`Published:\n${changes.map((id) => `  - ${id}`).join("\n")}`);

if (checkOnly) {
  process.exit(1);
}

writeFileSync(CURRICULUM, `${JSON.stringify(curriculum, null, 2)}\n`);
