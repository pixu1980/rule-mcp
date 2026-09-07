/** Generated component templates pass their own flex-first rule. */
import { run } from "./_flex.fixture.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";

// ── What the server generates ─────────────────────────────────────
test("generated components pass their own rule", async () => {
  const { loadAllSkills } = await import("../../../src/core/skills/index.js");
  const { callTool } = await import("../../../src/tools/router/index.js");
  await loadAllSkills();

  for (const component of ["button", "card", "modal", "list", "nav", "form", "table"]) {
    for (const framework of ["vanilla", "react", "vue", "svelte"]) {
      const result = await callTool("rule_tool_component", { component, framework });
      const text = result.content.map((c) => c.text).join("\n");
      const verdict = run(text, "");
      assert.equal(verdict.pass, true, `${component}/${framework} generates an unjustified grid: ${verdict.detail}`);
    }
  }
});

// ── What the skills teach ─────────────────────────────────────────

/** Every markdown file under skills/, recursively. */
