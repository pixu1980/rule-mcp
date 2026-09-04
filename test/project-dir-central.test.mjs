/**
 * Everything this server records about a project lives under the state
 * directory, and nothing lives in the project.
 *
 * `./.rule-mcp/` (and the local `./.rule-mcp/` layout) was a
 * directory in repositories the server recorded, kept out of git by a rule the
 * hooks re-asserted on every checkout. It is all under the central projects
 * root now, and the migration is what makes the change safe rather than lossy:
 * a recording that took months to accumulate is not something a refactor gets
 * to discard.
 *
 * Ported from rule-mcp (ADR 082) with the recorder name rebranded to the
 * rule layout and the legacy project directories widened to both names.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-central-home-"));
process.env.HOME = home; // homedir() reads it, so no new knob is needed
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { getProjectPaths, getRuntimePaths, migrateProjectData, projectSlug } = await import("../src/cli/paths.js");

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

/** @returns {string} the projects root, mirroring projectsRoot() in paths.js */
const projectsRoot = () => join(getRuntimePaths().stateDir, "projects");

/** A repository with a local recorder directory, the way one exists today. */
function legacyProject({ direction = ".rule-mcp", ignoreLine = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "rule-central-project-"));
  git(root, "init", "-q");
  mkdirSync(join(root, direction, "exports"), { recursive: true });
  writeFileSync(join(root, direction, "telemetry.jsonl"), '{"ts":1,"tool":"pix_tool"}\n');
  writeFileSync(join(root, direction, "project-id"), "kept-across-the-move\n");
  writeFileSync(join(root, direction, "exports", "one.flight"), '{"version":"2"}\n');
  writeFileSync(join(root, ".gitignore"), ignoreLine ? `node_modules\n${direction}/\n` : "node_modules\n");

  return root;
}

test("the recording lands under the state projects root, not in the project", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-central-plain-"));
  git(root, "init", "-q");
  const paths = getProjectPaths(root);

  assert.equal(paths.projectDir, root);
  assert.ok(paths.dir.startsWith(projectsRoot()), "the recording must live under the projects root");
  assert.ok(!paths.dir.startsWith(root), "nothing is recorded inside the project");
  assert.equal(paths.exportsDir, join(paths.dir, "exports"));
});

test("projectSlug names the project and its checkout", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-central-slug-"));
  assert.match(projectSlug(join(root, "My App")), /^my-app-[0-9a-f]{8}$/);
  assert.notEqual(projectSlug(join(root, "My App")), projectSlug(join(root, "My App", "checkout")));
});

test("migrateProjectData moves a legacy recording out of the project", () => {
  const root = legacyProject();
  const before = getProjectPaths(root);
  const result = migrateProjectData({ projectDir: root });
  const after = getProjectPaths(root);

  assert.equal(result.migrated, true);
  assert.equal(after.dir, before.dir, "the destinations are the same dir");
  assert.equal(existsSync(join(root, ".rule-mcp")), false, "the local directory is gone");
  assert.equal(existsSync(join(after.dir, "telemetry.jsonl")), true, "the telemetry log moved");
  assert.equal(readFileSync(join(after.dir, "project-id"), "utf8"), "kept-across-the-move\n");
  assert.equal(existsSync(join(after.dir, "exports", "one.flight")), true, "exports move too");
  assert.ok(!readFileSync(join(root, ".gitignore"), "utf8").includes("rule-mcp"), "the ignore rule is dropped");
});

test("a second migrate is a no-op", () => {
  const root = legacyProject();
  migrateProjectData({ projectDir: root });
  assert.equal(migrateProjectData({ projectDir: root }).migrated, false);
});

test("the rule-named legacy directory migrates the same way", () => {
  const root = legacyProject({ direction: ".rule-mcp" });
  const result = migrateProjectData({ projectDir: root });
  assert.equal(result.migrated, true);
  assert.equal(existsSync(join(root, ".rule-mcp")), false);
  assert.equal(existsSync(join(getProjectPaths(root).dir, "telemetry.jsonl")), true);
});

test("a project with no legacy recorder has nothing to migrate", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-central-clean-"));
  git(root, "init", "-q");
  assert.equal(migrateProjectData({ projectDir: root }).migrated, false);
});
