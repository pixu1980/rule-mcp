

/**
 * @module test/tokensave-integration.test
 *
 * Verifies tokensave awareness: detection, the context-suppression helper, the
 * opt-out env var, and the gateway directive injection when a project ships a
 * .tokensave/ code graph.
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

console.log("=== Tokensave Integration Tests ===\n");

process.env.RULE_MCP_DISABLE_AUTO_ADR = "1";
process.env.RULE_MCP_NO_CACHE = "1"; // hermetic: deterministic tool behavior, not the cache
process.env.RULE_MCP_NO_AUTOUPDATE = "1"; // hermetic: no real git ops in tests

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectProject, hasTokensave } from "../index.js";
// eslint-disable-next-line no-unused-vars
import { suppressIfTokensave, tokensaveActive, TOKENSAVE_DIRECTIVE } from "../../agents/_integrations.js";
import { loadAllSkills } from "../../skills/index.js";
import { callTool } from "../../../tools/router/index.js";

// Project WITH a tokensave graph.
const withTs = mkdtempSync(join(tmpdir(), "rule-ts-"));
mkdirSync(join(withTs, ".tokensave"), { recursive: true });
writeFileSync(join(withTs, "package.json"), JSON.stringify({ name: "graphed", dependencies: { react: "18.0.0" } }));

// Project WITHOUT.
const withoutTs = mkdtempSync(join(tmpdir(), "rule-nots-"));
writeFileSync(join(withoutTs, "package.json"), JSON.stringify({ name: "plain", dependencies: { react: "18.0.0" } }));

// ── T1: detection ──
check("T1 hasTokensave true when .tokensave present", hasTokensave(withTs) === true);
check("T1.1 hasTokensave false when absent", hasTokensave(withoutTs) === false);
check("T1.2 detectProject exposes tokensave flag", detectProject(withTs).tokensave === true);

// ── T2: suppression helper ──
const heavy = Array.from({ length: 50 }, (_, index) => `line ${index}`).join("\n");
const suppressed = suppressIfTokensave(heavy, { projectDir: withTs, label: "file tree" });
check("T2 suppresses heavy block when active", suppressed.includes("TOKENSAVE ACTIVE") && !suppressed.includes("line 49"));
// Multi-source note: with no explicit dir, env var or cwd can activate
// tokensave - so the "inactive" scenario must run from a neutral cwd.
const prevCwd = process.cwd();
process.chdir(withoutTs);
const keptNeutral = suppressIfTokensave(heavy, { label: "file tree" });
process.chdir(prevCwd);
check("T2.1 keeps block verbatim when inactive", keptNeutral === heavy);

// ── T3: opt-out ──
process.env.RULE_MCP_NO_TOKENSAVE = "1";
check("T3 opt-out disables activation", tokensaveActive(withTs) === false);
delete process.env.RULE_MCP_NO_TOKENSAVE;
check("T3.1 activation restored after opt-out cleared", tokensaveActive(withTs) === true);

// ── T4: gateway injects the directive ──
await loadAllSkills();
const gw = await callTool("rule_tool_gateway", { prompt: "make a react button", path: withTs });
const gwText = gw.content.map((c) => c.text).join("\n");
check("T4 gateway emits tokensave directive for graphed project", gwText.includes("TOKENSAVE ACTIVE"));
// Run from the plain project so cwd-walk-up cannot re-activate tokensave.
const gwPrevCwd = process.cwd();
process.chdir(withoutTs);
const gw2 = await callTool("rule_tool_gateway", { prompt: "make a react button", path: withoutTs });
process.chdir(gwPrevCwd);
check(
  "T4.1 gateway omits directive for plain project",
  !gw2.content
    .map((c) => c.text)
    .join("\n")
    .includes("TOKENSAVE ACTIVE"),
);

console.log(`\nResults: ${pass} passed, ${fail} failed`);
setTimeout(() => process.exit(fail > 0 ? 1 : 0), 100);
