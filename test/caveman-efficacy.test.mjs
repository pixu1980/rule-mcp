/**
 * Hardening 4.3: does caveman compression actually save anything?
 *
 * Every flight export said `measuredSaved: 0` with `savedBySource.caveman: 0`,
 * which left two possibilities: the compressor was not running where it
 * mattered, or its savings were a story. This suite settles it on a corpus of
 * real tool results rather than on invented prose, and pins the two claims that
 * have to hold together: compression removes something measurable, and what it
 * removes is never substance.
 *
 * The recorder is the third case. The number it books has to be what the
 * compression step removed, not what survives after the workflow reminder is
 * added on top of it - netting the two was what produced the zero.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-caveman-eval-"));
const projectDir = realpathSync(mkdtempSync(join(tmpdir(), "rule-caveman-project-")));
mkdirSync(join(projectDir, ".git"), { recursive: true });
process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
delete process.env.RULE_MCP_NO_TELEMETRY;
delete process.env.RULE_MCP_NO_CAVEMAN;

const { compressResult } = await import("../src/core/caveman.js");
const { loadAllSkills } = await import("../src/core/skills.js");
const { callTool, recomputeCore } = await import("../src/tools/router.js");
const { flush } = await import("../src/core/telemetry.js");
const { readEvents } = await import("../src/core/telemetry-store.js");

/**
 * Real results, not fixtures: the corpus is what this server actually returns.
 * Skill bodies are the prose-heavy end, the router payload is the data end.
 */
const CORPUS = [
  ["pix_tool", { prompt: "React accessible form with validation" }],
  ["rule_tool_frontend_react", {}],
  ["rule_tool_styleguide_css", {}],
  ["rule_tool_backend_node", {}],
  ["rule_tool_process_code_review", {}],
  ["rule_tool_caveman", {}],
];

const results = [];
const text = (result) => (result?.content ?? []).map((item) => item.text ?? "").join("");
const tokens = (result) => Math.ceil(text(result).length / 4);

before(async () => {
  await loadAllSkills();

  for (const [name, args] of CORPUS) {
    const core = await recomputeCore(name, args);
    results.push({ name, core, compressed: compressResult(core) });
  }
});

test("compression removes something measurable from real tool results", () => {
  const before_ = results.reduce((total, item) => total + tokens(item.core), 0);
  const after = results.reduce((total, item) => total + tokens(item.compressed), 0);
  const saved = before_ - after;

  assert.ok(saved > 0, `the corpus must compress at all (saved ${saved} tokens)`);
  assert.ok(
    saved / before_ > 0.01,
    `compression is a modest saving, but it is a saving: ${saved}/${before_} = ${((saved / before_) * 100).toFixed(1)} %`,
  );
});

test("prose compresses and data is left alone", () => {
  const router = results.find((item) => item.name === "pix_tool");
  assert.equal(
    text(router.compressed),
    text(router.core),
    "the router answers in JSON: compressing it would corrupt the payload",
  );

  const skill = results.find((item) => item.name === "rule_tool_backend_node");
  assert.ok(tokens(skill.compressed) < tokens(skill.core), "a skill body is prose and must lose its filler");
});

test("compression never touches substance", () => {
  const fences = (value) => value.match(/```[\S\s]*?```/g) ?? [];
  const urls = (value) => value.match(/https?:\/\/\S+/g) ?? [];
  const headings = (value) => value.match(/^#{1,6} .*$/gm) ?? [];
  const rows = (value) => value.match(/^\s*\|.*\|\s*$/gm) ?? [];
  const spans = (value) => value.match(/`[^`\n]+`/g) ?? [];

  for (const { name, core, compressed } of results) {
    const source = text(core);
    const output = text(compressed);
    assert.deepEqual(fences(output), fences(source), `${name}: code blocks must survive byte for byte`);
    assert.deepEqual(urls(output), urls(source), `${name}: URLs must survive`);
    assert.deepEqual(headings(output), headings(source), `${name}: headings must survive`);
    assert.deepEqual(rows(output), rows(source), `${name}: table rows must survive`);
    assert.deepEqual(spans(output), spans(source), `${name}: inline code must survive`);
  }
});

test("compressing twice changes nothing the second time", () => {
  for (const { name, compressed } of results) {
    assert.equal(text(compressResult(compressed)), text(compressed), `${name}: compression must be idempotent`);
  }
});

test("the reported compression ratio is the measured saving, not the net shrink", async () => {
  const { computeKpi } = await import("../src/core/kpi.js");
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
        saved: { caveman: 120 },
      },
    ],
  });

  assert.equal(kpi.tokens.cavemanRatio, 0.1, "the ratio must be what compression removed over what it was given");
  assert.equal(kpi.tokens.reminderOverhead, 60, "the reminder's net cost stays its own number");
});

test("the recorder books what compression removed, not what survives the reminder", async () => {
  process.chdir(projectDir);
  await callTool("rule_tool_backend_node", {});
  flush();

  const recorded = readEvents().filter((event) => event.tool === "rule_tool_backend_node" && !event.cacheHit);
  assert.ok(recorded.length > 0, "the call must have been recorded at all");
  assert.ok(
    recorded.some((event) => Number(event.saved?.caveman) > 0),
    `savedBySource.caveman must be positive on a prose result (got ${JSON.stringify(recorded.map((event) => event.saved))})`,
  );
});

// ── DOC-1: substance includes the meaning of a sentence ──

test("compression never leaves broken English behind", () => {
  // Found by the docs-engineer run: `rather` is filler on its own and half of a
  // comparative when `than` follows it, and deleting "in order to" outright ate
  // the "to" the verb needed. 144 occurrences across 34 skills shipped that way.
  const compress = (text) => compressResult({ content: [{ type: "text", text }] }).content[0].text;

  for (const [source, expected] of [
    ["Call the helper rather than writing it by hand.", "Call helper rather than writing it by hand."],
    ["Use a Set in order to check membership in a loop.", "Use Set to check membership in loop."],
    ["The plan is listed in order of leverage.", "plan is listed in order of leverage."],
  ]) {
    assert.equal(compress(source), expected, `compression must not break: ${source}`);
  }
});

test("the filler words that are only ever filler still go", () => {
  const compress = (text) => compressResult({ content: [{ type: "text", text }] }).content[0].text;

  assert.equal(compress("The value is very large."), "value is large.");
  assert.equal(compress("This is quite simply the only path."), "This is only path.");
  assert.equal(compress("It is rather slow."), "It is slow.", "rather is still filler when no than follows");
});
