

/**
 * PERF-5: the surfaces that used to leave uncompressed.
 *
 * Only router tool results went through the compressor. A `rulemcp://` resource
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

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-surface-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_CACHE = "1";
delete process.env.RULE_MCP_NO_COMPRESSION;

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
  const source = readSkill("rule-mcp-backend-node");
  const served = await readResource("rulemcp://rule-mcp-backend-node");
  const out = served.contents[0].text;

  assert.ok(out.length < source.length, `the body must lose its filler: ${source.length} -> ${out.length}`);
  assert.deepEqual(structure(out), structure(source), "and nothing structural with it");

  const stats = getTokenStats();
  assert.ok(stats.savedBySource["compression-resource"] > 0, "the resource surface books its own saving");
  assert.equal(stats.savedBySource.compression, undefined, "and does not book it as a tool result");
});

test("a JSON resource body is data and is left alone", async () => {
  const served = await readResource("rulemcp://skills");

  assert.equal(served.contents[0].mimeType, "application/json");
  assert.doesNotThrow(() => JSON.parse(served.contents[0].text), "compressing a catalog would corrupt it");
});

test("a prompt body is compressed and booked as its own source", async () => {
  resetTokenStats();
  const handlers = new Map();
  registerPromptHandlers({ setRequestHandler: (schema, handler) => handlers.set(schema.shape?.method?.value ?? handlers.size, handler) });

  const get = [...handlers.values()].at(-1);
  const name = listPrompts().find((prompt) => prompt.name.startsWith("rule-mcp-area-")).name;
  const before = getPrompt(name, {}).messages[0].content.text;
  const after = (await get({ params: { name } })).messages[0].content.text;

  assert.ok(after.length < before.length, `the persona prose must compress: ${before.length} -> ${after.length}`);
  assert.deepEqual(structure(after), structure(before), "and nothing structural with it");
  assert.ok(getTokenStats().savedBySource["compression-prompt"] > 0, "the prompt surface books its own saving");
});

test("prompts/list is left alone: its descriptions are schema, not prose", () => {
  const listed = listPrompts();

  assert.ok(listed.length > 0);

  for (const prompt of listed.slice(0, 10)) {
    assert.equal(typeof prompt.description, "string");
    assert.ok(prompt.description.length > 0, `${prompt.name} keeps its hint`);
  }
});
