# 017 - Native Claude Skills integration

- **Status:** accepted
- **Date:** 2026-07-19
- **Tags:** architecture, security

## Context

rule skills were only accessible via MCP tools. Claude Code has a native auto-discovery mechanism in .claude/skills/ that wasn't being used.

## Decision

installNativeSkills() now copies skills to ~/.claude/skills/<name>/ with Claude-compatible YARD frontmatter. Non-destructive: skips already-installed skills.

## Consequences

Claude can auto-discover skills. Dual install (MCP + native) for maximum compatibility.

## Alternatives Considered

- MCP only (status quo, rejected: loses auto-discovery)
- Native only (rejected: loses MCP compatibility)
