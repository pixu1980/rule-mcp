

/** Branch coverage for layer resolution: unreadable skills and persona id mismatch. */
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-layers-branches-home-"));
const root = mkdtempSync(join(tmpdir(), "rule-layers-branches-proj-"));

process.env.RULE_MCP_HOME = home;
mkdirSync(join(root, ".git"), { recursive: true });
mkdirSync(join(root, ".rule-mcp", "skills"), { recursive: true });
mkdirSync(join(root, ".rule-mcp", "personas"), { recursive: true });

const { resolvePersonaFiles, resolveSkillDirs } = await import("../_resolve.js");

test.after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

test("an unreadable skill file is reported and skipped", { skip: process.platform === "win32" }, () => {
  const skillDir = join(root, ".rule-mcp", "skills", "custom-skill");

  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), "---\nname: custom-skill\ndescription: x\n---\n");
  chmodSync(join(skillDir, "SKILL.md"), 0);

  try {
    const skills = resolveSkillDirs({ cwd: root });

    assert.ok(skills.problems.some((problem) => /unreadable skill/u.test(problem.reason)));
    assert.equal(skills.has("custom-skill"), false);
  } finally {
    chmodSync(join(skillDir, "SKILL.md"), 0o644);
  }
});

test("a persona whose id does not match the file name is skipped", () => {
  writeFileSync(
    join(root, ".rule-mcp", "personas", "custom-branch-persona.md"),
    ["---", 'id: "wrong"', 'role: "Tester"', "yearsOfExperience: 3", 'status: "active"', "version: 1", "skills:", '  - "testing"', "---", "", "# Tester", "", "- a lens", ""].join(
      "\n",
    ),
  );

  const personas = resolvePersonaFiles({ cwd: root });

  assert.ok(personas.problems.some((problem) => /does not match the file name/u.test(problem.reason)));
  assert.equal(personas.has("custom-branch-persona"), false);
});
