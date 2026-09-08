/** registerSkillTool: plugin names keep their prefix, rule names strip it. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { registerSkillTool } from "../_skill-tool.js";

test("a plugin skill keeps its full name in the tool surface", async () => {
  registerSkillTool("my-custom-rule");

  const { _tools } = await import("../../router/_hooks.js");
  const registered = _tools.find((tool) => tool.name === "rule_tool_my_custom_rule");

  assert.ok(registered, "the plugin registers as rule_tool_my_custom_rule");
  assert.doesNotThrow(() => registered.handler({ mode: "full" }), "a plugin handler runs");
});

test("a rule skill registers under its underscored name", async () => {
  registerSkillTool("rule-backend-express");

  const { _tools } = await import("../../router/_hooks.js");
  const registered = _tools.find((tool) => tool.name === "rule_tool_backend_express");

  assert.ok(registered, "the rule skill registers as rule_tool_backend_express");
});

test("every mode arm of the handler answers", async () => {
  registerSkillTool("rule-backend-express");

  const { _tools } = await import("../../router/_hooks.js");
  const tool = _tools.find((t) => t.name === "rule_tool_backend_express");
  const text = (result) => result.content[0].text;

  assert.match(text(await tool.handler({})), /^# rule-backend-express/, "no mode falls back to full");
  assert.match(text(await tool.handler({ mode: "summary" })), /rule-backend-express/, "summary renders");
  assert.match(text(await tool.handler({ mode: "guardrails" })), /./, "guardrails renders a report");
  assert.match(text(await tool.handler({ mode: "search", query: "express" })), /./, "search with a query renders");
  assert.match(text(await tool.handler({ mode: "search" })), /^# rule-backend-express/, "search without a query falls back to full");
  assert.match(text(await tool.handler({ mode: "tldr", query: "routing" })), /./, "tldr renders");

  const noCode = await tool.handler({ mode: "check" });
  assert.equal(noCode.isError, true, "check without code is an error");
  assert.match(text(noCode), /requires a `code` argument/, "the missing code is named");

  const checked = await tool.handler({ mode: "check", code: "const x = 1;\n", fileName: "x.js" });
  assert.match(text(checked), /Guardrail check: rule-backend-express/, "check renders the report");
});

test("the scaffold mode answers only on rule-styleguide", async () => {
  registerSkillTool("rule-styleguide");

  const { _tools } = await import("../../router/_hooks.js");
  const tool = _tools.find((t) => t.name === "rule_tool_styleguide");
  const scaffolded = await tool.handler({ mode: "scaffold" });

  assert.match(scaffolded.content[0].text, /Project Scaffolding/, "the scaffold section renders");
});
