# Getting Started

Install RuleMCP once, wire your agent, and route the first request in under five minutes.

## What it is

**RuleMCP** is an [MCP](https://modelcontextprotocol.io) server for the rule-mcp skill catalog. It:

1. **Routes** free-text requests to the matching skill (or area hub).
2. **Serves** skills as MCP tools, resources, and prompts, no LLM inside the server.
3. **Validates** generated code with deterministic guardrails before you keep it.

Identical behavior behind any model. Everything runs on your machine.

## Install

### Prerequisites

| Requirement        | Minimum | Check            |
| ------------------ | ------- | ---------------- |
| Node.js            | >= 20   | `node --version` |
| pnpm (recommended) | any     | `pnpm --version` |

### From a clone (current path)

The package is not on the npm registry yet. Install from a clone:

```bash
git clone https://github.com/pixu1980/rule.git
cd rule-mcp
pnpm install
./scripts/install.sh
rule-mcp doctor
```

Expected: health report with `ok: true`, tools registered, detected agents.

### Verify

```bash
rule-mcp tools list
rule-mcp serve
```

Wire `rule-mcp serve` into your agent's MCP config (the installer writes common targets for you via `rule-mcp setup`).

## Compatibility

### Agents and IDEs

The list below is generated from the installer's agent catalog and the
command-target registry, so it cannot promise a host the installer does not
have or miss one it gained.

<!-- census:begin:agent-targets -->

## Install targets (23)

`rule-mcp install --agent <name>` and the setup wizard accept exactly
these names. A host listed with command files also gets the slash commands in
its own format; the others receive the MCP configuration and reach the same
prompts through the server.

| `--agent`     | Command files                   | Transport             | Notes                                                                                                                                                                  |
| ------------- | ------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claude`      | yes: args (global)              | stdio                 |                                                                                                                                                                        |
| `codex`       | no                              | stdio                 | Codex CLI exposes MCP prompts as slash commands itself; its custom-prompt directory is not verified against a published spec, so writing files there would be a guess. |
| `cursor`      | yes: args (project)             | stdio                 |                                                                                                                                                                        |
| `copilot`     | no                              | stdio                 | GitHub Copilot CLI gets a custom agent file (~/.copilot/agents); its prompt-file directory is not verified against a published spec.                                   |
| `gemini`      | yes: gemini (global)            | stdio                 |                                                                                                                                                                        |
| `cline`       | yes: workflow (global, project) | stdio                 |                                                                                                                                                                        |
| `roo`         | yes: plain (global, project)    | stdio                 |                                                                                                                                                                        |
| `zed`         | no                              | stdio                 | Zed stores its rules/prompt library in profile storage, not in discoverable per-command files.                                                                         |
| `opencode`    | yes: args (global, project)     | stdio                 |                                                                                                                                                                        |
| `antigravity` | no                              | stdio                 | No published custom-command file location; MCP prompts remain the entry point.                                                                                         |
| `devin`       | no                              | stdio                 | Devin runs commands in its own workspace runtime, not from local slash-command files; MCP prompts remain the entry point.                                              |
| `pi`          | yes: args (global)              | stdio, daemon, docker |                                                                                                                                                                        |
| `kilo`        | no                              | stdio                 | Kilo CLI command directory is not verified against a published spec.                                                                                                   |
| `kimi`        | no                              | stdio                 | Kimi CLI command directory is not verified against a published spec.                                                                                                   |
| `vibe`        | no                              | stdio                 | Mistral Vibe command directory is not verified against a published spec.                                                                                               |
| `grok`        | no                              | stdio                 | Grok Build command directory is not verified against a published spec.                                                                                                 |
| `droid`       | no                              | stdio                 | Factory Droid command directory is not verified against a published spec.                                                                                              |
| `kiro`        | no                              | stdio                 | AWS Kiro command directory is not verified against a published spec.                                                                                                   |
| `qwen`        | no                              | stdio                 | Qwen Code command directory is not verified against a published spec.                                                                                                  |
| `vscode`      | yes: prompt (global)            | stdio, daemon, docker |                                                                                                                                                                        |
| `jetbrains`   | no                              | stdio                 | JetBrains AI Assistant has no user-authored slash-command files; MCP prompts are the only entry point.                                                                 |
| `neovim`      | no                              | stdio                 | Editor-level MCP plugins expose prompts directly; there is no command-file convention to write to.                                                                     |
| `emacs`       | no                              | stdio                 | mcp.el exposes prompts directly; there is no command-file convention to write to.                                                                                      |

Command files are also registered under `windsurf`, which the installer no longer accepts as an agent name (a deprecated alias): installing the host under its current name writes no command files.

Regenerate with `pnpm census`.

Per-host formats and the command surface itself: [`12-instructions.md`](12-instructions.md). Slash-command targets: 13 across 9 hosts.

<!-- census:end:agent-targets -->

### Models

The server never calls a model. Any agent that speaks MCP works: Claude, GPT, Gemini, Llama, Qwen, and local models. Deterministic tools and guardrails behave the same regardless of which model the host uses.

## Next steps

- [Quick start](./07-quick-start.md): the main flows in short examples
- [Reference overview](./README.md): map of architecture, surface table, and inventories
- [Architecture](./02-architecture.md): the request path
- [Surface map](./17-surface-map.md): the Command - Tool - Skill table
