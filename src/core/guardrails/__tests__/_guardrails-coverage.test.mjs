

/**
 * @module test/guardrails-coverage.test
 *
 * Verifies guardrails are ALWAYS involved and enforce the core skill rules:
 *   - the baseline applies to every skill (frontend, backend, data, devops).
 *   - the shipped component templates carry the core rule principles - no CSS
 *     classes, no inline styles - across frameworks.
 *   - the JS/TS idiom guardrails fire on stale patterns and pass on the modern
 *     idioms the styleguide mandates.
 *
 * The component templates are data served through `rule://templates` (the
 * template tool was removed by ADR 115), so the check reads them where they
 * live rather than through a tool that no longer exists.
 */

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("=== Guardrails Coverage Tests ===\n");

process.env.RULE_MCP_DISABLE_AUTO_ADR = "1";
process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1"; // hermetic: no real git ops in tests

import { getGuardrails, checkCode, BASELINE_SKILLS, ownedGuardrails } from "../index.js";
import { loadAllSkills } from "../../skills/index.js";
import { getTemplate } from "../../scaffold/templates/index.js";

// The baseline now lives in the skills that own it (ADR 089); what every
// domain must still carry is the union of those skills' rules.
await loadAllSkills();
const sharedIds = BASELINE_SKILLS.flatMap((skill) => ownedGuardrails(skill).map((rule) => rule.id));

// ── T1: the baseline applies to EVERY domain ──
for (const skill of ["rule-frontend-react", "rule-frontend-vue", "rule-backend-express", "rule-data-postgresql", "rule-devops-docker", "rule-styleguide"]) {
  const ids = new Set(getGuardrails(skill).map((g) => g.id));
  check(
    `T1 ${skill} includes the whole baseline`,
    sharedIds.every((id) => ids.has(id)),
  );
}

// ── T2/T3: the shipped templates exist and hold the core principles ──
const CORE_IDS = new Set(["no-css-classes", "no-inline-styles"]);
for (const [component, framework, skill] of [
  ["button", "react", "rule-frontend-react"],
  ["card", "vue", "rule-frontend-vue"],
  ["button", "vanilla", "rule-styleguide"],
]) {
  const template = getTemplate(component, framework);
  const code = typeof template === "string" ? template : [template?.html, template?.css].filter(Boolean).join("\n");
  check(`T2 ${component}/${framework} template is shipped`, typeof code === "string" && code.length > 0);

  const report = checkCode(skill, code, { framework, isComponent: true });
  const failedCore = report.failed.filter((f) => CORE_IDS.has(f.id));
  check(`T3 ${component}/${framework} passes core principles (no classes/inline styles)`, failedCore.length === 0);
}

// ── T4: JS/TS idiom guardrails (eslint-plugin-unicorn rules) fire on stale
//    patterns and pass on the modern idioms the styleguide mandates. ──
const JS_IDIOM_IDS = ["js-prefer-set-has", "js-no-array-for-each", "js-node-protocol", "js-throw-new-error", "js-prefer-replace-all", "js-array-flat-map", "js-new-for-builtins"];
const BAD_JS = `const allowed = ['read', 'write'];
const granted = requested.filter((scope) => allowed.includes(scope));
users.forEach((user) => sendEmail(user));
import fs from 'fs';
throw Error('boom');
str.replace(/-/g, ' ');
rows.map((r) => r.cells).flat();
const cache = Map();`;
const badReport = checkCode("rule-styleguide-javascript", BAD_JS, { fileName: "demo.js", framework: "vanilla" });
for (const id of JS_IDIOM_IDS) {
  check(
    `T4 ${id} fires on non-idiomatic JS`,
    badReport.failed.some((f) => f.id === id),
  );
}
const GOOD_JS = `const allowed = new Set(['read', 'write']);
const granted = requested.filter((scope) => allowed.has(scope));
for (const user of users) {
  sendEmail(user);
}
import fs from 'node:fs';
throw new Error('boom');
str.replaceAll('-', ' ');
rows.flatMap((r) => r.cells);
const cache = new Map();`;
const goodReport = checkCode("rule-styleguide-javascript", GOOD_JS, { fileName: "demo.js", framework: "vanilla" });
const goodFailed = new Set(goodReport.failed.map((f) => f.id));
for (const id of JS_IDIOM_IDS) {
  check(`T4 ${id} passes idiomatic JS`, !goodFailed.has(id));
}

console.log(`\nResults: ${pass} passed, ${fail} failed`);
setTimeout(() => process.exit(fail > 0 ? 1 : 0), 100);
