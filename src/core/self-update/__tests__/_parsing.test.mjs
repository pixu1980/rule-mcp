

/** S3: interval env parsing - 0 checks every call, invalid and negative fall back to the default. */
import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";

import { fetchCount, makeClonePair, runScenario, upstreamOf } from "./_throttle.fixture.mjs";

console.log("self-update throttle test: interval parsing");

// ── S3a: interval 0 => check on every invocation ──
{
  const { clone, base } = makeClonePair();
  const upstream = upstreamOf(clone);
  const { logPath } = runScenario(
    clone,
    `
    await maybeSelfUpdate();
    await maybeSelfUpdate();
    process.stdout.write(JSON.stringify({ done: true }));
  `,
    { RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS: "0", RULE_MCP_UPDATE_REMOTE: upstream },
  );
  const fetches = fetchCount(logPath);
  assert.equal(fetches, 2, `interval 0 => every invocation fetches (got ${fetches})`);
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ interval 0 checks on every invocation");
}

// ── S3b: invalid interval => default 60s (throttled) ──
{
  const { clone, base } = makeClonePair();
  const upstream = upstreamOf(clone);
  const { logPath } = runScenario(
    clone,
    `
    await maybeSelfUpdate();
    await maybeSelfUpdate();
    process.stdout.write(JSON.stringify({ done: true }));
  `,
    { RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS: "abc", RULE_MCP_UPDATE_REMOTE: upstream },
  );
  const fetches = fetchCount(logPath);
  assert.equal(fetches, 1, `invalid interval => default throttle, single fetch (got ${fetches})`);
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ invalid interval falls back to the default (1 fetch)");
}

// ── S3c: negative interval => default 60s (throttled) ──
{
  const { clone, base } = makeClonePair();
  const upstream = upstreamOf(clone);
  const { logPath } = runScenario(
    clone,
    `
    await maybeSelfUpdate();
    await maybeSelfUpdate();
    process.stdout.write(JSON.stringify({ done: true }));
  `,
    { RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS: "-5", RULE_MCP_UPDATE_REMOTE: upstream },
  );
  const fetches = fetchCount(logPath);
  assert.equal(fetches, 1, `negative interval => default throttle, single fetch (got ${fetches})`);
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ negative interval falls back to the default (1 fetch)");
}

console.log("\nself-update throttle: all checks passed");
