

/** The check and search tools: unknown skills, clean and failing verdicts. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { before, test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-skilltool-"));
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_CACHE = "1";

const { callTool } = await import("../../router/index.js");

before(async () => {
  const { loadAllSkills } = await import("../../../core/skills/index.js");
  await loadAllSkills();
});

test("check refuses an unknown skill with the available list", async () => {
  const result = await callTool("rule_tool_check", { skill: "rule-mcp-skill-that-does-not-exist", code: "x" });
  assert.equal(result.isError, true, "an unknown skill errors");
  assert.match(result.content[0].text, /Unknown skill/, "the error names the skill");
});

test("check passes clean code and fails violations", async () => {
  const cleanCode = "/** Doc. */\nexport const a = 1;\n";
  const pass = await callTool("rule_tool_check", { skill: "rule-mcp-styleguide-javascript", code: cleanCode });
  assert.match(pass.content[0].text, /pass/, "the verdict line renders");
  assert.equal(pass.isError, false, "a passing check is not an error");

  const dirty = await callTool("rule_tool_check", { skill: "rule-mcp-styleguide-javascript", code: "const a = 1; // \u2013 em dash" });
  assert.equal(dirty.isError, true, "a violating check errors");
  assert.match(dirty.content[0].text, /FAIL/, "the failing count renders");
  assert.match(dirty.content[0].text, /ai-no-emdash|em-dash|em dash/i, "the failing rule is named");
  assert.ok(dirty._meta?.ruleGuardrails, "the machine-readable report travels");
});

test("search answers without an index build via the fallback path", async () => {
  const result = await callTool("rule_tool_search", { query: "flex layout helpers" });
  assert.ok(!result.isError, "a search never errors");
  assert.ok(Array.isArray(result.content), "the search returns content");
});

test("check in project mode skips without a graph instead of failing", async () => {
  const box = mkdtempSync(join(tmpdir(), "rule-mcp-project-check-"));

  try {
    const result = await callTool("rule_tool_check", { skill: "rule-mcp-styleguide-javascript", mode: "project", projectDir: box });
    const text = result.content[0].text;

    assert.match(text, /Project guardrails/);
    assert.match(text, /skipped/i, "without a graph the checks are skipped, not failed");
    assert.equal(result.isError, false, "a skipped check is not a failure");
  } finally {
    rmSync(box, { recursive: true, force: true });
  }
});

test("semantic mode is skipped without an endpoint and advisory with one", async () => {
  const { resetDecisionRuntime } = await import("../../../core/decision/_runtime.js");
  const { startFakeServer } = await import("../../../core/decision/__tests__/fixtures/_fake-server.mjs");
  const names = ["RULE_MCP_DECISION_MODEL", "RULE_MCP_DECISION_URL", "RULE_MCP_DECISION_TIMEOUT"];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const code = 'throw new Error("Failed");\n';

  try {
    delete process.env.RULE_MCP_DECISION_MODEL;
    resetDecisionRuntime();

    const off = await callTool("rule_tool_check", { skill: "rule-mcp-process-ai", mode: "semantic", code });

    assert.equal(off.isError, false);
    assert.match(off.content[0].text, /skipped/i);
    assert.doesNotMatch(off.content[0].text, /semantic-error-message-actionable/);

    const server = await startFakeServer(({ url }) =>
      url === "/v1/systemone" ? { body: { answers: { message: { noul: 0.1 } }, usage: { input_tokens: 12 } } } : { body: { data: [] } },
    );

    try {
      process.env.RULE_MCP_DECISION_MODEL = "laya";
      process.env.RULE_MCP_DECISION_URL = server.url;
      process.env.RULE_MCP_DECISION_TIMEOUT = "1000";
      resetDecisionRuntime();

      const on = await callTool("rule_tool_check", { skill: "rule-mcp-process-ai", mode: "semantic", code });

      assert.equal(on.isError, false, "an advisory never fails the check");
      assert.match(on.content[0].text, /semantic-error-message-actionable/);
      assert.match(on.content[0].text, /0\.10/, "the model's probability reaches the report");
    } finally {
      await server.close();
    }
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }

    resetDecisionRuntime();
  }
});
