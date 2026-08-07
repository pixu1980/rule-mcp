# 034: Registry-driven clean slash commands for every agent and IDE

- **Date**: 2026-08-04
- **Status**: accepted
- **Tags**: architecture, cli, agents, slash-commands, vscode
- **Author**: rule-architect

## Context

Every MCP host namespaces the prompts a server exposes, and none of them let the server drop the prefix:

- Claude Code → `/rule-mcp:rule-backend (MCP)`
- VS Code (Copilot Chat) → `/mcp.rule-mcp.rule-backend`

Only the host's own command/prompt **files** are invoked bare (`/rule-backend`). ADR 029 solved this for Claude Code and Pi with user-level command files plus `RULE_MCP_NO_PROMPTS=1`, but the knowledge of _which directory, which format, which host_ was spread across three places: the per-agent installers (`src/cli/install.js`), a hand-maintained installer script (`scripts/install-agent-commands.sh`) and a hand-maintained path list in `scripts/uninstall.sh`.

Consequences of that split: VS Code was never covered (its commands stayed prefixed), and nothing structurally prevented the next new agent from being forgotten the same way.

## Decision

Add `src/core/agent-command-targets.js` as the **single registry** of clean-command targets. One entry per (agent, scope): label, render format, scope (`global`/`project`), a `detect()` gate, and a pure `dirs(ctx)` resolver with `exists`/`listDir` injected - so the whole registry is unit-testable for any platform without touching the filesystem.

Everything else derives from it:

1. `installAgent`/`uninstallAgent` write and remove the command set **centrally** for every agent; the ad-hoc per-installer writes (Claude, Pi, Gemini, Cursor) are gone.
2. `commandConfig` sets `RULE_MCP_NO_PROMPTS=1` for any host flagged `namespacedPrompts` (Claude, VS Code) instead of hardcoding `"claude"`.
3. `agent-commands --targets` and `agent-commands --sync [--remove]` expose the resolved directories; `scripts/install-agent-commands.sh` and `scripts/uninstall.sh` call them instead of listing paths.
4. `doctor` reports installed/expected command files per directory and prints the `--sync` fix when a host is short.
5. Agents with no verified command-file location live in `AGENTS_WITHOUT_COMMAND_SURFACE` **with a reason**. `test/agent-command-targets.test.mjs` fails when an agent appears in neither list - that test is the "always, for every agent/IDE" guarantee.

VS Code support arrives as a new `prompt` render format: `<name>.prompt.md` with `description` + `argument-hint` frontmatter, written to the user-data `prompts/` directory of every installed variant (Code, Insiders, Code-OSS, VSCodium) and every profile, since prompt files are profile-scoped. Formats whose host does not substitute arguments (`prompt`, `plain`, `workflow`) replace `$ARGUMENTS` with prose, so a meaningless literal token never reaches the model. Newly covered hosts: **VS Code, Roo Code, opencode**.

## Consequences

**Positive**

- A new agent cannot silently ship with prefixed-only commands - the coverage test blocks it.
- Installer, uninstaller and doctor cannot drift from the registry.
- VS Code finally gets bare `/rule-*` commands with no duplicate `/mcp.rule-mcp.*` entries.
- The remaining gaps are explicit, reasoned and reviewable instead of invisible.

**Negative**

- Existing installs must re-run `rule-mcp install --agent <name>` (or `agent-commands --sync`) and restart the host to pick up the files and the suppression flag.
- Daemon/SSE installs carry no `env`, so those hosts still show the prefixed prompts (one daemon serves every client).
- The VS Code workspace `.github/prompts` directory is deliberately not written - team-shared prompt files stay a manual opt-in - because 24 generated files would land in the user's git status.
- Every profile of every installed VS Code variant receives the full (~24 file) set.

## Alternatives considered

- **Shorten the MCP server name** so the host prefix hurts less - rejected: `/mcp.w.rule-backend` is still prefixed and destroys discoverability.
- **Ship a Claude plugin** - rejected in ADR 029: plugin commands are namespaced `/plugin:command`.
- **Keep per-installer writes and add VS Code by hand to each script** - rejected: that drift is exactly what left VS Code uncovered.
- **Auto-write `.github/prompts` in every repo** - rejected: pollutes the user's working tree.
