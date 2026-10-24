/**
 * Persona skill generation: one SKILL.md per active role, with
 * `exposeTool: false` so the tool surface is unchanged. The depth of the run is
 * read from the request, so the per-operation skills are gone (ADR 120).
 */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { generatePersonaSkills } from "../_personas.js";

const ROLE = { id: "architect", role: "Software Architect", yearsOfExperience: 30 };

test("generatePersonaSkills writes one skill per role", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-persona-skills-"));

  try {
    const written = generatePersonaSkills(dir, { roles: [ROLE] });

    assert.deepEqual(written, ["rule-persona-architect"]);

    const content = readFileSync(join(dir, "rule-persona-architect/SKILL.md"), "utf8");

    assert.match(content, /^name: rule-persona-architect$/m, "the skill name is the role");
    assert.match(content, /exposeTool: false/, "a persona skill never mints a tool");
    assert.match(content, /rule_tool_plan/, "the skill points at the composable operation tool");
    assert.match(content, /operation: "plan"/, "the depth intent reaches the skill");
    assert.match(content, /operation: "audit"/, "the audit fallback reaches the skill");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("generatePersonaSkills purges the per-operation and legacy names", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-persona-skills-"));

  try {
    for (const stale of ["rule-persona-architect-audit", "rule-persona-architect-plan", "rule-mcp-plan-architect"]) {
      mkdirSync(join(dir, stale), { recursive: true });
      writeFileSync(join(dir, stale, "SKILL.md"), "---\nname: stale\n---\n");
    }

    generatePersonaSkills(dir, { roles: [ROLE] });

    for (const stale of ["rule-persona-architect-audit", "rule-persona-architect-plan", "rule-mcp-plan-architect"]) {
      assert.equal(existsSync(join(dir, stale)), false, `${stale} must not survive the fold`);
    }
    assert.ok(existsSync(join(dir, "rule-persona-architect")), "the current skill is written");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("generatePersonaSkills dry-run writes nothing", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-persona-skills-"));

  try {
    const written = generatePersonaSkills(dir, { roles: [ROLE], dryRun: true });

    assert.deepEqual(written, ["rule-persona-architect"]);
    assert.equal(existsSync(join(dir, "rule-persona-architect")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
