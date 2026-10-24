/**
 * The shapes `rule_tool_stats` reads from a machine that is not this one: a
 * ledger entry with no figures, a graph with no recorded timestamp, a server
 * that reports no pid, and a project with no graph at all.
 *
 * The TokenSave CLI is a shell script on PATH. Every arm below exists because
 * the real CLI can answer with any of those shapes, so the adapter's defaults
 * are asserted against the documented contract and not against a live install.
 */
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const skip = process.platform === "win32" && "a POSIX shell is needed to fake the tokensave CLI";

const home = mkdtempSync(join(tmpdir(), "rule-stats-ledger-"));
const originalCwd = process.cwd();

process.env.RULE_MCP_HOME = home;
process.env.RULE_MCP_STATE_DIR = join(home, "state");
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_COMPRESSION = "1";
delete process.env.RULE_MCP_NO_TELEMETRY;

const { getProjectPaths } = await import("../../../cli/paths/index.js");
const { callTool, _tools } = await import("../../router/index.js");
const { registerStatsTool } = await import("../_stats.js");

registerStatsTool();

const fakes = join(home, "fakes");
const bin = join(home, "bin");

mkdirSync(fakes, { recursive: true });
mkdirSync(bin, { recursive: true });

// One script, three answers: `gain` prints the raw ledger, the two tools print
// an MCP envelope. Anything else fails the way a missing graph would.
writeFileSync(
  join(bin, "tokensave"),
  [
    "#!/bin/sh",
    'case "$1" in',
    '  gain) cat "$RULE_MCP_FAKE_GAIN" ;;',
    '  tool) case "$2" in',
    '          status) cat "$RULE_MCP_FAKE_STATUS" ;;',
    '          runtime) cat "$RULE_MCP_FAKE_RUNTIME" ;;',
    "          *) exit 1 ;;",
    "        esac ;;",
    "  *) exit 1 ;;",
    "esac",
    "",
  ].join("\n"),
);
chmodSync(join(bin, "tokensave"), 0o755);
process.env.PATH = `${bin}:${process.env.PATH}`;

test.after(() => {
  process.chdir(originalCwd);
  rmSync(home, { recursive: true, force: true });
});

/** Write the answers the fake CLI will give, and point it at them. */
function answer({ gain, status, runtime }) {
  writeFileSync(join(fakes, "gain.json"), JSON.stringify(gain));
  writeFileSync(join(fakes, "status.envelope"), JSON.stringify({ content: [{ type: "text", text: JSON.stringify(status) }] }));
  writeFileSync(join(fakes, "runtime.envelope"), JSON.stringify({ content: [{ type: "text", text: JSON.stringify(runtime) }] }));
  process.env.RULE_MCP_FAKE_GAIN = join(fakes, "gain.json");
  process.env.RULE_MCP_FAKE_STATUS = join(fakes, "status.envelope");
  process.env.RULE_MCP_FAKE_RUNTIME = join(fakes, "runtime.envelope");
}

/**
 * A project directory, with or without the database that makes a graph exist.
 *
 * @param {{ graph?: boolean }} [options]
 * @returns {string}
 */
function project({ graph = true } = {}) {
  const dir = mkdtempSync(join(home, "project-"));

  if (graph) {
    mkdirSync(join(dir, ".tokensave"), { recursive: true });
    writeFileSync(join(dir, ".tokensave", "tokensave.db"), "");
  }

  return dir;
}

/** Enter a project directory and return its telemetry recording directory. */
function enter(dir) {
  process.chdir(dir);

  const { dir: recording } = getProjectPaths();

  mkdirSync(recording, { recursive: true });

  return recording;
}

/** The registered handler, so a call can skip the schema's defaults once. */
const statsHandler = () => _tools.find((tool) => tool.name === "rule_tool_stats").handler;

test("the week window treats an event with no timestamp as older than it", { skip }, async () => {
  const recording = enter(project());

  writeFileSync(join(recording, "telemetry.jsonl"), `${JSON.stringify({ tool: "rule_tool_skill", ok: true })}\n`);
  answer({ gain: {}, status: {}, runtime: {} });

  const result = await statsHandler()({});

  assert.match(result.content[0].text, /Last 7 days/u, "an absent scope reads as the week");
  assert.equal(result._meta.ruleStats.calls, 0, "an event that cannot be dated is outside the window");
});

test("archived days add only the figures they carry, and a bare graph says what it cannot know", { skip }, async () => {
  const recording = enter(project());

  writeFileSync(join(recording, "telemetry-rollup.json"), JSON.stringify([{ date: "2025-01-01" }, { date: "2025-01-02", calls: 2 }]));
  answer({
    gain: {},
    status: { node_count: 5, edge_count: 7, file_count: 2, db_size_bytes: 2048, total_source_bytes: 1024 },
    runtime: { tokensave_version: "7.2.0", process: { rss_bytes: 4096, cpu_percent: 3 } },
  });

  const text = (await callTool("rule_tool_stats", { scope: "all" })).content[0].text;

  assert.match(text, /Archived days/u, "the rollups are reported");
  assert.match(text, /2 calls, ~0 tokens measured, ~0 estimated/u, "a day without figures contributes zero, not NaN");
  assert.match(text, /0 TokenSave calls over 30d saved ~0 tokens/u, "a ledger with no figures falls back to its documented defaults");
  assert.doesNotMatch(text, /\$/u, "no exchange rate is invented for a ledger that does not report one");
  assert.match(text, /Index last updated at an unknown time/u, "a graph that never recorded a timestamp is not dated");
  assert.match(text, /Server pid \? on TokenSave 7\.2\.0/u, "a server that reports no pid is not given one");
});

test("a ledger with figures and a dated graph are reported as measured", { skip }, async () => {
  enter(project());
  answer({
    gain: { calls: 4, saved_tokens: 1200, usd: 0.42, range: "7d" },
    status: { node_count: 1, edge_count: 2, file_count: 3, db_size_bytes: 1024, total_source_bytes: 2048, last_updated: Math.floor(Date.now() / 1000) - 5 },
    runtime: { tokensave_version: "7.2.0", process: { pid: 4242, rss_bytes: 1024, cpu_percent: 2 } },
  });

  const text = (await callTool("rule_tool_stats", { scope: "all" })).content[0].text;

  assert.match(text, /4 TokenSave calls over 7d saved ~1200 tokens \(\$0\.42\)/u, "the ledger is quoted with its own window and rate");
  assert.match(text, /Index last updated \d+s ago/u, "a dated graph is aged");
  assert.match(text, /Server pid 4242 on TokenSave 7\.2\.0/u, "the running server is named");
});

test("a project with no graph reports no graph section", { skip }, async () => {
  enter(project({ graph: false }));
  answer({ gain: {}, status: {}, runtime: {} });

  const result = await callTool("rule_tool_stats", {});
  const text = result.content[0].text;

  assert.equal(result._meta.ruleGraph, undefined, "no graph is reported as absent, not as zeros");
  assert.doesNotMatch(text, /## TokenSave graph/u, "and nothing claims one");
  assert.match(text, /## TokenSave ledger/u, "the ledger is still read: it is machine-wide");
});
