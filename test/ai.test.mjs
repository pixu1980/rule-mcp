/**
 * @module test/ai.test
 *
 * TDD tests for context-aware skill routing (Phase 3.1).
 * rule should return structured JSON with route, confidence,
 * sections, and next_tools, not plain text.
 */

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
};

console.log("=== rule Routing Tests ===\n");

process.env.RULE_MCP_DISABLE_AUTO_ADR = "1";
process.env.RULE_MCP_NO_CACHE = "1"; // hermetic: deterministic tool behavior, not the cache
process.env.RULE_MCP_NO_AUTOUPDATE = "1"; // hermetic: no real git ops in tests

import { loadAllSkills } from "../src/core/skills.js";
import { callTool } from "../src/tools/router.js";

await loadAllSkills();

// ── T1: rule returns structured JSON ──
const r1 = await callTool("pix_tool", { prompt: "I need a React button component" });
const text = r1.content?.[0]?.text ?? "";
check("T1 returns content", text.length > 0);

// Try to parse as JSON — new format should be JSON
let parsed = false;
try {
  parsed = JSON.parse(text);
} catch {
  // Old plain text format — will need update
}

if (parsed) {
  check("T1.1 JSON response has route", typeof parsed.route === "string");
  check("T1.2 JSON has confidence", typeof parsed.confidence === "number");
  check("T1.3 JSON has sections array", Array.isArray(parsed.sections));
  check("T1.4 JSON has next_tools array", Array.isArray(parsed.next_tools));
} else {
  check("T1.1 JSON response (will fix)", false);
}

// ── T2: Returns only relevant sections, not full files ──
check("T2 response size reasonable (under 8KB)", text.length < 8000);

// ── T3: Multi-skill query ──
const r2 = await callTool("pix_tool", { prompt: "React accessibility components" });
const text2 = r2.content?.[0]?.text ?? "";

let parsed2 = false;
try {
  parsed2 = JSON.parse(text2);
} catch {}

if (parsed2) {
  const allRoutes = [parsed2.route, ...(parsed2.alternatives || []).map(a => a.route)];
  const hasReact = allRoutes.some(r => r?.includes("rule-frontend-react"));
  check("T3 multi-skill: React routes", hasReact);
}

// ── T3.1: Pure accessibility query routes to styleguides ──
const r3 = await callTool("pix_tool", { prompt: "accessibility guidelines a11y WCAG standards" });
const text3 = r3.content?.[0]?.text ?? "";
let parsed3 = false;
try {
  parsed3 = JSON.parse(text3);
} catch {}
if (parsed3) {
  const allRoutes = [parsed3.route, ...(parsed3.alternatives || []).map(a => a.route)];
  const hasA11y = allRoutes.some(r => r?.includes("rule-styleguide"));
  check("T3.1 a11y query routes to styleguides", hasA11y);
}

// ── T4: Low-confidence prompt returns route:"unknown" without erroring ──
// Regression guard for F1: enforcement.validateRouterResult must not reject the
// "unknown" route the handler emits when no skill matches confidently.
const r4 = await callTool("pix_tool", { prompt: "zzzzz qqqqq wwwww xxxxx" });
check("T4 low-confidence prompt does not error", r4.isError !== true);
let parsed4 = false;
try {
  parsed4 = JSON.parse(r4.content?.[0]?.text ?? "");
} catch {}
check("T4.1 low-confidence prompt routes to 'unknown'", parsed4 && parsed4.route === "unknown");

console.log(`\nResults: ${pass} passed, ${fail} failed`);
setTimeout(() => process.exit(fail > 0 ? 1 : 0), 100);
