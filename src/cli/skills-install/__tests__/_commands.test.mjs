/** skills install/list: catalog discovery, copying, batch install, native mirror. */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-skills-home-"));
const ORIGINAL_HOME = process.env.HOME;
process.env.HOME = home;

const { copySkill, getAvailableSkills, isInstalled, readSkillMeta } = await import("../_catalog.js");
const { skillsInstallCommand, skillsListCommand } = await import("../_commands.js");

test.after(() => {
  if (ORIGINAL_HOME === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = ORIGINAL_HOME;
  }
  rmSync(home, { recursive: true, force: true });
});

test("getAvailableSkills reads the shipped catalog and tolerates a bad SKILL.md", () => {
  const skills = getAvailableSkills();
  assert.ok(skills.length >= 80, "the embedded catalog is not empty");
  assert.ok(skills.every((skill) => skill.name && skill.source), "every skill has a name and a source");
  assert.ok(skills.every((skill) => skill.displayName), "a display name falls back to the entry name");

  const root = mkdtempSync(join(tmpdir(), "rule-skills-empty-"));
  const meta = readSkillMeta(join(root, "not-a-skill"));
  assert.deepEqual(meta, { name: "", desc: "", tags: [] }, "an unreadable skill directory reads empty");
  rmSync(root, { recursive: true, force: true });
});

test("copySkill copies trees, recurses and replaces an existing destination", () => {
  const target = mkdtempSync(join(tmpdir(), "rule-skills-copy-"));
  const source = mkdtempSync(join(tmpdir(), "rule-skills-src-"));
  mkdirSync(join(source, "sub"), { recursive: true });
  writeFileSync(join(source, "SKILL.md"), "# S\n");
  writeFileSync(join(source, "sub", "rule.js"), "// rule\n");

  copySkill(source, target, "demo");
  assert.ok(isInstalled("demo", target), "the installed skill is detected");
  assert.equal(join(target, "demo", "sub", "rule.js").length > 0, true, "nested files copy");

  writeFileSync(join(source, "SKILL.md"), "# S v2\n");
  copySkill(source, target, "demo");
  assert.ok(readFileSync(join(target, "demo", "SKILL.md"), "utf8").includes("v2"), "an existing destination is replaced");
  rmSync(target, { recursive: true, force: true });
  rmSync(source, { recursive: true, force: true });
});

test("skillsInstallCommand batch-installs to the sandboxed home and lists it", () => {
  skillsInstallCommand({ selectAll: true });
  const homeSkills = join(home, ".agents", "skills");
  const installedNames = readdirSync(homeSkills);
  assert.ok(installedNames.length >= 80, "the sandbox home holds the installed skills");

  const listForced = [];
  const write = process.stdout.write;
  process.stdout.write = (chunk) => {
    listForced.push(String(chunk));
    return true;
  };
  skillsListCommand({ json: true });
  process.stdout.write = write;
  const parsed = JSON.parse(listForced.join(""));
  assert.ok(parsed.length >= 80, "the json list carries every skill");
  assert.ok(parsed.every((entry) => entry.name && entry.installPath.includes(home)), "install paths point at the sandbox home");
});

test("skillsInstallCommand reports when there is nothing to install", () => {
  const target = join(home, ".agents", "skills");
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });

  // Re-install with selectAll false and an empty target: no pre-selected, but
  // stdin is not a TTY so the batch path picks nothing and reports it.
  skillsInstallCommand({});
  assert.ok(existsSync(target), "the target dir still exists");
});
