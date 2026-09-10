# 041: Lossless installer: preserve toolPrefix and normalize rule blank lines

- **Date**: 2026-08-01
- **Status**: accepted
- **Tags**: installer, idempotency, toolPrefix, mcp-config
- **Author**: rule-mcp-architect

## Context

An uninstall.sh + install.sh cycle (a) removed the per-server toolPrefix key from the "rule-mcp" entry in ~/.pi/agent/mcp.json because upsertJsonServer replaced the entire entry, making /mcp__pix_galaxy_mcp__* commands reappear; (b) added a blank line to CLAUDE.md on each cycle because RULES_CONTENT started with \n and uninstall only removed the marker block leaving the line.

## Decision

upsertJsonServer/upsertVscode merge the existing entry with the new config, preserving user keys (toolPrefix, timeout, custom env); cmdConfig writes toolPrefix:"none" by default for pi (tool rule-tool-_, prompt /rule-_); install.sh uses append_rules_block which normalizes trailing newlines and inserts exactly one separator; uninstall.sh collapses trailing newlines after block removal.

## Consequences

The uninstall+install cycle is idempotent (no accumulated blank lines, no lost user keys). Fresh pi installs have clean names without mcp__pix_galaxy_mcp__ prefixes. Side effect: one-shot normalization of past accumulated blank lines (from N blank lines to 1).

## Alternatives Considered

1. Remove only one blank line before the marker in uninstall (doesn't converge with past accumulated states)
1. Not setting default toolPrefix and relying only on merge (doesn't restore already-lost user config)
