/**
 * Everything this server records about a project lives under the state
 * directory, and nothing lives in the project.
 *
 * Project recordings are kept under the central projects root
 * (`~/.rule-mcp/projects/<project-slug>`), keyed by repository name and
 * checkout digest, so a cache hit rate averaged over every repository answers
 * nothing and a benchmark export belongs next to the code it benchmarked.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-mcp-central-home-"));
process.env.HOME = home; // homedir() reads it, so no new knob is needed
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { getProjectPaths, getRuntimePaths, projectSlug } = await import("../index.js");

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

/** @returns {string} the projects root, mirroring projectsRoot() in paths.js */
const projectsRoot = () => join(getRuntimePaths().homeDir, "projects");

test("the recording lands under the state projects root, not in the project", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-central-plain-"));
  git(root, "init", "-q");
  const paths = getProjectPaths(root);

  assert.equal(paths.projectDir, root);
  assert.ok(paths.dir.startsWith(projectsRoot()), "the recording must live under the projects root");
  assert.ok(!paths.dir.startsWith(root), "nothing is recorded inside the project");
  assert.equal(paths.exportsDir, join(paths.dir, "exports"));
});

test("projectSlug names the project and its checkout", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-central-slug-"));
  assert.match(projectSlug(join(root, "My App")), /^my-app-[0-9a-f]{8}$/);
  assert.notEqual(projectSlug(join(root, "My App")), projectSlug(join(root, "My App", "checkout")));
});
