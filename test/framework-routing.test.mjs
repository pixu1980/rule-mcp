/**
 * @module test/framework-routing.test
 *
 * TDD tests for framework-biased routing.
 * rule should boost scores for skills matching the detected
 * or explicitly provided framework.
 */

import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
};

console.log("=== Framework-Biased Routing ===\n");

process.env.RULE_MCP_DISABLE_AUTO_ADR = "1";
process.env.RULE_MCP_NO_CACHE = "1"; // hermetic: deterministic tool behavior, not the cache
process.env.RULE_MCP_NO_AUTOUPDATE = "1"; // hermetic: no real git ops in tests

import { loadAllSkills } from "../src/core/skills.js";
import { callTool } from "../src/tools/router.js";

await loadAllSkills();

// Helper to collect all routes from a response (primary + alternatives)
function getAllRoutes(parsed) {
  return [parsed.route, ...(parsed.alternatives || []).map(a => a.route)];
}

// ── T6: framework bias boosts matching skill ──
// Without framework, rule-frontend-react should appear in top results for a React query
const r = await callTool("pix_tool", { prompt: "How do I create a React button component?" });
const parsed = JSON.parse(r.content[0].text);
const allRoutes = getAllRoutes(parsed);
check("T6 defaults: rule-frontend-react in top results", allRoutes.includes("rule-frontend-react"));

// Now with framework="vue" — rule-frontend-vue should rank higher
const rVue = await callTool("pix_tool", { prompt: "Vue 3 component with Composition API", framework: "vue" });
const parsedVue = JSON.parse(rVue.content[0].text);
const vueRoutes = getAllRoutes(parsedVue);
check("T6.1 vue bias: rule-frontend-vue in results", vueRoutes.includes("rule-frontend-vue"));
check("T6.2 vue bias: rule-frontend-vue is primary route with bias", parsedVue.route === "rule-frontend-vue");

// ── T6.3: framework bias with path auto-detection ──
const tmpDir = mkdtempSync(join(tmpdir(), "rule-fw-"));
writeFileSync(join(tmpDir, "package.json"), JSON.stringify({
  name: "svelte-app",
  dependencies: { svelte: "^5.0.0" },
  devDependencies: { vite: "^6.0.0" },
}));

const rPath = await callTool("pix_tool", {
  prompt: "How do I create a button component?",
  path: tmpDir,
});
const parsedPath = JSON.parse(rPath.content[0].text);
const pathRoutes = getAllRoutes(parsedPath);
check("T6.3 auto-detect: rule-frontend-svelte in results", pathRoutes.includes("rule-frontend-svelte"));

// ── T6.4: explicit framework overrides path detection ──
writeFileSync(join(tmpDir, "package.json"), JSON.stringify({
  name: "angular-app",
  dependencies: { "@angular/core": "^19.0.0" },
}));
const rOverride = await callTool("pix_tool", {
  prompt: "How do I create a button component?",
  framework: "react",
  path: tmpDir,
});
const parsedOverride = JSON.parse(rOverride.content[0].text);
const overrideRoutes = getAllRoutes(parsedOverride);
check("T6.4 explicit framework overrides path: rule-frontend-react in results", overrideRoutes.includes("rule-frontend-react"));

// Cleanup
rmSync(tmpDir, { recursive: true, force: true });

console.log(`\nResults: ${pass} passed, ${fail} failed`);
setTimeout(() => process.exit(fail > 0 ? 1 : 0), 100);
