# 028: Clean /rule-mcp-* commands via user commands + prompt suppression, not a plugin

- **Date**: 2026-08-03
- **Status**: accepted
- **Tags**: commands, claude, mcp, installer
- **Author**: rule-mcp-architect

## Context

Claude Code exposes MCP prompts as slash commands prefixed with the server name (/rule-mcp:rule-mcp-handoff, shown as (MCP)). Users wanted bare /rule-mcp-handoff. A Claude plugin does NOT solve this: plugin commands are also namespaced (/plugin-name:command); displayName is UI-only and never changes the invocation. The only mechanism that yields a bare /rule-mcp-handoff is a user/project command file in ~/.claude/commands/. MCP prompts cannot be hidden client-side - the server must stop emitting them (prompts/list) to remove the prefixed duplicates. The 7 agent commands were also hand-maintained per-agent heredocs, drifting from the ~23 MCP prompts.

## Decision

1. Do NOT ship a Claude plugin. 2) Generate the clean command set from the MCP prompt registry as the single source of truth (src/core/agent-commands.js + `rule-mcp agent-commands` CLI): the rule-mcp router pinned first, then every prompt alphabetically, rendered per agent format (args/workflow/gemini). 3) Suppress the server's prompts for Claude via a new RULE_MCP_NO_PROMPTS env flag (default 0), set to 1 in the Claude MCP config; listActivePrompts() returns [] when set, while listPrompts() stays pure. 4) install.sh/install-agent-commands.sh and `install --agent claude` write the full set for every agent; uninstall removes it. 5) /rule-mcp-handoff commits pending work as atomic scoped conventional commits + one separate docs(handoff)/docs(adr) commit, never pushing.

## Consequences

Claude users get bare /rule-mcp-* commands with no (MCP) duplicates after re-install + session restart. All agents share one consistently ordered, registry-derived command set that cannot drift. A shared daemon keeps prompts on (it serves all clients). Non-Claude stdio agents still see the MCP prompts unless similarly configured. Existing installs must re-run the installer (or `rule-mcp install --agent claude --force`) to pick up the env flag and expanded command set.
