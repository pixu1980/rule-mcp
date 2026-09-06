/** @module tools/a11y/tool */

import { z } from "zod/v4";
import { registerTool } from "../router/index.js";
import { buildReport } from "./_report.js";

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
