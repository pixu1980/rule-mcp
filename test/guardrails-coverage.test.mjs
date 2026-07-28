/**
 * @module test/guardrails-coverage.test
 *
 * Verifies guardrails are ALWAYS involved and enforce the core skill rules:
 *   - SHARED_GUARDRAILS apply to every skill (frontend, backend, data, devops).
 *   - pix_component generation self-validates and always emits a guardrail
 *     summary (guardrails involved even without an explicit pix_check call).
 *   - The core rule principles — no CSS classes, no inline styles — pass on
 *     generated component templates across frameworks.
 */

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
};

console.log("=== Guardrails Coverage Tests ===\n");

process.env.RULE_MCP_DISABLE_AUTO_ADR = "1";
process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1"; // hermetic: no real git ops in tests

import { getGuardrails, checkCode } from "../src/core/guardrails.js";
import { SHARED_GUARDRAILS } from "../src/core/guardrail-defs.js";
import { loadAllSkills } from "../src/core/skills.js";
import { callTool } from "../src/tools/router.js";

const sharedIds = SHARED_GUARDRAILS.map((g) => g.id);

// ── T1: SHARED_GUARDRAILS apply to EVERY domain ──
for (const skill of [
  "rule-frontend-react",
  "rule-frontend-vue",
  "rule-backend-express",
  "rule-data-postgresql",
  "rule-devops-docker",
  "rule-styleguide",
]) {
  const ids = new Set(getGuardrails(skill).map((g) => g.id));
  check(`T1 ${skill} includes all shared guardrails`, sharedIds.every((id) => ids.has(id)));
}

// ── T2: component generation always involves guardrails ──
await loadAllSkills();
for (const [component, framework] of [["button", "react"], ["card", "vue"], ["button", "vanilla"]]) {
  const r = await callTool("pix_component", { component, framework });
  const text = r.content.map((c) => c.text).join("\n");
  check(`T2 ${component}/${framework} output carries a guardrail summary`, text.includes("## Guardrails"));
}

// ── T3: core principles hold on generated templates ──
const CORE_IDS = ["no-css-classes", "no-inline-styles"];
for (const [component, framework, skill] of [
  ["button", "react", "rule-frontend-react"],
  ["button", "vanilla", "rule-styleguide"],
  ["card", "vue", "rule-frontend-vue"],
]) {
  const tmpl = await callTool("pix_component", { component, framework });
  // Extract fenced code from the output for a faithful check.
  const code = tmpl.content.map((c) => c.text).join("\n").match(/```[a-z]*\n([\s\S]*?)```/gi)
    ?.map((b) => b.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "")).join("\n") ?? "";
  const report = checkCode(skill, code, { framework, isComponent: true });
  const failedCore = report.failed.filter((f) => CORE_IDS.includes(f.id));
  check(`T3 ${component}/${framework} passes core principles (no classes/inline styles)`, failedCore.length === 0);
}

console.log(`\nResults: ${pass} passed, ${fail} failed`);
setTimeout(() => process.exit(fail > 0 ? 1 : 0), 100);
