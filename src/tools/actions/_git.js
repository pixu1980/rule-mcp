

/**
 * @module tools/actions/git
 *
 * `rule_tool_git`: the `/rule-git` backend, and the squash behind
 * `/rule-handoff --close-feature --squash`.
 *
 * Actions:
 *   - `audit` (default): read-only report - base, range, violations, merges.
 *   - `reword`: apply proposed Conventional Commit messages.
 *   - `linearize`: remove the merge commits.
 *   - `squash`: close the feature as one commit whose message the caller
 *     proposes.
 *
 * Every destructive action needs `force: true` to be proposed at all - the
 * `/rule-git --force` flag, or the explicit `--close-feature --squash` intent -
 * and `confirm: true` to run. `force` never substitutes for the confirmation.
 *
 * @see module:core/history
 */

import { z } from "zod/v4";
import { applyLinearize, applyReword, applySquash, auditFeatureHistory, proposeLinearize, proposeSquash } from "../../core/history/index.js";
import { registerTool } from "../router/index.js";
import { renderAudit, renderReword } from "./_git-render.js";
import { renderLinearize, renderSquash } from "./_git-render-rewrite.js";

/**
 * The refusal when a destructive action was not enabled.
 *
 * @param {string} action
 * @param {number} count
 * @returns {string}
 */
function refused(action, count) {
  return `# rule_tool_git - ${action}\n\nRefused: pass force: true to enable this history-normalization proposal.\n\nAffected commits: ${count}`;
}

/** Register the rule_tool_git tool. */
export function registerGitTool() {
  registerTool({
    name: "rule_tool_git",
    entry: "action",
    description:
      "Audit the feature history and normalize it: base branch, merge base, commit range, Conventional Commit violations and merge commits. " +
      "`reword` applies proposed messages; `linearize` removes merge commits; `squash` closes the feature as one commit and folds the feature's own ADRs and handoffs into one document each (deterministic concatenation, originals deleted, indexes rebuilt). " +
      "The destructive actions need force:true to be proposed and confirm:true to run. Every rewrite verifies what changed and rolls back on an unexpected path.",
    zodSchema: z.object({
      projectDir: z.string().optional().default(".").describe("Project root (default: cwd)"),
      action: z.enum(["audit", "reword", "linearize", "squash"]).optional().default("audit").describe("audit, reword, linearize, or squash"),
      force: z.boolean().optional().default(false).describe("Enable a history-normalization proposal (--force)"),
      confirm: z.boolean().optional().default(false).describe("Required to run a rewrite; the confirmation gate"),
      baseBranch: z.string().optional().describe("Override the detected base branch"),
      message: z.string().optional().describe("For squash: the final type(scope): summary"),
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
          return { content: [{ type: "text", text: refused("linearize", proposeLinearize(projectDir, options).merges.length) }] };
        }

        const result = applyLinearize(projectDir, { ...options, confirm: arguments_.confirm });

        return { content: [{ type: "text", text: renderLinearize(result) }] };
      }

      if (arguments_.action === "squash") {
        if (!arguments_.force) {
          return { content: [{ type: "text", text: refused("squash", proposeSquash(projectDir, options).range.count) }] };
        }

        const result = applySquash(projectDir, { ...options, message: arguments_.message ?? "", confirm: arguments_.confirm });

        return { content: [{ type: "text", text: renderSquash(result) }] };
      }

      return { content: [{ type: "text", text: renderAudit(auditFeatureHistory(projectDir, options), arguments_.force) }] };
    },
  });
}
