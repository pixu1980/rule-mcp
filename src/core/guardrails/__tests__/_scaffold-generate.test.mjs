

/**
 * @module test/scaffold-generate.test
 *
 * Unit coverage for the scaffold generator module (ADR 115: `rule_tool_scaffold`
 * is no longer on the public MCP surface; callers use `/rule-area-styleguide*`).
 * The module still exists, so its generate/list contract stays pinned here.
 *
 * Three things are pinned:
 *   - every advertised file generates something
 *   - what it generates passes the scaffold guardrail for that same file
 *   - an unknown file lists what is really there, not a hardcoded list
 */

import { checkCode } from "../index.js";
import { loadAllSkills } from "../../skills/index.js";
import { callTool } from "../../../tools/router/index.js";
import { registerScaffoldTool } from "../../../tools/skill/index.js";
import "./_install.fixture.mjs";

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
registerScaffoldTool();

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
