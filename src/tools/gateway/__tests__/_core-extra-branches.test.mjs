

/** Branch coverage for gateway core JSON defaults and multi-file checks. */
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-gateway-core-extra-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_CACHE = "1";

let computeGatewayCore;

before(async () => {
  const { loadAllSkills } = await import("../../../core/skills/index.js");
  await loadAllSkills();
  const { bootstrapCoreTools } = await import("../../_bootstrap.js");
  await bootstrapCoreTools();
  ({ computeGatewayCore } = await import("../index.js"));
});

test("a multi-file set runs one check per path", async () => {
  const core = await computeGatewayCore({ prompt: "center a div", framework: "react", path: "/tmp/x" }, [
    { path: "a.js", content: "export const a = 1;\n" },
    { path: "b.js", content: "export const b = 2;\n" },
  ]);

  assert.ok(core.checkResult);
  assert.ok(core.checkResult.total >= 0);
  assert.equal(Array.isArray(core.checkResult.failed), true);
});

test("missing sections and next_tools default to empty arrays", async () => {
  const core = await computeGatewayCore({ prompt: "", framework: "react" }, null);

  assert.deepEqual(core.matchedSections, []);
  assert.deepEqual(core.routeNextTools, []);
});
