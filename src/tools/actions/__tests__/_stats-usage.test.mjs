

/**
 * rule_tool_stats and rule_tool_usage, driven through the router in a scratch
 * state directory: every scope, the flight-file arm, the disabled arm, and the
 * refusals rule_tool_usage owes a caller who declared nothing or too much.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const state = mkdtempSync(join(tmpdir(), "rule-stats-"));

process.env.RULE_MCP_STATE_DIR = state;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
delete process.env.RULE_MCP_NO_TELEMETRY;

const { registerStatsTool } = await import("../_stats.js");
const { registerUsageTool } = await import("../_usage.js");
const { callTool } = await import("../../router/index.js");

registerStatsTool();
registerUsageTool();

test.after(() => rmSync(state, { recursive: true, force: true }));

/** The single text body of a tool result. */
const text = (result) => result.content.map((part) => part.text).join("\n");

test("stats answers for every scope", async () => {
  for (const [scope, title] of [
    ["session", /This session/],
    ["week", /Last 7 days/],
    ["all", /All recorded/],
  ]) {
    const result = await callTool("rule_tool_stats", { scope });

    assert.notEqual(result.isError, true, `${scope}: reading an empty log is not an error`);
    assert.match(text(result), title, `${scope}: the report is titled for the window it covers`);
  }
});

test("stats defaults to the last seven days", async () => {
  assert.match(text(await callTool("rule_tool_stats", {})), /Last 7 days/, "no scope means the week");
});

test("stats renders an exported flight file instead of the live log", async () => {
  const flight = join(state, "recording.flight");
  writeFileSync(flight, JSON.stringify({ kpi: { calls: 3, savedTokens: 120 }, events: [] }));

  const result = await callTool("rule_tool_stats", { flight });

  assert.notEqual(result.isError, true, `a valid flight file must render: ${text(result)}`);
  assert.ok(text(result).length > 0, "the recording is rendered");
});

test("stats says which flight file it could not read, rather than failing silently", async () => {
  const missing = await callTool("rule_tool_stats", { flight: join(state, "not-there.flight") });
  assert.equal(missing.isError, true);
  assert.match(text(missing), /Could not read/, "the refusal names the file");

  const corrupt = join(state, "corrupt.flight");
  writeFileSync(corrupt, "{ this is not json");
  assert.equal((await callTool("rule_tool_stats", { flight: corrupt })).isError, true, "a corrupt recording is an error, not an empty report");
});

test("usage refuses a declaration with no figures, and says what it cannot read", async () => {
  const result = await callTool("rule_tool_usage", {});

  assert.match(text(result), /Nothing to record/, "an empty declaration records nothing");
  assert.match(text(result), /cannot be read from disk/, "and it explains which agents need one");
});

test("usage records the figures it was given and stamps the claim", async () => {
  const result = await callTool("rule_tool_usage", { input: 1200, output: 340, model: "claude-fable-5" });

  assert.notEqual(result.isError, true, text(result));
  assert.match(text(result), /Recorded 3 figure/, "it counts what it stored");
  assert.match(text(result), /transcript still takes precedence/, "a declaration never outranks a measurement");
});

test("usage refuses a declaration too large to be one", async () => {
  const result = await callTool("rule_tool_usage", { model: "m".repeat(5000) });

  // Tool results pass through text compression, which drops articles: the
  // assertion is on the substance, never on the filler.
  assert.equal(result.isError, true, "an oversize body is refused outright");
  assert.match(text(result), /larger than 4096 bytes/, "the refusal names the cap");
  assert.match(text(result), /not (a )?transcript/, "and says what to send instead");
});

test("usage validates the shape of every figure", async () => {
  for (const [field, value] of [
    ["input", -1],
    ["apiCalls", 1.5],
    ["costUsd", -0.01],
  ]) {
    const result = await callTool("rule_tool_usage", { [field]: value });

    assert.equal(result.isError, true, `${field}=${value} must be refused by the schema`);
  }
});
