/** The skills catalog: frontmatter fallbacks, install checks, recursive copy. */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { copySkill, getAvailableSkills, isInstalled, readSkillMeta } from "../_catalog.js";

const root = mkdtempSync(join(tmpdir(), "rule-catalog-"));

test.after(() => rmSync(root, { recursive: true, force: true }));

test("readSkillMeta reads the frontmatter and falls back field by field", () => {
  const full = join(root, "full-skill");
  mkdirSync(full, { recursive: true });
  writeFileSync(join(full, "SKILL.md"), "---\nname: full-skill\ndescription: does things\ntags: [a, b]\n---\n\n# Body\n");

  const meta = readSkillMeta(full);
  assert.equal(meta.name, "full-skill", "the name reads");
  assert.equal(meta.desc, "does things", "the description reads");

  const bare = join(root, "bare-skill");
  mkdirSync(bare, { recursive: true });
  writeFileSync(join(bare, "SKILL.md"), "# No frontmatter at all\n");
  assert.deepEqual(readSkillMeta(bare), { name: "", desc: "", tags: [] }, "missing fields fall back to empty");

  assert.deepEqual(readSkillMeta(join(root, "nowhere")), { name: "", desc: "", tags: [] }, "a missing SKILL.md reads empty");
});

test("getAvailableSkills lists the embedded catalog sorted by name", () => {
  const skills = getAvailableSkills();
  assert.ok(skills.length > 0, "the embedded catalog is not empty");
  const names = skills.map((s) => s.name);
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b)),
    "the catalog sorts by name",
  );
  assert.ok(
    skills.every((s) => s.description.length > 0),
    "every entry carries a description",
  );
});

test("isInstalled answers by the SKILL.md marker", () => {
  const target = join(root, "installed");
  mkdirSync(join(target, "present"), { recursive: true });
  writeFileSync(join(target, "present", "SKILL.md"), "# here\n");

  assert.equal(isInstalled("present", target), true, "a marker file means installed");
  assert.equal(isInstalled("absent", target), false, "no marker means not installed");
});

test("copySkill copies nested trees and replaces an existing install", () => {
  const source = join(root, "source-skill");
  mkdirSync(join(source, "references"), { recursive: true });
  writeFileSync(join(source, "SKILL.md"), "# v2\n");
  writeFileSync(join(source, "references", "notes.md"), "nested\n");

  const target = join(root, "copy-target");
  mkdirSync(join(target, "the-skill"), { recursive: true });
  writeFileSync(join(target, "the-skill", "stale.md"), "old install\n");

  copySkill(source, target, "the-skill");

  assert.equal(readFileSync(join(target, "the-skill", "SKILL.md"), "utf8"), "# v2\n", "the root file copies");
  assert.equal(readFileSync(join(target, "the-skill", "references", "notes.md"), "utf8"), "nested\n", "the nested file copies");
  assert.equal(existsSync(join(target, "the-skill", "stale.md")), false, "the old install is replaced, not merged");
});
