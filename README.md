# pix-galaxy-mcp

**MCP server** for the **pix-\*** skill ecosystem.  
Serves styleguides, component templates, framework best practices, and design system patterns directly to your AI coding agent — **without leaving your editor**.

[![npm version](https://img.shields.io/npm/v/pix-galaxy-mcp)](https://www.npmjs.com/package/pix-galaxy-mcp)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![SDK](https://img.shields.io/badge/MCP%20SDK-1.29.0-blue)](https://github.com/modelcontextprotocol/typescript-sdk)

---

> **Runtime deps:** `@modelcontextprotocol/sdk` + `zod` only. No build step, no external registry deps.  
> **Local-first**: Everything runs on your machine, skills live in `~/.agents/skills/`.

---

## Table of Contents

- [What is it](#what-is-it)
- [Features](#features)
- [Installation](#installation)
- [CLI Reference](#cli-reference)
- [MCP Tools](#mcp-tools)
- [MCP Resources](#mcp-resources)
- [MCP Prompts](#mcp-prompts)
- [Transport](#transport)
- [Daemon & Services](#daemon--services)
- [Agent Installation](#agent-installation)
- [Skill System](#skill-system)
- [Guardrails Engine](#guardrails-engine)
- [BM25 Search](#bm25-search)
- [ADR System](#adr-system)
- [LLM Handoff](#llm-handoff)
- [Architecture](#architecture)
- [Docker](#docker)
- [Development](#development)
- [License](#license)

---

## What is it

**pix-galaxy-mcp** is an MCP (Model Context Protocol) server that exposes **78 tools** (or **9 in strict mode** with `PIX_STRICT_MODE=1`) and **146 resources** to any MCP-compatible coding agent (Claude Code, Cursor, Cline, Roo Code, Copilot, Gemini CLI, Codex CLI, Windsurf, OpenCode, Pi, and many more).

The server solves a concrete problem: **every AI agent needs precise instructions on how to write frontend code** — zero CSS classes, zero inline styles, semantic HTML, barrel file tree. pix-galaxy-mcp centralizes these rules into modular skills and makes them available as callable MCP tools.

### Typical workflow

```
User: "Create a button component in React"

  ↓ pix (router with framework bias)

Agent calls pix_frontend_react (reads React best practices)
Agent calls pix_component → button (gets template)

  ↓ Agent generates code using MCP responses

Result: React component compliant with pix principles
        (zero classes, semantic HTML, external CSS)
```

---

## Features

| Feature | Detail |
|---------|--------|
| **71 MCP Tools** | `pix` orchestrator, 65 skill tools, `pix_search`, `pix_component`, `pix_check`, `pix_scaffold`, `pix_architect`, `pix_detect`, `pix_process_adr`, `pix_process_handoff`, `pix_fix` |
| **146 MCP Resources** | `pix://skills`, `pix://templates`, `pix://project`, `pix://<skill-name>`, `pix://<skill-name>/summary`, `pix://a11y/*` |
| **5 MCP Prompts** | `pix-code-review`, `pix-generate-component`, `pix-a11y-test`, `pix-a11y-review`, `pix-architect-scaffold` |
| **Runtime deps only** | `@modelcontextprotocol/sdk` + `zod`. No build step needed. |
| **Framework auto-detection** | Reads `package.json` and detects framework, TypeScript usage, build tool |
| **Smart routing** | `pix` analyzes the prompt and routes to the correct skill with framework bias (×2 for detected framework) |
| **BM25 full-text search** | Semantic search across all skills: section-level indexing, ranked results with snippets |
| **Fail-closed enforcement** | Mandatory preprocessing and postprocessing around every tool call; invalid input/output never reaches downstream model |
| **Guardrails engine** | Shared + framework rules, including unfinished code, suppressed errors, and manifest-verified imports. Failed checks return blocking tool errors |
| **Auditable output** | Every successful result includes `_meta.pixEnforcement` and visible `PIX ENFORCEMENT CONTRACT` |
| **Reusable agent commands** | `/pix-galaxy-mcp` for Pi, Claude Code, Gemini CLI, Cursor; Copilot custom agent via `/agent` |
| **TLDR mode** | BM25-compressed output: 90-97% token savings. `mode=tldr` on every skill tool |
| **Component templates** | Multi-framework templates (vanilla, React, Vue, Svelte) for button, card, modal, formField, list, nav, a11y tests |
| **ADR System** | Architecture Decision Records with auto-numbering, Nygard template, auto-index, auto-log after tool calls |
| **LLM Handoff** | Generates context summary from ADRs + `.context/` values to resume interrupted sessions |
| **SSE Daemon** | Background HTTP server for SSE-compatible IDEs. Port 37999 |
| **Native HTTPS** | Self-signed certificate auto-generation via OpenSSL |
| **23 agent installer** | Install/uninstall from Claude, Codex, Cursor, Copilot, Gemini, Cline, Roo, Zed, OpenCode, Windsurf, Antigravity, Kilo, Kimi, Vibe, Grok, Droid, Kiro, Qwen, Pi, VS Code, JetBrains, Neovim, Emacs |
| **Native services** | macOS LaunchAgent (Login Items), Linux systemd user service, Windows Service |
| **Docker** | Multi-arch image on ghcr.io, compose with health check |
| **Plugin system** | Custom skills with `plugin.js` for extended guardrails and generators |

### Mandatory enforcement pipeline

```text
LLM tool request
  → Zod schema validation
  → fail-closed preprocessing (size/depth/key/control-char checks + normalization)
  → deterministic tool handler
  → mandatory postprocessing (result shape + route/tool registry verification)
  → `_meta.pixEnforcement` + model-visible compliance contract
  → LLM
```

`pix_check` is blocking: any failed guardrail returns `isError: true`. Model must fix code and rerun until all checks pass. Server rejects invented router skills/tools, blank routing prompts, malformed MCP results, unfinished implementation markers, ignored diagnostics, empty catches, and undeclared external imports when manifest context is supplied.

### Reusable command support

| Agent | Installed artifact | Invocation |
|-------|--------------------|------------|
| Pi | `~/.pi/agent/prompts/pix-galaxy-mcp.md` | `/pix-galaxy-mcp <request>` |
| Claude Code | `~/.claude/commands/pix-galaxy-mcp.md` | `/pix-galaxy-mcp <request>` |
| Gemini CLI | `~/.gemini/commands/pix-galaxy-mcp.toml` | `/pix-galaxy-mcp <request>` |
| Cursor | `.cursor/commands/pix-galaxy-mcp.md` | `/pix-galaxy-mcp <request>` |
| GitHub Copilot CLI | `~/.copilot/agents/pix-galaxy-mcp.agent.md` | `/agent`, then select `pix-galaxy-mcp` |
| Codex CLI | Global `pix` skill | Use skill routing; custom prompt commands vary by Codex version |

---

### Recommended tool filter

To reduce token consumption and prevent the model from choosing irrelevant skill tools, use `allowedTools` in your `mcp.json`:

```json
{
  "mcpServers": {
    "pix_galaxy_mcp": {
      "command": "node",
      "args": ["path/to/pix-galaxy-mcp/bin/pix-galaxy-mcp.js", "serve"],
      "directTools": true,
      "allowedTools": ["pix_gateway", "pix_apply", "pix", "pix_search", "pix_check", "pix_detect", "pix_scaffold", "pix_component"]
    }
  }
}
```

With this filter, the model sees only 8 core tools. For routing, evidence, validation, and writing — all through `pix_gateway` + `pix_apply` — this is sufficient for most workflows.

For even stricter enforcement, set `PIX_STRICT_MODE=1` (via environment variable) which limits the surface to just 9 tools (gateway, apply, search, check, detect, scaffold, component, handoff, and the `pix` router).

---

## Installation

### Prerequisites

- **Node.js ≥ 20** (https://nodejs.org)
- **pnpm** (recommended) — `npm install -g pnpm`

### Global (recommended)

```bash
pnpm add -g pix-galaxy-mcp
```

Then verify:

```bash
pix-galaxy-mcp doctor
```

### pnpx / pnpx (no global install)

```bash
pnpx pix-galaxy-mcp doctor
pnpx pix-galaxy-mcp serve
```

### Local development

```bash
git clone https://github.com/pixu1980/pix-galaxy-mcp.git
cd pix-galaxy-mcp
pnpm install
pnpm link --global
```

### Universal installer

```bash
# Remote (auto-downloaded script)
curl -fsSL https://pix-galaxy.dev/install.sh | bash

# Local (from repo)
./scripts/install.sh
# Options:
./scripts/install.sh --agent claude    # Install for Claude only
./scripts/install.sh --models          # Configure API keys
./scripts/install.sh --dry-run         # Preview without writing
./scripts/install.sh --force           # Override existing configs
```

### Windows

```powershell
.\scripts\install.ps1
```

---

## CLI Reference

Every command supports `--help` (or `-h`) for inline documentation.

### `pix-galaxy-mcp help`

Prints the global help message with all commands and options.

### `pix-galaxy-mcp serve [options]`

Starts the MCP server.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--transport` | `string` | `"stdio"` | `stdio` (stdin/stdout) or `sse` (HTTP) |
| `--ssl-cert` | `path` | — | TLS certificate path (requires `--ssl-key`) |
| `--ssl-key` | `path` | — | TLS private key path (requires `--ssl-cert`) |

**Aliases:**
- `pix-galaxy-mcp dev` ≡ `pix-galaxy-mcp serve` (stdio)
- `pix-galaxy-mcp up` ≡ `pix-galaxy-mcp serve --transport sse`

**Examples:**
```bash
pix-galaxy-mcp serve                         # STDIO (default)
pix-galaxy-mcp serve --transport sse          # SSE on 127.0.0.1:37999
pix-galaxy-mcp serve --transport sse --ssl-cert cert.pem --ssl-key key.pem  # HTTPS
pnpm dev                                      # STDIO from local repo
pnpm up                                       # SSE from local repo
```

On startup, prints the `mcp.json` config snippet to stderr for agent integration.

### `pix-galaxy-mcp daemon <action> [options]`

Manages the MCP daemon. Two modes: **process** (cross-platform, no reboot persistence) and **native service** (persists across reboots, appears in Login Items on macOS).

| Action | Description |
|--------|-------------|
| `start` | Starts daemon (process or native service) |
| `stop` | Stops daemon |
| `status` | Shows detailed status (platform, service, PID, files) |
| `logs` | Shows daemon log |
| `install` | Installs platform-native service |
| `uninstall` | Removes platform-native service |
| `enable` | Activates native service without reinstalling |
| `disable` | Deactivates native service without removing |

| Option | Description |
|---------|-------------|
| `--dry-run` | Preview changes without writing (install/uninstall only) |

**Examples:**
```bash
pix-galaxy-mcp daemon start          # Start background process
pix-galaxy-mcp daemon status         # Full status
pix-galaxy-mcp daemon logs           # Show logs
pix-galaxy-mcp daemon install        # Install native service
pix-galaxy-mcp daemon uninstall      # Remove native service
```

#### Native services per platform

| Platform | Mechanism | Config path | Visible in |
|----------|-----------|-------------|-------------|
| macOS | LaunchAgent | `~/Library/LaunchAgents/io.github.pixu1980.pix-galaxy-mcp.plist` | System Settings → General → Login Items |
| Linux | systemd user | `~/.config/systemd/user/pix-galaxy-mcp.service` | `systemctl --user status pix-galaxy-mcp` |
| Windows | Windows Service | `sc.exe query pix-galaxy-mcp` | Services.msc |

On macOS, a wrapper script is created at `~/.local/bin/pix-galaxy-mcpd` so that Login Items shows "pix-galaxy-mcpd" instead of "Node.js Foundation".

### `pix-galaxy-mcp install --agent <name> [options]`

Installs pix-galaxy-mcp into an agent/IDE configuration (writes/updates `mcp.json`).

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--agent` | `string` | — | Agent name or `"all"` for all 23 supported agents |
| `--global` | `flag` | — | Uses clean command `pix-galaxy-mcp serve` (requires global install) |
| `--force` | `flag` | — | Overrides existing configuration |
| `--dry-run` | `flag` | — | Preview without writing |

**Supported agents (23 total):**

| Category | Agents |
|----------|--------|
| Coding Agents | `claude`, `codex`, `cursor`, `copilot`, `gemini`, `pi`, `cline`, `roo`, `zed`, `opencode`, `antigravity`, `windsurf`, `kilo`, `kimi`, `vibe`, `grok`, `droid`, `kiro`, `qwen` |
| IDEs | `vscode`, `jetbrains`, `neovim`, `emacs` |

**Examples:**
```bash
pix-galaxy-mcp install --agent claude                 # Single agent (local mode)
pix-galaxy-mcp install --agent claude --global         # Single agent (global mode)
pix-galaxy-mcp install --agent all                     # All 23 agents
pix-galaxy-mcp install --agent all --dry-run           # Preview
pix-galaxy-mcp install --agent cursor --force           # Override
```

#### Install modes

| Mode | Command in mcp.json | Prerequisite |
|------|--------------------|--------------|
| `local` (default) | `node /path/to/pix-galaxy-mcp.js serve` | None — uses absolute path |
| `global` (`--global`) | `pix-galaxy-mcp serve` | `pnpm add -g pix-galaxy-mcp` |

The manifest file `installed.md` is written to `~/.local/share/pix-galaxy-mcp/installed.md`.

### `pix-galaxy-mcp uninstall --agent <name> [options]`

Removes pix-galaxy-mcp from an agent configuration.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--agent` | `string` | — | Agent name or `"all"` |
| `--dry-run` | `flag` | — | Preview without removing |

**Examples:**
```bash
pix-galaxy-mcp uninstall --agent claude
pix-galaxy-mcp uninstall --agent all
```

### `pix-galaxy-mcp fix [options]`

Validates and auto-fixes project file tree structure against pix conventions (barrel `index.js`, `_` prefix for component files).

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--dir` | `path` | `"."` | Project root directory |
| `--src-dir` | `path` | `"src"` | Source directory to scan |
| `--mode` | `string` | `"lint"` | `lint` (scan + report) or `fix` (scan + auto-correct) |
| `--dry-run` | `flag` | — | Preview fixes without applying |

**What the lint checks:**
- Every component folder must have an `index.js` barrel that re-exports
- Every component file inside a folder must start with `_` (e.g. `_Button.jsx`)
- Barrel files must contain valid `export` statements
- Orphan CSS files (no matching component)
- Files missing the `_` prefix

**What auto-fix corrects:**
- Renames component files to add the `_` prefix
- Creates/populates barrel `index.js` files with correct exports

**What it does NOT auto-fix** (manual intervention required):
- Component files outside a PascalCase folder (e.g. `src/Card.jsx`)
- Orphan CSS files

**Examples:**
```bash
pix-galaxy-mcp fix                          # Lint: scan + report
pix-galaxy-mcp fix --mode lint               # Explicit lint mode
pix-galaxy-mcp fix --mode fix                # Preview fixes (dry-run)
pix-galaxy-mcp fix --mode fix --no-dry-run   # Apply fixes
pix-galaxy-mcp fix --dir ./my-project --src-dir app
```

### `pix-galaxy-mcp config [options]`

Prints the `mcp.json` configuration snippet for MCP integration.

| Option | Description |
|---------|-------------|
| `--global` | Uses clean command `pix-galaxy-mcp serve` |

**Examples:**
```bash
pix-galaxy-mcp config                    # Config with absolute path
pix-galaxy-mcp config --global           # Config with global command
```

Typical output:
```json
{
  "pix_galaxy_mcp": {
    "command": "/path/to/node",
    "args": ["/path/to/pix-galaxy-mcp.js", "serve"],
    "directTools": true,
    "lifecycle": "keep-alive"
  }
}
```

### `pix-galaxy-mcp tools <subcommand> [args]`

Lists or calls MCP tools directly from the terminal.

| Subcommand | Description |
|------------|-------------|
| `list` | Lists all registered tools (name + description) |
| `call <name> --json '{...}'` | Calls a tool with JSON arguments |

**Examples:**
```bash
pix-galaxy-mcp tools list
pix-galaxy-mcp tools call pix --json '{"prompt": "I need a React button"}'
pix-galaxy-mcp tools call pix_detect --json '{}'
```

### `pix-galaxy-mcp doctor [options]`

Runs a full system health check. Outputs JSON.

| Option | Description |
|---------|-------------|
| `--telemetry` | Includes anonymous usage stats (version, Node, platform, tool count, agent count) |

The report includes:
- Server version, SDK version, Node version
- 23 agents with validation (configured/unconfigured, command, args)
- IDE configurations (Cursor, Windsurf, VS Code User, JetBrains Toolbox)
- Model provider API keys (env vars + stored files)
- Runtime paths (stateDir, dataDir, configDir)
- Registered tools
- Daemon status (PID, pidFile, logFile, native service)

**Example:**
```bash
pix-galaxy-mcp doctor
pix-galaxy-mcp doctor --telemetry
```

### `pix-galaxy-mcp skills <action> [options]`

Manages the pix skill system.

| Action | Description |
|--------|-------------|
| `install` | Interactive installer with checkbox UI |
| `list` | Lists all available skills with install status |
| `reload` | Force-reloads all skills from disk (flushes cache) |

| Option (`install`) | Type | Default | Description |
|---------------------|------|---------|-------------|
| `--scope` | `string` | `"global"` | `global` → `~/.agents/skills/`, `project` → `.agents/skills/` |
| `--all` | `flag` | — | Pre-selects all skills |

**Examples:**
```bash
pix-galaxy-mcp skills install                      # Checkbox UI → ~/.agents/skills/
pix-galaxy-mcp skills install --scope project      # Install locally to project
pix-galaxy-mcp skills install --all                # All skills
pix-galaxy-mcp skills list                         # JSON list
pix-galaxy-mcp skills reload                       # Flush cache + rebuild BM25 index
```

The checkbox UI supports: `↑↓`/`jk` movement, `␣` toggle, `a` toggle all, `↵` confirm, `q` quit.

### `pix-galaxy-mcp adr new "<title>" [options]`

Creates an Architecture Decision Record (ADR) in `docs/adr/`. Auto-numbering, Michael Nygard template, auto-index.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--status` | `string` | `"accepted"` | `proposed`, `accepted`, `deprecated`, `superseded` |
| `--context` | `string` | — | Context/factors leading to the decision |
| `--decision` | `string` | — | Decision made and why |
| `--consequences` | `string` | — | Positive and negative consequences |
| `--tags` | `string` | `"architecture"` | Comma-separated tags |

**Examples:**
```bash
pix-galaxy-mcp adr new "Use PostgreSQL" --status accepted --tags database
pix-galaxy-mcp adr new "Switch to pnpm" --context "pnpm is slow" --tags build,tooling
```

The ADR is saved as `docs/adr/ADR-NNN-title-slug.md` and the index `docs/adr/README.md` is updated automatically.

### `pix-galaxy-mcp handoff [options]`

Generates an LLM context summary from ADR logs + `.context/` values. The output is a text prompt that a new LLM session can use to resume work without re-asking.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--dir` | `path` | `"."` | Project root directory |
| `--format` | `string` | `"full"` | `full` (table + full values), `brief` (one-line), `minimal` (compact JSON) |
| `--compress` | `flag` | — | Aggressively compresses values (truncates to 80 chars) |
| `--max-tokens` | `number` | `0` (no limit) | Token budget; auto-downgrades: full → brief → minimal |

**Output formats:**

| Format | Tokens | Use case |
|--------|-------|----------|
| `full` | ~140+ | New chat with same model |
| `brief` | ~90 | Tight context window |
| `minimal` | ~24 | Emergency handoff, model swap |

**Examples:**
```bash
pix-galaxy-mcp handoff                          # Full summary
pix-galaxy-mcp handoff --compress | pbcopy      # Compressed → clipboard (macOS)
pix-galaxy-mcp handoff --format minimal          # Compact JSON (~24 tokens)
pix-galaxy-mcp handoff --max-tokens 200          # Auto-downgrade if exceeded
```

The handoff includes:
- **Project identity** from `package.json`
- **ADR log** — every decision, status, and tags
- **Context snapshot** — all `.context/` values sorted by priority
- **Handoff instruction** — instructs the receiving LLM to continue without re-asking

### `pix-galaxy-mcp completions [options]`

Generates shell auto-completion scripts.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--shell` | `string` | `"zsh"` | `zsh`, `bash`, `fish` |

**Installation examples:**
```bash
# zsh (oh-my-zsh, prezto, zim)
mkdir -p ~/.zsh/completions
pix-galaxy-mcp completions --shell zsh > ~/.zsh/completions/_pix-galaxy-mcp

# bash
pix-galaxy-mcp completions --shell bash | source
# Or persistent:
pix-galaxy-mcp completions --shell bash > ~/.bash_completion.d/pix-galaxy-mcp

# fish
mkdir -p ~/.config/fish/completions
pix-galaxy-mcp completions --shell fish > ~/.config/fish/completions/pix-galaxy-mcp.fish
```

Completions cover: commands, subcommands, flags, values (agent names, transports, formats, shells, ADR statuses, file paths).

---

## MCP Tools (71)

All tools registered with the MCP server. Every tool has a validated Zod input schema.

### Router & Orchestrator

#### `pix`

**Main router.** Analyzes a user prompt and routes to the most relevant pix skill with framework bias.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | `string` | ✅ | — | User's question about frontend development |
| `framework` | `string` | — | — | Framework hint (react, vue, svelte, angular, solid, astro, electron, vanilla) |
| `path` | `string` | — | — | Project path for auto-framework detection |

**Routing algorithm:**
1. Tokenizes the prompt into keywords (filters ~120 stopwords)
2. For each skill, extracts `##` sections and scores them
3. Per-word score: 3× if in section heading, 1× in body, +2× in YAML description, +3× if skill base name matches
4. Framework bias: ×2 for detected framework skill, ×1.15 for general skills (styleguides/web/architect), ×0.85 for others
5. Normalizes: confidence = raw / maxRaw
6. Returns top 6 skills with relevant sections and suggested tools

**Output:**
```json
{
  "route": "pix-frontend-react",
  "confidence": 1,
  "sections": ["Component Architecture", "Props & State"],
  "next_tools": ["pix_frontend_react", "pix_check", "pix_search", "pix_component"],
  "alternatives": [
    { "route": "pix-styleguide", "confidence": 0.6, "sections": ["CSS Architecture"] }
  ],
  "skills_available": ["pix-frontend-react", "pix-frontend-vue", ...],
  "summary": "Top match: pix-frontend-react (100%)..."
}
```

**Example:**
```json
{
  "name": "pix",
  "arguments": {
    "prompt": "Create a responsive navbar component in React",
    "framework": "react"
  }
}
```

### Search

#### `pix_search`

Full-text BM25 search across ALL pix skills. Indexes by `##` sections, returns ranked results with snippets.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | `string` | ✅ | — | Search query |
| `maxResults` | `integer` | — | `10` | Max results (1–100) |

**Output:** Ranked results with BM25 score, content snippet, section name, and skill name. Includes index statistics.

**Example:**
```json
{
  "name": "pix_search",
  "arguments": { "query": "CSS custom properties", "maxResults": 5 }
}
```

### Component Templates

#### `pix_component`

Generates component templates following pix principles.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `component` | `string` | ✅ | — | Type: `button`, `card`, `modal`, `formField`, `list`, `nav`, `playwright-config`, `a11y-test-basic`, `a11y-test-forms`, `a11y-test-components` |
| `framework` | `enum` | — | `"vanilla"` | `vanilla`, `react`, `vue`, `svelte`, `angular`, `solid`, `astro` |
| `name` | `string` | — | — | Component name for multi-file generation |
| `mode` | `enum` | — | `"generate"` | `generate` (single template), `multi` (full file tree), `guardrails` (checklist) |

**Mode `multi`**: generates the complete file tree:
```
src/components/PascalCase/
├── _PascalCase.jsx    (or .vue, .svelte, .js)
├── _PascalCase.css     (if applicable)
└── index.js            (barrel)
```

**Example:**
```json
{
  "name": "pix_component",
  "arguments": {
    "component": "button",
    "framework": "react",
    "mode": "generate"
  }
}
```

### Validation (Guardrails)

#### `pix_check`

Runs guardrail checks on code against any pix skill.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `skill` | `string` | ✅ | — | Target skill name (e.g. `pix-frontend-react`) |
| `code` | `string` | ✅ | — | Code to validate |
| `framework` | `string` | — | — | Framework (react, vue, svelte, angular, solid, astro, vanilla) |
| `fileName` | `string` | — | — | File name for naming convention checks |
| `isComponent` | `boolean` | — | — | Whether this is a component file |
| `mode` | `string` | — | — | Check mode (e.g. `"scaffold"` for config files) |
| `previousPassed` | `string[]` | — | — | Guardrail IDs already passed in previous iteration — skipped on re-check |

**Smart iteration pattern:** `check → fix → re-check → all pass`:
```json
// First call: all checks run
{ "skill": "pix-frontend-react", "code": "..." }

// Second call: only previously failing checks run
{ "skill": "pix-frontend-react", "code": "...", "previousPassed": ["no-css-classes", "semantic-html", ...] }
```

**Example:**
```json
{
  "name": "pix_check",
  "arguments": {
    "skill": "pix-frontend-react",
    "code": "export function Button() { return <button className=\"btn\">Click</button> }",
    "fileName": "_Button.jsx",
    "isComponent": true
  }
}
```

Output: report with passed, failed, skipped counts, violation details, fix suggestions, and `previousPassed` array for the next iteration.

### File Tree Auto-Fix

#### `pix_fix`

Validates and auto-fixes the project file tree structure against pix conventions. Operates on disk — scans actual directories and files.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | `string` | — | `"."` | Project root directory |
| `srcDir` | `string` | — | `"src"` | Source directory relative to root |
| `mode` | `enum` | — | `"lint"` | `lint` (scan + report), `fix` (scan + auto-correct), `generate` (create component file tree) |
| `dryRun` | `boolean` | — | `true` | Preview fixes without applying (used with mode=fix) |
| `name` | `string` | — | — | Component name (PascalCase) for mode=generate |
| `framework` | `enum` | — | `"vanilla"` | Framework for mode=generate: `react`, `vue`, `svelte`, `vanilla` |
| `baseDir` | `string` | — | `"src/components"` | Base output directory for mode=generate |

**Mode `lint`**: scans all files under `srcDir`, detects violations, returns a structured report with:
- Missing barrel files (`index.js`)
- Component files without `_` prefix
- Empty barrel files (no exports)
- Bare component files outside PascalCase folders
- Orphan CSS files

**Mode `fix`**: applies auto-corrections:
- Renames unprefixed component files (e.g. `Button.jsx` → `_Button.jsx`)
- Creates barrel files in component folders
- Populates empty barrel files with correct `export` statements

**Mode `generate`**: creates a complete component file tree following conventions:
```
src/components/PascalName/
├── index.js            ← Barrel with export
└── _PascalName.jsx     ← Component file with underscore prefix
```

**Example:**
```json
{
  "name": "pix_fix",
  "arguments": { "mode": "lint", "path": "./my-project", "srcDir": "src" }
}
```

### Scaffolding

#### `pix_scaffold`

Generates project scaffolding files (config templates). Reads from the `## Project Scaffolding` section of `pix-styleguide`.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `mode` | `enum` | — | `"generate"` | `generate` (create files), `list` (list available), `validate` (check presence) |
| `file` | `string` | — | — | Specific file to generate (omit for all) |
| `projectDir` | `string` | — | — | Project root (for mode=validate) |
| `framework` | `string` | — | — | Framework hint (tsconfig for TS projects) |

**Available files:** `.prettierrc`, `.nvmrc`, `.editorconfig`, `.gitignore`, `.eslintrc.json`, `tsconfig.json`, `jsconfig.json`

**Example:**
```json
{
  "name": "pix_scaffold",
  "arguments": { "mode": "generate", "file": ".prettierrc" }
}
```

### Framework Detection

#### `pix_detect`

Detects the project framework by reading `package.json`.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | `string` | — | `"."` | Project directory |

**Output:**
```json
{
  "projectName": "my-app",
  "framework": "react",
  "typescript": true,
  "buildTool": "vite",
  "nodeVersion": ">=20",
  "suggested_skills": ["pix-frontend-react"],
  "suggested_tools": ["pix_frontend_react", "pix_check", "pix_scaffold", "pix_component"],
  "message": "Detected react project..."
}
```

Detectable frameworks: `react`, `vue`, `svelte`, `angular`, `solid`, `astro`, `electron`, `vanilla`.

### Skill Tools (34)

Every pix skill is registered as a separate MCP tool named `pix_<name>` (e.g. `pix_frontend_react`, `pix_frontend_vue`, `pix_styleguide`).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `mode` | `enum` | — | `"full"` | `full` (entire content), `summary` (first 30 lines), `tldr` (BM25-compressed), `search` (line grep), `guardrails` (checklist), `check` (validate code), `scaffold` (styleguides/architect only) |
| `query` | `string` | — | — | Query for `mode=search` or `mode=tldr` |
| `code` | `string` | — | — | Code to validate for `mode=check` |
| `framework` | `string` | — | — | Framework hint for check |
| `file` | `string` | — | — | Specific scaffold file |
| `target` | `string` | — | — | Project directory for architect interview |
| `fileName` | `string` | — | — | File name for naming convention |
| `isComponent` | `boolean` | — | — | Whether this is a component file |

**Skill tool families:**

| Tool | Skill | Framework |
|------|-------|-----------|
| `pix_frontend_vanilla_reactive` | pix-frontend-vanilla-reactive | Vanilla JS |
| `pix_frontend_react` | pix-frontend-react | React 18+ |
| `pix_frontend_vue` | pix-frontend-vue | Vue 3 |
| `pix_frontend_svelte` | pix-frontend-svelte | Svelte 5 |
| `pix_frontend_solidjs` | pix-frontend-solidjs | SolidJS |
| `pix_frontend_angular` | pix-frontend-angular | Angular (standalone) |
| `pix_frontend_astro` | pix-frontend-astro | Astro |
| `pix_frontend_meta_next` | pix-frontend-meta-next | Next.js |
| `pix_frontend_meta_nuxt` | pix-frontend-meta-nuxt | Nuxt 3 |
| `pix_frontend_meta_remix` | pix-frontend-meta-remix | Remix |
| `pix_platform_web` | pix-platform-web | Web platform |
| `pix_platform_desktop` | pix-platform-desktop | Desktop (Electron) |
| `pix_platform_library` | pix-platform-library | Library authoring |
| `pix_backend` | pix-backend | Backend/API |
| `pix_architect` | pix-architect | Architecture wizard |
| `pix_styleguide` | pix-styleguide | HTML, CSS, JS, a11y |
| `pix_backend_node` | pix-backend-node | Backend Node scaffold |
| `pix_frontend_react` | pix-frontend-react | React + Vite scaffold |
| `pix_platform_agent` | pix-platform-agent | AI Agent scaffold |
| `pix_platform_expo` | pix-platform-expo | Expo scaffold |
| `pix_devops_docker` | pix-devops-docker | Dockerfile + compose |
| `pix_devops_gitlab_ci` | pix-devops-gitlab-ci | GitLab CI/CD |
| `pix_devops_testing` | pix-devops-testing | Vitest setup |
| `pix_devops_version` | pix-devops-version | Version auto-increment |
| `pix_backend_security` | pix-backend-security | Security hardening |
| `pix_backend_api_design` | pix-backend-api-design | REST API + OpenAPI |
| `pix_platform_agent` | pix-platform-agent | AI Agent |
| `pix_platform_expo` | pix-platform-expo | EAS Build & Expo CI/CD |
| `pix_process_feature_workflow` | pix-process-feature-workflow | Feature workflow |
| `pix_process_documentation` | pix-process-documentation | Mintlify docs |
| (folded into pix-frontend-react) | React forms |
| (folded into pix-styleguide-validation) | Business field validation |
| (folded into pix-devops-testing) | Coverage enforcement (60/50/60/60) |
| (folded into pix-devops-docker) | Docker standards |
| `pix_process_bmad` | pix-process-bmad | BMAD Method (AI-driven development framework) |
| `pix_frontend_meta_next` | pix-frontend-meta-next | Next.js |
| `pix_frontend_meta_nuxt` | pix-frontend-meta-nuxt | Nuxt 3 |
| `pix_frontend_meta_remix` | pix-frontend-meta-remix | Remix |
| `pix_frontend_vue` | pix-frontend-vue | Vue 3 |
| `pix_frontend_svelte` | pix-frontend-svelte | Svelte 5 |
| `pix_frontend_solidjs` | pix-frontend-solidjs | SolidJS |
| `pix_frontend_angular` | pix-frontend-angular | Angular (standalone) |
| `pix_frontend_astro` | pix-frontend-astro | Astro |
| `pix_platform_desktop` | pix-platform-desktop | Desktop (Electron) |
| `pix_platform_expo` | pix-platform-expo | Expo/EAS |
| `pix_platform_library` | pix-platform-library | Library authoring |
| `pix_platform_web` | pix-platform-web | Web platform |
| `pix_frontend` | pix-frontend | Frontend umbrella |
| `pix_platform` | pix-platform | Platform umbrella |
| `pix_devops` | pix-devops | DevOps umbrella |
| `pix_process` | pix-process | Process umbrella |
| `pix_toolchain` | pix-toolchain | Toolchain umbrella |
| `pix_data` | pix-data | Data umbrella |
| `pix_data_sql` | pix-data-sql | SQL design |
| `pix_data_postgresql` | pix-data-postgresql | PostgreSQL |
| `pix_data_mysql` | pix-data-mysql | MySQL/MariaDB |
| `pix_data_mongodb` | pix-data-mongodb | MongoDB |
| `pix_backend_express` | pix-backend-express | Express.js |
| `pix_backend_fastify` | pix-backend-fastify | Fastify |
| `pix_backend_hono` | pix-backend-hono | Hono |
| `pix_backend_nestjs` | pix-backend-nestjs | NestJS |
| `pix_toolchain_vite` | pix-toolchain-vite | Vite |
| `pix_toolchain_parcel` | pix-toolchain-parcel | Parcel |
| `pix_toolchain_biome` | pix-toolchain-biome | Biome |
| `pix_toolchain_eslint` | pix-toolchain-eslint | ESLint |
| `pix_toolchain_husky` | pix-toolchain-husky | Husky |
| `pix_toolchain_pnpm` | pix-toolchain-pnpm | pnpm |
| `pix_toolchain_turborepo` | pix-toolchain-turborepo | Turborepo |
| `pix_toolchain_typescript` | pix-toolchain-typescript | TypeScript |
| `pix_toolchain_project` | pix-toolchain-project | Project config |
| `pix_backend_node` | pix-backend-node | Node scaffold |
| `pix_process_bmad` | pix-process-bmad | BMAD Method |
| `pix_ui` | pix-ui | UI umbrella |
| `pix_ui_design_system` | pix-ui-design-system | UI design system |
| `pix_styleguide_a11y` | pix-styleguide-a11y | A11y |
| `pix_styleguide_css` | pix-styleguide-css | CSS |
| `pix_styleguide_html` | pix-styleguide-html | HTML |
| `pix_styleguide_javascript` | pix-styleguide-javascript | JavaScript |
| `pix_styleguide_json` | pix-styleguide-json | JSON |
| `pix_styleguide_markdown` | pix-styleguide-markdown | Markdown |
| `pix_styleguide_naming` | pix-styleguide-naming | Naming & file tree |
| `pix_styleguide_patterns` | pix-styleguide-patterns | Patterns cheat sheet |
| `pix_styleguide_validation` | pix-styleguide-validation | Business validation |

**Mode `tldr` on skill tools:**
Uses BM25 to return ONLY sections relevant to the query, saving 90-97% on tokens.

```json
{
  "name": "pix_frontend_react",
  "arguments": { "mode": "tldr", "query": "state management hooks" }
}
```

Output: sections `Component Architecture`, `Props & State` with snippets and scores — no `Overview`, `Setup`, `Installation`, `License`.

### ADR & Handoff

#### `pix_process_adr`

Creates an Architecture Decision Record.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | `string` | ✅ | — | ADR title |
| `status` | `enum` | — | `"accepted"` | `proposed`, `accepted`, `deprecated`, `superseded` |
| `context` | `string` | — | — | Decision context |
| `decision` | `string` | — | — | Decision made |
| `consequences` | `string` | — | — | Consequences |
| `alternatives` | `string[]` | — | — | Alternatives considered |
| `tags` | `string[]` | `["architecture"]` | Categorization tags |
| `projectDir` | `string` | `"."` | Project root |

**Auto-ADR hooks:** The server automatically logs an ADR after every call to `pix_architect`, `pix`, `pix_scaffold`, `pix_detect`. Logs are saved in `docs/adr/`.

#### `pix_process_handoff`

Generates LLM context summary from ADRs + `.context/`.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectDir` | `string` | — | `"."` | Project root |
| `includeContext` | `boolean` | — | `true` | Include `.context/` values |
| `includeAdrs` | `boolean` | — | `true` | Include ADR summaries |
| `includeIdentity` | `boolean` | — | `true` | Include project identity |
| `compress` | `boolean` | — | `false` | Compress output |
| `maxTokens` | `number` | — | `0` | Token budget (0 = no limit) |
| `format` | `enum` | — | `"full"` | `full`, `brief`, `minimal` |

### Tool Error Handling

All tools return structured errors:

```json
{
  "isError": true,
  "content": [{ "type": "text", "text": "Invalid arguments:\n- code: Required" }]
}
```

- Zod validation errors: readable message with field path
- Unknown tool: `"Unknown tool: <name>"`
- Handler errors: `err.message`

---

## MCP Resources

Resources accessible via the MCP `resources/read` protocol.

| URI | MIME | Description |
|-----|------|-------------|
| `pix://skills` | `application/json` | Index of all pix skills (path, length) |
| `pix://templates` | `application/json` | Component template catalog |
| `pix://project` | `application/json` | Current project analysis (framework + suggested tools) |
| `pix://community` | `application/json` | Community skill index (plugins) |
| `pix://ai` | `text/markdown` | Full pix skill content |
| `pix://a11y` | `text/markdown` | A11y testing guide (Playwright + axe-core) |
| `pix://a11y/test-basic` | `text/plain` | Basic a11y test template |
| `pix://a11y/test-forms` | `text/plain` | Form a11y test template |
| `pix://<skill-name>` | `text/markdown` | Full skill content (e.g. `pix://pix-frontend-react`) |
| `pix://<skill-name>/summary` | `text/markdown` | First 30 lines of a skill |

The `pix://project` resource runs `detectProject(process.cwd())` and returns detected framework, TypeScript, build tool, suggested skills and tools.

---

## MCP Prompts

Prompt templates accessible via the MCP `prompts/get` protocol.

| Name | Arguments | Description |
|------|-----------|-------------|
| `pix-code-review` | `framework` (opt), `code` (req) | Review code against pix styleguides |
| `pix-generate-component` | `framework` (req), `component` (req), `features` (opt) | Generate component following pix principles |
| `pix-a11y-test` | `framework` (req), `component` (opt) | Generate Playwright + axe-core a11y tests |
| `pix-a11y-review` | `code` (req), `framework` (opt) | Review code for WCAG 2.2 AA compliance |
| `pix-architect-scaffold` | `projectName` (req), `framework` (opt), `tier` (opt) | Scaffold project with .agents/ + .context/ |

Each prompt returns a system message with specific instructions for the task.

---

## Transport

### STDIO (default)

Standard MCP server: reads JSON-RPC from stdin, writes to stdout. Used by all MCP agents.

```bash
pix-galaxy-mcp serve
```

Manual test:
```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node ./bin/pix-galaxy-mcp.js serve
```

### SSE (HTTP)

HTTP server on `127.0.0.1:37999` with SSE endpoint for IDE integration.

```bash
pix-galaxy-mcp serve --transport sse
```

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sse` | GET | Establishes SSE stream |
| `/message?sessionId=...` | POST | Sends MCP message |
| `/health` | GET | Health check (`{ ok: true, uptime: ... }`) |

CORS: `*` on all endpoints.

### HTTPS

```bash
pix-galaxy-mcp serve --transport sse --ssl-cert cert.pem --ssl-key key.pem
```

If the files do not exist, self-signed certificates are auto-generated via OpenSSL (730-day validity, SAN: localhost, 127.0.0.1, ::1).

---

## Daemon & Services

The daemon can run in two modes:

### Process (cross-platform)

Spawns a detached child process that runs in the background. Does not persist across reboots.

```bash
pix-galaxy-mcp daemon start
pix-galaxy-mcp daemon status
pix-galaxy-mcp daemon stop
pix-galaxy-mcp daemon logs
```

State files:
- PID: `~/.local/state/pix-galaxy-mcp/daemon.pid`
- Log: `~/.local/state/pix-galaxy-mcp/daemon.log`

### Native service (persistent)

Installs a system service that starts automatically at boot.

| Platform | Install command | Config file | Verification |
|----------|----------------|-------------|--------------|
| macOS | `pix-galaxy-mcp daemon install` | `~/Library/LaunchAgents/io.github.pixu1980.pix-galaxy-mcp.plist` | System Settings → General → Login Items |
| Linux | `pix-galaxy-mcp daemon install` | `~/.config/systemd/user/pix-galaxy-mcp.service` | `systemctl --user status pix-galaxy-mcp` |
| Windows | `pix-galaxy-mcp daemon install` | Windows Service `pix-galaxy-mcp` | `services.msc` |

```bash
# Installation and activation
pix-galaxy-mcp daemon install      # Create and start native service
pix-galaxy-mcp daemon enable       # Activate without reinstalling
pix-galaxy-mcp daemon disable      # Deactivate without removing
pix-galaxy-mcp daemon uninstall    # Remove completely
```

On macOS, the LaunchAgent uses a wrapper script (`~/.local/bin/pix-galaxy-mcpd`) so that "pix-galaxy-mcpd" appears in Login Items instead of "Node.js Foundation".

---

## Agent Installation

### Adding to mcp.json manually

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

### With global install (recommended)

```bash
pnpm add -g pix-galaxy-mcp
pix-galaxy-mcp install --agent claude
# or
pix-galaxy-mcp install --agent all
```

### With pnpx (no global install)

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

### Configuration paths per agent

| Agent | Config file | Format |
|-------|-------------|--------|
| Claude | `~/.claude.json` | JSON (`mcpServers`) |
| Codex | `~/.codex/config.toml` | TOML (`mcp_servers.pix_galaxy_mcp`) |
| Cursor | `~/.cursor/mcp.json` | JSON (`mcpServers`) |
| Copilot | `~/.config/github-copilot/hosts.json` | JSON (`copilot-mcp-pix_galaxy_mcp`) |
| Gemini | `~/.gemini/settings.json` | JSON (`mcpServers`) |
| Cline | `~/.config/cline/mcp.json` | JSON (`mcpServers`) |
| Roo | `~/.config/roo/mcp.json` | JSON (`mcpServers`) |
| Zed | `~/.config/zed/mcp.json` | JSON (`mcpServers`) |
| OpenCode | `~/.config/opencode/mcp.json` | JSON (`mcpServers`) |
| Windsurf | `~/.config/windsurf/mcp.json` | JSON (`mcpServers`) |
| Antigravity | `~/.config/antigravity/mcp.json` | JSON (`mcpServers`) |
| Pi | `~/.pi/agent/mcp.json` | JSON (`mcpServers`) |
| VS Code | `.vscode/mcp.json` | JSON (VS Code format: `servers`) |
| JetBrains | `.idea/mcp.json` | JSON (`mcpServers`) |
| Neovim | `~/.config/nvim/mcp.json` | JSON (`mcpServers`) |
| Emacs | `~/.emacs.d/init.el` | ELisp (`setq mcp-servers`) |

Agent instruction files (CLAUDE.md, GEMINI.md, AGENTS.md, .cursorrules) are updated with an HTML marker instructing the agent to use pix tools before writing frontend code.

---

## Skill System

### Architecture

Skills live in two locations:

```
~/.agents/skills/       ← User skills (override embedded)
  pix-frontend-react/
    SKILL.md
    ...
  pix-frontend-vue/
    SKILL.md
    ...
  my-custom-rule/       ← Plugin (any directory with SKILL.md)
    SKILL.md
    plugin.js            ← Optional plugin JS

skills/                  ← Embedded skills (bundled with package)
  pix-frontend-react/
    SKILL.md
  pix-frontend-vue/
    SKILL.md
  ...
```

### SKILL.md format

Every skill has a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: pix-frontend-react
description: >
  React 18+ best practices aligned with pix styleguides
tags:
  - "react"
  - "frontend"
  - "components"
frameworks: [react, reactjs]
---

## Overview
...
```

Frontmatter fields are used by the routing algorithm (`pix`) for scoring and framework bias.

### Plugin System

Custom skills (not starting with `pix-`) can include a `plugin.js`:

```javascript
// ~/.agents/skills/my-custom-rule/plugin.js
export const guardrails = [
  {
    id: "my-custom-check",
    label: "Custom check",
    description: "My custom validation rule",
    check: (code, context) => {
      // ... return { pass, failCount, detail, suggestion }
    },
  },
];

export const generators = {
  // ...
};
```

Plugin guardrails are automatically merged into the guardrails engine by `loadAllSkills()` via `mergePluginGuardrails(name, guardrails)`.

---

## Guardrails Engine

The guardrails engine is a system of testable assertions that validate code against pix principles.

### Architecture

```
src/core/
├── guardrails.js         ← Engine: getGuardrails(), checkCode(), getGuardrailsReport()
└── guardrail-defs.js     ← Definitions: SHARED, FRAMEWORK-specific, SCAFFOLD, ARCHITECT
```

### Iteration flow

```
generate → pix_check → fix → pix_check(previousPassed) → ... → allPass: true
```

1. First call: all guardrails are executed
2. Passing guardrails are collected in `previousPassed[]`
3. Second call with `previousPassed`: already-passed guardrails are SKIPPED
4. Iterate until `failCount === 0`

### Shared guardrails (SHARED_GUARDRAILS)

| ID | Label | Description |
|----|-------|-------------|
| `no-css-classes` | Zero CSS classes | CSS uses element + `[data-part]` selectors only. No `.class` rules |
| `no-inline-styles` | Zero inline styles | No `style="..."` in templates |
| `semantic-html` | Semantic HTML required | No `<div>` where a semantic element exists |
| `external-css` | External CSS | CSS loaded via `adoptedStyleSheets` or framework-native imports |
| `barrel-file-tree` | Barrel pattern | Every component folder has `index.js` re-exporting |
| `file-naming` | File naming convention | Component files: `_PascalCase.ext`. Folder: `PascalCase/` |
| `data-part-naming` | data-part attribute | Child elements have `data-part="role"` |
| `jsdoc-required` | JSDoc on exports | Every exported symbol has JSDoc |
| `css-comments-required` | CSS file comments | Every CSS file starts with a header comment |
| `a11y-test-required` | A11y tests | A11y tests with Playwright + `@axe-core/playwright` and `expect(results.violations).toEqual([])` |

### Framework-specific guardrails

| Framework | ID | Label |
|-----------|----|-------|
| React | `react-no-classname` | No `className`, use `data-part` |
| React | `react-hooks-rules` | Hooks called at top level only |
| Vue | `vue-no-class-binding` | No `:class` or `v-bind:class` |
| Angular | `angular-no-ngclass` | No `[ngClass]` |
| Svelte | `svelte-no-class-directive` | No `class:` directives |

### Scaffold guardrails

Verify project config files exist and are correct: `.prettierrc`, `.nvmrc`, `.editorconfig`, `.gitignore`, `.eslintrc.json`, `tsconfig.json`, `jsconfig.json`.

### Architect guardrails

Verify architect infrastructure completeness: `.agents/` directory, `AGENTS.md`, 7 SDD specs, filled placeholders, context CLI, documented workflow, phase instructions.

---

## BM25 Search

The BM25 search engine indexes ALL pix skills by sections (`## Heading`).

### BM25 parameters

| Parameter | Value | Effect |
|-----------|-------|--------|
| `K1` | `1.2` | Term frequency saturation |
| `B` | `0.75` | Length normalization |
| `MIN_TERM_LENGTH` | `2` | Minimum indexed terms |
| `STOPWORDS` | ~120 terms | Filtered from index and query |

### Index statistics

```bash
pix query="React" maxResults=1
# → Index: 300+ sections, 2000+ unique terms, avg 150 terms/doc
```

### Cache

The BM25 index is built at startup (`loadAllSkills()` → `buildIndex()`). Forced rebuild via `pix-galaxy-mcp skills reload`.

---

## ADR System

The ADR system saves Architecture Decision Records in `docs/adr/`.

### Directory structure

```
docs/adr/
├── README.md                           ← Auto-generated index (newest first)
├── ADR-001-initial-architecture.md
├── ADR-002-database-selection.md
└── ADR-003-auto-log-pix_architect-execute.md
```

### Template (Michael Nygard)

```markdown
# ADR-001: Decision Title

- **Date**: 2024-01-15
- **Status**: accepted
- **Tags**: architecture, database
- **Author**: pix-architect

## Context
...

## Decision
...

## Consequences
...
```

### Auto-ADR Hooks

After every successful call to `pix_architect`, `pix`, `pix_scaffold`, `pix_detect`, the server automatically logs a summary ADR with:
- Tool name and arguments
- Timestamp
- Status `accepted`
- Tags `tool, auto-log`

The mechanism:
1. Tool handler completes without error
2. Router collects all hooks registered for the tool name (and `"*"` wildcard)
3. Each hook fires fire-and-forget (non-blocking, errors swallowed)
4. The ADR hook writes a lightweight entry to `docs/adr/`

### Custom hooks

```javascript
import { addAfterToolHook } from "./tools/router.js";

addAfterToolHook("*", async (toolName, args, result) => {
  console.log(`Tool ${toolName} completed`);
});
```

---

## LLM Handoff

The handoff system generates a text prompt for resuming an interrupted LLM session.

### Output by format

| Format | Tokens | Structure |
|--------|-------|-----------|
| `full` | ~140+ | ADR table + full context + instruction |
| `brief` | ~90 | One-line ADRs + truncated context + instruction |
| `minimal` | ~24 | Single-line JSON + essential instruction |

### Priority scoring

`.context/` values are sorted by priority:

| Pattern | Score |
|---------|-------|
| ADR, decision, architect | 100 |
| PROJECT_TYPE, STACK, BUILD | 80 |
| DOMAIN, ENTITY, PERSONA, FEATURE | 60 |
| DESCRIPTION, NAME, PITCH | 50 |
| VERSION, NODE, TYPESCRIPT | 40 |
| NOTES, CONSTRAINT, NEED | 30 |
| Other | 10 |

### Auto-downgrade

If `maxTokens` is set and the current format exceeds the budget, the handoff auto-downgrades: `full → brief → minimal`.

---

## Architecture

```
pix-galaxy-mcp/
├── bin/
│   └── pix-galaxy-mcp.js       ← CLI entry point (2 lines: import + cli())
│
├── src/
│   ├── index.js                ← CLI dispatcher: parse args → command handler
│   ├── server.js               ← MCP Server bootstrap (SDK) + tool/resource/prompt handlers
│   │
│   ├── cli/
│   │   ├── commands.js         ← Handler for every CLI command (serve, daemon, install, tools, ...)
│   │   ├── install.js          ← 23-agent installer: writes mcp.json, atomic backups
│   │   ├── uninstall.js        ← Agent removal (delegates to install.js)
│   │   ├── doctor.js           ← Health check: validated agents, IDEs, model providers, daemon
│   │   ├── daemon.js           ← Native services: macOS LaunchAgent, Linux systemd, Win Service
│   │   ├── paths.js            ← Runtime paths: stateDir, dataDir, configDir, skillDirs
│   │   ├── skills-install.js   ← Interactive skill installer (checkbox UI, recursive copy)
│   │   └── completions.js      ← Shell completion generator (zsh, bash, fish)
│   │
│   ├── tools/
│   │   ├── router.js           ← Tool registry: registerTool, listTools, callTool, afterToolHook
│   │   ├── ai.js              ← pix: routing engine with scoring and framework bias
│   │   ├── skill.js            ← Skill tool: dynamic registration + search/check/scaffold
│   │   ├── adr.js              ← pix_process_adr: auto-numbering, Nygard template, index
│   │   ├── handoff.js          ← pix_process_handoff: LLM context from ADRs + .context/
│   │   ├── fix.js              ← pix_fix: file tree lint, auto-fix, generator
│   │   └── architect.js        ← Architect interview: context wizard server launcher
│   │
│   ├── core/
│   │   ├── skills.js           ← Skill loader: loadAllSkills, parseSkillFrontmatter, LRU cache
│   │   ├── detector.js         ← Framework detector: package.json → react/vue/svelte/...
│   │   ├── guardrails.js       ← Guardrails engine: getGuardrails, checkCode, mergePluginGuardrails
│   │   ├── guardrail-defs.js   ← Guardrail definitions: shared, framework, scaffold, architect
│   │   ├── templates.js        ← Template engine: generateMultiFile, getTemplate, registerTemplateTool
│   │   ├── template-data.js    ← Template definitions: button, card, modal, formField, list, nav
│   │   ├── bm25.js             ← BM25 search: inverted index, tokenizer, scoring, search
│   │   └── file-tree.js        ← File tree validation and auto-fix engine
│   │
│   ├── transport/
│   │   ├── sse.js              ← HTTP/SSE server: /sse, /message, /health, CORS, TLS
│   │   └── cert.js             ← Self-signed cert: OpenSSL wrapper, SAN support
│   │
│   ├── resources/
│   │   └── index.js            ← Resource registry: pix://* (skills, templates, project, a11y)
│   │
│   ├── prompts/
│   │   └── index.js            ← Prompt registry: code-review, generate-component, a11y, architect
│   │
│   └── utils/
│       └── sandbox.js          ← Resilience: safeJsonParse, withTimeout, trySafe, wrapRequestHandler
│
├── skills/                     ← Embedded skills (34 skills)
├── scripts/                    ← Build, install, package scripts
├── test/                       ← Test suite (smoke, ai, detector, framework-routing)
├── Dockerfile                  ← Multi-arch on node:22-alpine
├── docker-compose.yml          ← SSE compose with health check
└── server.json                 ← MCP server schema (JSON Schema 2025-12-11)
```

### Architectural principles

1. **Strict modularity**: every module is ≤300 lines. Single responsibility.
2. **Lazy loading**: skills, BM25 index, plugins — all lazy/async.
3. **Resilience**: every external operation is wrapped in a sandbox (timeout, error recovery).
4. **Caching**: skill content in LRU cache (max 50 entries), BM25 index rebuildable.
5. **Fire-and-forget**: auto-ADR hooks non-blocking, errors silent.

---

## Docker

### Dockerfile

Multi-stage build on `node:22-alpine`:
- Build stage: installs production deps, embeds skills
- Runtime stage: bin, src, skills, scripts only

Exposed port: `37999`
Default: stdio transport (for MCP agents)
Override: `--transport sse` for IDE integration

```bash
# Build
docker build -t pix-galaxy-mcp .

# Run (stdio - for MCP agents)
docker run -i pix-galaxy-mcp

# Run (SSE)
docker run -p 37999:37999 pix-galaxy-mcp node src/index.js serve --transport sse
```

### Docker Compose

```yaml
services:
  mcp:
    build: .
    image: ghcr.io/pixu1980/pix-galaxy-mcp:latest
    ports: ["37999:37999"]
    command: ["node", "src/index.js", "serve", "--transport", "sse"]
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:37999/health"]
    restart: unless-stopped
```

```bash
docker compose up -d
# → http://localhost:37999/sse
```

---

## Development

### Setup

```bash
git clone <repo>
cd pix-galaxy-mcp
pnpm install
```

### Commands

```bash
pnpm dev                    # Start STDIO server (development)
pnpm up                     # Start SSE server (pnpm run dev --transport sse)

pnpm test                   # Smoke test
pnpm run test:all           # All tests
pnpm run ci                 # CI pipeline: smoke + ai + detector + framework-routing

pnpm run post-process          # Lint file tree structure
pnpm run post-process:fix       # Auto-fix file tree violations

pnpm run lint               # ESLint
pnpm run lint:fix           # ESLint fix
pnpm run format             # Prettier check
pnpm run format:fix         # Prettier write

pnpm run audit              # pnpm audit --prod
pnpm run build              # Package script
```

### Tests

```bash
node test/smoke.mjs                       # Base test: tool list, call, routing
node test/ai.test.mjs                 # Routing engine test
node test/detector.test.mjs               # Framework detection test
node test/framework-routing.test.mjs      # Framework bias test
```

Tests are in `test/` with `.mjs` extension. Each test expects the server to be functional and skills loaded.

### Pre-publish

Before publishing, run:

```bash
node scripts/embed-skills.mjs    # Embed skills into package
node scripts/package.mjs         # Create distribution package
```

---

## License

MIT
