

/**
 * Agent catalog: the install targets, the remote-mode set, and mode
 * normalization. Pure data + one small normalizer; no I/O.
 * @module cli/installers/catalog
 */

const allAgents = [
  // ── Coding Agents ──
  "claude", // Anthropic Claude Code
  "codex", // OpenAI Codex CLI
  "cursor", // Cursor editor
  "copilot", // GitHub Copilot
  "gemini", // Google Gemini CLI
  "cline", // Cline VSCode extension
  "roo", // Roo Code
  "zed", // Zed editor
  "opencode", // OpenCode
  "antigravity", // Antigravity (Google)
  "devin", // Devin (formerly Windsurf)
  "pi", // Pi coding agent (pi.dev)
  "kilo", // Kilo CLI
  "kimi", // Moonshot Kimi CLI
  "vibe", // Mistral Vibe
  "grok", // xAI Grok Build
  "droid", // Factory Droid
  "kiro", // AWS Kiro
  "qwen", // Qwen Code (Alibaba)

  // ── IDEs ──
  "vscode", // VS Code (user-level config)
  "jetbrains", // JetBrains IDEs (IntelliJ, WebStorm, etc.)
  "neovim", // Neovim (via MCP plugin)
  "emacs", // Emacs (via mcp.el)
];

/** Agents with verified HTTP/SSE MCP configuration support. */

const remoteModeAgents = new Set(["pi", "vscode"]);

const normalizeInstallMode = (mode = "stdio") => {
  const normalized = mode === "sse" ? "daemon" : mode;

  if (!new Set(["stdio", "daemon", "docker"]).has(normalized)) {
    throw new Error(`Unsupported install mode: "${mode}"`);
  }

  return normalized;
};

export { allAgents, remoteModeAgents, normalizeInstallMode };
