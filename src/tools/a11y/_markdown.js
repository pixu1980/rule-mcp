/** @module tools/a11y/markdown - the WCAG-EM structured report body */

import { WCAG_EM_STEPS, WCAG_GENERATED, WCAG_SOURCE, WCAG_VERSION } from "../../core/wcag-data/index.js";
import { BLOCKING } from "./_evaluate.js";

/**
 * Render the markdown half of the report.
 *
 * @param {object} ev - from evaluate()
 * @returns {string}
 */
export function renderMarkdown(ev) {
  const { scope, sample, evaluator, level, target, seen, counts, conforms, stamp } = ev;

  const lines = [
    `# Accessibility evaluation: ${scope.title}`,
    "",
    `WCAG ${WCAG_VERSION}, conformance target level **${level}**. Evaluator: ${evaluator}. Date: ${stamp}.`,
    "",
    `**Result: ${conforms ? `conforms at level ${level}` : `does not conform at level ${level}`}.**`,
    "",
    `## ${WCAG_EM_STEPS[0].step}. ${WCAG_EM_STEPS[0].name}`,
    "",
    `- Target: ${scope.url}`,
    `- Conformance target: WCAG ${WCAG_VERSION} level ${level} (${target.length} success criteria)`,
    "",
    `## ${WCAG_EM_STEPS[1].step}. ${WCAG_EM_STEPS[1].name}`,
    "",
    WCAG_EM_STEPS[1].asks + ".",
    "",
    `## ${WCAG_EM_STEPS[2].step}. ${WCAG_EM_STEPS[2].name}`,
    "",
    sample.length > 0 ? sample.map((page) => `- ${page}`).join("\n") : "_No sample declared. A result without one covers nothing beyond itself._",
    "",
    `## ${WCAG_EM_STEPS[3].step}. ${WCAG_EM_STEPS[3].name}`,
    "",
    "| Criterion | Title | Level | Outcome | Note |",
    "|-----------|-------|-------|---------|------|",
  ];

  for (const c of target) {
    const entry = seen.get(c.num);
    const outcome = entry?.outcome ?? "untested";
    const mark = {
      passed: "pass",
      failed: "**FAIL**",
      cantTell: "cannot tell",
      inapplicable: "n/a",
      untested: "untested",
    }[outcome];
    lines.push(`| ${c.num} | ${c.handle} | ${c.level} | ${mark} | ${entry?.note ?? ""} |`);
  }

  lines.push(
    "",
    `## ${WCAG_EM_STEPS[4].step}. ${WCAG_EM_STEPS[4].name}`,
    "",
    `- passed: ${counts.passed}`,
    `- failed: ${counts.failed}`,
    `- cannot tell: ${counts.cantTell}`,
    `- not applicable: ${counts.inapplicable}`,
    `- untested: ${counts.untested}`,
    "",
  );

  if (!conforms) {
    const blockers = target
      .filter((c) => {
        const entry = seen.get(c.num);

        return !entry || BLOCKING.has(entry.outcome);
      })
      .slice(0, 20);

    lines.push(
      `A conformance claim at level ${level} requires every one of the ${target.length} criteria to pass or be inapplicable.`,
      `${blockers.length === 20 ? "First 20 outstanding" : "Outstanding"}: ${blockers.map((c) => c.num).join(", ")}.`,
      "",
    );
  }

  lines.push("---", `Criteria data: ${WCAG_SOURCE} (vendored ${WCAG_GENERATED}). Methodology: WCAG-EM. Results vocabulary: EARL.`);

  return lines.join("\n");
}
