

/** rule_tool_search: the ranked-results and no-results arms over the real index. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { registerSearchTool } from "../_search-tool.js";

registerSearchTool();
const { _tools } = await import("../../router/_hooks.js");
const tool = _tools.find((t) => t.name === "rule_tool_search");

test("a real query returns ranked results with the index stats line", async () => {
  const result = await tool.handler({ query: "semantic html", maxResults: 3 });
  const text = result.content[0].text;

  assert.match(text, /^# Search: "semantic html"/, "the header names the query");
  assert.match(text, /Found \d+ results across \d+ skills/, "the result count renders");
  assert.match(text, /score: /, "results carry their scores");
});

test("a gibberish query states there is nothing, with the index size", async () => {
  const result = await tool.handler({ query: "zzqqxxyyvv" });
  const text = result.content[0].text;

  assert.match(text, /^No results for "zzqqxxyyvv"\./, "the empty arm states itself");
  assert.match(text, /sections indexed/, "the stats line still renders");
});
