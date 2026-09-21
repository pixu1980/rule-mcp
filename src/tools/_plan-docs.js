

/**
 * @module tools/plan-docs
 *
 * `rule_tool_plan_docs` - keep a review persona's audit/review/plan trio in sync
 * (personas C.2).
 *
 * `rule_tool_plan` hands the agent the operation; this tool does the part of it
 * that is bookkeeping rather than judgment. The agent reports what it found and
 * gets back three documents whose headers, tables, checklist and statuses are already
 * correct, so the only thing left to write is the content.
 *
 * @see module:core/review/docs - the merge rules and the file formats
 */

import { z } from "zod/v4";

import { allRoles, roleById } from "../core/review/roles/index.js";
import { loadRoleOverlays } from "../core/review/_overlays.js";
import { syncRoleDocs } from "../core/review/docs/index.js";
import { registerTool } from "./router/index.js";

const FindingSchema = z.object({
  id: z.string().describe("Finding id"),
  severity: z.string().optional().describe("critical|high|medium|low|info"),
  summary: z.string().optional().describe("What is wrong"),
  evidence: z.string().optional().describe("Audit pointer"),
  steps: z.array(z.string()).optional().describe("Sub-steps for the plan checklist, one action each"),
});

const PlanDocsSchema = z.object({
  role: z.string().describe("Role id"),
  findings: z.array(FindingSchema).optional().describe("What this run found. Anything omitted counts as closed - unless a scope is set."),
  scope: z.string().optional().describe("The binding scope of a scoped run: findings outside it stay untouched instead of resolving."),
  projectDir: z.string().optional(),
});

/** Register the rule_tool_plan_docs tool. */
export function registerPlanDocsTool() {
  registerTool({
    name: "rule_tool_plan_docs",
    entry: "action",
    description: "Create or refresh the audit/review/plan documents for a review persona run: the bookkeeping half.",
    zodSchema: PlanDocsSchema,
    advertise: ["role", "findings"],
    handler: async (arguments_) => {
      const { roles: overlays } = loadRoleOverlays({ projectDir: arguments_.projectDir });
      const role = roleById(arguments_.role, overlays);

      if (!role) {
        const known = allRoles(overlays)
          .map((entry) => `${entry.id} (${entry.status})`)
          .join(", ");

        return {
          isError: true,
          content: [{ type: "text", text: `Unknown role "${arguments_.role}". Available: ${known}.` }],
        };
      }

      const result = syncRoleDocs({
        role: role.id,
        findings: arguments_.findings ?? [],
        projectDir: arguments_.projectDir ?? ".",
        version: role.version ?? 1,
        scope: arguments_.scope,
      });

      const lines = [
        `# Trio for ${role.id}`,
        "",
        ...(arguments_.scope ? [`- scope: ${arguments_.scope} (findings outside it left untouched)`] : []),
        `- open: ${result.counts.open}`,
        `- resolved this run: ${result.counts.resolved}`,
        `- pruned: ${result.counts.pruned}`,
        "",
        "## Written",
        "",
        ...result.written.map((path) => `- ${path}`),
        ...(result.deleted.length > 0 ? ["", "## Deleted", "", ...result.deleted.map((path) => `- ${path}`)] : []),
        "",
        "The headers, tables, plan checklist and statuses are done. Steps are uncapped: pass as many findings",
        "as the run earned, with `steps` sub-actions on any finding that hides more than one. Fill the evidence in the audit, the wording of each",
        "finding in the review, and what each step takes in the plan.",
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  });
}
