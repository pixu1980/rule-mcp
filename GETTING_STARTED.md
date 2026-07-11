# Getting Started with pix-galaxy-mcp

> Quick-start guide covering all installation methods, configuration, and common workflows.
> **Goal**: have the MCP server running and integrated with your AI agent in under 5 minutes.

---

## Table of Contents

1. [What You Get](#1-what-you-get)
2. [Prerequisites](#2-prerequisites)
3. [Installation](#3-installation)
   - [A. Global install (recommended)](#a-global-install-recommended)
   - [B. pnpx/pnpx (no install)](#b-npxpnpx-no-install)
   - [C. Local development](#c-local-development)
   - [D. Universal installer script](#d-universal-installer-script)
   - [E. Docker](#e-docker)
4. [Verify Everything Works](#4-verify-everything-works)
5. [Integrate with Your AI Agent](#5-integrate-with-your-ai-agent)
   - [A. Quick auto-install into 23 agents](#a-quick-auto-install-into-23-agents)
   - [B. Manual mcp.json configuration](#b-manual-mcpjson-configuration)
   - [C. Per-agent configuration](#c-per-agent-configuration)
6. [First Workflow](#6-first-workflow)
   - [Step 1: Detect your project framework](#step-1-detect-your-project-framework)
   - [Step 2: Read the relevant skill](#step-2-read-the-relevant-skill)
   - [Step 3: Generate a component](#step-3-generate-a-component)
   - [Step 4: Validate the code](#step-4-validate-the-code)
   - [Step 5: Fix file tree](#step-5-fix-file-tree)
   - [Step 6: Track decisions with ADR](#step-6-track-decisions-with-adr)
   - [Step 7: Close the session](#step-7-close-the-session)
7. [CLI Quick Reference](#7-cli-quick-reference)
8. [MCP Tool Quick Reference](#8-mcp-tool-quick-reference)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. What You Get

After installing `pix-galaxy-mcp`, your AI coding agent gains:

| Capability | Tool | What it does |
|------------|------|-------------|
| **Smart routing** | `pix` | Routes any prompt to the best of 65 skills with framework bias |
| **65 skill tools** | `pix_frontend_react`, `pix_frontend_vue`, ... | Framework-specific best practices, styleguides, templates |
| **Search** | `pix_search` | BM25 full-text search across all 65 skills |
| **Component templates** | `pix_component` | Multi-framework component generation (button, card, modal, ...) |
| **Code validation** | `pix_check` | Guardrail checks: zero CSS classes, semantic HTML, barrel files, a11y |
| **File tree auto-fix** | `pix_fix` | Validates and auto-corrects file names, barrel files, structure |
| **Framework detection** | `pix_detect` | Auto-detects React, Vue, Svelte, Angular, Astro, Electron, etc. |
| **Project scaffolding** | `pix_scaffold` | Generates `.prettierrc`, `.editorconfig`, `.gitignore`, etc. |
| **Architecture wizard** | `pix_architect` | 16-step context interview for SDD specs |
| **ADR system** | `pix_process_adr` | Architecture Decision Records with auto-logging |
| **Session handoff** | `pix_process_handoff` | LLM context summary for cross-session recovery |
| **65+ MCP resources** | `pix://skills`, `pix://react`, ... | Full skill content as readable resources |

---

## 2. Prerequisites

| Requirement | Minimum | Check command |
|-------------|---------|---------------|
| **Node.js** | ≥ 20 | `node --version` |
| **pnpm** (recommended) | any | `pnpm --version` |
| **pnpm** (alternative) | any | `pnpm --version` |
| **AI coding agent** | any MCP-compatible | Claude Code, Cursor, Cline, Roo, etc. |
| **OpenSSL** (for HTTPS) | any | `openssl version` |

If you don't have pnpm:
```bash
npm install -g pnpm
```

---

## 3. Installation

### A. Global install (recommended)

```bash
pnpm add -g pix-galaxy-mcp
```

Verify:
```bash
pix-galaxy-mcp doctor
```

You should see a JSON report with `"ok": true`, your Node version, and the list of registered tools.

### B. pnpx/pnpx (no install)

Use directly without installing — good for evaluation or CI:

```bash
pnpx pix-galaxy-mcp doctor
pnpx pix-galaxy-mcp serve
```

To add to an agent's `mcp.json`:
```json
{
  "mcpServers": {
    "pix_galaxy_mcp": {
      "command": "pnpx",
      "args": ["-y", "pix-galaxy-mcp", "serve"],
      "directTools": true,
      "lifecycle": "keep-alive"
    }
  }
}
```

### C. Local development

Clone the repository and link globally:

```bash
git clone https://github.com/pixu1980/pix-galaxy-mcp.git
cd pix-galaxy-mcp
pnpm install
pnpm link --global
```

Then verify:
```bash
pix-galaxy-mcp doctor
```

### D. Universal installer script

Auto-detects installed coding agents and configures everything:

```bash
# From remote (auto-downloaded)
curl -fsSL https://pix-galaxy.dev/install.sh | bash

# From local repo
./scripts/install.sh

# Options:
./scripts/install.sh --agent claude     # Single agent only
./scripts/install.sh --models           # Also configure API keys
./scripts/install.sh --dry-run          # Preview without writing
./scripts/install.sh --force            # Override existing configs
```

**Windows:**
```powershell
.\scripts\install.ps1
```

### E. Docker

```bash
# Build
docker build -t pix-galaxy-mcp .

# Run (stdio — for MCP agents)
docker run -i pix-galaxy-mcp

# Run (SSE — for IDE integration)
docker run -p 37999:37999 pix-galaxy-mcp node src/index.js serve --transport sse

# Or with compose
docker compose up -d
# → SSE endpoint: http://localhost:37999/sse
```

---

## 4. Verify Everything Works

Run these commands to confirm the installation is correct:

```bash
# 1. Health check
pix-galaxy-mcp doctor

# 2. List all available tools (should show 41)
pix-galaxy-mcp tools list | head -20

# 3. Test a tool call
pix-galaxy-mcp tools call pix_detect --json '{"path": "."}'

# 4. Test the router
pix-galaxy-mcp tools call pix --json '{"prompt": "Create a React button component"}'

# 5. Start the STDIO server (for agent integration)
pix-galaxy-mcp serve
```

Every successful MCP tool response also contains `_meta.pixEnforcement` and a visible enforcement contract. `pix_check` returns a blocking tool error until every guardrail passes.

Expected output for each:

| Command | Expected |
|---------|----------|
| `doctor` | JSON with `"ok": true`, tools list, agent detection |
| `tools list` | 71 bundled tool names plus any discovered custom skill tools, alphabetically |
| `pix_detect` | Detected framework (e.g. `"react"`, `"vanilla"`) |
| `pix` | Routing JSON with `"route": "pix-frontend-react"`, confidence, sections |
| `serve` | Config snippet printed to stderr, then waits for MCP connections |

---

## 5. Integrate with Your AI Agent

### A. Quick auto-install into 23 agents

The fastest way to integrate with all your agents:

```bash
# Install into ALL detected agents (auto-discovers configs)
pix-galaxy-mcp install --agent all

# Install for a specific agent
pix-galaxy-mcp install --agent claude
pix-galaxy-mcp install --agent cursor
pix-galaxy-mcp install --agent codex
pix-galaxy-mcp install --agent pi
pix-galaxy-mcp install --agent vscode

# Preview before installing
pix-galaxy-mcp install --agent all --dry-run
```

Supported agents (23 total):
- **Coding agents**: `claude`, `codex`, `cursor`, `copilot`, `gemini`, `pi`, `cline`, `roo`, `zed`, `opencode`, `antigravity`, `windsurf`, `kilo`, `kimi`, `vibe`, `grok`, `droid`, `kiro`, `qwen`
- **IDEs**: `vscode`, `jetbrains`, `neovim`, `emacs`

Installer also adds reusable workflow entry points where host provides verified mechanism:

| Host | Command |
|------|---------|
| Pi, Claude Code, Gemini CLI, Cursor | `/pix-galaxy-mcp <request>` |
| GitHub Copilot CLI | `/agent` → `pix-galaxy-mcp` |
| Codex CLI | Use globally installed `pix` skill; custom prompt behavior is version-dependent |

Command enforces: route with `pix`, load exact skills, use repository evidence, refuse guesses, write failing tests first, run blocking `pix_check` until green, run project checks, record architecture decisions with `pix_process_adr`.

### B. Manual mcp.json configuration

If you prefer to configure manually, add this to your agent's `mcp.json`:

**With global install:**
```json
{
  "mcpServers": {
    "pix_galaxy_mcp": {
      "command": "pix-galaxy-mcp",
      "args": ["serve"],
      "directTools": true,
      "lifecycle": "keep-alive"
    }
  }
}
```

**With pnpx/pnpx (no global install):**
```json
{
  "mcpServers": {
    "pix_galaxy_mcp": {
      "command": "pnpx",
      "args": ["-y", "pix-galaxy-mcp", "serve"],
      "directTools": true,
      "lifecycle": "keep-alive"
    }
  }
}
```

**With local path (development):**
```json
{
  "mcpServers": {
    "pix_galaxy_mcp": {
      "command": "node",
      "args": ["/absolute/path/to/pix-galaxy-mcp/bin/pix-galaxy-mcp.js", "serve"],
      "directTools": true,
      "lifecycle": "keep-alive"
    }
  }
}
```

### C. Per-agent configuration paths

| Agent | Config file location |
|-------|---------------------|
| Claude Code | `~/.claude.json` |
| Cursor | `~/.cursor/mcp.json` |
| VS Code | `.vscode/mcp.json` (project-level) |
| Cline | `~/.config/cline/mcp.json` |
| Roo Code | `~/.config/roo/mcp.json` |
| Zed | `~/.config/zed/mcp.json` |
| Windsurf | `~/.config/windsurf/mcp.json` |
| Pi | `~/.pi/agent/mcp.json` |
| Gemini CLI | `~/.gemini/settings.json` |
| JetBrains | `.idea/mcp.json` (project-level) |
| Neovim | `~/.config/nvim/mcp.json` |
| Emacs | `~/.emacs.d/init.el` |

---

## 6. First Workflow

This section walks through a complete workflow: from detecting your project to closing the session with a handoff.

### Step 1: Detect your project framework

```bash
pix-galaxy-mcp tools call pix_detect --json '{"path": "."}'
```

Output:
```json
{
  "projectName": "my-app",
  "framework": "react",
  "typescript": true,
  "buildTool": "vite",
  "suggested_skills": ["pix-frontend-react"],
  "suggested_tools": ["pix_frontend_react", "pix_check", "pix_scaffold", "pix_component"]
}
```

### Step 2: Read the relevant skill

```bash
# Read the full React skill
pix-galaxy-mcp tools call pix_frontend_react --json '{"mode": "full"}'
```

Or get a compressed TLDR with BM25:
```bash
pix-galaxy-mcp tools call pix_frontend_react --json '{"mode": "tldr", "query": "component architecture props"}'
```

### Step 3: Generate a component

```bash
# Generate a single button template
pix-galaxy-mcp tools call pix_component --json '{"component": "button", "framework": "react"}'

# Generate a full file tree (multi-file mode)
pix-galaxy-mcp tools call pix_component --json '{
  "component": "button",
  "framework": "react",
  "mode": "multi",
  "name": "PrimaryButton"
}'
```

Output file tree:
```
src/components/PrimaryButton/
├── _PrimaryButton.jsx
├── _PrimaryButton.css
└── index.js
```

Alternatively, use `pix_fix` which generates a compliant file tree:
```bash
pix-galaxy-mcp tools call pix_fix --json '{
  "mode": "generate",
  "name": "MyCard",
  "framework": "react",
  "path": "."
}'
```

### Step 4: Validate the code

Run guardrail checks on your generated code:

```bash
pix-galaxy-mcp tools call pix_check --json '{
  "skill": "pix-frontend-react",
  "code": "export function Button() { return <button data-part=\"button\">Click</button> }",
  "fileName": "_Button.jsx",
  "isComponent": true
}'
```

Fix any violations, then re-check with smart iteration:
```bash
pix-galaxy-mcp tools call pix_check --json '{
  "skill": "pix-frontend-react",
  "code": "...",
  "fileName": "_Button.jsx",
  "isComponent": true,
  "previousPassed": ["no-css-classes", "no-inline-styles", "semantic-html"]
}'
```

### Step 5: Fix file tree

Scan the project for file tree violations and auto-correct:

```bash
# Lint: scan for issues without modifying
pix-galaxy-mcp fix

# Auto-fix: correct violations
pix-galaxy-mcp fix --mode fix --no-dry-run

# Scan with custom source directory
pix-galaxy-mcp fix --dir ./my-project --src-dir app

# Via MCP tool
pix-galaxy-mcp tools call pix_fix --json '{"mode": "lint", "path": "."}'
pix-galaxy-mcp tools call pix_fix --json '{"mode": "fix", "dryRun": false}'
```

What the fix checks and corrects:

| Issue | Detection | Auto-fix |
|-------|-----------|----------|
| Missing `index.js` barrel | ✅ | Creates barrel with correct exports |
| Unprefixed component file (`Button.jsx`) | ✅ | Renames to `_Button.jsx` |
| Empty barrel (no exports) | ✅ | Populates with `export { ... }` |
| Component file outside PascalCase folder | ✅ | Reports (requires manual move) |
| Orphan CSS file | ✅ | Reports (requires manual check) |

### Step 6: Track decisions with ADR

Every tool call to `pix`, `pix_scaffold`, `pix_architect`, `pix_detect`, and `pix_fix` automatically creates an ADR in `docs/adr/`.

You can also create explicit ADRs:

```bash
# CLI
pix-galaxy-mcp adr new "Use PostgreSQL for persistence" --status accepted --tags database

# MCP tool
pix-galaxy-mcp tools call pix_process_adr --json '{
  "title": "Use PostgreSQL for persistence",
  "status": "accepted",
  "context": "Need ACID compliance and complex JOINs",
  "decision": "PostgreSQL 16 with PgBouncer connection pooling",
  "consequences": "Positive: ACID compliance. Negative: scaling requires read replicas",
  "alternatives": ["MongoDB (rejected: no relations)", "SQLite (rejected: concurrency)"],
  "tags": ["database", "persistence", "backend"]
}'
```

View all ADRs:
```bash
ls docs/adr/
cat docs/adr/README.md
```

### Step 7: Close the session

Before ending a session, generate a comprehensive handoff so a new session can pick up seamlessly:

```bash
# Full session close (git diff + ADRs + docs scan + context)
pix-galaxy-mcp handoff --mode close-session | pbcopy

# Or via MCP tool
pix-galaxy-mcp tools call pix_process_handoff --json '{"mode": "close-session"}'
```

On the next session, restore context with:
```bash
pix-galaxy-mcp handoff
```

This outputs all ADRs, git state, documentation status, and context values — allowing the new session to continue without re-asking any questions.

---

## 7. CLI Quick Reference

```bash
# Server
pix-galaxy-mcp serve [--transport sse] [--ssl-cert FILE --ssl-key FILE]

# Daemon (background process)
pix-galaxy-mcp daemon start|stop|status|logs
pix-galaxy-mcp daemon install|uninstall|enable|disable

# Agent integration
pix-galaxy-mcp install --agent <name> [--global] [--dry-run] [--force]
pix-galaxy-mcp uninstall --agent <name> [--dry-run]

# Tools
pix-galaxy-mcp tools list
pix-galaxy-mcp tools call <name> --json '{...}'

# Health
pix-galaxy-mcp doctor [--telemetry]

# Skills
pix-galaxy-mcp skills install [--scope global|project] [--all]
pix-galaxy-mcp skills reload

# File tree fix
pix-galaxy-mcp fix [--mode lint|fix] [--dir PATH] [--src-dir PATH] [--dry-run]

# ADR
pix-galaxy-mcp adr new "<title>" [--status <s>] [--tags <a,b,c>]

# Handoff
pix-galaxy-mcp handoff [--mode handoff|close-session] [--compress] [--format full|brief|minimal]

# Config
pix-galaxy-mcp config [--global]
pix-galaxy-mcp completions --shell zsh|bash|fish

# Help
pix-galaxy-mcp help
pix-galaxy-mcp <command> --help
```

---

## 8. MCP Tool Quick Reference

| Tool | Purpose | Example args |
|------|---------|-------------|
| `pix` | Route prompt to correct skill | `{ "prompt": "React button", "framework": "react" }` |
| `pix_search` | BM25 search across all skills | `{ "query": "CSS data-part", "maxResults": 5 }` |
| `pix_component` | Generate component templates | `{ "component": "button", "framework": "react", "mode": "multi" }` |
| `pix_check` | Validate code against guardrails | `{ "skill": "pix-frontend-react", "code": "...", "fileName": "_Btn.jsx" }` |
| `pix_fix` | File tree lint, fix, or generate | `{ "mode": "lint", "path": "." }` |
| `pix_scaffold` | Generate project config files | `{ "file": ".prettierrc" }` |
| `pix_detect` | Auto-detect project framework | `{ "path": "." }` |
| `pix_process_adr` | Create Architecture Decision Record | `{ "title": "Use PostgreSQL" }` |
| `pix_process_handoff` | Generate session handoff | `{ "mode": "close-session" }` |
| `pix_frontend_react` | React best practices skill | `{ "mode": "tldr", "query": "hooks" }` |
| `pix_frontend_vue` | Vue 3 best practices skill | `{ "mode": "full" }` |
| `pix_process_bmad` | BMAD Method AI-driven dev framework | `{ "mode": "summary" }` |
| ... and 32 more skill tools | | |

---

## 9. Troubleshooting

### `pix-galaxy-mcp: command not found`

```bash
# Check if installed
pnpm list -g pix-galaxy-mcp

# Reinstall
pnpm add -g pix-galaxy-mcp

# Or use pnpx directly
pnpx pix-galaxy-mcp doctor
```

### Agent doesn't see the tools

```bash
# 1. Verify the server starts
pix-galaxy-mcp serve
# Should print config snippet to stderr

# 2. Check the mcp.json file
cat ~/.claude.json    # or the relevant agent config
# Should contain pix_galaxy_mcp entry

# 3. Reinstall with --force
pix-galaxy-mcp install --agent claude --force

# 4. Restart your agent
```

### Guardrails fail but code looks correct

Use smart iteration to skip already-passed checks:

```bash
pix-galaxy-mcp tools call pix_check --json '{
  "skill": "pix-frontend-react",
  "code": "...",
  "previousPassed": ["no-css-classes", "no-inline-styles", "semantic-html", "external-css"]
}'
```

### Skills not loading after update

```bash
pix-galaxy-mcp skills reload
```

### Need help

```bash
# Full system diagnostics
pix-galaxy-mcp doctor

# Check daemon logs
pix-galaxy-mcp daemon logs

# List all available tools
pix-galaxy-mcp tools list
```

---

## Quick Install Cheat Sheet

```bash
# ─── I want to install quickly ───
pnpm add -g pix-galaxy-mcp
pix-galaxy-mcp doctor
pix-galaxy-mcp install --agent all

# ─── I want to use it without installing ───
pnpx pix-galaxy-mcp serve

# ─── I want to try it first ───
pnpx -y pix-galaxy-mcp doctor

# ─── I want to develop ───
git clone <repo> && cd pix-galaxy-mcp && pnpm install && pnpm link --global

# ─── I want Docker ───
docker compose up -d

# ─── I want to just fix my project file tree ───
pnpx -y pix-galaxy-mcp fix --mode fix --no-dry-run

# ─── I want to close my session ───
pix-galaxy-mcp handoff --mode close-session | pbcopy
```
