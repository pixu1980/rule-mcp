

/**
 * computeGatewayCore's routing decisions: backend override, no-override
 * frontend, unknown-route fallback, multi-file verdicts and the code-only unit.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-gateway-core-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";
delete process.env.RULE_MCP_NO_CACHE;

let computeGatewayCore;

before(async () => {
  const { loadAllSkills } = await import("../../../core/skills/index.js");
  await loadAllSkills();
  // The gateway and the apply tool are registered at startup, not by the
  // catalog, so a test that drives them runs the same bootstrap.
  const { bootstrapCoreTools } = await import("../../_bootstrap.js");
  await bootstrapCoreTools();
  ({ computeGatewayCore } = await import("../index.js"));
});

const CLEAN = `/**
 * Sum two numbers.
 *
 * @param {number} a - First addend.
 * @param {number} b - Second addend.
 * @returns {number} The sum.
 */
export function sum(a, b) {
  const total = a + b;

  return total;
}
`;

test("a backend framework overrides a frontend route and names the original", async () => {
  const core = await computeGatewayCore({ prompt: "center a div with flexbox", framework: "express", path: "/tmp/x" }, null);

  assert.equal(core.effectiveRoute, "rule-backend-express", "express demands the backend domain");
  assert.equal(core.originalRoute, "rule-frontend", "the overridden route is named");
  assert.ok(core.evidence.length > 0, "the backend skill evidence is loaded");
});

test("a non-backend framework keeps the frontend route", async () => {
  const core = await computeGatewayCore({ prompt: "center a div with flexbox", framework: "react", path: "/tmp/x" }, null);

  assert.equal(core.effectiveRoute, "rule-frontend-react", "react stays on the frontend route");
  assert.equal(core.originalRoute, undefined, "no override means no original route");
  assert.ok(core.evidence.length > 0, "the frontend evidence is loaded");
  assert.doesNotMatch(core.evidence, /^Unknown tool/, "the evidence is not an error string");
});

test("a backend framework with a backend route does not override", async () => {
  const core = await computeGatewayCore({ prompt: "query the users table with joins", framework: "express", path: "/tmp/x" }, null);

  assert.equal(core.effectiveRoute, "rule-data-mysql", "the data route is kept as routed");
  assert.equal(core.originalRoute, undefined, "no frontend route to override");
});

test("an unroutable prompt falls back to the default check skill", async () => {
  const core = await computeGatewayCore({ prompt: "", framework: "react", path: "/tmp/x", code: CLEAN }, null);

  assert.equal(core.effectiveRoute, "unknown", "no route resolves");
  assert.equal(core.evidence, "", "no evidence without a primary skill");
  assert.deepEqual(core.matchedSections, [], "an unknown route carries no sections");
  assert.equal(core.checkResult.allPass, true, "clean code passes under the fallback skill");
});

test("no code and no files mean no guardrail verdict", async () => {
  const core = await computeGatewayCore({ prompt: "", framework: "react", path: "/tmp/x" }, null);

  assert.equal(core.checkResult, null, "nothing to check, no verdict");
  assert.equal(core.routeNextTools.length, 0, "an unknown route offers no next tools");
});

test("path and framework are optional on the routed call", async () => {
  const core = await computeGatewayCore({ prompt: "center a div with flexbox", code: CLEAN }, null);

  assert.equal(core.effectiveRoute, "rule-frontend-react", "the route resolves without path or framework");
  assert.equal(core.checkResult.allPass, true, "the fallback vanilla check runs clean");
});

test("a failing code-only unit carries no file label", async () => {
  const core = await computeGatewayCore(
    { prompt: "center a div with flexbox", framework: "react", path: "/tmp/x", code: "/** Doc. */\nexport const x = 1; // \u2013 stray em dash" },
    null,
  );

  assert.equal(core.checkResult.allPass, false, "the inline code fails");
  assert.equal(core.checkResult.failed[0]?.file, undefined, "a code-only unit has no file name");
});

test("multifile verdicts carry per-file failure labels", async () => {
  const dirty = "/** Doc. */\nexport const x = 1; // \u2013 stray em dash";

  const core = await computeGatewayCore({ prompt: "center a div with flexbox", framework: "react", path: "/tmp/x" }, [
    { path: "src/sum.js", content: CLEAN },
    { path: "src/dirty.js", content: dirty },
  ]);

  assert.equal(core.checkResult.allPass, false, "the dirty file fails");
  assert.equal(core.checkResult.failCount, 1, "exactly one unit fails");
  assert.equal(core.checkResult.failed[0]?.file, "src/dirty.js", "the failing unit is named by path");
});
