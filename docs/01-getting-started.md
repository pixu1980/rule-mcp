# Getting Started with rule-mcp

> Step-by-step installation guide for all deployment modes.
> **Goal:** have the MCP server running with your AI agent in under 5 minutes.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Global npm install (recommended)](#2-global-npm-install-recommended)
3. [pnpx/npx (no install, ephemeral)](#3-pnpxnpx-no-install-ephemeral)
4. [Local development clone](#4-local-development-clone)
5. [Docker](#5-docker)
6. [Agent integration](#6-agent-integration)
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

## 2. Global CLI from a clone

The package is not on the npm registry yet, so install from a clone.
The installer puts a `rule-mcp` launcher on your PATH:

```bash
git clone https://github.com/pixu1980/rule-mcp.git
cd rule-mcp
pnpm install
./scripts/install.sh
```

Verify the installation:

```bash
rule-mcp doctor
```

Expected output: health report with `ok: true`, 78 tools registered, detected agents.

<!-- install-claims:allow-start -->

> **Note:** `pnpm add -g rule-mcp` applies only once the package is
> published to the npm registry. Until then, install from a clone as above.

<!-- install-claims:allow-end -->

---

## 3. pnpx/npx (no install, ephemeral)

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

## 4. Local development clone

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

## 5. Docker

### Build and run

```bash
# Build the image
docker build -t rule-mcp .

# Run in stdio mode (for MCP agents)
docker run -i rule-mcp

# Create the local token and client config first.
rule-mcp install --agent pi --mode docker

# Run in SSE mode (for Pi or VS Code over HTTP)
RULE_MCP_SSE_TOKEN="$(cat ~/.rule-mcp/state/sse-token)" \
  docker run -e RULE_MCP_SSE_TOKEN -p 37999:37999 \
  rule-mcp node src/index.js serve --transport sse

# Or use docker-compose from this repository.
RULE_MCP_SSE_TOKEN="$(cat ~/.rule-mcp/state/sse-token)" \
  docker compose up -d
# → SSE endpoint: http://localhost:37999/sse
# → Health: http://localhost:37999/health
```

### Docker Compose configuration

The included `docker-compose.yml` exposes:

- The server on port `37999` with authenticated SSE transport
- Automatic restarts
- Health check endpoint at `/health`

The Compose service requires `RULE_MCP_SSE_TOKEN`; the installer creates the owner-only token at `~/.rule-mcp/state/sse-token`. Do not commit that token or copy it into shared configuration.

---

## 6. Agent integration

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
rule-mcp setup --agent pi --mode docker --no-rules

# Skills are never copied without asking; --skills forces the copy.
rule-mcp setup --skills

# Preview before writing
rule-mcp install --agent all --dry-run
```

Supported agents: `claude`, `codex`, `cursor`, `copilot`, `gemini`, `pi`, `cline`, `roo`, `zed`, `opencode`, `antigravity`, `devin` (formerly Windsurf), `kilo`, `kimi`, `vibe`, `grok`, `droid`, `kiro`, `qwen`, `vscode`, `jetbrains`, `neovim`, `emacs`.

`daemon` and `docker` are deliberately limited to **Pi and VS Code** until the HTTP configuration schema of every other host is verified. Other adapters fail clearly rather than silently receiving a stdio configuration.

### The setup wizard

`rule-mcp setup` is a full-viewport, step-based installer. It runs on the
alternate screen, so the terminal it borrows is handed back exactly as it was
found.

| Step      | What you choose                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------- |
| Preflight | Nothing - it reports Node, the package manager, git, the binary and the global shim               |
| Agents    | Which agents get an MCP entry. Detected ones start ticked; the rest stay reachable                |
| Mode      | `stdio`, `daemon` or `docker`, with what each one costs and which agents support it               |
| Extras    | Instruction rules, slash commands, bundled skills, the commit hook, the service, the health check |
| Review    | The whole plan as an ordered list, with `d` to toggle a dry run                                   |
| Install   | Live progress, one row per task, with the output of whatever is running                           |
| Done      | The tally, every warning with its message, and what to run next                                   |

`--uninstall` runs the mirror: a scan of what is actually on the machine, one
tick per removable group with its count and paths, a separate opt-in screen for
the destructive purge, then the same review and progress screens.

Keys: `↑↓`/`jk` move, `space` toggles, `1-9` jump and toggle, `a`/`n` select all
or none, `enter` advances, `esc` goes back, `q` quits. Nothing is written before
the review step is confirmed.

**Every flag:**

```bash
rule-mcp setup --help
```

`--agent <name>` narrows the run to one target, `--mode <name>` picks the
transport, `--dry-run` previews, `--force` overrides existing configuration, and
each optional step has a pair (`--rules`/`--no-rules`, `--skills`/`--no-skills`,
`--commands`/`--no-commands`, `--git-hook`/`--no-git-hook`,
`--service`/`--no-service`, `--doctor`/`--no-doctor`). `--purge` and
`--keep-config` apply to `--uninstall`.

### Shell and PowerShell bootstraps

`scripts/install.sh`, `scripts/uninstall.sh` and their `.ps1` counterparts are
bootstraps of about 60 lines: they check Node, resolve the binary, and forward
everything to `setup`. All the logic lives in `src/cli/setup/` (ADR 080), so
there is one implementation to keep correct rather than three.

- `curl -fsSL .../install.sh | bash` still gets the wizard: the bootstrap
  borrows `/dev/tty` when stdin is the piped script and stdout is a terminal. A
  fully redirected run stays non-interactive and prints one line per step.
- The global `rule-mcp` is only used when `rule-mcp --version`
  succeeds. A stale shim (left behind by a repo move, say) is detected and
  rewritten as a plain launcher in the global bin dir.
- The installer **never runs `pnpm link --global`** (pnpm 10/11 rewrites
  `pnpm-workspace.yaml` overrides and the lockfile). Set
  `RULE_MCP_SKIP_GLOBAL_LINK=1` to skip writing the shim entirely.
- The bundled `rule-*` skills are never copied without asking. `--skills` forces
  the copy in non-interactive runs, `--no-skills` skips the step.
- The instruction block is written and removed through one target list, so
  install and uninstall cannot disagree about where it lives, and the block is
  prettier-clean so the project `CLAUDE.md` does not churn across cycles.
- `--force` on `uninstall.sh` means "do not ask": it runs the plan with defaults
  and no wizard.

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
      "allowedTools": ["rule_tool_gateway", "rule_tool_apply", "pix_tool", "rule_tool_search", "rule_tool_check", "rule_tool_detect", "rule_tool_scaffold", "rule_tool_component"]
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
| Devin       | `~/.config/devin/mcp_config.json` (formerly Windsurf)                                                                                                            |
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
rule-mcp tools call rule_tool_detect --json '{"path": "."}'

# 4. Test the router
rule-mcp tools call rule --json '{"prompt": "Create a React button component"}'

# 5. Start the STDIO server
rule-mcp serve
```

Every successful MCP tool response includes `_meta.pixEnforcement` metadata.

---

## 8. Next steps

Once the server is running and integrated with your agent:

- Read the [full documentation README](README.md) for complete architecture, tool reference, and guardrail system
- Explore skill content via `./02-product-architecture.md` for the skill taxonomy
- Run `rule-mcp tools list` to see all available tools
- Run `rule-mcp tools call rule -j '{"prompt":"..."}'` to test routing

For a complete workflow walkthrough (detect, route, generate, validate, fix, handoff), see the root [../README.md](../README.md).
