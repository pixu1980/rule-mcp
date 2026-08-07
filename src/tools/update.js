/**
 * @module tools/update
 *
 * pix_update - explicit self-update entry point. Runs the same git
 * fast-forward + skill hot-reload as the automatic check, and reports what
 * happened. The automatic check (core/self-update.maybeSelfUpdate) runs
 * throttled in the background on tool calls; this tool lets the agent or user
 * trigger it on demand.
 *
 * @see module:core/self-update
 */

import { z } from "zod/v4";
import { registerTool } from "./router.js";
import { runSelfUpdate, buildBanner, scheduleRestartIfNeeded } from "../core/self-update.js";
import { detectInstallType } from "../cli/paths.js";

/**
 * Register the pix_update tool.
 */
export function registerUpdateTool() {
  registerTool({
    name: "rule_tool_update",
    description:
      "Force-update this local MCP server from its upstream git repo (fast-forward only), " +
      "hot-reload skills, and restart if server code changed. Also runs automatically " +
      "(throttled, in the background) on tool calls; call directly to update on demand.",
    zodSchema: z.object({}),
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const result = await runSelfUpdate();
      const restartNote = scheduleRestartIfNeeded(result);

      const lines = [];
      if (result.updated) {
        lines.push(buildBanner(result));
        if (restartNote) {
          lines.push(restartNote);
        }
      } else if (result.skipped) {
        const reasons = {
          disabled: "Auto-update is disabled (RULE_MCP_NO_AUTOUPDATE=1).",
          "no-upstream": "No upstream branch is configured - nothing to pull from.",
          "detached-head": "HEAD is detached - checkout a branch to enable updates.",
          "dirty-tree": "Working tree has local changes - commit or stash them first (never auto-discarded).",
          "not-fast-forward": "Local branch has diverged from upstream - a fast-forward is not possible.",
          "fetch-failed": "Could not reach the remote (offline?). Still running the current version.",
          "git-error": "git command failed - still running the current version.",
          "remote-not-allowed": `REFUSED: the git remote (${result.remote ?? "unknown"}) is not an allowed update source. Nothing was fetched. Set RULE_MCP_UPDATE_REMOTE to the upstream you trust.`,
          "no-allowed-remote":
            "REFUSED: no allowed update remote is configured. Nothing was fetched. Set RULE_MCP_UPDATE_REMOTE to the upstream you trust.",
          "unsigned-upstream":
            "REFUSED: the upstream commit has no valid signature and RULE_MCP_UPDATE_REQUIRE_SIGNATURE=1. Nothing was merged.",
          npm: "Installed via npm.",
          docker: "Running in Docker.",
          unknown: "Install type is not a git clone.",
        };
        lines.push(`ℹ️ No update applied: ${reasons[result.reason] ?? result.reason}`);
        if (result.note) {
          lines.push(result.note);
        }
      } else {
        lines.push(`✅ rule-mcp is already up to date (install: ${detectInstallType()}).`);
      }

      return {
        content: [
          { type: "text", text: lines.filter(Boolean).join("\n") },
          {
            type: "text",
            text: `\`\`\`json\n${JSON.stringify({ ...result, restart: restartNote ?? null }, null, 2)}\n\`\`\``,
          },
        ],
      };
    },
  });
}
