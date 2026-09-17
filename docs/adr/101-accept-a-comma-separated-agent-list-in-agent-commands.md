# 101: Accept a comma-separated agent list in agent-commands

- **Date**: 2026-09-17
- **Status**: accepted
- **Tags**: cli, installer, agent-commands
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The install wizard builds one `agent-commands --sync` argv for every selected agent and joins the names with commas (`commandSyncArgs` in `src/cli/setup/_task-extras.js`). `resolveCommandTargets` compared that raw string against each target's `agent` field, so any install with two or more selected agents resolved zero targets and wrote no command files at all. Only the per-agent installer's single router file (`rule.md`) landed, which is why a multi-agent install showed no `/rule-*` commands in any agent. The 156-file sync worked only when exactly one agent was named.

## Decision

`resolveCommandTargets` now parses `options.agent` as a comma-separated list (arrays work too) and filters targets through a Set, so one `--agent claude,pi` call covers every named agent. The `--agent` CLI description now says "limit to these agents (comma-separated)", and the census-owned `docs/12-cli.md` is regenerated to match.

## Consequences

Multi-agent installs write the full selected command set into every selected agent's directory in a single sync. Unknown agent names still match nothing, and the `detectedOnly` gate and global-directory forcing keep their previous semantics. The CLI contract widens: `--agent` accepts a list in addition to one name.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Have the wizard spawn one `agent-commands --sync --agent <name>` per selected agent: extra processes and argv assertions to maintain.
