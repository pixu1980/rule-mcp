/**
 * Personas plan B.1-B.3: the surfaces, all generated from the registry.
 *
 * One role, one prompt, one agent command, and one composable tool. The names
 * come from the registry, so activating or deprecating a role changes every
 * entry point at once - that is the whole reason the registry exists.
 *
 * Naming note: the prompt and the agent command share the name
 * `rule-plan-<role>`. The agent-command generator derives its set from the
 * prompt registry, so two names for one operation would be exactly the drift
 * ADR 029 removed.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { activeRoles } from "../src/core/review-roles.js";
import { getPrompt, listPrompts } from "../src/prompts/index.js";
import { listAgentCommands } from "../src/core/agent-commands.js"; // eslint-disable-line no-unused-vars
import { callTool, listTools } from "../src/tools/router.js";

const { registerPlanTool } = await import("../src/tools/plan.js");
registerPlanTool();

test("every active role has a prompt", () => {
  const names = new Set(listPrompts().map((prompt) => prompt.name));
  for (const role of activeRoles()) {
    assert.ok(names.has(`rule-plan-${role.id}`), `missing prompt for ${role.id}`);
  }
});

test("a role prompt carries the filled template", () => {
  const prompt = getPrompt("rule-plan-security", {});
  const text = prompt.messages.map((message) => message.content.text).join("\n");
  assert.match(text, /Security Engineer/);
  assert.match(text, /docs\/plans\/security\.md/);
  assert.ok(!text.includes("{{"), "no placeholder reaches the client");
});

test("a role prompt takes an optional topic", () => {
  const prompt = getPrompt("rule-plan-privacy", { topic: "the flight recorder exports" });
  const text = prompt.messages.map((message) => message.content.text).join("\n");
  assert.match(text, /the flight recorder exports/);
});

test("every active role has an agent command", () => {
  const commands = new Set(listAgentCommands().map((command) => command.name));
  for (const role of activeRoles()) {
    assert.ok(commands.has(`rule-plan-${role.id}`), `missing command for ${role.id}`);
  }
});

test("rule_tool_plan is registered and answers for a role", async () => {
  assert.ok(
    listTools().some((tool) => tool.name === "rule_tool_plan"),
    "the composable entry point exists",
  );
  const result = await callTool("rule_tool_plan", { role: "architect" });
  const text = result.content.map((part) => part.text).join("\n");
  assert.match(text, /Software Architect/);
  assert.match(text, /docs\/audits\/architect\.md/);
});

test("rule_tool_plan applies overrides and lists roles for an unknown one", async () => {
  // Tool results pass through caveman compression, which drops articles: the
  // assertion is on the substance ("CLI output"), never on the filler.
  const overridden = await callTool("rule_tool_plan", { role: "a11y", years: 40, topic: "the CLI output" });
  const text = overridden.content.map((part) => part.text).join("\n");
  assert.match(text, /40 anni di esperienza/);
  assert.match(text, /CLI output/);

  const unknown = await callTool("rule_tool_plan", { role: "nope" });
  const unknownText = unknown.content.map((part) => part.text).join("\n");
  assert.equal(unknown.isError, true);
  assert.match(unknownText, /security/, "an unknown role is answered with the ones that exist");
});

test("a proposed role is reachable by the tool but has no generated surface", async () => {
  const names = new Set(listPrompts().map((prompt) => prompt.name));
  assert.equal(names.has("rule-plan-qa-testing"), false, "proposed roles stay out of the surfaces");
  const result = await callTool("rule_tool_plan", { role: "qa-testing" });
  assert.match(result.content.map((part) => part.text).join("\n"), /QA and Test Engineer/);
});
