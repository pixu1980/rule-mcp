/**
 * Personas resolve through the same three layers as skills (ADR 089), and the
 * machine owner has the last word: native, then project, then user.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-persona-home-"));
const project = mkdtempSync(join(tmpdir(), "rule-persona-project-"));

process.env.RULE_MCP_HOME = home;
mkdirSync(join(project, ".git"), { recursive: true });

const { loadRoleOverlays } = await import("../_overlays.js");
const { allRoles, roleById } = await import("../roles/index.js");

test.after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(project, { recursive: true, force: true });
});

/** Write a persona file into one layer's directory. */
function persona(dir, id, role, years = 5) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${id}.md`),
    `---\nid: "${id}"\nrole: "${role}"\nyearsOfExperience: ${years}\nstatus: "active"\nversion: 1\nskills:\n  - "a skill"\n---\n\n# ${role}\n\n- a lens\n`,
  );
}

/** The role a caller would get for an id, overlays applied. */
function resolved(id) {
  const { roles } = loadRoleOverlays({ projectDir: project });

  return roleById(id, roles);
}

test("with no layers the embedded persona answers", () => {
  assert.equal(resolved("security").role, "Security Engineer", "the bundled catalog is the native layer");
  assert.equal(resolved("security").layer, undefined, "an embedded role carries no overlay layer");
});

test("a project persona overrides the embedded one, wholesale", () => {
  persona(join(project, ".rule-mcp", "personas"), "security", "Project Security Engineer", 12);

  const role = resolved("security");
  assert.equal(role.role, "Project Security Engineer", "the repository's own persona wins over the bundled one");
  assert.equal(role.yearsOfExperience, 12, "every field comes from the layer that won");
  assert.equal(role.layer, "project", "and the role says which layer that was");
});

test("the machine owner overrides the project", () => {
  persona(join(home, "personas"), "security", "My Security Engineer", 30);

  const role = resolved("security");
  assert.equal(role.role, "My Security Engineer", "no repository overrides the user");
  assert.equal(role.layer, "user");
});

test("a persona only the project ships is added, not just substituted", () => {
  persona(join(project, ".rule-mcp", "personas"), "house-style", "House Style Reviewer");

  const role = resolved("house-style");
  assert.ok(role, "a project can bring a persona the server never shipped");
  assert.equal(role.layer, "project");
  assert.ok(
    allRoles(loadRoleOverlays({ projectDir: project }).roles).some((entry) => entry.id === "house-style"),
    "and it joins the catalog every surface is generated from",
  );
});

test("a persona that does not validate is reported, and the layer below still answers", () => {
  const dir = join(project, ".rule-mcp", "personas");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "privacy.md"), '---\nid: "privacy"\nrole: ""\n---\n\nbroken\n');

  const { roles, problems } = loadRoleOverlays({ projectDir: project });

  assert.ok(
    problems.some((problem) => problem.file.endsWith("privacy.md")),
    `the broken file is named: ${JSON.stringify(problems)}`,
  );
  assert.equal(roleById("privacy", roles).role, "Privacy and Compliance Engineer", "the embedded persona still answers");
});
