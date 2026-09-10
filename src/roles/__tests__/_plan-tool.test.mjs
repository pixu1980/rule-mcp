

/** rule_tool_plan: registered, answers per role, applies overrides, resolves aliases. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { OPERATIONS, callTool, listPrompts, listTools } from "./_surfaces.fixture.mjs";

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
  assert.match(text, /40 years/);
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

test("an aliased id is reachable by the tool but has no generated surface", async () => {
  // The adopted registry keeps legacy ids as aliases (`api-design` → backend,
  // `simplicity-staff-eng` → simplicity): no generated surface exists under
  // the old name, but the tool must still answer with the owning role.
  const names = new Set(listPrompts().map((prompt) => prompt.name));
  for (const operation of OPERATIONS) {
    assert.equal(names.has(`rule-${operation}-api-design`), false, "aliased ids stay out of the surfaces");
    assert.equal(names.has(`rule-${operation}-simplicity-staff-eng`), false, "aliased ids stay out of the surfaces");
  }
  const result = await callTool("rule_tool_plan", { role: "api-design" });
  assert.match(result.content.map((part) => part.text).join("\n"), /Backend and API Design Engineer/);
});
