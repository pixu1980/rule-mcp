/**
 * @module cli/install
 *
 * The instruction block agents receive carries the flex first layout rule
 * (display:grid only when flex cannot do it) - see INSTRUCTION_BLOCK in
 * ./agent-installers.js, re-exported below.
 */
/*
 * @module cli/install
 *
 * Agent/IDE/model installation support for rule-mcp.
 * Generates MCP configuration files for ALL supported coding agents.
 *
 * Inspired by tokensave's architecture:
 *   18+ agents with individual install/uninstall/healthcheck per agent.
 *   Shared utilities for JSON/TOML file manipulation with atomic writes + backups.
 *   Cross-platform paths for macOS, Linux, Windows.
 *
 * Supported agents (matching tokensave's full list):
 *   claude, codex, cursor, copilot, gemini,
 *   cline, roo, zed, opencode, antigravity,
 *   devin, kilo, kimi, vibe, grok, droid, kiro, qwen,
 *   pi, vscode, jetbrains, neovim, emacs
 *
 * Verification tiers (honesty matters for a compatibility surface this wide):
 *   - stdio: universally tested - works with every MCP host. Default, preferred.
 *   - daemon / HTTP+SSE: interop-verified end-to-end only for `pi` and `vscode`
 *     (see remoteModeAgents). Other agents get a correct-shape `mcpServers` config
 *     that is NOT individually interop-tested and may need a manual tweak.
 *
 * Supports stdio, native daemon/SSE, and Docker deployment modes.
 * Stdio can use a local Node entrypoint or a globally installed command.
 */

export * from "./_manifest.js";
export * from "./_agent-ops.js";
export * from "./_detect.js";
