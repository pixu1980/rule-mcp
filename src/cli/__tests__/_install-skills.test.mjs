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

const root = resolve(import.meta.dirname, "../../..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const testHome = join(tmpdir(), `rule-mcp-skills-install-${process.pid}`);
const target = join(testHome, ".agents", "skills");

console.log("global skills installer test");

try {
  mkdirSync(join(target, "rule-mcp"), { recursive: true });
  writeFileSync(join(target, "rule-mcp", "stale.txt"), "remove me");
  mkdirSync(join(target, "custom-skill"), { recursive: true });
  writeFileSync(join(target, "custom-skill", "SKILL.md"), "custom");

  // The repo serves skills directly from ./skills via MCP resources; the
  // script deliberately advertises that no separate global install is needed.
  assert.equal(
    packageJson.scripts?.["skills:install"],
    'echo "ℹ️ pnpm skills:install: skills are loaded directly from ./skills - no separate install step is needed."',
    "package.json must advertise that skills need no separate install step",
  );

  const result = spawnSync(process.execPath, [join(root, "scripts", "install", "skills", "index.mjs")], {
    cwd: root,
    env: { ...process.env, HOME: testHome, USERPROFILE: testHome },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const sourceSkills = readdirSync(join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, "skills", entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();

  for (const skill of sourceSkills) {
    assert.ok(existsSync(join(target, skill, "SKILL.md")), `${skill} was not installed`);
  }

  assert.ok(!existsSync(join(target, "rule-mcp", "stale.txt")), "existing bundled skill must be replaced cleanly");
  assert.ok(existsSync(join(target, "custom-skill", "SKILL.md")), "unrelated custom skills must be preserved");
  assert.ok(result.stdout.includes(`Installed ${sourceSkills.length} skills`), "installer must report the installed count");
  assert.ok(result.stdout.includes(target), "installer must report the global destination");

  console.log(`  ✅ ${sourceSkills.length} skills installed globally without touching custom skills`);
} finally {
  rmSync(testHome, { recursive: true, force: true });
}
