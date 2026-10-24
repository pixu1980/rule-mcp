/**
 * @module core/guardrails/project/run
 *
 * Run the project-level graph guardrails through the TokenSave adapter.
 *
 * A check whose tool cannot answer is skipped, never failed: a missing graph
 * is not a code defect, and a false failure would train the caller to ignore
 * the verdict. The result shape mirrors `checkCode` so the same caller can
 * render either.
 */

import { callToolSync } from "../../tokensave/_client-sync.js";
import { probeFilesystem } from "../../tokensave/_probe.js";
import { PROJECT_CHECKS } from "./_checks.js";

/**
 * @typedef {Object} ProjectCheckResult
 * @property {string} skill
 * @property {number} total
 * @property {number} passCount
 * @property {number} failCount
 * @property {number} skippedCount
 * @property {Array<object>} passed
 * @property {Array<object>} failed
 * @property {Array<object>} skipped
 * @property {boolean} allPass
 * @property {string} summary
 */

/**
 * Run every project check against one project.
 *
 * @param {string} [projectDir] - Project root
 * @param {{ skill?: string, diagnostics?: boolean, probe?: Function, client?: Function }} [options]
 * @returns {ProjectCheckResult}
 */
export function checkProjectGuarded(projectDir = process.cwd(), { skill = "rule-mcp-process-ai", diagnostics = false, probe = probeFilesystem, client = callToolSync } = {}) {
  const available = probe(projectDir).available;
  const passed = [];
  const failed = [];
  const skipped = [];
  const advisory = [];

  for (const check of PROJECT_CHECKS) {
    if (check.optional && !diagnostics) {
      skipped.push({ id: check.id, label: check.label, reason: "optional check not requested" });
      continue;
    }

    if (!available) {
      skipped.push({ id: check.id, label: check.label, reason: "graph unavailable" });
      continue;
    }

    const result = client(check.tool, check.args ?? {}, { projectDir });

    if (!result.ok) {
      skipped.push({ id: check.id, label: check.label, reason: result.error ?? "tool unavailable" });
      continue;
    }

    const outcome = check.evaluate(result.value);

    if (outcome) {
      const entry = { id: check.id, wcag: "", label: check.label, failCount: outcome.failCount, detail: outcome.detail, suggestion: outcome.suggestion };

      // An advisory check reports, it never fails: the graph sees a shape, a
      // person decides whether the shape is the defect.
      if (check.advisory === true) {
        advisory.push(entry);
      } else {
        failed.push(entry);
      }
    } else {
      passed.push({ id: check.id, label: check.label });
    }
  }

  const total = PROJECT_CHECKS.length;
  const summary =
    failed.length > 0
      ? `❌ ${failed.length}/${total} project checks failed.`
      : skipped.length > 0
        ? `✅ ${passed.length}/${total} project checks pass (${skipped.length} skipped: graph unavailable).`
        : `✅ All ${total} project checks pass.`;

  return {
    skill,
    total,
    passCount: passed.length,
    failCount: failed.length,
    skippedCount: skipped.length,
    advisoryCount: advisory.length,
    passed,
    failed,
    skipped,
    advisory,
    allPass: failed.length === 0,
    summary: advisory.length > 0 ? `${summary} ${advisory.length} advisory finding(s) - reported, not failing.` : summary,
  };
}
