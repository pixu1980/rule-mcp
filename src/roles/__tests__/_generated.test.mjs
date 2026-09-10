

/** The generated surfaces: three prompts and three commands per active role, all from the registry. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { OPERATIONS, activeRoles, getPrompt, listAgentCommands, listPrompts } from "./_surfaces.fixture.mjs";

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
    // The request typed after the command is the run's focus: it must be
    // forwarded into rule_tool_plan as `topic` (handoff-style pass-through).
    assert.match(command.body, /\$ARGUMENTS/, `${command.name}: body must carry the request placeholder`);
    assert.match(command.body, /typed after this command passed through unchanged as `topic`/, `${command.name}: body must forward the request as topic`);
  }
});

test("persona prompts and commands accept a free-form request like every other prompt", () => {
  const personaDefs = listPrompts().filter((p) => /^rule-(plan|audit|review)-/.test(p.name));

  for (const prompt of personaDefs) {
    assert.equal(prompt.arguments.length, 1, `${prompt.name}: exactly one argument, the free-form request`);
    assert.equal(prompt.arguments[0].name, "topic", `${prompt.name}: the argument is the request`);
    assert.match(prompt.arguments[0].description, /request/, `${prompt.name}: the argument description must call it a request`);
  }

  // Help surfaces an invocation example, so the user sees how the request slots in.
  const help = getPrompt("rule-plan-security", { topic: "help" });
  const helpText = help.messages[0].content.text;
  assert.match(helpText, /^Usage: \/rule-plan-security/, "persona help must start with the usage line");
  assert.match(helpText, /Examples:/, "persona help must show a request example");

  // The request reaches the model: a persona prompt with a topic must say so.
  const withRequest = getPrompt("rule-audit-security", { topic: "the SSE daemon token handling" });
  const text = withRequest.messages.map((message) => message.content.text).join("\n");
  assert.match(text, /the SSE daemon token handling/, "the request must land in the filled template");
});
