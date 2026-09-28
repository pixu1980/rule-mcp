

/**
 * @module tools/actions/git
 *
 * `rule_tool_git`: the `/rule-git` backend. Audit the feature history, and
 * normalize it behind a confirmation gate.
 *
 * Three actions:
 *   - `audit` (default): read-only report - base, range, violations, merges.
 *   - `reword`: apply proposed Conventional Commit messages. The model proposes
 *     the text; the tool validates it and rewrites with `filter-branch`.
 *   - `linearize`: remove the merge commits. Requires `force: true` (the
 *     `/rule-git --force` flag) to be proposed at all, and `confirm: true` to run.
 *
 * `force` enables a destructive *proposal*. It never bypasses the confirmation
 * gate: `linearize` without `confirm` returns the plan and stops.
 *
 * @see module:core/history
 */

import { z } from "zod/v4";
import { applyLinearize, applyReword, auditFeatureHistory, proposeLinearize } from "../../core/history/index.js";
import { registerTool } from "../router/index.js";
import { renderAudit, renderLinearize, renderReword } from "./_git-render.js";

/** Register the rule_tool_git tool. */
export function registerGitTool() {
  registerTool({
    name: "rule_tool_git",
    entry: "action",
    description:
      "Audit the feature history and normalize it: base branch, merge base, commit range, Conventional Commit violations and merge commits. " +
      "`reword` applies proposed messages; `linearize` removes merge commits and needs force:true to be proposed and confirm:true to run. " +
      "Every rewrite verifies the final tree is unchanged and rolls back when it is not. Never resolves a conflict.",
    zodSchema: z.object({
      projectDir: z.string().optional().default(".").describe("Project root (default: cwd)"),
      action: z.enum(["audit", "reword", "linearize"]).optional().default("audit").describe("audit (read-only), reword, or linearize"),
      force: z.boolean().optional().default(false).describe("The /rule-git --force flag: enable history-normalization proposals"),
      confirm: z.boolean().optional().default(false).describe("Required to run a rewrite; the confirmation gate"),
      baseBranch: z.string().optional().describe("Override the detected base branch"),
      rewrites: z
        .array(z.object({ sha: z.string(), message: z.string() }))
        .optional()
        .describe("For reword: the message proposed for each commit sha"),
    }),
    handler: async (arguments_) => {
      const projectDir = arguments_.projectDir || ".";
      const options = { baseBranch: arguments_.baseBranch };

      if (arguments_.action === "reword") {
        const result = applyReword(projectDir, { ...options, rewrites: arguments_.rewrites ?? [], confirm: arguments_.confirm });

        return { content: [{ type: "text", text: renderReword(result) }] };
      }

      if (arguments_.action === "linearize") {
        if (!arguments_.force) {
          const proposal = proposeLinearize(projectDir, options);

          return {
            content: [
              {
                type: "text",
                text: `# rule_tool_git - linearize\n\nRefused: pass force: true (the /rule-git --force flag) to enable a history-normalization proposal.\n\nMerge commits: ${proposal.merges.length}`,
              },
            ],
          };
        }

        const result = applyLinearize(projectDir, { ...options, confirm: arguments_.confirm });

        return { content: [{ type: "text", text: renderLinearize(result) }] };
      }

      return { content: [{ type: "text", text: renderAudit(auditFeatureHistory(projectDir, options), arguments_.force) }] };
    },
  });
}
