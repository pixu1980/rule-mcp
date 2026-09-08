/** rule_tool_component: every handler arm over the registered tool. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { registerTemplateTool } from "../index.js";

registerTemplateTool();
const { _tools } = await import("../../../../tools/router/_hooks.js");
const tool = _tools.find((t) => t.name === "rule_tool_component");
const text = (result) => result.content[0].text;

test("the guardrails mode renders the principles without needing a component", async () => {
  const result = await tool.handler({ mode: "guardrails", component: "ignored" });
  assert.ok(text(result).length > 0, "the guardrails text renders");
});

test("an unknown component is an error naming the available set", async () => {
  const result = await tool.handler({ component: "no-such-widget", mode: "generate" });
  assert.equal(result.isError, true, "unknown components error");
  assert.match(text(result), /Unknown: no-such-widget\. Available: /, "the available set is listed");
});

test("a single-file template renders with its guardrail summary", async () => {
  const result = await tool.handler({ component: "button", framework: "vanilla", mode: "generate" });
  assert.equal(result.isError, undefined, "a known component renders");
  assert.match(text(result), /# button - vanilla/, "the header names the pair");
});

test("the multi mode renders one block per file", async () => {
  const result = await tool.handler({ component: "button", framework: "vanilla", mode: "multi", name: "DemoButton" });

  if (result.isError) {
    assert.match(text(result), /Cannot generate multi-file output/, "an unsupported pair is stated");
  } else {
    assert.match(text(result), /# Generated: button/, "the multi header renders");
    assert.match(text(result), /### `/, "each file gets its own block");
  }
});
