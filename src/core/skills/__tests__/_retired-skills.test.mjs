/**
 * @module test/skills/retired-skills
 *
 * A retired skill leaves no trace.
 *
 * Deleting the folder is the easy part and the only part that is obvious. The
 * rows that link to it are the part that rots: the area router table, the
 * dispatcher, the cross-references in neighbor skills, the persona that
 * listed it as evidence, and the plan index. Every one of them is a plain
 * string in a Markdown file, so nothing fails when the folder goes.
 *
 * This test is the tombstone. A retired id must not reappear anywhere a reader
 * or the router can reach it, and the list only grows.
 */
import { strict as assert } from "node:assert";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Skills the catalog retired. Adding one is a decision; removing one is not. */
export const RETIRED = ["rule-mcp-platform-agent", "rule-mcp-frontend-vanilla-reactive", "rule-mcp-frontend-custom-element"];

/** Every SKILL.md in the catalog. */
function skillFiles() {
  const skillsRoot = join(root, "skills");

  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(skillsRoot, entry.name, "SKILL.md"))
    .filter((path) => existsSync(path));
}

/** The files a retired id must not appear in. */
function linkingFiles() {
  const personasRoot = join(root, "personas");
  const personas = existsSync(personasRoot)
    ? readdirSync(personasRoot)
        .filter((name) => name.endsWith(".md"))
        .map((name) => join(personasRoot, name))
    : [];

  return [...skillFiles(), ...personas, join(root, "docs", "plans", "skills", "README.md"), join(root, "docs", "plans", "skills", "DEPENDENCIES.md")].filter((path) =>
    existsSync(path),
  );
}

test("a retired skill has no directory", () => {
  for (const id of RETIRED) {
    assert.equal(existsSync(join(root, "skills", id)), false, `${id} still has a directory`);
  }
});

test("a retired skill is linked from nowhere", () => {
  const offenders = [];

  for (const path of linkingFiles()) {
    const text = readFileSync(path, "utf8");

    for (const id of RETIRED) {
      if (text.includes(id)) {
        offenders.push(`${path.slice(root.length + 1)} mentions ${id}`);
      }
    }
  }

  assert.deepEqual(offenders, [], `remove these references:\n  ${offenders.join("\n  ")}`);
});

test("a retired skill mints no tool", async () => {
  const { loadAllSkills } = await import("../index.js");
  await loadAllSkills(true);

  const { getSkillNames } = await import("../../../tools/router/index.js");
  const names = getSkillNames();

  for (const id of RETIRED) {
    assert.equal(names.includes(id), false, `${id} is still a loaded skill`);
  }
});
