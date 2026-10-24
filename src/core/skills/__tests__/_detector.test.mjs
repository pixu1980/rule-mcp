/**
 * @module test/detector.test
 *
 * TDD tests for project framework auto-detector (Phase 3.2).
 * rule_tool_detect tool should read package.json and return project profile.
 */

import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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

console.log("=== Project Framework Detector ===\n");

process.env.RULE_MCP_DISABLE_AUTO_ADR = "1";
process.env.RULE_MCP_NO_CACHE = "1"; // hermetic: deterministic tool behavior, not the cache
process.env.RULE_MCP_NO_AUTOUPDATE = "1"; // hermetic: no real git ops in tests

import { loadAllSkills } from "../index.js";
// eslint-disable-next-line no-unused-vars
import { callTool, registerTool } from "../../../tools/router/index.js";
import { detectProject } from "../../detector/index.js";

await loadAllSkills();

// ── T4: rule_tool_detect tool exists and returns project profile ──
const tools = (await import("../../../tools/router/index.js")).listTools();
const hasDetect = tools.some((t) => t.name === "rule_tool_detect");
check("T4 rule_tool_detect tool registered", hasDetect);

// ── T4b: rule_tool_detect suggests registered thematic skill tools ──
const detectTmpDir = mkdtempSync(join(tmpdir(), "rule-mcp-detect-tool-"));
writeFileSync(
  join(detectTmpDir, "package.json"),
  JSON.stringify({
    name: "detect-react-app",
    dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
  }),
);
const detectToolResult = await callTool("rule_tool_detect", { path: detectTmpDir });
const detectPayload = JSON.parse(detectToolResult.content[0].text);
check("T4b suggested skill uses existing thematic name", detectPayload.suggested_skills.includes("rule-mcp-frontend-react"));
check(
  "T4b suggested tool is registered",
  tools.some((t) => t.name === detectPayload.suggested_tools[0]),
);
check("T4b suggested tool uses thematic name", detectPayload.suggested_tools[0] === "rule_tool_frontend_react");
rmSync(detectTmpDir, { recursive: true, force: true });

// ── T5: Detects React from package.json ──
const tmpDir = mkdtempSync(join(tmpdir(), "rule-mcp-detect-"));
writeFileSync(
  join(tmpDir, "package.json"),
  JSON.stringify({
    name: "my-app",
    dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
    devDependencies: { vite: "^5.0.0", typescript: "^5.0.0" },
  }),
);

const r1 = detectProject(tmpDir);
check("T5 detector returns object", typeof r1 === "object");
check("T5.1 detects React", r1.framework === "react");
check("T5.2 detects TypeScript", r1.typescript === true);
check("T5.3 detects Vite", r1.buildTool === "vite");
check("T5.4 has name", r1.projectName === "my-app");

// ── T5b: Detects Vue ──
writeFileSync(
  join(tmpDir, "package.json"),
  JSON.stringify({
    name: "vue-app",
    dependencies: { vue: "^3.0.0" },
    devDependencies: { vite: "^5.0.0" },
  }),
);
const r2 = detectProject(tmpDir);
check("T5b detects Vue", r2.framework === "vue");

// ── T5c: Detects Svelte ──
writeFileSync(
  join(tmpDir, "package.json"),
  JSON.stringify({
    name: "svelte-app",
    dependencies: { svelte: "^4.0.0" },
  }),
);
const r3 = detectProject(tmpDir);
check("T5c detects Svelte", r3.framework === "svelte");

// ── T5d: Detects Angular ──
writeFileSync(
  join(tmpDir, "package.json"),
  JSON.stringify({
    name: "ng-app",
    dependencies: { "@angular/core": "^17.0.0" },
  }),
);
const r4 = detectProject(tmpDir);
check("T5d detects Angular", r4.framework === "angular");

// ── T5e: Detects plain JS (no framework) ──
writeFileSync(
  join(tmpDir, "package.json"),
  JSON.stringify({
    name: "plain-js",
    dependencies: { lodash: "^4.0.0" },
  }),
);
const r5 = detectProject(tmpDir);
check("T5e detects no framework (vanilla)", r5.framework === "vanilla");

// ── T5f: Handles missing package.json ──
rmSync(join(tmpDir, "package.json"));
const r6 = detectProject(tmpDir);
check("T5f handles missing package.json", r6.framework === "vanilla" && r6.projectName === "unknown");

// Cleanup
rmSync(tmpDir, { recursive: true, force: true });

console.log(`\nResults: ${pass} passed, ${fail} failed`);
setTimeout(() => process.exit(fail > 0 ? 1 : 0), 100);
