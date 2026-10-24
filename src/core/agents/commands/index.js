

/**
 * @module core/agents/commands
 *
 * Registry-driven generator for agent slash-command files.
 *
 * A single source of truth (the MCP prompt registry, {@link module:prompts/index})
 * drives the clean `/rule-mcp-*` commands installed into every coding agent
 * (Claude Code, Pi, Gemini CLI, Cursor, Windsurf, Cline). This replaces the
 * hand-maintained per-agent heredocs so the command set never drifts from the
 * prompts and stays consistently ordered.
 *
 * Ordering (see {@link commandNames}): the `rule-mcp` router is pinned
 * first; every remaining command follows in locale-alphabetical order.
 *
 * Why clean commands at all: Claude Code exposes MCP prompts as
 * `/<server>:<prompt> (MCP)` - the server prefix cannot be dropped client-side.
 * User-level command files (`~/.claude/commands/*.md`) are invoked bare
 * (`/rule-mcp-handoff`), so the installer ships these AND suppresses the server's
 * prompts for Claude (RULE_MCP_NO_PROMPTS=1) to avoid duplicate entries.
 *
 * @see module:prompts/index - listPrompts (the source registry)
 * @see module:cli/install - installClaude sets RULE_MCP_NO_PROMPTS
 */

export * from "./_formats.js";
export * from "./_names.js";
export * from "./_check-intent.js";
export * from "./_bodies.js";
export * from "./_bodies-session.js";
export * from "./_personas.js";
export * from "./_definitions.js";
export * from "./_render.js";
