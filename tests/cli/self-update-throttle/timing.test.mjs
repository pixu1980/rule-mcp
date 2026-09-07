/** S1 + S2: the throttle re-arms after the interval, and never blocks the tool call. */
import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";

import { fetchCount, makeClonePair, runScenario, upstreamOf } from "./_throttle.fixture.mjs";

console.log("self-update throttle test: interval and non-blocking");

// ── S1: re-check after interval elapses (today: once per process) ──
{
  const { clone, base } = makeClonePair();
  const upstream = upstreamOf(clone);
  const { logPath } = runScenario(
    clone,
    `
    await maybeSelfUpdate();
    await new Promise((r) => setTimeout(r, 300));
    await maybeSelfUpdate();
    await new Promise((r) => setTimeout(r, 150));
    process.stdout.write(JSON.stringify({ done: true }));
  `,
    { RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS: "0.1", RULE_MCP_UPDATE_REMOTE: upstream },
  );
  const fetches = fetchCount(logPath);
  assert.equal(fetches, 2, `interval elapsed => a second invocation must fetch again (got ${fetches})`);
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ interval elapsed triggers a new fetch (not once-per-process)");
}

// ── S2: non-blocking - maybeSelfUpdate returns before the fetch completes ──
{
  const { clone, base } = makeClonePair();
  const upstream = upstreamOf(clone);
  const { out } = runScenario(
    clone,
    `
    const t0 = Date.now();
    const p = maybeSelfUpdate();
    const t1 = Date.now();
    process.stdout.write(JSON.stringify({ returnedMs: t1 - t0 }));
    await p;
  `,
    { RULE_MCP_GIT_SLEEP: "2", RULE_MCP_UPDATE_REMOTE: upstream }, // every git call takes 2s
  );
  assert.ok(out.returnedMs < 1500, `fire-and-forget: call returned in ${out.returnedMs}ms, must not block on the fetch`);
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ maybeSelfUpdate returns immediately (background check)");
}
