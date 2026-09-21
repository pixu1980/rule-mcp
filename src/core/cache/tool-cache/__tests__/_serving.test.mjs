

/** End to end: rephrased prompts served from cache, tiers reported, aggregates rendered. */
import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { cacheClear, callTool, registerTool, result, stateDir } from "./_tiers.fixture.mjs";

const { loadAllSkills } = await import("../../../skills/index.js");
await loadAllSkills(true);

// ── End to end through callTool ──
test("a rephrased prompt is served from cache without recomputing", async () => {
  const { callTool: call } = await import("../../../../tools/router/index.js");
  cacheClear();

  const first = await call("pix_tool", { prompt: "angular standalone component with signals" });
  assert.equal(first._meta?.pixCache?.tier, undefined, "the first call computes");

  const second = await call("pix_tool", { prompt: "Angular standalone components with signals?" });
  assert.equal(second._meta?.pixCache?.tier, "normalized");
  assert.equal(second.content[0].text, first.content[0].text, "and returns the same answer");
});

test("the tier is reported to the caller at every tier", async () => {
  const { callTool: call } = await import("../../../../tools/router/index.js");
  cacheClear();

  const miss = await call("pix_tool", { prompt: "vue 3 composition api component" });
  assert.equal(miss._meta?.pixCache, undefined, "a miss says nothing");

  const exact = await call("pix_tool", { prompt: "vue 3 composition api component" });
  assert.equal(exact._meta?.pixCache?.tier, "exact");

  const normalized = await call("pix_tool", { prompt: "Vue 3: composition API components?" });
  assert.equal(normalized._meta?.pixCache?.tier, "normalized");
});

test("a tool outside the allowlist gets L0 and nothing else", async () => {
  cacheClear();
  let runs = 0;
  registerTool({
    name: "rule_tool_tier_probe",
    entry: "action",
    description: "A probe tool for the tier tests, long enough to satisfy the description rule.",
    inputSchema: { type: "object", properties: { prompt: { type: "string" } } },
    handler: async () => {
      runs += 1;
      return result(`ran ${runs}`);
    },
  });

  await callTool("rule_tool_tier_probe", { prompt: "react button component" });
  await callTool("rule_tool_tier_probe", { prompt: "react button component" });
  assert.equal(runs, 1, "an identical call still replays");

  await callTool("rule_tool_tier_probe", { prompt: "React button components?" });
  assert.equal(runs, 2, "a rephrasing recomputes, because the tool is not allowlisted");
});

// ── The entry path, which is what R8 is gated on ──

process.on("exit", () => rmSync(stateDir, { recursive: true, force: true }));
