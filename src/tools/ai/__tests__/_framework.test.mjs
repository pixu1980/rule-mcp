/** detectFrameworkSkill: explicit hints, project detection, and every domain. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { detectFrameworkSkill } from "../_framework.js";

test("an explicit framework hint wins without touching the project", () => {
  const resolved = detectFrameworkSkill({ framework: "react", path: "/does/not/exist" });

  assert.equal(resolved.detectedFramework, "react", "the hint is kept");
  assert.equal(resolved.detectedSkillName, "rule-frontend-react", "the react skill is suggested");
  assert.equal(resolved.detectedDomain, "frontend", "react is frontend");
});

test("an agents hint resolves to the ai domain", () => {
  const resolved = detectFrameworkSkill({ framework: "agents" });

  assert.equal(resolved.detectedSkillName, "rule-ai", "the agents hint resolves to the ai umbrella");
  assert.equal(resolved.detectedDomain, "ai", "agents is ai");
});

test("a project with a package.json detects its framework when no hint is given", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-detect-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ dependencies: { react: "^19.0.0" } }, null, 2));

  const resolved = detectFrameworkSkill({ path: dir });
  assert.equal(resolved.detectedFramework, "react", "react is detected from dependencies");
  assert.equal(resolved.detectedSkillName, "rule-frontend-react", "the skill follows the detection");
  rmSync(dir, { recursive: true, force: true });
});

test("no framework and no project mean an empty resolution", () => {
  const resolved = detectFrameworkSkill({});

  assert.equal(resolved.detectedFramework, undefined, "nothing to detect");
  assert.equal(resolved.detectedSkillName, null, "no skill to suggest");
  assert.equal(resolved.detectedDomain, null, "no domain");
});
