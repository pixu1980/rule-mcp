/**
 * @module test/install-skills
 *
 * Verifies the repository-only installer that copies bundled skills globally
 * without installing or configuring the MCP server.
 */

import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const testHome = join(tmpdir(), `rule-skills-install-${process.pid}`);
const target = join(testHome, ".agents", "skills");

console.log("global skills installer test");

try {
  mkdirSync(join(target, "rule"), { recursive: true });
  writeFileSync(join(target, "rule", "stale.txt"), "remove me");
  mkdirSync(join(target, "custom-skill"), { recursive: true });
  writeFileSync(join(target, "custom-skill", "SKILL.md"), "custom");

  assert.equal(
    packageJson.scripts?.["skills:install"],
    "node ./scripts/install-skills.mjs",
    "package.json must expose pnpm skills:install",
  );

  const result = spawnSync(process.execPath, [join(root, "scripts", "install-skills.mjs")], {
    cwd: root,
    env: { ...process.env, HOME: testHome, USERPROFILE: testHome },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const sourceSkills = readdirSync(join(root, "skills"), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(root, "skills", entry.name, "SKILL.md")))
    .map(entry => entry.name)
    .sort();

  for (const skill of sourceSkills) {
    assert.ok(existsSync(join(target, skill, "SKILL.md")), `${skill} was not installed`);
  }

  assert.ok(!existsSync(join(target, "rule", "stale.txt")), "existing bundled skill must be replaced cleanly");
  assert.ok(existsSync(join(target, "custom-skill", "SKILL.md")), "unrelated custom skills must be preserved");
  assert.ok(result.stdout.includes(`Installed ${sourceSkills.length} skills`), "installer must report the installed count");
  assert.ok(result.stdout.includes(target), "installer must report the global destination");

  console.log(`  ✅ ${sourceSkills.length} skills installed globally without touching custom skills`);
} finally {
  rmSync(testHome, { recursive: true, force: true });
}
