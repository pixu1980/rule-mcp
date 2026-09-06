/**
 * Hardening 0.1 (F-S1 partial): checkCode rejects oversize input fast.
 *
 * The 2026-09-03 audit measured 67 s of synchronous regex time on ~200 KB of
 * adversarial input. Guardrails were never meant for generated bundles: any
 * input above the cap is refused with a clear message instead of being
 * scanned, and the refusal must be near-instant.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { checkCode, MAX_CHECK_INPUT_BYTES } from "../../src/core/guardrails/index.js";

const adversarial = (bytes) => {
  // Nested-quantifier bait repeated far past the cap.
  const unit = "const a = { b: 'c' };\n" + "\t ".repeat(40) + "// x\n";
  return unit.repeat(Math.ceil(bytes / unit.length));
};

test("the cap constant is 256 KiB", () => {
  assert.equal(MAX_CHECK_INPUT_BYTES, 256 * 1024);
});

test("oversize input is refused with the cap message, not scanned", () => {
  const oversize = adversarial(MAX_CHECK_INPUT_BYTES + 1024);
  const started = process.hrtime.bigint();
  const result = checkCode("rule-styleguide-css", oversize, { fileName: "a.css" });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  assert.ok(elapsedMs < 100, `refusal took ${elapsedMs}ms, budget is 100ms`);
  assert.equal(result.allPass, false);
  assert.equal(result.inputTooLarge, true);
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].id, "input-size-cap");
  assert.match(result.summary, /256 KiB/);
  assert.match(result.summary, /smaller units/i);
});

test("input at the cap is checked normally", () => {
  const result = checkCode("rule-styleguide-css", "a { color: red; }", { fileName: "a.css" });
  assert.equal(result.inputTooLarge, undefined);
  assert.ok(result.total > 0);
});
