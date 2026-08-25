# Getting Started with rule-mcp

> Step-by-step installation guide for all deployment modes.
> **Goal:** have the MCP server running with your AI agent in under 5 minutes.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [A. Global npm install (recommended)](#a-global-npm-install-recommended)
3. [B. pnpx/npx (no install, ephemeral)](#b-pnpxnpx-no-install-ephemeral)
4. [C. Local development clone](#c-local-development-clone)
5. [D. Docker](#d-docker)
6. [E. Agent integration](#e-agent-integration)
7. [Verify everything works](#7-verify-everything-works)
8. [Next steps](#8-next-steps)

---

## 1. Prerequisites

| Requirement            | Minimum | Check            |
| ---------------------- | ------- | ---------------- |
| **Node.js**            | ≥ 20    | `node --version` |
| **pnpm** (recommended) | any     | `pnpm --version` |
| **npm** (alternative)  | any     | `npm --version`  |

If you don't have pnpm:

```bash
npm install -g pnpm
```

---

## 2. A. Global npm install (recommended)

```bash
pnpm add -g rule-mcp
# or: npm install -g rule-mcp
```

Verify the installation:

```bash
rule-mcp doctor
```

Expected output: health report with `ok: true`, 78 tools registered, detected agents.

---

## 3. B. pnpx/npx (no install, ephemeral)

Use directly without installing - ideal for evaluation, CI, or occasional use:

```bash
pnpx rule-mcp doctor
pnpx rule-mcp serve
```

To integrate with an agent via `mcp.json`:

```json
{
  "mcpServers": {
    "rule-mcp": {
      "command": "pnpx",
      "args": ["-y", "rule-mcp", "serve"],
      "directTools": true,
      "lifecycle": "keep-alive"
    }
  }
}
```

---

## 4. C. Local development clone

For contributors or custom builds:

```bash
git clone git@gitlab.palmabit.cloud:rule/rule-mcp/rule-mcp.git
cd rule-mcp
pnpm install
pnpm link . --global
```

Verify:

```bash
rule-mcp doctor
```

Start the server in stdio mode (for agent integration):

```bash
rule-mcp serve
```

Start in SSE mode (for IDE integration over HTTP):

```bash
rule-mcp serve --transport sse
# → SSE endpoint: http://127.0.0.1:37999/sse
# → Health: http://127.0.0.1:37999/health
```

---

## 5. D. Docker

### Build and run

```bash
# Build the image
docker build -t rule-mcp .

# Run in stdio mode (for MCP agents)
docker run -i rule-mcp

# Create the local token and client config first.
rule-mcp install --agent pi --mode docker

# Run in SSE mode (for Pi or VS Code over HTTP)
RULE_MCP_SSE_TOKEN="$(cat ~/.local/state/rule-mcp/sse-token)" \
  docker run -e RULE_MCP_SSE_TOKEN -p 37999:37999 \
  rule-mcp node src/index.js serve --transport sse

# Or use docker-compose from this repository.
RULE_MCP_SSE_TOKEN="$(cat ~/.local/state/rule-mcp/sse-token)" \
  docker compose up -d
# → SSE endpoint: http://localhost:37999/sse
# → Health: http://localhost:37999/health
```

### Docker Compose configuration

The included `docker-compose.yml` exposes:

- The server on port `37999` with authenticated SSE transport
- Automatic restarts
- Health check endpoint at `/health`

The Compose service requires `RULE_MCP_SSE_TOKEN`; the installer creates the owner-only token at `~/.local/state/rule-mcp/sse-token`. Do not commit that token or copy it into shared configuration.

---

## 6. E. Agent integration

### Auto-install into supported agents (23 total)

```bash
# Install into all detected agents
rule-mcp install --agent all

# Stdio is the default and works with every supported adapter.
rule-mcp install --agent claude
rule-mcp install --agent cursor
rule-mcp install --agent codex

# Daemon mode is verified for Pi and VS Code.
rule-mcp daemon install
rule-mcp install --agent pi --mode daemon
rule-mcp install --agent vscode --mode daemon

# Docker mode starts the same authenticated SSE endpoint through Compose.
./scripts/install.sh --agent pi --mode docker --no-rules

# Preview before writing
rule-mcp install --agent all --dry-run
```

Supported agents: `claude`, `codex`, `cursor`, `copilot`, `gemini`, `pi`, `cline`, `roo`, `zed`, `opencode`, `antigravity`, `windsurf`, `kilo`, `kimi`, `vibe`, `grok`, `droid`, `kiro`, `qwen`, `vscode`, `jetbrains`, `neovim`, `emacs`.

`daemon` and `docker` are deliberately limited to **Pi and VS Code** until the HTTP configuration schema of every other host is verified. Other adapters fail clearly rather than silently receiving a stdio configuration.

### Installer CLI health (bash + PowerShell)

`scripts/install.sh` and `scripts/install.ps1` never trust a binary that cannot launch:

- The global `rule-mcp` is only used when `rule-mcp --version` succeeds. A stale shim (e.g. left behind by a repo move) is **detected, warned about, and rewritten** as a plain launcher in the global bin dir; the install falls back to the local entrypoint (`node bin/rule-mcp.js`) instead of failing silently.
- The installer **never runs `pnpm link --global`** (pnpm 10/11 rewrites `pnpm-workspace.yaml` overrides and the lockfile). Set `RULE_MCP_SKIP_GLOBAL_LINK=1` to skip writing the shim entirely.
- CLI failures print their real output (indented) instead of being swallowed.
- Colors and box-drawing render only on an interactive TTY without `NO_COLOR`; piped/CI output stays plain. The interactive selector supports `↑↓/jk`, `1-9`, `a` (all), `n` (none), `Enter`/`q`.
- `uninstall.sh` / `uninstall.ps1` fully reverse the shim/global package, and the rules block appended to agent instruction files is prettier-clean, so the project `CLAUDE.md` no longer churns after install/uninstall cycles.

### Manual mcp.json configuration

For agents that support MCP, add this to their `mcp.json`:

**After global install (`rule-mcp` available in PATH):**

```json
{
  "mcpServers": {
    "rule-mcp": {
      "command": "rule-mcp",
      "args": ["serve"],
      "directTools": true,
      "lifecycle": "keep-alive"
    }
  }
}
```

**With local path (development):** use absolute paths for both Node and the entrypoint. `spawn()` does not expand `~`.

```json
{
  "mcpServers": {
    "rule-mcp": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/rule-mcp/bin/rule-mcp.js", "serve"],
      "directTools": true,
      "lifecycle": "keep-alive"
    }
  }
}
```

**Pi daemon configuration:** let the CLI generate the authenticated entry rather than copying a token manually:

```bash
rule-mcp config --mode daemon
rule-mcp install --agent pi --mode daemon
```

**VS Code daemon configuration:** the installer updates the user-level `servers` object (not the project workspace file):

```bash
rule-mcp install --agent vscode --mode daemon
```

It writes an entry equivalent to:

```json
{
  "servers": {
    "rule-mcp": {
      "type": "http",
      "url": "http://127.0.0.1:37999/sse",
      "headers": { "Authorization": "Bearer <local-token>" },
      "directTools": true,
      "lifecycle": "keep-alive"
    }
  }
}
```

**Recommended tool filter (reduces token consumption):**

```json
{
  "mcpServers": {
    "rule-mcp": {
      "command": "rule-mcp",
      "args": ["serve"],
      "directTools": true,
      "allowedTools": [
        "pix_gateway",
        "pix_apply",
        "rule",
        "pix_search",
        "pix_check",
        "pix_detect",
        "pix_scaffold",
        "pix_component"
      ]
    }
  }
}
```

### Agent config file paths

| Agent       | Configuration file                                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code | `~/.claude.json`                                                                                                                                                 |
| Cursor      | `~/.cursor/mcp.json`                                                                                                                                             |
| VS Code     | User-level `mcp.json`: macOS `~/Library/Application Support/Code/User/mcp.json`; Linux `~/.config/Code/User/mcp.json`; Windows `%APPDATA%\\Code\\User\\mcp.json` |
| Cline       | `~/.config/cline/mcp.json`                                                                                                                                       |
| Roo Code    | `~/.config/roo/mcp.json`                                                                                                                                         |
| Zed         | `~/.config/zed/mcp.json`                                                                                                                                         |
| Windsurf    | `~/.config/windsurf/mcp.json`                                                                                                                                    |
| Pi          | `~/.pi/agent/mcp.json`                                                                                                                                           |
| Gemini CLI  | `~/.gemini/settings.json`                                                                                                                                        |
| JetBrains   | `.idea/mcp.json` (project-level)                                                                                                                                 |
| Neovim      | `~/.config/nvim/mcp.json`                                                                                                                                        |
| Emacs       | `~/.emacs.d/init.el`                                                                                                                                             |

---

## 7. Verify everything works

```bash
# 1. Full health check
rule-mcp doctor

# 2. List all 78 tools
rule-mcp tools list | head -n 20

# 3. Test framework detection
rule-mcp tools call pix_detect --json '{"path": "."}'

# 4. Test the router
rule-mcp tools call rule --json '{"prompt": "Create a React button component"}'

# 5. Start the STDIO server
rule-mcp serve
```

Every successful MCP tool response includes `_meta.pixEnforcement` metadata.

---

## 8. Next steps

Once the server is running and integrated with your agent:

- Read the [full documentation README](../README.md) for complete architecture, tool reference, and guardrail system
- Explore skill content via `docs/01-product-architecture.md` for the skill taxonomy
- Run `rule-mcp tools list` to see all available tools
- Run `rule-mcp tools call rule -j '{"prompt":"..."}'` to test routing

For a complete workflow walkthrough (detect, route, generate, validate, fix, handoff), see the main [README.md](../README.md).
