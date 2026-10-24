

/** The tokensave pipeline: suppression thresholds, one-time directives, truncation. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { decorateWithTokensave, resetTokenPipeline, suppressIfTokensave, TOKENSAVE_SUPPRESSIBLE } from "../_token-pipeline.js";

const project = mkdtempSync(join(tmpdir(), "rule-mcp-tokensave-"));
const cleanDir = mkdtempSync(join(tmpdir(), "rule-mcp-tokensave-clean-"));
const previousCwd = process.cwd();

test.before(() => {
  mkdirSync(join(project, ".tokensave"), { recursive: true });
  process.chdir(cleanDir);
});

test.after(() => {
  process.chdir(previousCwd);
  delete process.env.RULE_MCP_SUPPRESS_MIN_LINES;
  delete process.env.RULE_MCP_NO_TOKENSAVE;
  rmSync(project, { recursive: true, force: true });
  rmSync(cleanDir, { recursive: true, force: true });
});

const BIG = Array.from({ length: 90 }, (_, index) => `line ${index}`).join("\n");

test("suppressIfTokensave stays quiet below the threshold and when inactive", () => {
  const small = suppressIfTokensave("tiny block", { projectDir: project });
  assert.equal(small, "tiny block", "a small block passes through");

  process.env.RULE_MCP_NO_TOKENSAVE = "1";
  const off = suppressIfTokensave(BIG, { projectDir: project });
  assert.equal(off, BIG, "tokensave off passes through");
  delete process.env.RULE_MCP_NO_TOKENSAVE;

  const elsewhere = suppressIfTokensave(BIG, { projectDir: "/tmp/no-such-tokensave" });
  assert.equal(elsewhere, BIG, "no graph in that project passes through");
});

test("suppressIfTokensave replaces big blocks with the directive and counts bytes", () => {
  resetTokenPipeline();
  const first = suppressIfTokensave(BIG, { projectDir: project });
  assert.match(first, /TOKENSAVE ACTIVE/, "the full directive leads the first suppression");
  assert.match(first, /suppressed/, "the suppression is reported");

  const second = suppressIfTokensave(BIG, { projectDir: project, label: "prompts" });
  assert.match(second, /prompts suppressed/, "the label carries into the terse block");
  assert.match(second, /\(query tokensave for detail\)|TERSE|query tokensave/i, "later suppressions are terse");
});

test("a custom threshold comes from the environment or the options", () => {
  const four = ["a", "b", "c", "d", "e"].join("\n");
  assert.equal(suppressIfTokensave(four, { projectDir: project }), four, "five lines stay under forty");

  process.env.RULE_MCP_SUPPRESS_MIN_LINES = "4";
  const forced = suppressIfTokensave(four, { projectDir: project });
  assert.match(forced, /5 lines omitted/, "the env threshold triggers");
  delete process.env.RULE_MCP_SUPPRESS_MIN_LINES;
});

test("decorateWithTokensave skips errors, test tools and unknown dirs", () => {
  resetTokenPipeline();
  assert.deepEqual(decorateWithTokensave("rule_tool", null), null, "no core passes through");
  assert.deepEqual(decorateWithTokensave("rule_tool", { isError: true, content: [] }), { isError: true, content: [] }, "an error core passes through");
  assert.deepEqual(decorateWithTokensave("rule_tool", { content: "nope" }), { content: "nope" }, "non-array content passes through");
  assert.deepEqual(decorateWithTokensave("test_rule_tool", { content: [{ type: "text", text: "x" }] }), { content: [{ type: "text", text: "x" }] }, "test tools keep payloads");
  assert.deepEqual(
    decorateWithTokensave("rule_tool", { content: [{ type: "text", text: "x" }] }, {}),
    { content: [{ type: "text", text: "x" }] },
    "no tokensave dir means no decoration",
  );
});

test("decorateWithTokensave emits once and defers for JSON payloads", () => {
  resetTokenPipeline();
  const plain = { content: [{ type: "text", text: "hello world" }] };
  const once = decorateWithTokensave("rule_tool", plain, { path: project });
  assert.match(once.content[0].text, /TOKENSAVE ACTIVE/, "the directive leads the first call");

  const twice = decorateWithTokensave("rule_tool", plain, { path: project });
  assert.equal(twice.content[0].text, "hello world", "the directive is not emitted again");

  resetTokenPipeline();
  const json = { content: [{ type: "text", text: '{"tool":"x"}' }] };
  const jsonOut = decorateWithTokensave("rule_tool", json, { path: project });
  assert.equal(jsonOut.content[0].text, '{"tool":"x"}', "a JSON payload is not decorated");
});

test("decorateWithTokensave truncates allowlisted heavy outputs", () => {
  resetTokenPipeline();
  const heavy = { content: [{ type: "text", text: BIG }] };
  process.env.RULE_MCP_SUPPRESS_MIN_LINES = "30";
  const truncated = decorateWithTokensave("rule_tool_fix", heavy, { path: project });

  assert.match(truncated.content.map((item) => item.text).join("\n"), /lines omitted/, "the heavy output is truncated");
  assert.ok(TOKENSAVE_SUPPRESSIBLE.has("rule_tool_fix"), "the fix tool is allowlisted");
});
