# Handoff: clean /rule-mcp-* commands and the reinstall command

**Branch:** main
**Commits covered:** `8e3d5547..02a0d11d` (5 commits)
**Date:** 2026-09-17

## Session Summary

Closed two defects in the install surface and added one dev convenience command.
First, MCP prompt suppression was configured but never honored on the wire, so
Claude Code kept showing `/rule-mcp:rule-mcp-handoff` instead of the clean
`/rule-mcp-handoff`. Second, a multi-agent install resolved zero command targets and
wrote no `/rule-mcp-*` files at all. Third, `reinstall` became one shell script
behind three entry points.

## Work Completed

### 1. Prompt suppression now reaches the client

- `src/cli/installers/_env.js` adds `RULE_MCP_NO_PROMPTS: "1"` to
  `DEFAULT_OPTOUT_ENV`, so an installer-written environment hides MCP prompts by
  default (`6cec5b09`).
- `src/server/_prompt-handlers.js` was calling `listPrompts()` (the always-full
  registry) in the `ListPromptsRequestSchema` handler instead of
  `listActivePrompts()`. The env var therefore had no effect on what the client
  received. Switched to `listActivePrompts()` (`cab5ae9d`).
- Test: `src/server/__tests__/_prompt-handlers.test.mjs` (3 pass, 0 fail).

### 2. Multi-agent installs write the full command set

- Root cause: the wizard joins selected agents with commas into one
  `agent-commands --sync` argv, but `resolveCommandTargets` compared that raw
  string against each target's `agent` field. Two or more selected agents
  therefore matched no targets; only the per-agent router file (`rule-mcp.md`) landed.
  The 156-file sync worked only with exactly one agent named.
- `src/core/agents/command-targets/_resolve.js` now parses `options.agent` as a
  comma-separated list (arrays accepted too) and filters through a Set (`3b9b9da5`).
- `--agent` CLI description updated; regenerated `docs/12-cli.md` and
  `docs/02-product-architecture.md` to match.
- Tests: `src/cli/commands/__tests__/_targets-sync.test.mjs`,
  `src/cli/commands/__tests__/_coverage.test.mjs`.
- ADR 101.

### 3. Reinstall: one implementation, three entry points

- `scripts/reinstall.sh` owns the sequence: purge `node_modules` and
  `pnpm-lock.yaml`, `pnpm install`, then `pnpm install -g .` to refresh the
  global bin. It runs from the checkout it lives in and refuses a directory
  without `package.json`.
- Entry points: `pnpm reinstall` (`package.json`), `rule-mcp reinstall`
  (registrar plus handler with injectable spawn, inheriting stdio), and the
  script directly (`eb86ca08`).
- The CLI handler imports only Node built-ins and delegates to a child process,
  so it survives the purge of its own `node_modules`. Bash only; on Windows it
  needs Git Bash, like `mcp:install`.
- Tests: `src/cli/__tests__/_reinstall-command.test.mjs`,
  `src/cli/__tests__/_reinstall-script.test.mjs` (script runs in a scratch copy
  with a fake `pnpm` on PATH).
- ADR 102.

### 4. Lockfile refresh

- `chore(deps)`: bumped three transitive pins through browserslist,
  `baseline-browser-mapping` 2.11.23 to 2.11.24, `electron-to-chromium` 1.5.428
  to 1.5.430, `ip-address` 10.7.1 to 10.7.2 (`02a0d11d`).

## Open Issues

### ADR "What would end this" ships a placeholder

`generateAdr()` in `src/tools/adr/_body.js:34` falls back to the template
sentence "The assumption this leans on, and the observation that would make it
wrong." when `endsWhen` is absent. The MCP tool schema in
`src/tools/adr/_register.js` (call site around line 50) never accepts or forwards
an `endsWhen` argument, so the field is unreachable from `rule_tool_process_adr`.
29 files under `docs/adr/` currently carry the placeholder instead of a real
falsification condition, including ADR 101 and ADR 102 written this session.

Next steps: add an `endsWhen` string to the ADR tool input schema, forward it
through `_register.js` and `src/tools/handoff/_closeout.js`, then backfill the
29 affected ADRs and regenerate `docs/adr/ADR.md`.

### Skill display name in Claude Code App for macOS

Carried over from handoff 09 and still unresolved. The CLI shows the clean
`/rule-mcp-handoff`, the app may still show `/rule-mcp:rule-mcp-handoff`. The
prompt-suppression fix in this session addresses the MCP-prompt path; the app
path was not verified. Investigate `src/cli/setup/_task-extras.js`,
`src/cli/setup/_commands-items.js` and `~/.claude/mcp.json`.

### Reinstall validation environment

`scripts/reinstall.sh` is POSIX-only and has not been exercised on Windows. Its
tests use a scratch copy, so the same shell dependency as `mcp:install` applies.

## Testing Status

- `src/server/__tests__/_prompt-handlers.test.mjs`: 3 pass, 0 fail (run
  `cab5ae9d`).
- Reinstall and agent-targets suites committed with their changes.
- No full-suite run is recorded in this session; trust the per-area results above
  and rerun `pnpm test` before relying on the tree as green.

## ADR Reference

- ADR 101: accept a comma-separated agent list in agent-commands
- ADR 102: reinstall is one shell script behind three entry points
- ADR 033: registry-driven clean slash commands for every agent and IDE
- ADR 028: clean `/rule-mcp-*` commands via user commands and prompt suppression
- ADR 046: installer self-heals its global shim (background on the pnpm global bin)

## References

- `scripts/reinstall.sh`
- `src/cli/commands/_reinstall.js`, `src/cli/_register-reinstall.js`
- `src/core/agents/command-targets/_resolve.js`
- `src/cli/installers/_env.js`, `src/server/_prompt-handlers.js`
- `docs/adr/101-accept-a-comma-separated-agent-list-in-agent-commands.md`
- `docs/adr/102-reinstall-is-one-shell-script-behind-three-entry-points.md`
