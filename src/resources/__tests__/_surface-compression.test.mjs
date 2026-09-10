/**
 * PERF-5: the surfaces that used to leave uncompressed.
 *
 * Only router tool results went through the compressor. A `rule://` resource
 * body and a prompt body are the same thing from the model's side - prose the
 * server emits and the context pays for - and both left at full length. This
 * pins that they no longer do, that the guard still holds on them, and that
 * each surface books its own saving so coverage is answerable.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-surface-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_CACHE = "1";
delete process.env.RULE_MCP_NO_CAVEMAN;

const { readResource } = await import("../_serve.js");
const { registerPromptHandlers } = await import("../../server/_prompt-handlers.js");
const { getPrompt, listPrompts } = await import("../../prompts/index.js");
const { getTokenStats, resetTokenStats } = await import("../../core/telemetry/_token-stats.js");
const { readSkill } = await import("../../tools/router/index.js");
const { loadAllSkills } = await import("../../core/skills/index.js");

await loadAllSkills();

const structure = (value) => ({
  fences: value.match(/```[\S\s]*?```/g) ?? [],
  urls: value.match(/https?:\/\/\S+/g) ?? [],
  headings: value.match(/^#{1,6} .*$/gm) ?? [],
  rows: value.match(/^\s*\|.*\|\s*$/gm) ?? [],
  spans: value.match(/`[^`\n]+`/g) ?? [],
});

test("a markdown resource body is compressed and booked as its own source", async () => {
  resetTokenStats();
  const source = readSkill("rule-backend-node");
  const served = await readResource("rule://rule-backend-node");
  const out = served.contents[0].text;

  assert.ok(out.length < source.length, `the body must lose its filler: ${source.length} -> ${out.length}`);
  assert.deepEqual(structure(out), structure(source), "and nothing structural with it");

  const stats = getTokenStats();
  assert.ok(stats.savedBySource["caveman-resource"] > 0, "the resource surface books its own saving");
  assert.equal(stats.savedBySource.caveman, undefined, "and does not book it as a tool result");
});

test("a JSON resource body is data and is left alone", async () => {
  const served = await readResource("rule://skills");

  assert.equal(served.contents[0].mimeType, "application/json");
  assert.doesNotThrow(() => JSON.parse(served.contents[0].text), "compressing a catalog would corrupt it");
});

test("a prompt body is compressed and booked as its own source", async () => {
  resetTokenStats();
  const handlers = new Map();
  registerPromptHandlers({ setRequestHandler: (schema, handler) => handlers.set(schema.shape?.method?.value ?? handlers.size, handler) });

  const get = [...handlers.values()].at(-1);
  const name = listPrompts().find((prompt) => prompt.name.startsWith("rule-area-")).name;
  const before = getPrompt(name, {}).messages[0].content.text;
  const after = (await get({ params: { name } })).messages[0].content.text;

  assert.ok(after.length < before.length, `the persona prose must compress: ${before.length} -> ${after.length}`);
  assert.deepEqual(structure(after), structure(before), "and nothing structural with it");
  assert.ok(getTokenStats().savedBySource["caveman-prompt"] > 0, "the prompt surface books its own saving");
});

test("prompts/list descriptions compress; names and argument names stay", async () => {
  resetTokenStats();
  const handlers = new Map();
  registerPromptHandlers({ setRequestHandler: (schema, handler) => handlers.set(schema.shape?.method?.value ?? handlers.size, handler) });

  const list = [...handlers.values()][0];
  const { prompts: listed } = await list({});
  const registry = listPrompts();

  // Names are the machine contract: identical to the registry, untouched.
  assert.deepEqual(listed.map((p) => p.name), registry.map((p) => p.name), "names survive the listing unchanged");
  assert.deepEqual(
    listed.map((p) => (p.arguments ?? []).map((a) => a.name)),
    registry.map((p) => (p.arguments ?? []).map((a) => a.name)),
    "argument names are the schema contract and stay",
  );

  // Prose descriptions compress: a persona prompt carries filler it sheds.
  const raw = registry.find((prompt) => prompt.name === "rule-plan-security");
  const out = listed.find((prompt) => prompt.name === raw.name);
  assert.ok(out.description.length < raw.description.length, `the persona hint shortens: ${raw.description.length} -> ${out.description.length}`);
  assert.ok(out.description.includes("Security"), "the substance of the description survives");

  const stats = getTokenStats();
  assert.ok(stats.savedBySource["caveman-prompt-list"] > 0, "the listing books its own saving");
});

test("a payload that is not text passes through the compression step", async () => {
  // The reader can answer with a binary or an unnamed payload, and the way out
  // must hand those back rather than try to shorten them.
  const { readResource } = await import("../_serve.js");
  const plain = await readResource("rule://a11y/test-basic");

  assert.equal(plain.contents[0].mimeType, "text/plain");
  assert.ok(plain.contents[0].text.length > 0, "a text/plain template still reads back");

  const missing = await readResource("rule://not-a-resource");
  assert.equal(missing.contents[0].text, "Resource not found", "an unknown URI answers, compressed or not");
});
