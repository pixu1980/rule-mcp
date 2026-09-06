/**
 * The two blind spots ADR 074 named as follow-ups.
 *
 * A cache hit went through the same decoration as a miss - compressed, then
 * given a reminder - and recorded neither end of it, so every token figure was
 * a lower bound on any session the cache answered. And `reminderOverhead` was
 * the difference between the two ends of post-processing, which nets the
 * reminder against the compression that ran in the same step: it read zero on
 * an 8-call session where the reminder had demonstrably cost 322 tokens.
 *
 * Both are measured at the step that does the work, which is where the numbers
 * become the thing they claim to be rather than a subtraction that survives.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-accounting-state-"));
const projectDir = realpathSync(mkdtempSync(join(tmpdir(), "rule-accounting-project-")));
mkdirSync(join(projectDir, ".git"), { recursive: true });
process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
// Every call has to re-anchor, or the calls under test carry no reminder at all.
process.env.RULE_MCP_REMINDER_EVERY = "1";
delete process.env.RULE_MCP_NO_CACHE;
delete process.env.RULE_MCP_NO_TELEMETRY;
delete process.env.RULE_MCP_NO_CAVEMAN;

const { computeKpi } = await import("../../src/core/telemetry/_kpi.js");
const { loadAllSkills } = await import("../../src/core/skills.js");
const { callTool } = await import("../../src/tools/router/index.js");
const { flush } = await import("../../src/core/telemetry/_telemetry.js");
const { readEvents } = await import("../../src/core/telemetry/_store.js");

await loadAllSkills();
process.chdir(projectDir);

// The same call twice: the first computes, the second is served by the cache.
await callTool("rule_tool_backend_node", {});
await callTool("rule_tool_backend_node", {});
flush();

const recorded = readEvents().filter((event) => event.tool === "rule_tool_backend_node");
const miss = recorded.find((event) => !event.cacheHit);
const hit = recorded.find((event) => event.cacheHit);

test("both calls were recorded, one as a miss and one as a hit", () => {
  assert.ok(miss, "the first call must be recorded as a miss");
  assert.ok(hit, `the second call must be served from the cache: ${JSON.stringify(recorded.map((e) => e.cacheTier))}`);
});

test("a cache hit reports what post-processing did to it", () => {
  assert.equal(typeof hit.coreTokens, "number", "a hit is decorated like a miss, so it is measured like one");
  assert.equal(typeof hit.finalTokens, "number");
  assert.ok(Number(hit.saved?.caveman) > 0, "the replayed result is compressed on the way out, and that is a saving");
});

test("the reminder's own cost is recorded, not left to a subtraction", () => {
  assert.ok(Number(miss.reminderTokens) > 0, "the call carried a reminder, so its cost is a number");
  assert.equal(
    Number(miss.finalTokens) - Number(miss.coreTokens) + Number(miss.saved.caveman),
    Number(miss.reminderTokens),
    "core, compression and reminder have to add up: final = core - compressed + reminder",
  );
});

test("reminderOverhead is the reminder, even when compression removed more than it added", () => {
  const kpi = computeKpi({
    events: [
      {
        ts: 1,
        session: "s",
        tool: "pix_tool",
        coreTokens: 1000,
        finalTokens: 980,
        reminderTokens: 60,
        saved: { caveman: 80 },
      },
    ],
  });

  assert.equal(kpi.tokens.reminderOverhead, 60, "the net shrink of 20 tokens must not hide a reminder that cost 60");
  assert.equal(kpi.tokens.cavemanRatio, 0.08, "and compression keeps reporting what it removed");
});

test("a log written before the field existed still reports something honest", () => {
  const kpi = computeKpi({
    events: [{ ts: 1, session: "s", tool: "pix_tool", coreTokens: 1000, finalTokens: 1130 }],
  });

  assert.equal(kpi.tokens.reminderOverhead, 130, "with nothing measured, the net growth is the best available answer");
});

// ── What a cache hit actually saves ──

test("a hit reports the output it replayed, not a token saving", () => {
  assert.equal(hit.saved?.cache, undefined, "a replayed result saves no tokens: the model reads every one of them");
  assert.ok(Number(hit.replayedTokens) > 0, "what it did is serve that output without recomputing it");
});

test("measuredSaved counts only what was really saved", () => {
  const kpi = computeKpi({
    events: [
      { ts: 1, session: "s", tool: "pix_tool", cacheHit: false, durationMs: 12, saved: { caveman: 80 } },
      { ts: 2, session: "s", tool: "pix_tool", cacheHit: true, durationMs: 1, replayedTokens: 1000 },
    ],
  });

  assert.equal(kpi.tokens.measuredSaved, 80, "the replayed payload is not a saving and does not join the total");
  assert.equal(kpi.tokens.savedBySource.cache, undefined, "and it is not a source of saving either");
  assert.equal(kpi.cache.replayedTokens, 1000, "it is reported where it belongs, as what the cache served");
  assert.ok(kpi.cache.recomputeSavedMsPerHit >= 0, "what a hit saves is recomputation, in milliseconds");
});

test("a log that still books cache as a saving is read honestly", () => {
  // Every session recorded before this change carries saved.cache. Counting it
  // would keep the old overstatement alive in every historical export.
  const kpi = computeKpi({
    events: [{ ts: 1, session: "s", tool: "pix_tool", cacheHit: true, durationMs: 1, saved: { cache: 900 } }],
  });

  assert.equal(kpi.tokens.measuredSaved, 0, "an old log's cache figure is not a saving now either");
  assert.equal(kpi.cache.replayedTokens, 900, "it is read as what it always was: replayed output");
});
