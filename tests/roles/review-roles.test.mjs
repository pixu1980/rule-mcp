/**
 * Personas plan A.1-A.3: the role registry, its overlays, and the template.
 *
 * A role is data. These tests pin the three properties every surface depends
 * on: the catalog is valid, an overlay replaces an entry wholesale without
 * being able to break the load, and one role fills the template the same way
 * every time.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { activeRoles, allRoles, EMBEDDED_ROLES, roleById, validateRole } from "../../src/core/review/_roles.js";

test("every embedded role is valid", () => {
  for (const role of EMBEDDED_ROLES) {
    assert.deepEqual(validateRole(role), [], `${role.id} must validate`);
  }
  assert.equal(new Set(EMBEDDED_ROLES.map((r) => r.id)).size, EMBEDDED_ROLES.length, "ids are unique");
});

test("the catalog ships the agreed active set", () => {
  const active = activeRoles()
    .map((role) => role.id)
    .sort();
  assert.deepEqual(active, [
    "a11y",
    "ai",
    "architect",
    "auth",
    "backend",
    "data",
    "design-system",
    "devops",
    "devx",
    "docs",
    "frontend",
    "i18n",
    "performance",
    "privacy",
    "qa",
    "security",
    "simplicity",
    "supply-chain",
  ]);
  assert.equal(
    allRoles().length,
    EMBEDDED_ROLES.length,
    "the catalog is exactly the adopted original set - nothing else rides along",
  );
});

test("validateRole rejects what a surface cannot generate from", () => {
  assert.ok(
    validateRole({ id: "Bad Id", role: "x", yearsOfExperience: 1, skills: ["a"], status: "active", version: 1 }).some(
      (p) => p.includes("kebab-case"),
    ),
  );
  assert.ok(
    validateRole({ id: "ok", role: "", yearsOfExperience: 1, skills: ["a"], status: "active", version: 1 }).length > 0,
  );
  assert.ok(
    validateRole({ id: "ok", role: "R", yearsOfExperience: 0, skills: ["a"], status: "active", version: 1 }).length > 0,
  );
  assert.ok(
    validateRole({ id: "ok", role: "R", yearsOfExperience: 1, skills: [], status: "active", version: 1 }).length > 0,
  );
  assert.ok(
    validateRole({ id: "ok", role: "R", yearsOfExperience: 1, skills: ["a"], status: "retired", version: 1 }).length >
      0,
  );
  assert.ok(
    validateRole({ id: "ok", role: "R", yearsOfExperience: 1, skills: ["a"], status: "deprecated", version: 1 }).some(
      (problem) => problem.includes("deprecatedBy"),
    ),
    "a deprecated role must say what replaces it",
  );
});

test("a deprecated role leaves the surfaces but keeps its entry", () => {
  const overlay = [{ ...roleById("security"), status: "deprecated", deprecatedBy: "architect", version: 2 }];
  assert.equal(
    activeRoles(overlay).some((role) => role.id === "security"),
    false,
    "deprecated roles are not generated",
  );
  assert.equal(roleById("security", overlay)?.status, "deprecated", "the entry survives for its documents");
});

test("an overlay replaces an entry wholesale, by id", async () => {
  const { loadRoleOverlays } = await import("../../src/core/review/_overlays.js");
  const home = mkdtempSync(join(tmpdir(), "rule-roles-user-"));
  try {
    mkdirSync(join(home, "config", "roles"), { recursive: true });
    // Only the user's layer remains: a project layer read roles out of a
    // checkout, which is why it needed a trust gate, and both are gone (ADR 082).
    // Overlays use the same persona-file format as the embedded catalog.
    const { formatPersonaFile } = await import("../../src/core/review/_persona-file.js");
    const replacement = { ...roleById("performance"), version: 2, yearsOfExperience: 11 };
    writeFileSync(join(home, "config", "roles", "performance.md"), formatPersonaFile(replacement));

    const { roles, problems } = loadRoleOverlays({ home });
    assert.deepEqual(problems, [], "a valid overlay loads without complaint");

    const merged = roleById("performance", roles);
    assert.equal(merged.yearsOfExperience, 11, "the user's own entry wins over the embedded one");
    assert.equal(merged.version, 2);
    assert.equal(merged.layer, "user", "and it says where it came from");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("an invalid or unreadable overlay is reported, never fatal", async () => {
  const { loadRoleOverlays } = await import("../../src/core/review/_overlays.js");
  const home = mkdtempSync(join(tmpdir(), "rule-roles-bad-"));
  try {
    mkdirSync(join(home, "config", "roles"), { recursive: true });
    writeFileSync(join(home, "config", "roles", "broken.md"), "---\nnot a persona file");
    writeFileSync(join(home, "config", "roles", "invalid.md"), '---\nid: "X X"\nrole: ""\n---\n');
    const { roles, problems } = loadRoleOverlays({ home, projectDir: home });
    assert.equal(roles.length, 0, "nothing invalid enters the registry");
    assert.equal(problems.length, 2, "both files are reported");
    assert.ok(problems.every((problem) => problem.file && problem.reason));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("the template is filled verbatim from the role", async () => {
  const { fillRoleTemplate } = await import("../../src/core/review/_template.js");
  const filled = fillRoleTemplate(roleById("security"));
  assert.ok(!filled.includes("{{"), "no placeholder survives");
  assert.match(filled, /Security Engineer/);
  assert.match(filled, /25 years of experience/, "the template stays in the wording the user wrote");
  assert.match(filled, /application security/);
  assert.match(filled, /docs\/audits\/security\.md/, "the operation contract names the trio");
  assert.match(filled, /docs\/reviews\/security\.md/);
  assert.match(filled, /docs\/plans\/security\.md/);
  assert.match(filled, /rule-backend-security/, "evidence skills are named");
  assert.match(filled, /interview mode/, "interview mode survives the translation");
  assert.match(
    filled,
    /rule_tool_plan_docs/,
    "the contract names the helper that does the bookkeeping, or the agent is left to remember it",
  );
});

test("the filled template is byte-stable", async () => {
  const { fillRoleTemplate } = await import("../../src/core/review/_template.js");
  assert.equal(fillRoleTemplate(roleById("a11y")), fillRoleTemplate(roleById("a11y")));
});

test("overrides refine a role without editing the registry", async () => {
  const { fillRoleTemplate } = await import("../../src/core/review/_template.js");
  const filled = fillRoleTemplate(roleById("privacy"), {
    years: 33,
    skills: ["ePrivacy"],
    topic: "the flight recorder",
  });
  assert.match(filled, /33 years of experience/);
  assert.match(filled, /ePrivacy/);
  assert.match(filled, /the flight recorder/);
});
