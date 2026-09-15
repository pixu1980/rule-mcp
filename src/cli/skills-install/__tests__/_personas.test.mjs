/**
 * Persona skill generation: one SKILL.md per active role and operation, with
 * `exposeTool: false` so the tool surface is unchanged.
 */
import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { generatePersonaSkills } from "../_personas.js";

const ROLE = { id: "architect", role: "Software Architect", yearsOfExperience: 30 };

test("generatePersonaSkills writes one skill per role and operation", () => {
  const dir = mkdtempSync(join(tmpdir(), "pix-persona-skills-"));

  try {
    const written = generatePersonaSkills(dir, { roles: [ROLE], operations: ["plan", "audit", "review"] });

    assert.deepEqual(written, ["pix-plan-architect", "pix-audit-architect", "pix-review-architect"]);

    const content = readFileSync(join(dir, "pix-audit-architect/SKILL.md"), "utf8");

    assert.match(content, /^name: pix-audit-architect$/m, "the skill name is the operation and role");
    assert.match(content, /exposeTool: false/, "a persona skill never mints a tool");
    assert.match(content, /pix_tool_audit/, "the audit skill points at the audit tool");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("generatePersonaSkills dry-run writes nothing", () => {
  const dir = mkdtempSync(join(tmpdir(), "pix-persona-skills-"));

  try {
    const written = generatePersonaSkills(dir, { roles: [ROLE], operations: ["plan"], dryRun: true });

    assert.deepEqual(written, ["pix-plan-architect"]);
    assert.equal(existsSync(join(dir, "pix-plan-architect")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
