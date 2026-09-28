

/**
 * @module tools/actions/sync
 *
 * `rule_tool_sync`: review how far the base branch has moved, and apply the
 * rebase the user confirmed.
 *
 * The default action is read-only. `action: "rebase"` runs nothing without
 * `confirm: true`, so the confirmation gate is a property of the contract and
 * not a habit of the caller.
 *
 * @see module:core/sync - the guard and the rebase
 */

import { z } from "zod/v4";
import { applyRebase, proposeRebase } from "../../core/sync/index.js";
import { registerTool } from "../router/index.js";

/**
 * Render the read-only proposal.
 *
 * @param {object} proposal
 * @returns {string}
 */
function renderProposal(proposal) {
  const f = proposal.freshness;
  const lines = [
    "# rule_tool_sync - check",
    "",
    `Base branch:     ${f.baseBranch || "(none)"}${f.baseRef ? ` (${f.baseRef}, source: ${f.baseSource})` : ""}`,
    `Merge base:      ${f.mergeBase || "-"}`,
    `Commits ahead:   ${f.ahead} (only on this branch)`,
    `Commits behind:  ${f.behind} (only on the base)`,
    `Requires rebase: ${f.requiresRebase ? "yes" : "no"}`,
    `Working tree:    ${proposal.safe ? "safe to rewrite" : `NOT safe - ${proposal.reasons.join("; ")}`}`,
  ];

  if (f.reason) {
    lines.push(`Note:            ${f.reason}`);
  }

  if (proposal.actionable) {
    lines.push("", "Proposed:", `  ${proposal.command}`, "Confirm with: rule_tool_sync action=rebase confirm=true");
  } else if (f.requiresRebase && !proposal.safe) {
    lines.push("", "Commit or stash the changes above before rebasing.");
  }

  return lines.join("\n");
}

/**
 * Render the rebase verdict.
 *
 * @param {object} result
 * @returns {string}
 */
function renderRebase(result) {
  const lines = ["# rule_tool_sync - rebase", ""];

  if (result.applied) {
    const v = result.verification;

    lines.push("Rebase applied.", `Working tree: ${v.workingTree}`, `Commits behind now: ${v.freshness.behind}`);

    return lines.join("\n");
  }

  lines.push(`Not applied: ${result.reason}`);

  if (result.conflicted) {
    lines.push(
      "",
      "Conflicts (left unresolved):",
      ...(result.verification.conflicts.length > 0 ? result.verification.conflicts.map((file) => `  ${file}`) : ["  (git listed none)"]),
      "",
      "Resolve them and run `git rebase --continue`, or `git rebase --abort`. This tool never resolves or aborts a conflict for you.",
    );
  }

  if (result.output) {
    lines.push("", "git said:", result.output);
  }

  return lines.join("\n");
}

/** Register the rule_tool_sync tool. */
export function registerSyncTool() {
  registerTool({
    name: "rule_tool_sync",
    entry: "action",
    description:
      "Check how far the base branch has moved since this branch forked, and propose the rebase. " +
      "Read-only by default; `action: rebase` requires `confirm: true` and refuses on a dirty tree. " +
      "A conflict is reported with its files and never resolved automatically.",
    zodSchema: z.object({
      projectDir: z.string().optional().default(".").describe("Project root (default: cwd)"),
      action: z.enum(["check", "rebase"]).optional().default("check").describe("check (read-only) or rebase (needs confirm)"),
      confirm: z.boolean().optional().default(false).describe("Required for action=rebase; the confirmation gate"),
      baseBranch: z.string().optional().describe("Override the detected base branch"),
      fetch: z.boolean().optional().default(false).describe("Fetch the base remote first, so the check sees the remote's position"),
    }),
    handler: async (arguments_) => {
      const projectDir = arguments_.projectDir || ".";
      const options = { baseBranch: arguments_.baseBranch, fetch: arguments_.fetch };
      const text =
        arguments_.action === "rebase" ? renderRebase(applyRebase(projectDir, { ...options, confirm: arguments_.confirm })) : renderProposal(proposeRebase(projectDir, options));

      return { content: [{ type: "text", text }] };
    },
  });
}
