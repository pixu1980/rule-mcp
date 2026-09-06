/**
 * Hardening 1.1 (F-S1): every guardrail stays linear on adversarial input.
 *
 * The 2026-09-03 audit measured 67 s on ~200 KB of brace runs
 * (a11y-focus-visible: an ambiguous class re-scanned per position). This
 * corpus runs every unique guardrail against the shapes that trigger
 * catastrophic backtracking - long space/tab runs, brace runs, long single
 * lines, attribute stuffing - under a hard time budget, so a quadratic
 * pattern fails CI before it ships.
 */
import { strict as assert } from "node:assert";
import { readdirSync } from "node:fs";
import test from "node:test";

import { checkCode, getGuardrails } from "../../src/core/guardrails/index.js";
import { loadAllSkills } from "../../src/core/skills/index.js";

await loadAllSkills();

const KB = 1024;
const shape = (unit, bytes) => unit.repeat(Math.ceil(bytes / unit.length));
const SHAPES = (bytes) => ({
  spaces: shape(" ".repeat(2000) + "\n", bytes),
  tabsMix: shape("\t ".repeat(1000) + "x\n", bytes),
  braces: shape("{".repeat(500) + "a:b;".repeat(250) + "\n", bytes),
  attrs: shape('<div class="' + "a ".repeat(800) + '">\n', bytes),
  css: shape("a{color:red;padding:" + "0 ".repeat(800) + "}\n", bytes),
  longline: "a".repeat(bytes),
});

test("the 200 KB reproducer completes fast without the size cap", () => {
  const reproducer = SHAPES(200 * KB).braces;
  const started = performance.now();
  const result = checkCode("rule-styleguide-css", reproducer, { fileName: "adv.css" });
  const elapsed = performance.now() - started;
  assert.equal(result.inputTooLarge, undefined, "200 KB is under the cap - the patterns themselves must hold");
  assert.ok(elapsed < 2000, `reproducer took ${Math.round(elapsed)}ms; the audit baseline was 67000ms`);
});

test("every guardrail is linear on the adversarial corpus", () => {
  const shapes = Object.entries(SHAPES(64 * KB));
  const seen = new Set();
  const slow = [];
  const started = performance.now();
  for (const skill of readdirSync(new URL("../../skills", import.meta.url))) {
    let rails;
    try {
      rails = getGuardrails(skill);
    } catch {
      continue;
    }
    for (const g of rails) {
      if (seen.has(g.id)) {
        continue;
      }
      seen.add(g.id);
      for (const [name, input] of shapes) {
        const t0 = performance.now();
        try {
          g.check(input, { fileName: "adv.css" });
        } catch {
          /* time is the assertion, not the verdict */
        }
        const ms = performance.now() - t0;
        if (ms > 250) {
          slow.push(`${g.id}/${name}: ${Math.round(ms)}ms`);
        }
      }
    }
  }
  const total = performance.now() - started;
  assert.deepEqual(slow, [], `guardrails above the per-shape budget: ${slow.join(", ")}`);
  assert.ok(seen.size > 50, `corpus must cover the full rule set, saw ${seen.size}`);
  assert.ok(total < 20_000, `corpus total ${Math.round(total)}ms exceeds the overall budget`);
});
