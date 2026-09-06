/**
 * @module test/scaffold-generate.test
 *
 * `rule_tool_scaffold mode=generate` could not produce a single file.
 *
 * It reads templates from a `## Project Scaffolding` section of
 * `rule-styleguide`, and that section did not exist. So every request
 * answered `File ".nvmrc" not found. Available: ...` against a hardcoded list of
 * files it could not actually produce, while `mode=list` advertised all of them.
 *
 * Three things are pinned here, because a template that exists is not the same
 * as a template that is right:
 *   - every advertised file generates something
 *   - what it generates passes the scaffold guardrail for that same file, so the
 *     generator and the checker cannot drift apart
 *   - an unknown file lists what is really there, not a hardcoded list
 */

import { checkCode } from "../../src/core/guardrails/index.js";
import { loadAllSkills } from "../../src/core/skills/_skills.js";
import { callTool } from "../../src/tools/router/index.js";

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

console.log("=== Scaffold generation ===\n");

process.env.RULE_MCP_NO_CACHE = "1";
await loadAllSkills(true);

const text = (result) => result.content.map((part) => part.text).join("\n");

const listed = text(await callTool("rule_tool_scaffold", { mode: "list" }))
  .split("\n")
  .map((line) => line.match(/^- `([^`]+)`/)?.[1])
  .filter(Boolean);

check("T1 the list advertises the config files", listed.length >= 8 && listed.includes(".npmrc"));

for (const file of listed) {
  const result = await callTool("rule_tool_scaffold", { mode: "generate", file });
  const body = text(result);
  check(`T2 ${file} generates content`, !result.isError && body.trim().length > 0);
  const report = checkCode("rule-styleguide", body, { fileName: file, mode: "scaffold" });
  const own = report.failed.filter((failure) => failure.id === `scaffold-${file.replace(/^[.]/, "")}`);
  check(`T2.1 ${file} passes its own scaffold guardrail`, own.length === 0);
}

// ── T3: the whole section, and an honest error ──
const all = text(await callTool("rule_tool_scaffold", { mode: "generate" }));
check(
  "T3 generating everything returns every file",
  listed.every((file) => all.includes(file)),
);
const missing = await callTool("rule_tool_scaffold", { mode: "generate", file: "vite.config.js" });
check("T3.1 an unknown file is an error", missing.isError === true);
check(
  "T3.2 and it lists what is really available",
  listed.every((file) => text(missing).includes(file)),
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exit(1);
}
