/** Role template filling and the persona catalog loader, on a scratch dir. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { fillRoleTemplate } from "../template/index.js";
import { loadPersonaCatalog } from "../roles/index.js";

const role = {
  id: "security",
  role: "Security Engineer",
  yearsOfExperience: 10,
  skills: ["threat modeling"],
  lenses: ["depth over breadth"],
  evidenceSkills: ["rule-backend-security"],
  status: "active",
};

test("fillRoleTemplate fills every placeholder with defaults", () => {
  const filled = fillRoleTemplate(role);
  assert.match(filled, /Security Engineer/, "the role name fills");
  assert.match(filled, /10 years/, "the years fill from the role");
  assert.match(filled, /threat modeling/, "the skills fill");
  assert.match(filled, /## The operation/, "the operation section renders");
});

test("fillRoleTemplate honors overrides and tolerates missing fields", () => {
  const sparse = { id: "tiny", role: "Tiny", yearsOfExperience: 1 };
  const filled = fillRoleTemplate(sparse, { years: 7, skills: ["extra"], operation: "audit", topic: "the auth flow" });

  assert.match(filled, /7 years/, "the years override wins");
  assert.match(filled, /extra/, "the extra skill is added");
  assert.match(filled, /the scope above, through this role's expertise/, "the no-lenses default follows the scope");
  assert.match(filled, /covers ONLY: the auth flow/, "the topic is the binding scope");
  assert.match(filled, /operation: audit/, "the commit example names the operation");
  assert.doesNotMatch(filled, /threat modeling/, "role skills absent when none");
});

test("fillRoleTemplate refuses a missing role", () => {
  assert.throws(() => fillRoleTemplate(), /needs a role/, "no role throws");
});

const PERSONA = (id) =>
  [
    `---`,
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

test("loadPersonaCatalog reads, validates and orders persona files", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-personas-"));
  writeFileSync(join(dir, "b.md"), PERSONA("b"));
  writeFileSync(join(dir, "a.md"), PERSONA("a"));
  writeFileSync(join(dir, "notes.txt"), "not a persona");

  const { roles, problems } = loadPersonaCatalog(dir);

  assert.deepEqual(
    roles.map((entry) => entry.id),
    ["a", "b"],
    "files sort by name and non-md is ignored",
  );
  assert.deepEqual(problems, [], "no problems with well-formed files");
  rmSync(dir, { recursive: true, force: true });
});

test("loadPersonaCatalog reports missing, unreadable, invalid and mismatched files", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-personas-bad-"));
  writeFileSync(join(dir, "broken.md"), "no frontmatter at all");
  writeFileSync(join(dir, "invalid.md"), PERSONA("invalid").replace("yearsOfExperience: 3", "yearsOfExperience: zero"));
  writeFileSync(join(dir, "mismatch.md"), PERSONA("different-id"));

  const { roles, problems } = loadPersonaCatalog(dir);
  assert.equal(roles.length, 0, "nothing valid to load");
  assert.equal(problems.length, 3, "every broken file names its problem");
  assert.match(problems[0].reason, /id must be/, "a non-persona file is refused on its empty role");
  assert.match(problems[1].reason, /yearsOfExperience/, "an invalid role is reported");
  assert.match(problems[2].reason, /does not match the file name/, "an id mismatch is reported");
  rmSync(dir, { recursive: true, force: true });
});

test("loadPersonaCatalog reports a missing and an unreadable directory", () => {
  const missing = loadPersonaCatalog(join(tmpdir(), "rule-personas-absent-"));
  assert.equal(missing.roles.length, 0, "no roles from nowhere");
  assert.match(missing.problems[0].reason, /does not exist/, "the missing dir is named");
});
