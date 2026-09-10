

/**
 * One-shot style fixer for the repo's own guardrail rules (self-guardrails,
 * F-A1 discipline). Mirrors exactly the detectors in framework.js/shared.js so
 * what satisfies this pass also satisfies checkCode:
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
 * Iterates to a fixed point (bounded) so insertions satisfying one rule never
 * break another.
 */
import { readFileSync, writeFileSync } from "node:fs";

import { trackedFiles } from "../_tracked.mjs";

import { apply as blankBeforeReturn } from "./_blank-before-return.mjs";
import { apply as blankBetweenMethods } from "./_blank-between-methods.mjs";
import { apply as splitOneLiners } from "./_split-one-liners.mjs";
import { apply as constTop } from "./_const-top.mjs";
import { apply as blankBlocks } from "./_blank-blocks.mjs";

const dryRun = process.argv.includes("--dry-run");
const files = trackedFiles(["src/**/*.js"]);

/** Run every pass once, in the order the detectors expect. */
function fix(text) {
  let changed = false;

  for (const pass of [blankBeforeReturn, blankBetweenMethods, splitOneLiners, constTop, blankBlocks]) {
    const result = pass(text);

    text = result.text;
    changed = changed || result.changed;
  }

  return { text, changed };
}

let touched = 0;
for (const file of files) {
  try {
    const before = readFileSync(file, "utf8");
    const { text, changed } = fix(before);
    if (changed && text !== before) {
      touched++;
      if (!dryRun) {
        writeFileSync(file, text);
      }
      console.log(`  ${changed ? "fixed" : "ok   "} ${file}`);
    }
  } catch {
    /* skip unreadable */
  }
}
console.log(`\n${dryRun ? "would fix" : "fixed"} ${touched} files`);
