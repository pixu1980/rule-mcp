

/** The generated surfaces: one prompt and one command per active role, all from the registry. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { activeRoles, getPrompt, listAgentCommands, listPrompts } from "./_surfaces.fixture.mjs";

test("every active role has one persona prompt", () => {
  const names = new Set(listPrompts().map((prompt) => prompt.name));

  for (const role of activeRoles()) {
    assert.ok(names.has(`rule-persona-${role.id}`), `missing prompt for ${role.id}`);
    for (const operation of ["audit", "review", "plan"]) {
      assert.equal(names.has(`rule-persona-${role.id}-${operation}`), false, `the old ${role.id}-${operation} prompt must be gone`);
    }
  }
});

test("the request decides how deep the run goes", () => {
  const sectionOf = (name, topic) => {
    const prompt = getPrompt(name, topic === undefined ? {} : { topic });
    const text = prompt.messages.map((message) => message.content.text).join("\n");

    assert.ok(!text.includes("{{"), "no placeholder reaches the client");
    assert.match(text, /Security Engineer/);

    return text;
  };

  const audit = sectionOf("rule-persona-security", "the auth flow");
  assert.match(audit, /## The operation: audit$/m, "no stage keyword runs the audit alone");
  assert.match(audit, /docs\/audits\/security\.md/);
  assert.ok(!audit.includes("docs/plans/security.md"), "an audit run does not promise the plan");
  assert.ok(!audit.includes("docs/reviews/security.md"), "nor the review");

  const review = sectionOf("rule-persona-security", "review the auth flow");
  assert.match(review, /## The operation: audit, then review/);
  assert.match(review, /docs\/audits\/security\.md/);
  assert.match(review, /docs\/reviews\/security\.md/);
  assert.match(review, /distilled from the audit/, "the review points back at the audit");
  assert.ok(!review.includes("docs/plans/security.md"), "a review does not promise the plan");

  const plan = sectionOf("rule-persona-security", "plan the auth fix");
  assert.match(plan, /## The operation: audit, review, plan/);
  assert.match(plan, /docs\/audits\/security\.md/);
  assert.match(plan, /docs\/reviews\/security\.md/);
  assert.match(plan, /docs\/plans\/security\.md/);
});

test("a role prompt takes an optional topic and makes it the binding scope", () => {
  const prompt = getPrompt("rule-persona-privacy", { topic: "the flight recorder exports" });
  const text = prompt.messages.map((message) => message.content.text).join("\n");

  assert.match(text, /the flight recorder exports/);
  assert.match(text, /## Scope: binding/, "the topic is a scope, not a suggestion");
});

test("every active role has one agent command", () => {
  const commands = new Set(listAgentCommands().map((command) => command.name));

  for (const role of activeRoles()) {
    assert.ok(commands.has(`rule-persona-${role.id}`), `missing command for ${role.id}`);
  }
});

test("persona command bodies route through the tools and carry the depth intent", () => {
  for (const command of listAgentCommands()) {
    if (!/^rule-persona-/.test(command.name)) {
      continue;
    }

    assert.match(command.body, /rule_tool_plan/, `${command.name}: body must get the contract from rule_tool_plan`);
    assert.match(command.body, /rule_tool_impersonation/, `${command.name}: body must hand the trio to rule_tool_impersonation`);
    assert.match(command.body, /commit/, `${command.name}: body must close with a scoped commit`);
    assert.match(command.body, /Depth intent/, `${command.name}: body must state the depth rule`);
    assert.match(command.body, /operation=plan/, `${command.name}: a plan ask runs the deepest operation`);
    assert.match(command.body, /operation=review/, `${command.name}: a review ask runs audit plus review`);
    assert.match(command.body, /operation=audit/, `${command.name}: the fallback is the audit`);
    // The request typed after the command is the run's focus: it must be
    // forwarded into rule_tool_plan as `topic` (handoff-style pass-through).
    assert.match(command.body, /\$ARGUMENTS/, `${command.name}: body must carry the request placeholder`);
    assert.match(command.body, /typed after this command passed through unchanged as `topic`/, `${command.name}: body must forward the request as topic`);
    assert.match(command.body, /binding scope/, `${command.name}: body must call the request the binding scope`);
  }
});

test("persona prompts and commands accept a free-form request like every other prompt", () => {
  const personaDefs = listPrompts().filter((p) => /^rule-persona-/.test(p.name));

  for (const prompt of personaDefs) {
    assert.equal(prompt.arguments.length, 1, `${prompt.name}: exactly one argument, the free-form request`);
    assert.equal(prompt.arguments[0].name, "topic", `${prompt.name}: the argument is the request`);
    assert.match(prompt.arguments[0].description, /request/, `${prompt.name}: the argument description must call it a request`);
  }

  // Help surfaces an invocation example, so the user sees how the request slots in.
  const help = getPrompt("rule-persona-security", { topic: "help" });
  const helpText = help.messages[0].content.text;
  assert.match(helpText, /^Usage: \/rule-persona-security/, "persona help must start with the usage line");
  assert.match(helpText, /Examples:/, "persona help must show a request example");
  assert.match(helpText, /plan the SSE daemon auth fix/, "the help shows how a plan ask deepens the run");

  // The request reaches the model: a persona prompt with a topic must say so.
  const withRequest = getPrompt("rule-persona-security", { topic: "the SSE daemon token handling" });
  const text = withRequest.messages.map((message) => message.content.text).join("\n");
  assert.match(text, /the SSE daemon token handling/, "the request must land in the filled template");
});
