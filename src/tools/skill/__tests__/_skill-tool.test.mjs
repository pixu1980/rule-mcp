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