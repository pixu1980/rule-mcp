/** Role validation and the user overlay layer, on a scratch config dir. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { validateRole } from "../roles/index.js";
import { loadRoleOverlays } from "../_overlays.js";
import { parsePersonaFile } from "../persona-file/index.js";

const overlayDir = mkdtempSync(join(tmpdir(), "rule-overlay-"));
process.env.RULE_MCP_ROLES_OVERLAY_DIR = overlayDir;

test.after(() => {
  rmSync(overlayDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_ROLES_OVERLAY_DIR;
});

const PERSONA_FOR = (id) =>
  [
    "---",
    `id: "${id}"`,
    'role: "Tester"',
    "yearsOfExperience: 3",
    'status: "active"',
    "version: 1",
    "skills:",
    '  - "testing"',
    "---",
    "# Tester",
    "",
    "- edge cases first",
    "",
  ].join("\n");

test("validateRole names every missing and malformed field", () => {
  assert.deepEqual(validateRole(), ["not an object"], "a non-object role is invalid");
  const emptyProblems = validateRole({});
  assert.ok(emptyProblems.includes("id must be a non-empty string"), "the id is named");
  assert.ok(emptyProblems.includes("role must be a non-empty string"), "the role is named");
  assert.ok(emptyProblems.length >= 6, "every missing field is named");
  assert.deepEqual(
    validateRole({ id: "BadCase", role: "x", yearsOfExperience: 0, skills: [], status: "weird", version: 0 }),
    [
      "id must be kebab-case",
      "yearsOfExperience must be a positive integer",
      "skills must be a non-empty array",
      "status must be one of active, proposed, deprecated",
      "version must be a positive integer",
    ],
    "every invalid field is reported",
  );
  assert.deepEqual(
    validateRole({ id: "fine", role: "Fine", yearsOfExperience: 1, skills: ["x"], status: "active", version: 1, evidenceSkills: "nope" }),
    ["evidenceSkills must be an array when present"],
    "a malformed evidenceSkills is named",
  );
});

test("loadRoleOverlays reads md and legacy json overlays, overriding by id", () => {
  writeFileSync(join(overlayDir, "tester.md"), PERSONA_FOR("tester"));
  writeFileSync(
    join(overlayDir, "legacy.json"),
    JSON.stringify({ id: "legacy", role: "Legacy", yearsOfExperience: 2, status: "active", version: 1, skills: ["a"], evidenceSkills: [], lenses: [] }),
  );
  writeFileSync(join(overlayDir, "broken.md"), "{|");

  const { roles, problems } = loadRoleOverlays({ home: overlayDir });
  assert.ok(
    roles.some((entry) => entry.id === "tester"),
    "the md overlay loads",
  );
  assert.ok(
    roles.some((entry) => entry.id === "legacy"),
    "the legacy json overlay loads",
  );
  assert.equal(problems.length, 1, "the broken file is reported");
  assert.match(problems[0].reason, /must be a non-empty string/, "the reason lists the missing fields");

  delete process.env.RULE_MCP_ROLES_OVERLAY_DIR;
  try {
    const absent = loadRoleOverlays({ home: "/nonexistent-home-xyz" });
    assert.deepEqual(absent.roles, [], "a missing overlay dir has no roles");
  } finally {
    process.env.RULE_MCP_ROLES_OVERLAY_DIR = overlayDir;
  }
});

test("parsePersonaFile reads frontmatter and body lenses", () => {
  const parsed = parsePersonaFile(PERSONA_FOR("tester"));
  assert.equal(parsed.role, "Tester", "the role field reads");
  assert.deepEqual(parsed.skills, ["testing"], "the skills list reads");
  assert.deepEqual(parsed.lenses, ["edge cases first"], "the body bullets are lenses");
});
