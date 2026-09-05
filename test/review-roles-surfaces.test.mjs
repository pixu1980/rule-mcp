/**
 * Personas plan B.1-B.3: the surfaces, all generated from the registry.
 *
 * One role, three prompts, three agent commands, and one composable tool. The
 * names come from the registry, so activating or deprecating a role changes
 * every entry point at once - that is the whole reason the registry exists.
 *
 * Naming note: the prompts and the agent commands share the names
 * `rule-plan-<role>`, `rule-audit-<role>`, `rule-review-<role>`. The agent-command
 * generator derives its set from the prompt registry, so two names for one
 * operation would be exactly the drift ADR 029 removed.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { activeRoles } from "../src/core/review-roles.js";
import { OPERATIONS } from "../src/core/review-roles-template.js";
import { getPrompt, listPrompts } from "../src/prompts/index.js";
import { listAgentCommands } from "../src/core/agent-commands.js";
import { callTool, listTools } from "../src/tools/router.js";

const { registerPlanTool } = await import("../src/tools/plan.js");
registerPlanTool();

test("every active role has all three persona prompts", () => {
  const names = new Set(listPrompts().map((prompt) => prompt.name));
  for (const role of activeRoles()) {
    for (const operation of OPERATIONS) {
      assert.ok(names.has(`rule-${operation}-${role.id}`), `missing prompt for ${role.id} (${operation})`);
    }
  }
});

test("a role prompt carries the filled template for its operation", () => {
  const plan = getPrompt("rule-plan-security", {});
  const planText = plan.messages.map((message) => message.content.text).join("\n");
  assert.match(planText, /Security Engineer/);
  assert.match(planText, /docs\/plans\/security\.md/);
  assert.match(planText, /## The operation: plan/);
  assert.ok(!planText.includes("{{"), "no placeholder reaches the client");

  const audit = getPrompt("rule-audit-security", {});
  const auditText = audit.messages.map((message) => message.content.text).join("\n");
  assert.match(auditText, /docs\/audits\/security\.md/);
  assert.match(auditText, /## The operation: audit/);
  assert.ok(!auditText.includes("docs/plans/security.md"), "an audit run does not promise the plan");

  const review = getPrompt("rule-review-security", {});
  const reviewText = review.messages.map((message) => message.content.text).join("\n");
  assert.match(reviewText, /docs\/reviews\/security\.md/);
  assert.match(reviewText, /## The operation: review/);
  assert.match(reviewText, /distilled from/, "the review points back at the audit");
});

test("a role prompt takes an optional topic", () => {
  const prompt = getPrompt("rule-plan-privacy", { topic: "the flight recorder exports" });
  const text = prompt.messages.map((message) => message.content.text).join("\n");
  assert.match(text, /the flight recorder exports/);
});

test("every active role has all three agent commands", () => {
  const commands = new Set(listAgentCommands().map((command) => command.name));
  for (const role of activeRoles()) {
    for (const operation of OPERATIONS) {
      assert.ok(commands.has(`rule-${operation}-${role.id}`), `missing command for ${role.id} (${operation})`);
    }
  }
});

test("persona command bodies route through the tools, not a recap", () => {
  for (const command of listAgentCommands()) {
    if (!/^rule-(plan|audit|review)-/.test(command.name)) {
      continue;
    }

    assert.match(command.body, /rule_tool_plan/, `${command.name}: body must get the contract from rule_tool_plan`);
    assert.match(command.body, /rule_tool_plan_docs/, `${command.name}: body must hand the trio to rule_tool_plan_docs`);
    assert.match(command.body, /commit/, `${command.name}: body must close with a scoped commit`);
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

test("rule_tool_plan applies overrides, an operation, and lists roles for an unknown one", async () => {
  // Tool results pass through caveman compression, which drops articles: the
  // assertion is on the substance ("CLI output"), never on the filler.
  const overridden = await callTool("rule_tool_plan", { role: "a11y", years: 40, topic: "the CLI output" });
  const text = overridden.content.map((part) => part.text).join("\n");
  assert.match(text, /40 anni di esperienza/);
  assert.match(text, /CLI output/);

  const audited = await callTool("rule_tool_plan", { role: "a11y", operation: "audit" });
  const auditText = audited.content.map((part) => part.text).join("\n");
  assert.match(auditText, /## The operation: audit/);
  assert.match(auditText, /docs\/audits\/a11y\.md/);

  const unknown = await callTool("rule_tool_plan", { role: "nope" });
  const unknownText = unknown.content.map((part) => part.text).join("\n");
  assert.equal(unknown.isError, true);
  assert.match(unknownText, /security/, "an unknown role is answered with the ones that exist");
});

test("a proposed role is reachable by the tool but has no generated surface", async () => {
  const names = new Set(listPrompts().map((prompt) => prompt.name));
  for (const operation of OPERATIONS) {
    assert.equal(names.has(`rule-${operation}-api-design`), false, "proposed roles stay out of the surfaces");
    assert.equal(names.has(`rule-${operation}-simplicity-staff-eng`), false, "proposed roles stay out of the surfaces");
  }
  const result = await callTool("rule_tool_plan", { role: "api-design" });
  assert.match(result.content.map((part) => part.text).join("\n"), /API Design Engineer/);
});
