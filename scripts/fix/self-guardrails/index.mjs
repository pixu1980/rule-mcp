#!/usr/bin/env node


/**
 * One-shot style fixer for the repo's own guardrail rules (self-guardrails,
 * F-A1 discipline). The passes themselves live in `src/core/fix/` so this
 * script, the `rule_tool_fix` tool and the `/rule-mcp-fix` command all run the same
 * code:
 *
 *  - js-blank-line-before-return: blank line before `return` unless first-in-block/continuation
 *  - js-const-top: blank line after the last declaration of a scope's top group
 *  - js-blank-lines-blocks: blank lines around if/for/while/switch/try blocks and after closing braces
 *  - js-for-loop-braces: split single-line for bodies
 *  - js-single-line-method: split single-line method bodies
 *  - js-if-braces: add braces to braceless if/for
 *  - js-no-inline-blocks: split `{ ... }` on one line
 *  - js-blank-line-between-methods: blank between class methods
 *  - fp-*: plain ASCII typography, American spelling (prose only)
 *
 * Run: node scripts/fix/self-guardrails/index.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";

import { applyJsStyle } from "../../../src/core/guardrails/fix/index.js";
import { trackedFiles } from "../_tracked.mjs";

const dryRun = process.argv.includes("--dry-run");
const files = trackedFiles(["src/**/*.js"]);

let touched = 0;
for (const file of files) {
  try {
    const before = readFileSync(file, "utf8");
    const { text, changed } = applyJsStyle(before);

    if (changed && text !== before) {
      touched++;
      if (!dryRun) {
        writeFileSync(file, text);
      }
      console.log(`  fixed ${file}`);
    }
  } catch {
    /* skip unreadable */
  }
}
console.log(`\n${dryRun ? "would fix" : "fixed"} ${touched} files`);
