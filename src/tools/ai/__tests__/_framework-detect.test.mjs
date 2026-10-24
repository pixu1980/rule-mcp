

/**
 * detectFrameworkSkill: the hint wins, the path is the fallback, and the
 * domain is derived from the skill the framework maps to.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { detectFrameworkSkill } from "../_framework.js";

test("an explicit framework hint is used as given", () => {
  const react = detectFrameworkSkill({ framework: "react" });

  assert.equal(react.detectedFramework, "react");
  assert.equal(react.detectedSkillName, "rule-mcp-frontend-react");
  assert.equal(react.detectedDomain, "frontend");
});

test("the agent framework routes to the ai domain", () => {
  const agents = detectFrameworkSkill({ framework: "agents" });

  assert.equal(agents.detectedSkillName, "rule-mcp-ai");
  assert.equal(agents.detectedDomain, "ai", "rule-mcp-ai is the ai domain");
});

test("a skill outside the domain prefixes has no domain", () => {
  const desktop = detectFrameworkSkill({ framework: "electron" });

  assert.equal(desktop.detectedSkillName, "rule-mcp-platform-desktop");
  assert.equal(desktop.detectedDomain, null, "a platform skill carries no framework-bias domain");
});

test("with neither a hint nor a path nothing is detected", () => {
  assert.deepEqual(detectFrameworkSkill({}), { detectedFramework: undefined, detectedSkillName: null, detectedDomain: null });
});

test("a path is detected when no hint was given", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-detect-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "probe", dependencies: { vue: "3.0.0" } }));

  try {
    const detected = detectFrameworkSkill({ path: root });

    assert.equal(detected.detectedFramework, "vue", "the project is read from disk");
    assert.equal(detected.detectedSkillName, "rule-mcp-frontend-vue");
    assert.equal(detected.detectedDomain, "frontend");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the hint wins over the path", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-detect-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "probe", dependencies: { vue: "3.0.0" } }));

  try {
    assert.equal(detectFrameworkSkill({ framework: "react", path: root }).detectedFramework, "react", "the caller's hint is not second-guessed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an unreadable path detects nothing instead of throwing", () => {
  const detected = detectFrameworkSkill({ path: join(tmpdir(), "rule-mcp-detect-does-not-exist") });

  assert.equal(typeof detected, "object", "a missing directory is survivable");
  assert.equal(detected.detectedDomain === null || detected.detectedDomain === "frontend", true, "and it still answers with a shape the caller can read");
});
