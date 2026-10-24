# Handoff: postinstall CLI registration

**Branch:** main
**Commits:** 89002a13 (chore(installer): register rule-mcp globally on postinstall)
**Date:** 2026-09-16

## Session Summary

Added automatic global CLI registration on `pnpm install` postinstall hook to enable immediate access to `rule-mcp setup` after clone and install.

## Work Completed

### Installer postinstall script

- Added `postinstall` script to package.json: `pnpm install -g . 2>/dev/null || true`
- Enables `rule-mcp` CLI to be available globally after `pnpm i`
- Works in CI environments (errors suppressed)
- Reduces friction: users clone, `pnpm i`, then `rule-mcp setup` immediately

### Known Issue: Skill naming in Claude Code App macOS

**Problem:** Skills appear as `/rule-mcp:rule-mcp-handoff` instead of `/rule-mcp-handoff` in Claude App macOS, though Claude CLI shows correct shorthand `/rule-mcp-handoff`.

**Root cause:** Unknown - likely in skill registration during setup wizard or MCP server configuration.

**Files to investigate:**

- `src/cli/setup/_commands-items.js` - command naming logic
- `src/cli/setup/_task-extras.js` - how commands and skills are installed
- `src/core/agents/commands/` - command template generation
- `server.json` - MCP server metadata (check for skill shortcut definitions)

**Next steps:** Audit how skills are registered in Claude Code during the setup wizard. Check if `commandShortcut` or similar field controls the displayed name.

## Testing Status

postinstall hook tested with fresh `pnpm i`. CLI registers but needs TTY-safe implementation validation in CI environments.

## ADR Reference

- ADR 090: setup wizard is the installer
- ADR 033: registry-driven clean slash commands for every agent and IDE
- ADR 028: clean /rule-mcp-* commands via user commands and prompt suppression

## References

- `package.json` (lines 20-29, postinstall script)
- `src/cli/setup/` (installer wizard implementation)
- `~/.claude/mcp.json` (Claude Code MCP server registration)
