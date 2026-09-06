#!/usr/bin/env node
/**
 * docs-scan.mjs - Scans docs/ for stale `pix_` tool references.
 *
 * Run after refactoring/renaming tools to ensure docs are up to date.
 * Usage: node test/docs-scan.mjs
 */

import { validateTrio } from "../../src/core/review/_docs.js";
import { loadAllSkills } from "../../src/core/skills/_skills.js";
import { listTools } from "../../src/tools/router/index.js";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

await loadAllSkills();
const tools = new Set(listTools().map((x) => x.name));
const archivalDirectories = new Set(["adr", "handoff", "plans", "reports"]);

function scan(dir) {
  let stale = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (
      e.isDirectory() &&
      !["node_modules", ".git", ".context", ".tokensave", ".pi"].includes(e.name) &&
      !archivalDirectories.has(e.name)
    ) {
      stale += scan(p);
    } else if (e.name.endsWith(".md")) {
      const c = readFileSync(p, "utf8");
      const lines = c.split("\n");
      for (const [index, line] of lines.entries()) {
        for (const m of line.matchAll(/\bpix_[a-z0-9_]+\b/g)) {
          if (tools.has(m[0]) || m[0] === "rule-mcp" || m[0] === "rule_tool_process_handoff") {
            continue;
          }

          console.log("STALE:", p + ":" + (index + 1) + " " + m[0]);
          stale++;
        }
      }
    }
  }
  return stale;
}

const total = scan("docs");
console.log(
  total === 0 ? "✅ ALL CLEAN - 0 stale references across live docs/" : "❌ " + total + " stale references found",
);

// Persona trios are checked here too (personas C.3): a review that lost its
// audit, a plan whose steps point at findings nobody has open, a document that
// cannot say when it was written.
const trio = validateTrio({ projectDir: "." });
for (const problem of trio) {
  console.log("TRIO:", problem.file + " " + problem.reason);
}
console.log(
  trio.length === 0
    ? "✅ TRIO CLEAN - 0 problems in docs/audits, reviews, plans"
    : "❌ " + trio.length + " trio problems found",
);
process.exit(total + trio.length > 0 ? 1 : 0);
