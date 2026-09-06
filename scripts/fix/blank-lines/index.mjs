/**
 * Rule-exact self-guardrails fixer: mirrors the DETECTORS in
 * framework.js/shared.js so it inserts a blank line exactly where the rule
 * reports one, and nowhere else. Run: node scripts/fix-blank-lines.mjs --safe
 * <files...>
 */
import { readFileSync, writeFileSync } from "node:fs";

import { fix_const_top, fix_returns } from "./_declarations.mjs";
import { fix_blocks, fix_between_methods } from "./_blocks.mjs";

const SAFE = process.argv.includes("--safe");
const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));

let touched = 0;
for (const file of files) {
  let lines = readFileSync(file, "utf8").split("\n");
  let any = false;
  for (const pass of [fix_returns, fix_const_top, fix_between_methods, fix_blocks]) {
    const [out, changed] = pass(lines);
    lines = out;
    any ||= changed;
  }
  const fixed = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  if (any && fixed !== readFileSync(file, "utf8")) {
    writeFileSync(file, fixed);
    touched++;
    console.log("fixed", file);
  }
}
console.log(`${touched} files updated`);
