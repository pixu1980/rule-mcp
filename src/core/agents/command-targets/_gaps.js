/** @module core/agents/command-targets/gaps */

/**
 * Agents with no discoverable command-file surface. Each entry states WHY, so a
 * gap is a documented decision instead of an oversight. Hosts listed here keep
 * the namespaced MCP prompts (still functional, just prefixed).
 */
export const AGENTS_WITHOUT_COMMAND_SURFACE = {
  codex: "Codex CLI exposes MCP prompts as slash commands itself; its custom-prompt directory is not verified against a published spec, so writing files there would be a guess.",
  copilot: "GitHub Copilot CLI gets a custom agent file (~/.copilot/agents); its prompt-file directory is not verified against a published spec.",
  zed: "Zed stores its rules/prompt library in profile storage, not in discoverable per-command files.",
  antigravity: "No published custom-command file location; MCP prompts remain the entry point.",
  kilo: "Kilo CLI command directory is not verified against a published spec.",
  kimi: "Kimi CLI command directory is not verified against a published spec.",
  vibe: "Mistral Vibe command directory is not verified against a published spec.",
  grok: "Grok Build command directory is not verified against a published spec.",
  droid: "Factory Droid command directory is not verified against a published spec.",
  kiro: "AWS Kiro command directory is not verified against a published spec.",
  qwen: "Qwen Code command directory is not verified against a published spec.",
  jetbrains: "JetBrains AI Assistant has no user-authored slash-command files; MCP prompts are the only entry point.",
  neovim: "Editor-level MCP plugins expose prompts directly; there is no command-file convention to write to.",
  emacs: "mcp.el exposes prompts directly; there is no command-file convention to write to.",
  devin: "Devin runs commands in its own workspace runtime, not from local slash-command files; MCP prompts remain the entry point.",
};
