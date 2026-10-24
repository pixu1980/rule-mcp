/**
 * Layer resolution over real directories (ADR 089): which copy of a skill or a
 * persona answers, and which layer it came from.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-mcp-resolve-home-"));
const projectRoot = mkdtempSync(join(tmpdir(), "rule-mcp-resolve-project-"));

process.env.RULE_MCP_HOME = home;
mkdirSync(join(projectRoot, ".git"), { recursive: true });

const { resolvePersonaFiles, resolveSkillDirs } = await import("../_resolve.js");

test.after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(projectRoot, { recursive: true, force: true });
});

/** Write a SKILL.md into a layer's skills directory. */
function skill(base, name, frontmatter = "") {
  const dir = join(base, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\n${frontmatter}\n---\n\n# ${name}\n`);

  return dir;
}

/** Write a persona file into a layer's personas directory. */
function persona(base, id, role = "Tester") {
  const dir = join(base, "personas");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${id}.md`),
    `---\nid: "${id}"\nrole: "${role}"\nyearsOfExperience: 3\nstatus: "active"\nversion: 1\nskills:\n  - "testing"\n---\n\n# ${role}\n\n- a lens\n`,
  );
}

test("the bundled skills resolve as the native layer", () => {
  const resolved = resolveSkillDirs({ cwd: projectRoot });

  assert.ok(resolved.size > 80, `the bundled catalog resolves: ${resolved.size}`);
  assert.equal(resolved.get("rule-mcp-devops-docker").layer, "native");
  assert.ok(resolved.get("rule-mcp-devops-docker").dir.endsWith(join("skills", "rule-mcp-devops-docker")));
});

test("a project skill is added, and reports its layer", () => {
  skill(join(projectRoot, ".rule-mcp"), "rule-mcp-project-rules");

  const resolved = resolveSkillDirs({ cwd: projectRoot });
  const entry = resolved.get("rule-mcp-project-rules");

  assert.equal(entry.layer, "project", "a skill the repo ships is attributed to the repo");
  assert.equal(entry.meta.name, "rule-mcp-project-rules", "its frontmatter is parsed from the layer that won");
});

test("the user layer overrides the project layer, which overrides native", () => {
  skill(join(projectRoot, ".rule-mcp"), "rule-mcp-devops-docker", "description: from the project");

  assert.equal(resolveSkillDirs({ cwd: projectRoot }).get("rule-mcp-devops-docker").layer, "project", "the repo overrides what the server ships");

  skill(home, "rule-mcp-devops-docker", "description: from the user");

  const resolved = resolveSkillDirs({ cwd: projectRoot }).get("rule-mcp-devops-docker");
  assert.equal(resolved.layer, "user", "and the machine owner has the last word");
  assert.equal(resolved.meta.description, "from the user");
});

test("a directory with no SKILL.md is not a skill", () => {
  mkdirSync(join(home, "skills", "rule-mcp-not-a-skill"), { recursive: true });

  assert.equal(resolveSkillDirs({ cwd: projectRoot }).has("rule-mcp-not-a-skill"), false, "a folder without a SKILL.md declares nothing");
});

test("a custom skill need not be named rule-mcp-anything", () => {
  skill(home, "my-house-rules");

  const entry = resolveSkillDirs({ cwd: projectRoot }).get("my-house-rules");

  assert.ok(entry, "a custom layer is the user's namespace, not ours");
  assert.equal(entry.layer, "user");
});

test("personas resolve through the same layers", () => {
  const resolved = resolvePersonaFiles({ cwd: projectRoot });

  assert.ok(resolved.size >= 18, `the bundled personas resolve: ${resolved.size}`);
  assert.equal(resolved.get("security").layer, "native");

  persona(join(projectRoot, ".rule-mcp"), "security", "Project Security Engineer");
  assert.equal(resolvePersonaFiles({ cwd: projectRoot }).get("security").layer, "project");

  persona(home, "security", "My Security Engineer");
  const user = resolvePersonaFiles({ cwd: projectRoot }).get("security");
  assert.equal(user.layer, "user");
  assert.equal(user.role.role, "My Security Engineer", "the whole entry is replaced, not merged");
});

test("a persona that does not validate is reported and skipped", () => {
  const dir = join(home, "personas");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "broken.md"), '---\nid: "broken"\n---\n\nno role, no years\n');

  const resolved = resolvePersonaFiles({ cwd: projectRoot });

  assert.equal(resolved.has("broken"), false, "an invalid persona never reaches a prompt");
  assert.ok(
    resolved.problems.some((problem) => problem.file.endsWith("broken.md")),
    `the problem is reported: ${JSON.stringify(resolved.problems)}`,
  );
});

test("a missing layer directory is not a problem", () => {
  const bare = mkdtempSync(join(tmpdir(), "rule-mcp-resolve-bare-"));

  try {
    const resolved = resolveSkillDirs({ cwd: bare });

    assert.ok(resolved.size > 80, "the native layer still answers when no other layer exists");
    assert.deepEqual(resolved.problems, [], "an absent directory is the normal case, not a fault");
  } finally {
    rmSync(bare, { recursive: true, force: true });
  }
});
