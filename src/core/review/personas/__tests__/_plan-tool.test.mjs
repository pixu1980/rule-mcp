

/** rule_tool_plan: registered, answers per role, applies overrides, resolves aliases. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { callTool, listPrompts, listTools } from "./_surfaces.fixture.mjs";

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
  // Tool results pass through text compression, which drops articles: the
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

test("audit and review tools pin their operation", async () => {
  const audit = await callTool("rule_tool_audit", { role: "a11y" });
  const auditText = audit.content.map((part) => part.text).join("\n");
  assert.match(auditText, /## The operation: audit/, "rule_tool_audit pins the audit operation");

  const review = await callTool("rule_tool_review", { role: "a11y" });
  const reviewText = review.content.map((part) => part.text).join("\n");
  assert.match(reviewText, /## The operation: audit, then review/, "rule_tool_review pins the review operation, audit included (ADR 120)");
});

test("rule_tool_plan detects tokensave in the project dir for a scoped run", async () => {
  // Assertions stay on headings and inline-code tokens: tool results pass
  // through text compression, which never touches either.
  const box = mkdtempSync(join(tmpdir(), "rule-mcp-plan-"));

  try {
    const before = await callTool("rule_tool_plan", { role: "security", operation: "audit", topic: "SSE daemon", projectDir: box });
    const beforeText = before.content.map((part) => part.text).join("\n");
    assert.match(beforeText, /## Resolve the scope/, "a scoped run maps its scope first");
    assert.match(beforeText, /tokensave_status/, "without .tokensave/ availability is checked at run time");

    mkdirSync(join(box, ".tokensave"));
    writeFileSync(join(box, ".tokensave", "tokensave.db"), "");
    const after = await callTool("rule_tool_plan", { role: "security", operation: "audit", topic: "SSE daemon", projectDir: box });
    const afterText = after.content.map((part) => part.text).join("\n");
    assert.match(afterText, /initialized/, "with .tokensave/ the prompt states availability");
    assert.match(afterText, /Graph health/, "the graph checklist rides with an available graph");
    assert.ok(!afterText.includes("tokensave_status"), "no availability check when the generator already knows");
  } finally {
    rmSync(box, { recursive: true, force: true });
  }
});

test("an aliased id is reachable by the tool but has no generated surface", async () => {
  // The adopted registry keeps legacy ids as aliases (`api-design` -> backend,
  // `simplicity-staff-eng` -> simplicity): no generated surface exists under
  // the old name, but the tool must still answer with the owning role.
  const names = new Set(listPrompts().map((prompt) => prompt.name));
  for (const aliased of ["rule-mcp-persona-api-design", "rule-mcp-persona-simplicity-staff-eng"]) {
    assert.equal(names.has(aliased), false, "aliased ids stay out of the surfaces");
  }
  const result = await callTool("rule_tool_plan", { role: "api-design" });
  assert.match(result.content.map((part) => part.text).join("\n"), /Backend and API Design Engineer/);
});
