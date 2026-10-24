// Invariant 2: the home directory cannot add, rename, or shadow a tool.
import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";

import { home, runWithHome, surface } from "./_surface.fixture.mjs";

test.after(() => rmSync(home, { recursive: true, force: true }));

test("a stale brand directory in ~/.agents/skills adds no tool", () => {
  assert.ok(!surface.skills.includes("rule-mcp-outdated-brand"));
  assert.ok(!surface.tools.includes("rule_tool_rule_mcp_outdated_brand"));
});

test("a generic third-party skill in ~/.agents/skills adds no tool", () => {
  assert.ok(!surface.tools.includes("rule_tool_test_driven_development"));
  assert.ok(!surface.tools.includes("rule_tool_evil_plugin"));
});

test("a home copy cannot shadow the content of an embedded skill", async () => {
  const script = `
    const { readSkill } = await import(${JSON.stringify(new URL("../../../tools/router/index.js", import.meta.url).href)});
    process.stdout.write(readSkill("rule-mcp-frontend-react") ?? "");
  `;
  const content = runWithHome(script);
  assert.doesNotMatch(content, /SHADOWED/, "embedded skill content is authoritative");
  assert.ok(content.length > 100, "the embedded skill must still be readable");
});
