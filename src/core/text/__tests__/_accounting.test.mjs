/** The accounting: the ratio is the measured saving, and the recorder books it. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { callTool, flush, projectDir, readEvents } from "./_efficacy.fixture.mjs";

test("the reported compression ratio is the measured saving, not the net shrink", async () => {
  const { computeKpi } = await import("../../telemetry/kpi/index.js");
  // The case that separates the two definitions: the reminder grew this result
  // by more than compression shrank it, so core-minus-final reports nothing
  // while 120 tokens were demonstrably removed.
  const kpi = computeKpi({
    events: [
      {
        ts: 1_760_000_000_000,
        session: "s",
        tool: "rule_tool_backend_node",
        coreTokens: 1200,
        finalTokens: 1260,
        saved: { compression: 120 },
      },
    ],
  });

  assert.equal(kpi.tokens.compressionRatio, 0.1, "the ratio must be what compression removed over what it was given");
  assert.equal(kpi.tokens.reminderOverhead, 60, "the reminder's net cost stays its own number");
});

test("the recorder books what compression removed, not what survives the reminder", async () => {
  process.chdir(projectDir);
  await callTool("rule_tool_backend_node", {});
  flush();

  const recorded = readEvents().filter((event) => event.tool === "rule_tool_backend_node" && !event.cacheHit);
  assert.ok(recorded.length > 0, "the call must have been recorded at all");
  assert.ok(
    recorded.some((event) => Number(event.saved?.compression) > 0),
    `savedBySource.compression must be positive on a prose result (got ${JSON.stringify(recorded.map((event) => event.saved))})`,
  );
});
