/**
 * @module core/agents/command-targets
 *
 * Where the clean `/rule-*` slash commands are written, per agent/IDE.
 *
 * Every MCP host namespaces the prompts a server exposes, and none of them let a
 * server drop that prefix:
 *   - Claude Code → `/rule-mcp:rule-backend (MCP)`
 *   - VS Code (Copilot Chat) → `/mcp.rule-mcp.rule-backend`
 * The only surface that yields a bare `/rule-backend` is the host's own
 * command/prompt FILES. This module is the single registry of those file
 * locations, so "clean commands everywhere" is a property of the codebase rather
 * than a per-installer accident:
 *
 *   1. {@link COMMAND_TARGETS} declares every directory + render format.
 *   2. {@link AGENTS_WITHOUT_COMMAND_SURFACE} documents the remaining gaps -
 *      an agent may be in one list or the other, never in neither
 *      (enforced by test/agent-command-targets.test.mjs).
 *   3. Hosts that namespace prompts AND receive files also get
 *      `RULE_MCP_NO_PROMPTS=1` ({@link suppressesMcpPrompts}), so the clean
 *      commands replace the prefixed MCP entries instead of duplicating them.
 *
 * Resolution is pure: `exists`/`listDir` are injected, so the whole registry is
 * unit-testable for any platform without touching the filesystem.
 *
 * @see module:core/agents/commands - the command bodies and render formats
 * @see module:cli/install - installs/removes the resolved targets
 */

export * from "./_gaps.js";
export * from "./_context.js";
export * from "./_registry.data.js";
export * from "./_resolve.js";
