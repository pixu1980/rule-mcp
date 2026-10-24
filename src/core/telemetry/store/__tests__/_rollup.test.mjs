/** The daily rollup: empty folds, today-skip, merges, and failing writes. */
import { strict as assert } from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";

import { eventsFile, readRollups, rollup, rollupFile } from "../index.js";
import { withHome as withHomePrefix } from "../../../../shared/_testkit.js";

const PREV_HOME = process.env.RULE_MCP_HOME;
const DAY = 86_400_000;
const NOW = 1_760_000_000_000;

/** Write a file next to the events log, creating parents like ensureDirectory would. */
function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/** Point RULE_MCP_HOME at a fresh temp dir for one scenario. */
function withHome(fn) {
  return withHomePrefix(fn, "rule-mcp-store-");
}

test.after(() => {
  if (PREV_HOME === undefined) {
    delete process.env.RULE_MCP_HOME;
  } else {
    process.env.RULE_MCP_HOME = PREV_HOME;
  }
});

const dayOf = (ts) => new Date(ts).toISOString().slice(0, 10);

test("readRollups tolerates a missing, malformed or non-array rollup file", () => {
  withHome(() => {
    assert.deepEqual(readRollups(), [], "no rollup file means no rollups");
    write(rollupFile(), "{ not json");
    assert.deepEqual(readRollups(), [], "malformed JSON reads as empty");
    write(rollupFile(), JSON.stringify({ date: "2026-01-01" }));
    assert.deepEqual(readRollups(), [], "a non-array rollup reads as empty");
    write(rollupFile(), JSON.stringify([{ date: "2026-01-01", calls: 1 }]));
    assert.equal(readRollups()[0].calls, 1, "an array rollup reads back");
  });
});

test("rollup returns zero days with no events and skips today's events", () => {
  withHome(() => {
    assert.deepEqual(rollup({ now: NOW }), { days: 0 }, "no events means no days");
    assert.deepEqual(rollup(), { days: 0 }, "the now option defaults to the clock");

    write(eventsFile(), [JSON.stringify({ tool: "rule_tool", ts: NOW + 1000 }), JSON.stringify({ tool: "rule_tool" }), ""].join("\n"));
    assert.deepEqual(rollup({ now: NOW + 2000 }), { days: 0 }, "today's and timestamp-less events are still accumulating");
  });
});

test("rollup folds errors, cache hits, tool names and missing fields from old events", () => {
  withHome(() => {
    const dayAts = NOW - 2 * DAY;
    const dayBts = NOW - 3 * DAY;
    const lines =
      [
        { tool: "a", ts: dayAts, ok: false, cacheHit: true, saved: { compression: 10 }, estimatedRouting: 100 },
        { tool: "a", ts: dayAts + 1, ok: true, cacheHit: false, saved: { zeroed: 0 } },
        { tool: "b", ts: dayBts, ok: true },
      ]
        .map((event) => JSON.stringify(event))
        .join("\n") + "\n";
    write(eventsFile(), lines);

    const days = rollup({ now: NOW });
    assert.equal(days.days, 2, "two distinct old days fold");

    const byDate = Object.fromEntries(readRollups().map((day) => [day.date, day]));
    const dayA = byDate[dayOf(dayAts)];
    const dayB = byDate[dayOf(dayBts)];
    assert.equal(dayA.calls, 2, "both events on the day count");
    assert.equal(dayA.errors, 1, "the failing call counts as an error");
    assert.equal(dayA.cacheHits, 1, "the cache hit counts");
    assert.equal(dayA.savedTokens, 10, "only numeric savings count");
    assert.equal(dayA.estimatedTokens, 100, "estimated routing counts");
    assert.equal(dayA.byTool.a, 2, "the tool counter aggregates");
    assert.equal(dayB.calls, 1, "the second day has its own line");
  });
});

test("rollup merges a previously rolled date instead of replacing it", () => {
  withHome(() => {
    const yesterday = NOW - 2 * DAY;
    write(rollupFile(), JSON.stringify([{ date: dayOf(yesterday), calls: 5, errors: 0 }], null, 2));
    write(eventsFile(), JSON.stringify({ tool: "b", ts: yesterday }) + "\n");

    rollup({ now: NOW });

    const [merged] = readRollups();
    assert.equal(merged.calls, 6, "new events add to the existing aggregate");
    assert.deepEqual(merged.byTool, { b: 1 }, "a previous aggregate without tool counters is tolerated");
  });
});

test("rollup unions tool counters with a previously rolled date", () => {
  withHome(() => {
    const yesterday = NOW - 2 * DAY;
    write(rollupFile(), JSON.stringify([{ date: dayOf(yesterday), calls: 5, errors: 0, byTool: { a: 5 } }], null, 2));
    write(eventsFile(), JSON.stringify({ tool: "b", ts: yesterday }) + "\n");

    rollup({ now: NOW });

    const [merged] = readRollups();
    assert.equal(merged.calls, 6, "new events add to the existing aggregate");
    assert.deepEqual(merged.byTool, { a: 5, b: 1 }, "existing and new tool counters union");
  });
});

test("rollup tolerates an unwritable or directory rollup target", () => {
  withHome((home) => {
    writeFileSync(join(home, "blocker"), "file, not dir", "utf8");
    process.env.RULE_MCP_HOME = join(home, "blocker");
    assert.deepEqual(rollup({ now: NOW }), { days: 0 }, "no project dir means no writable events");
  });

  withHome(() => {
    write(eventsFile(), JSON.stringify({ tool: "a", ts: NOW - 2 * DAY }) + "\n");
    mkdirSync(rollupFile(), { recursive: true });
    assert.deepEqual(rollup({ now: NOW }), { days: 1 }, "a failing rollup write does not throw");
  });
});
