/**
 * @module core/tokensave/surface
 *
 * The TokenSave tools this server actually calls, and where.
 *
 * TokenSave exposes its tools on two surfaces, and this adapter uses the CLI
 * one (`tokensave tool <name>`). The map is the audit trail: a reader can see
 * which slice of the surface rule-mcp depends on without reading every module, and
 * the test beside it fails when a call is added, renamed or orphaned without
 * the map following.
 *
 * It is a map, not a gate: TokenSave adds tools faster than this server needs
 * them, and an entry here is a dependency, not a permission.
 *
 * @see module:core/tokensave/client - the call
 * @see module:core/tokensave/graph - the checklist of tools a persona may run
 */

/** The executable tools, by the module that calls them. */
export const TOKENSAVE_SURFACE = {
  "core/tokensave/_files.js": ["files"],
  "core/tokensave/_routing.js": ["search"],
  "core/tokensave/_deps.js": ["config"],
  "core/tokensave/_changes.js": ["commit_context", "diff_context", "log"],
  "core/tokensave/_edit.js": ["str_replace"],
  "core/tokensave/_memory.js": ["record_decision", "session_recall"],
  "core/tokensave/_insights.js": ["status", "affected", "runtime"],
  "core/guardrails/project/_checks.js": ["circular", "health", "dead_code", "unsafe_patterns", "unused_imports", "redundancy", "diagnostics"],
};

/** The TokenSave CLI subcommands, by the module that runs them. */
export const TOKENSAVE_COMMANDS = {
  "cli/_init.js": ["init"],
  "core/tokensave/_sync.js": ["sync"],
  "core/tokensave/_ledger.js": ["gain"],
  "core/tokensave/_client.js": ["tool"],
  "core/tokensave/_client-sync.js": ["tool"],
};

/** Every executable tool name, deduplicated. */
export function tokensaveToolNames() {
  return [...new Set(Object.values(TOKENSAVE_SURFACE).flat())].sort();
}
