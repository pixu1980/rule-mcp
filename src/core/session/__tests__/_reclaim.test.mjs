/** Telemetry retention/drain and the idle-reclaim policy. */
import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

const state = mkdtempSync(join(tmpdir(), "rule-retain-"));

test.before(() => {
  process.env.RULE_MCP_STATE_DIR = state;
});

test.after(() => {
  rmSync(state, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

const { maintain, purge, drain } = await import("../../../core/telemetry/store/index.js");
const { reclaimIfIdle, reclaimNow, touchActivity, idleFor, startIdleReclaim, stopIdleReclaim } = await import("../_reclaim.js");
const { cacheStore } = await import("../../../core/cache/tool-cache/index.js");
const { writeEvents } = await import("../../../core/telemetry/store/index.js");
const { eventsFile } = await import("../../../core/telemetry/store/index.js");

const DAY = 86_400_000;
const NOW = 1_760_000_000_000;

test("purge drops old events and keeps recent ones, and maintain rolls first", () => {
  const older = { tool: "a", ts: NOW - 8 * DAY };
  const recent = { tool: "a", ts: NOW - DAY };
  writeEvents([older, recent]);

  const result = purge({ now: NOW });
  assert.equal(result.removed, 1, "the too-old event is dropped");
  assert.equal(result.kept, 1, "the recent event stays");

  writeEvents([recent]);
  const maintained = maintain({ now: NOW });
  assert.deepEqual(maintained.kept, 1, "maintain keeps the same events");
});

test("drain empties the log and reports the count", () => {
  const eventFile = eventsFile();
  writeEvents([{ tool: "a", ts: NOW }]);
  const drained = drain();
  assert.equal(drained.removed, 1, "the log had one event");
  assert.ok(!existsSync(eventFile), "the events file is gone after drain");

  const again = drain();
  assert.equal(again.removed, 0, "draining an empty log reports zero");
});

test("reclaimIfIdle frees the heaps after a spell of silence", () => {
  touchActivity(NOW);
  assert.equal(reclaimIfIdle({ now: NOW + 10_000, idleMs: 60_000 }), null, "a busy server gives nothing");

  const freed = reclaimIfIdle({ now: NOW + 120_000, idleMs: 60_000 });
  assert.ok(freed, "an idle server reclaims");
  assert.equal(reclaimIfIdle({ now: NOW + 999_999, idleMs: 60_000 }), null, "reclaiming twice gives nothing");

  touchActivity(NOW + 300_000);
  assert.equal(reclaimIfIdle({ now: NOW + 300_001, idleMs: 60_000 }), null, "new activity resets the window");
});

test("reclaimNow frees even while busy and the timers are idempotent", () => {
  touchActivity(NOW);
  const freed = reclaimNow();
  assert.ok("index" in freed && "skills" in freed && "cacheEntries" in freed, "the freed counts are reported");

  assert.ok(idleFor(NOW) >= 0, "idle time is measurable");
  const timer = startIdleReclaim({ checkMs: 10, idleMs: 1 });
  stopIdleReclaim();
  clearTimeout(timer);
});
