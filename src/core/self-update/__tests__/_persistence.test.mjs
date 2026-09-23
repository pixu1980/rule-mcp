

/** ARCH-9 cont'd: the throttle window survives a restart instead of resetting to zero. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { fetchCount, makeClonePair, runScenario, upstreamOf } from "./_throttle.fixture.mjs";

console.log("self-update persistence test: the throttle survives a restart");

// ── the throttle window is honored across two separate processes sharing one home ──
{
  const { clone, base } = makeClonePair();
  const upstream = upstreamOf(clone);
  const home = mkdtempSync(join(tmpdir(), "rule-sut-shared-home-"));
  const environment = { RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS: "60", RULE_MCP_UPDATE_REMOTE: upstream, RULE_MCP_HOME: home };

  // First "process": nothing persisted yet, so this checks and writes the state.
  const first = runScenario(clone, `await maybeSelfUpdate();\nprocess.stdout.write(JSON.stringify({ done: true }));`, environment);

  assert.equal(fetchCount(first.logPath), 1, "the first process, with no persisted state, checks");

  // Second "process": fresh module state (a real restart), same home, well inside
  // the 60s interval. Without persistence this would check again because
  // _lastCheckAt resets to 0 on every new process.
  const second = runScenario(clone, `await maybeSelfUpdate();\nprocess.stdout.write(JSON.stringify({ done: true }));`, environment);

  assert.equal(fetchCount(second.logPath), 0, "a restart inside the interval must not re-check: the throttle was persisted");

  rmSync(base, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
  console.log("  ✅ a restart inside the interval honors the persisted throttle");
}

// ── a fresh home (no persisted state) always checks, same as before this existed ──
{
  const { clone, base } = makeClonePair();
  const upstream = upstreamOf(clone);
  const { logPath } = runScenario(clone, `await maybeSelfUpdate();\nprocess.stdout.write(JSON.stringify({ done: true }));`, {
    RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS: "60",
    RULE_MCP_UPDATE_REMOTE: upstream,
  });

  assert.equal(fetchCount(logPath), 1, "a fresh home with nothing persisted still checks on the first call");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ a fresh home (no persisted state) checks on the first call");
}
