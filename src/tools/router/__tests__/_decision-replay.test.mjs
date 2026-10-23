// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** The opt-in L3 replay returns the chosen cached core before compute; off it computes. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "pix-decision-replay-"));

process.env.PIX_GALAXY_MCP_STATE_DIR = stateDir;
process.env.PIX_GALAXY_MCP_NO_SYNC_GUARD = "1";
process.env.PIX_GALAXY_MCP_SKILL_UNIVERSE = "base";
process.env.PIX_GALAXY_MCP_DECISION_CACHE_REPLAY = "1";
process.env.PIX_GALAXY_MCP_DECISION_MODEL = "laya";
process.env.PIX_GALAXY_MCP_DECISION_TIMEOUT = "1000";
delete process.env.PIX_GALAXY_MCP_DECISION_CACHE_SHADOW;
delete process.env.PIX_GALAXY_MCP_NO_CACHE;

const { loadAllSkills } = await import("../../../core/skills/index.js");
const { callTool } = await import("../index.js");
const { cacheClear, cacheStore } = await import("../../../core/cache/tool-cache/index.js");
const { clearShadows, readShadows } = await import("../../../core/cache/tool-cache/_decision-shadow.js");
const { clearDecisionCache } = await import("../../../core/decision/_cache.js");
const { resetDecisionRuntime } = await import("../../../core/decision/_runtime.js");
const { startFakeServer } = await import("../../../core/decision/__tests__/fixtures/_fake-server.mjs");

await loadAllSkills(true);

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.PIX_GALAXY_MCP_STATE_DIR;
  delete process.env.PIX_GALAXY_MCP_DECISION_CACHE_REPLAY;
  delete process.env.PIX_GALAXY_MCP_DECISION_MODEL;
  delete process.env.PIX_GALAXY_MCP_DECISION_URL;
  delete process.env.PIX_GALAXY_MCP_DECISION_TIMEOUT;
});

function result(route) {
  return { content: [{ type: "text", text: JSON.stringify({ route, replayed: true }) }] };
}

async function scriptedServer() {
  return startFakeServer(({ url, body }) => {
    if (url !== "/v1/systemone") {
      return { body: { data: [] } };
    }

    const criteria = Object.keys(body.questions.pick.criteria);
    const pick = criteria[0];

    return {
      body: {
        answers: { pick: { choice: pick, probabilities: { [pick]: 0.95 } } },
        usage: { input_tokens: 12 },
      },
    };
  });
}

test("the replay returns the chosen cached core before compute", async () => {
  cacheClear();
  clearShadows();
  clearDecisionCache();
  resetDecisionRuntime();
  cacheStore("pix_tool", { prompt: "create a react button", framework: "react" }, result("pix-frontend-react"), {});
  const server = await scriptedServer();
  process.env.PIX_GALAXY_MCP_DECISION_URL = server.url;

  try {
    const response = await callTool("pix_tool", { prompt: "create a react form component", framework: "react" });
    const parsed = JSON.parse(response.content[0].text);

    assert.equal(parsed.replayed, true, "the cached core answered, not a fresh compute");
    assert.equal(response._meta?.pixCache?.tier, "decision");
    assert.equal(response._meta?.pixCache?.choice, "candidate-1");
    assert.equal(response._meta?.pixCache?.probability, 0.95);
    assert.deepEqual(readShadows(), [], "replay mode does not also shadow");
    assert.equal(server.count > 0, true);
  } finally {
    await server.close();
  }
});

test("with the replay flag off the same live prompt computes and hides the sentinel", async () => {
  delete process.env.PIX_GALAXY_MCP_DECISION_CACHE_REPLAY;

  const response = await callTool("pix_tool", { prompt: "create a react form component", framework: "react" });
  const parsed = JSON.parse(response.content[0].text);

  assert.equal(parsed.replayed, undefined);
  assert.equal(response._meta?.pixCache, undefined);
});
