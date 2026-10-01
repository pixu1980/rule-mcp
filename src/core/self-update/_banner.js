

/** Render the update banner from one run result. */

/**
 * Build the user-visible banner for an update result, or null when there is
 * nothing worth showing (silent skips stay silent).
 *
 * @param {object} r - runSelfUpdate result
 * @returns {string|null}
 */
export function buildBanner(r) {
  if (!r) {
    return null;
  }

  if (r.updated) {
    if (r.release) {
      return `🔄 Updating MCP server - rule-mcp upgraded ${r.from || "?"}→${r.to} (${r.release}).`;
    }

    const what = r.changedSkills && r.changedCode ? "skills + code" : r.changedCode ? "code" : r.changedSkills ? "skills" : "";
    const scope = what ? `${what} file(s)` : "file(s)";
    let message = `🔄 Updating MCP server - rule-mcp updated ${r.from}→${r.to} (${r.count} ${scope}).`;

    if (r.changedSkills) {
      message += " Skills hot-reloaded.";
    }

    return message;
  }

  if (r.available && r.release) {
    return `ℹ️ rule-mcp ${r.to} (${r.release}) is available. On main it applies itself; elsewhere run \`rule-mcp update\`, or set RULE_MCP_AUTO_UPDATE=notify to only hear about it.`;
  }

  if (r.reason === "not-on-main") {
    return `ℹ️ rule-mcp ${r.to} (${r.release}) is available, but this checkout is on ${r.branch}. Switch to main or run \`rule-mcp update\` to move.`;
  }

  // A refused remote is never silent: it means this install's upstream is not
  // the one it ships with, which is either a fork that needs configuring or
  // someone repointing the remote at code of their own.
  if (r.reason === "remote-not-allowed") {
    return (
      `⚠️ rule-mcp self-update REFUSED - the git remote (${r.remote ?? "unknown"}) is not an allowed update source. ` +
      "Set RULE_MCP_UPDATE_REMOTE to the upstream you trust, or update manually. No code was fetched."
    );
  }

  if (r.reason === "no-allowed-remote") {
    return "⚠️ rule-mcp self-update REFUSED - no allowed update remote is configured. Set RULE_MCP_UPDATE_REMOTE to the upstream you trust. No code was fetched.";
  }

  if (r.reason === "unsigned-upstream") {
    return `⚠️ rule-mcp self-update REFUSED - upstream commit ${r.to ?? ""} has no valid signature and RULE_MCP_UPDATE_REQUIRE_SIGNATURE=1. No code was merged.`;
  }
  // Non-git installs get a one-line hint so the user knows how to update.
  if (r.skipped && r.note) {
    return `ℹ️ rule-mcp is up to date on disk. ${r.note}`;
  }

  return null;
}
