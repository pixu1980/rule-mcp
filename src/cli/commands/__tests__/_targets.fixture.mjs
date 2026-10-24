/**
 * @module test/agent-command-targets
 *
 * The clean-command guarantee: EVERY supported agent/IDE either has a declared
 * slash-command target (so `/rule-mcp-*` is invoked bare, never as
 * `/mcp.rule-mcp.rule-mcp-backend` or `/rule:rule-mcp-backend`)
 * or is explicitly listed as having no file-based command surface, with a reason.
 *
 * Verifies:
 *   - coverage: no agent in the install registry is silently uncovered
 *   - VS Code Copilot Chat prompt files land in the user-profile `prompts` dirs
 *     (all variants + profiles) with the `.prompt.md` extension
 *   - hosts that namespace MCP prompts get them suppressed, so the clean files
 *     replace rather than duplicate the MCP entries
 *   - the `prompt` render format carries no `$ARGUMENTS` placeholder (VS Code
 *     does not substitute it)
 */

export * from "../../../core/agents/command-targets/index.js";
export * from "../../../core/agents/commands/index.js";
export { getAllAgents } from "../../install/index.js";

/** Deterministic context: nothing exists unless the test says it does. */
export const ctx = ({ present = [], profiles = {}, platform = "darwin", home = "/home/u", cwd = "/repo", env = {} } = {}) => ({
  home,
  cwd,
  platform,
  env,
  exists: (path) => present.includes(path),
  listDir: (path) => profiles[path] ?? [],
});
