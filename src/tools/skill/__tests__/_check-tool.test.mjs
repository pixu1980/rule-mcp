

/** The check and search tools: unknown skills, clean and failing verdicts. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { before, test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-skilltool-"));
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { callTool } = await import("../../router/index.js");

before(async () => {
  const { loadAllSkills } = await import("../../../core/skills/index.js");
  await loadAllSkills();
});

test("check refuses an unknown skill with the available list", async () => {
  const result = await callTool("rule_tool_check", { skill: "rule-skill-that-does-not-exist", code: "x" });
  assert.equal(result.isError, true, "an unknown skill errors");
  assert.match(result.content[0].text, /Unknown skill/, "the error names the skill");
});

test("check passes clean code and fails violations", async () => {
  const cleanCode = "/** Doc. */\nexport const a = 1;\n";
  const pass = await callTool("rule_tool_check", { skill: "rule-styleguide-javascript", code: cleanCode });
  assert.match(pass.content[0].text, /pass/, "the verdict line renders");
  assert.equal(pass.isError, false, "a passing check is not an error");

  const dirty = await callTool("rule_tool_check", { skill: "rule-styleguide-javascript", code: "const a = 1; // \u2013 em dash" });
  assert.equal(dirty.isError, true, "a violating check errors");
  assert.match(dirty.content[0].text, /FAIL/, "the failing count renders");
  assert.match(dirty.content[0].text, /fp-no-emdash|em-dash|em dash/i, "the failing rule is named");
  assert.ok(dirty._meta?.pixGuardrails, "the machine-readable report travels");
});

test("search answers without an index build via the fallback path", async () => {
  const result = await callTool("rule_tool_search", { query: "flex layout helpers" });
  assert.ok(!result.isError, "a search never errors");
  assert.ok(Array.isArray(result.content), "the search returns content");
});

test("check in project mode skips without a graph instead of failing", async () => {
  const box = mkdtempSync(join(tmpdir(), "rule-project-check-"));

  try {
    const result = await callTool("rule_tool_check", { skill: "rule-styleguide-javascript", mode: "project", projectDir: box });
    const text = result.content[0].text;

    assert.match(text, /Project guardrails/);
    assert.match(text, /skipped/i, "without a graph the checks are skipped, not failed");
    assert.equal(result.isError, false, "a skipped check is not a failure");
  } finally {
    rmSync(box, { recursive: true, force: true });
  }
});
