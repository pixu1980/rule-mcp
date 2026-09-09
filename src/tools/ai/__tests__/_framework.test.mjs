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

test("a path the detector chokes on resolves to nothing instead of throwing", () => {
  const resolved = detectFrameworkSkill({ path: 42 });

  assert.equal(resolved.detectedFramework, undefined, "a throwing detection is swallowed");
  assert.equal(resolved.detectedSkillName, null, "no skill without a detection");
});

test("no framework and no project mean an empty resolution", () => {
  const resolved = detectFrameworkSkill({});

  assert.equal(resolved.detectedFramework, undefined, "nothing to detect");
  assert.equal(resolved.detectedSkillName, null, "no skill to suggest");
  assert.equal(resolved.detectedDomain, null, "no domain");
});

test("a meta-framework is frontend, so the router still applies its bias", () => {
  const resolved = detectFrameworkSkill({ framework: "astro" });

  assert.equal(resolved.detectedSkillName, "rule-meta-astro", "astro suggests the meta skill");
  // The rule-meta rename dropped astro out of the rule-frontend prefix, and with
  // it the framework bias the router applies when the domains agree.
  assert.equal(resolved.detectedDomain, "frontend", "a meta-framework is still frontend");
});

test("a skill with no routing domain resolves to null rather than a wrong one", () => {
  const resolved = detectFrameworkSkill({ framework: "electron" });

  assert.equal(resolved.detectedSkillName, "rule-platform-desktop");
  assert.equal(resolved.detectedDomain, null, "platform is not one of the routing domains");
});

test("every domain the table can produce is one FRAMEWORK_SKILL_MAP can reach", async () => {
  const { FRAMEWORK_SKILL_MAP } = await import("../../../core/detector/_rules.data.js");
  const suggested = new Set(Object.values(FRAMEWORK_SKILL_MAP));
  const domains = new Set();

  for (const framework of Object.keys(FRAMEWORK_SKILL_MAP)) {
    domains.add(detectFrameworkSkill({ framework }).detectedDomain);
  }

  assert.deepEqual([...domains].sort(), ["ai", "frontend", null].sort(), "the reachable domains, and nothing else");
  assert.ok(
    [...suggested].every((skill) => !(skill.startsWith("rule-backend") || skill.startsWith("rule-data") || skill.startsWith("rule-devops"))),
    "no suggestion reaches those domains, which is why the table does not list them",
  );
});
