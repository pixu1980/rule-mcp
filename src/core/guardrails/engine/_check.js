

/** @module core/guardrails/engine/check - run every applicable rule over one body of code */

import { getGuardrails } from "./_registry.js";
import { GUARDRAIL_HELPERS } from "../_helpers.js";

/**
 * Hard cap on the input handed to guardrail regexes. Above it the check is
 * refused outright: pattern time grows super-linearly on adversarial input
 * (67 s measured on ~200 KB) and the regexes run synchronously on the only
 * thread, so a size gate is the one defense that cannot be backtracked around.
 */
export const MAX_CHECK_INPUT_BYTES = 256 * 1024;

/**
 * Run every guardrail for a skill over a body of code.
 *
 * @param {string} skillName
 * @param {string} code
 * @param {object} [context]
 * @returns {object} the check report
 */
export function checkCode(skillName, code, context = {}) {
  // A rule imports nothing: what it needs arrives here (ADR 079). The caller's
  // own context wins, so a test can hand a rule a different bag on purpose.
  const withHelpers = { helpers: GUARDRAIL_HELPERS, ...context };

  // Refuse oversize input fast instead of scanning it (hardening 0.1).
  if (typeof code === "string" && Buffer.byteLength(code, "utf8") > MAX_CHECK_INPUT_BYTES) {
    return {
      skill: skillName,
      total: 1,
      passCount: 0,
      failCount: 1,
      skippedCount: 0,
      passed: [],
      failed: [
        {
          id: "input-size-cap",
          wcag: "",
          label: "Input exceeds the size cap",
          failCount: 1,
          detail: [`Input is ${Buffer.byteLength(code, "utf8")} bytes; the cap is ${MAX_CHECK_INPUT_BYTES} (256 KiB).`],
          suggestion: "Split the input into smaller units (256 KiB cap), or exclude generated/vendored files.",
        },
      ],
      skipped: [],
      inputTooLarge: true,
      summary: "❌ Refused to check: input exceeds the 256 KiB cap. Split it into smaller units.",
      allPass: false,
      previousPassed: [],
    };
  }

  const guardrails = getGuardrails(skillName, context?.mode);
  const previousPassed = new Set(); // ← always start fresh - no client bypass

  const results = guardrails.map((g) => {
    if (previousPassed.has(g.id)) {
      return {
        id: g.id,
        label: g.label,
        pass: true,
        failCount: 0,
        detail: [],
        suggestion: "",
        note: "Skipped - previously passed",
        skipped: true,
      };
    }

    const result = g.check(code, withHelpers);

    return {
      id: g.id,
      label: g.label,
      wcag: g.wcag || "",
      pass: result.pass,
      failCount: result.failCount || 0,
      detail: result.detail || [],
      suggestion: result.suggestion || "",
      note: result.note || "",
      skipped: false,
    };
  });

  const passed = results.filter((r) => r.pass && !r.skipped);
  const failed = results.filter((r) => !r.pass);
  const skipped = results.filter((r) => r.skipped);

  const newPassed = [...passed.map((r) => r.id)];

  return {
    skill: skillName,
    total: guardrails.length,
    passCount: passed.length,
    failCount: failed.length,
    skippedCount: skipped.length,
    passed: passed.map((r) => ({ id: r.id, label: r.label })),
    failed: failed.map((r) => ({
      id: r.id,
      label: r.label,
      wcag: r.wcag || "",
      failCount: r.failCount,
      detail: r.detail,
      suggestion: r.suggestion,
    })),
    skipped: skipped.map((r) => ({ id: r.id, label: r.label })),
    summary:
      failed.length === 0
        ? `✅ All ${guardrails.length} guardrails pass for ${skillName} (${skipped.length} skipped from previous iteration).`
        : `❌ ${failed.length}/${guardrails.length} guardrails FAIL for ${skillName} (${skipped.length} skipped from previous). Fix then re-check.`,
    allPass: failed.length === 0,
    previousPassed: newPassed,
  };
}
