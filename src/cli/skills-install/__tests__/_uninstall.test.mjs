/**
 * Removing what the skills step copied: the catalog and the generated persona
 * skills, never a user's own directory.
 */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { catalogSkillNames, personaSkillNames, removeInstalledSkills } from "../_uninstall.js";
import { skillsUninstallCommand } from "../index.js";

const seed = (dir, name) => {
  mkdirSync(join(dir, name), { recursive: true });
  writeFileSync(join(dir, name, "SKILL.md"), `---\nname: ${name}\n---\n`);
};

test("the copied names are the catalog plus the generated persona skills", () => {
  assert.ok(catalogSkillNames().includes("rule-mcp-data-sqlite"), "a catalog skill is a copied name");
  assert.ok(personaSkillNames().includes("rule-persona-security"), "a generated persona skill is a copied name");
});

test("removeInstalledSkills removes the catalog and persona dirs, leaves a user skill", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-skills-rm-"));

  try {
    const catalog = catalogSkillNames()[0];
    const persona = personaSkillNames()[0];
    seed(dir, catalog);
    seed(dir, persona);
    seed(dir, "caveman");

    const removed = removeInstalledSkills(dir);

    assert.ok(removed.includes(catalog), "a catalog skill is removed");
    assert.ok(removed.includes(persona), "a generated persona skill is removed");
    assert.equal(existsSync(join(dir, catalog)), false);
    assert.equal(existsSync(join(dir, persona)), false);
    assert.ok(existsSync(join(dir, "caveman")), "a user skill survives");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("removeInstalledSkills dry-run reports without deleting", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-skills-rm-"));

  try {
    const catalog = catalogSkillNames()[0];
    seed(dir, catalog);

    const removed = removeInstalledSkills(dir, { dryRun: true });

    assert.deepEqual(removed, [catalog]);
    assert.ok(existsSync(join(dir, catalog)), "nothing is deleted in a dry run");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("removeInstalledSkills on a missing directory is a no-op", () => {
  assert.deepEqual(removeInstalledSkills(join(tmpdir(), `rule-mcp-skills-missing-${Date.now()}`)), []);
});

test("removeInstalledSkills also removes the persona shapes an earlier release wrote", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-skills-rm-"));

  try {
    seed(dir, "rule-persona-security-audit");
    seed(dir, "rule-persona-security");
    seed(dir, "rule-mcp-plan-security");
    seed(dir, "caveman");

    const removed = removeInstalledSkills(dir);

    assert.ok(removed.includes("rule-persona-security-audit"), "the per-operation persona skill is removed");
    assert.ok(removed.includes("rule-persona-security"), "the current persona skill is removed");
    assert.ok(removed.includes("rule-mcp-plan-security"), "the pre-persona shape is removed");
    assert.ok(!removed.includes("caveman"), "a user skill still survives");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("skillsUninstallCommand removes the copied skills from the global dirs", () => {
  const home = mkdtempSync(join(tmpdir(), "rule-mcp-skills-home-"));
  const previous = process.env.HOME;
  process.env.HOME = home;

  try {
    const skills = join(home, ".agents", "skills");
    seed(skills, catalogSkillNames()[0]);
    seed(skills, "keep-me");

    const results = skillsUninstallCommand();

    assert.ok(
      results.some((entry) => entry.dir === skills && entry.removed.length === 1),
      "the catalog skill is removed",
    );
    assert.ok(existsSync(join(skills, "keep-me")), "a user skill survives");
  } finally {
    process.env.HOME = previous;
    rmSync(home, { recursive: true, force: true });
  }
});

test("skillsUninstallCommand dry-run reports nothing and removes nothing", () => {
  const home = mkdtempSync(join(tmpdir(), "rule-mcp-skills-home-"));
  const previous = process.env.HOME;
  process.env.HOME = home;

  try {
    const skills = join(home, ".agents", "skills");
    const catalog = catalogSkillNames()[0];
    seed(skills, catalog);

    const results = skillsUninstallCommand({ dryRun: true });

    assert.ok(
      results.some((entry) => entry.removed.includes(catalog)),
      "the report names the skill",
    );
    assert.ok(existsSync(join(skills, catalog)), "a dry run removes nothing");
  } finally {
    process.env.HOME = previous;
    rmSync(home, { recursive: true, force: true });
  }
});
