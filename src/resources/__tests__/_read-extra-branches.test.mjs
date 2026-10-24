/**
 * The resource arms that answer from a custom skill layer rather than the
 * bundled catalog: a project skill listed as a plugin, and an empty override
 * of the routing skill.
 *
 * Both are real layers of the resolution order (ADR 089), so the fixture is a
 * project directory carrying its own `.rule-mcp/skills`, never a stubbed module.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const originalCwd = process.cwd();
const project = mkdtempSync(join(tmpdir(), "rule-mcp-read-extra-"));

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-read-extra-state-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

for (const [name, body] of [
  ["team-lint", "---\nname: team-lint\ndescription: Runs the team linter.\n---\n\n# Team lint\n"],
  ["team-notes", "---\nname: team-notes\n---\n\n# Team notes\n"],
]) {
  mkdirSync(join(project, ".rule-mcp", "skills", name), { recursive: true });
  writeFileSync(join(project, ".rule-mcp", "skills", name, "SKILL.md"), body);
}

process.chdir(project);

const { serveResource } = await import("../_read.js");
const { clearSkillResolution } = await import("../../tools/router/index.js");

test.after(() => {
  process.chdir(originalCwd);
  rmSync(project, { recursive: true, force: true });
});

test("a project skill is a plugin row, with its own description or the documented fallback", async () => {
  const result = await serveResource("rulemcp://community");
  const community = JSON.parse(result.contents[0].text);

  assert.deepEqual(
    community.plugins.map((entry) => entry.name),
    ["team-lint", "team-notes"],
    "the bundled skills are skipped; only the project layer is foreign",
  );
  assert.deepEqual(
    community.plugins.map((entry) => entry.description),
    ["Runs the team linter.", "User-defined plugin skill"],
    "a SKILL.md without a description line gets the fallback instead of a blank row",
  );
  assert.equal(community.total, 2, "the total counts the plugin rows, not every resolved skill");
});

test("an empty override of the routing skill serves an empty body", async () => {
  mkdirSync(join(project, ".rule-mcp", "skills", "rule-mcp"), { recursive: true });
  writeFileSync(join(project, ".rule-mcp", "skills", "rule-mcp", "SKILL.md"), "");
  clearSkillResolution();

  const result = await serveResource("rulemcp://ai");

  assert.equal(result.contents[0].mimeType, "text/markdown", "the URI keeps its mime type");
  assert.equal(result.contents[0].text, "", "an override with no body serves nothing rather than failing");
});
