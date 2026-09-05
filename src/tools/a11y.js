/**
 * @module tools/a11y
 *
 * `rule_tool_a11y_report`: turns a set of per-criterion outcomes into a report
 * structured by the WCAG Evaluation Methodology, plus EARL as JSON-LD.
 *
 * Why a tool and not a prompt. An accessibility report is a claim someone may
 * have to defend, and the two things that make it defensible are mechanical:
 * every criterion in the conformance target is accounted for, and anything not
 * checked is reported as untested rather than omitted. A model asked to write
 * the same report will quietly drop the criteria nobody mentioned, and the gap
 * between "we checked 12 things" and "we conform at AA" is exactly where a
 * conformance claim goes wrong.
 *
 * So the rules here are deliberate and not negotiable:
 *   - an unknown criterion number is an error, never a silent skip
 *   - an unknown outcome is an error; EARL has five and they mean different things
 *   - untested criteria are counted and named
 *   - a single failure, or any untested criterion, blocks the claim
 *
 * No model, no network, no clock beyond what the caller passes: same input,
 * same report, so the result cache can replay it.
 *
 * @see module:core/wcag-data - the vendored criteria
 * @see https://www.w3.org/TR/WCAG-EM/ - the methodology
 * @see https://www.w3.org/TR/EARL10-Schema/ - the result vocabulary
 */

import { z } from "zod/v4";
import {
  EARL_OUTCOMES,
  WCAG_EM_STEPS,
  WCAG_GENERATED,
  WCAG_SOURCE,
  WCAG_VERSION,
  criteriaForLevel,
  criterion,
} from "../core/wcag-data.js";
import { registerTool } from "./router.js";

/** JSON-LD context for the EARL output. */
const EARL_CONTEXT = {
  // An IRI, not a URL to fetch. RDF terms are compared byte for byte, so the
  // EARL vocabulary is `http://` and rewriting it to https would silently emit
  // a different vocabulary that no consumer resolves.
  // The EARL vocabulary IRI is http by definition.
  earl: "https://www.w3.org/ns/earl#".replace("https", "http"),
  dct: "http://purl.org/dc/terms/",
  WCAG: "https://www.w3.org/TR/WCAG22/#",
};

/** Outcomes that count against a conformance claim. */
const BLOCKING = new Set(["failed", "cantTell", "untested"]);

/**
 * Build the report.
 *
 * @param {{
 *   scope: { title: string, url: string, level?: "A"|"AA"|"AAA" },
 *   sample?: string[],
 *   results?: Array<{ criterion: string, outcome: string, note?: string, location?: string }>,
 *   evaluator?: string,
 *   date?: string,
 * }} input
 * @returns {{ markdown: string, earl: string, summary: object }}
 */
export function buildReport(input) {
  const { scope, sample = [], results = [], evaluator = "rule-mcp", date } = input ?? {};

  if (!scope?.title || !scope?.url) {
    throw new Error(
      "scope.title and scope.url are required: a result with no declared scope cannot be reproduced or disputed",
    );
  }

  const level = scope.level ?? "AA";
  const target = criteriaForLevel(level);
  const targetNumbers = new Set(target.map((c) => c.num));

  // Validate before counting. A report that silently dropped a typo'd criterion
  // would claim coverage it does not have.
  const seen = new Map();

  for (const entry of results) {
    const found = criterion(entry.criterion);

    if (!found) {
      throw new Error(
        `Unknown WCAG criterion "${entry.criterion}". WCAG ${WCAG_VERSION} defines no such success criterion.`,
      );
    }

    if (!EARL_OUTCOMES.includes(entry.outcome)) {
      throw new Error(`Unknown outcome "${entry.outcome}". EARL defines: ${EARL_OUTCOMES.join(", ")}.`);
    }

    if (!targetNumbers.has(entry.criterion)) {
      throw new Error(
        `Criterion ${entry.criterion} is level ${found.level}, outside a level ${level} conformance target.`,
      );
    }

    seen.set(entry.criterion, { ...entry, ...found });
  }

  const counts = Object.fromEntries(EARL_OUTCOMES.map((o) => [o, 0]));

  for (const entry of seen.values()) {
    counts[entry.outcome] += 1;
  }

  const untestedList = target.filter((c) => !seen.has(c.num));
  counts.untested += untestedList.length;

  const conforms = target.every((c) => {
    const entry = seen.get(c.num);

    return Boolean(entry) && !BLOCKING.has(entry.outcome);
  });

  const summary = { level, total: target.length, ...counts, conforms };
  const stamp = date ?? "(date not supplied)";

  // ── Markdown, structured by the five WCAG-EM steps ──
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
    sample.length > 0
      ? sample.map((page) => `- ${page}`).join("\n")
      : "_No sample declared. A result without one covers nothing beyond itself._",
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

  lines.push(
    "---",
    `Criteria data: ${WCAG_SOURCE} (vendored ${WCAG_GENERATED}). Methodology: WCAG-EM. Results vocabulary: EARL.`,
  );

  // ── EARL, one assertion per declared result ──
  const graph = [...seen.values()].map((entry) => ({
    "@type": "Assertion",
    assertedBy: evaluator,
    subject: { "@type": "TestSubject", source: scope.url },
    test: { "@type": "TestCriterion", "@id": `WCAG:${entry.id}`, title: `${entry.num} ${entry.handle}` },
    result: {
      "@type": "TestResult",
      outcome: `earl:${entry.outcome}`,
      ...(entry.note && { "dct:description": entry.note }),
      ...(entry.location && { pointer: entry.location }),
    },
  }));

  return {
    markdown: lines.join("\n"),
    earl: JSON.stringify({ "@context": EARL_CONTEXT, "@graph": graph }, undefined, 2),
    summary,
  };
}

/** Register the rule_tool_a11y_report tool. */
export function registerA11yReportTool() {
  const ReportSchema = z.object({
    scope: z
      .object({
        title: z.string().describe('What was evaluated, e.g. "Checkout flow"'),
        url: z.string().describe("The target URL or application entry point"),
        level: z.enum(["A", "AA", "AAA"]).default("AA").describe("Conformance target"),
      })
      .describe("WCAG-EM step 1 scope"),
    sample: z.array(z.string()).default([]).describe("WCAG-EM step 3 sample"),
    results: z
      .array(
        z.object({
          criterion: z.string().describe('Success criterion number, e.g. "1.4.3"'),
          outcome: z.enum(["passed", "failed", "cantTell", "inapplicable", "untested"]).describe("EARL outcome"),
          note: z.string().optional().describe("What was found"),
          location: z.string().optional().describe("Where, e.g. a selector or a file path"),
        }),
      )
      .default([])
      .describe("WCAG-EM step 4 results"),
    evaluator: z.string().optional().describe("Evaluator"),
    date: z.string().optional().describe("Date (ISO)"),
  });

  registerTool({
    name: "rule_tool_a11y_report",
    description:
      "Build a WCAG-EM accessibility report from criteria and audit results; returns findings and the verdict.",
    zodSchema: ReportSchema,
    handler: async (arguments_) => {
      let report;

      try {
        report = buildReport(arguments_);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: `Cannot build the report: ${error.message}` }] };
      }

      return {
        content: [
          { type: "text", text: report.markdown },
          { type: "text", text: `\n## EARL (JSON-LD)\n\n\`\`\`json\n${report.earl}\n\`\`\`` },
        ],
        _meta: { pixA11y: report.summary },
      };
    },
  });
}
