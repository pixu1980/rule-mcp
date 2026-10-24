/** The multilingual model is outside the decision-cache gate. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-decision-model-gate-"));

process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_DECISION_MODEL = "julia";
delete process.env.RULE_MCP_NO_CACHE;
delete process.env.RULE_MCP_DECISION_CACHE_REPLAY;
delete process.env.RULE_MCP_DECISION_CACHE_SHADOW;

const { cacheClear, cacheStore } = await import("../index.js");
const { evaluateDecision } = await import("../_decision-evaluate.js");

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
  delete process.env.RULE_MCP_DECISION_MODEL;
});

test("the multilingual model is excluded from the cache gate", async () => {
  cacheClear();
  cacheStore("rule_tool", { prompt: "create a react button component" }, { content: [{ type: "text", text: JSON.stringify({ route: "rule-mcp-frontend-react" }) }] }, {});

  const evaluated = await evaluateDecision("rule_tool", { prompt: "create a react form component" });

  assert.equal(evaluated, null);
});
