

/** Branch coverage for prompt extraction and the annotation batch. */
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-nyx-annotate-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { annotateMissing, promptOf } = await import("../_nyx-annotate.js");
const { entriesStore } = await import("../_persistence.js");

test("a tool without a prompt field and a missing args object both read as no prompt", () => {
  assert.equal(promptOf("rule_tool_check", {}), null);
  assert.equal(promptOf("pix_tool"), null);
});

test("a non-string or blank prompt is not a prompt", () => {
  assert.equal(promptOf("pix_tool", { prompt: 42 }), null);
  assert.equal(promptOf("pix_tool", { prompt: " ".repeat(3) }), null);
  assert.equal(promptOf("pix_tool", { prompt: "hello" }), "hello");
});

test("an empty pending set returns without calling the adapter", async () => {
  const store = entriesStore();

  store.clear();

  let embedded = false;

  await annotateMissing(
    {
      embed: async () => {
        embedded = true;

        return [];
      },
    },
    "pix_tool",
  );

  assert.equal(embedded, false);
});

test("entries of another tool, already embedded or without a prompt are skipped", async () => {
  const store = entriesStore();

  store.clear();
  store.set("other", { tool: "rule_tool_check", args: { prompt: "x" } });
  store.set("embedded", { tool: "pix_tool", args: { prompt: "x" }, nyx: { embedding: [1] } });
  store.set("blank", { tool: "pix_tool", args: { prompt: " " } });
  store.set("keep", { tool: "pix_tool", args: { prompt: "hello" } });

  const seen = [];

  await annotateMissing(
    {
      embed: async (texts) => {
        seen.push(...texts);

        return [[0.1]];
      },
      classify: async () => ({ decision: { cacheGroup: "cache" } }),
    },
    "pix_tool",
  );

  assert.deepEqual(seen, ["hello"]);
  assert.deepEqual(store.get("keep").nyx, { cacheGroup: "cache", embedding: [0.1] });
});

test("an embedding the adapter did not return leaves the entry unannotated", async () => {
  const store = entriesStore();

  store.clear();
  store.set("keep", { tool: "pix_tool", args: { prompt: "hello" } });

  await annotateMissing({ embed: async () => [undefined] }, "pix_tool");

  assert.equal(store.get("keep").nyx, undefined);
});

test("the candidate batch stops at the cap", async () => {
  const store = entriesStore();

  store.clear();

  for (let index = 0; index < 205; index += 1) {
    store.set(`k${index}`, { tool: "pix_tool", args: { prompt: `p${index}` } });
  }

  let batch = 0;

  await annotateMissing(
    {
      embed: async (texts) => {
        batch = texts.length;

        return texts.map(() => [0.1]);
      },
      classify: async () => ({ decision: { cacheGroup: "cache" } }),
    },
    "pix_tool",
  );

  assert.equal(batch, 200);
});
