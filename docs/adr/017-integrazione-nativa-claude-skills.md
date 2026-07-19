# 017 — Integrazione nativa Claude Skills

- **Status:** accepted
- **Date:** 2026-07-19
- **Tags:** architecture, security

## Context

Le skill rule erano accessibili solo via tool MCP. Claude Code ha un meccanismo nativo di auto-discovery in .claude/skills/ che non veniva usato.

## Decision

installNativeSkills() ora copia le skill anche in ~/.claude/skills/<name>/ con frontmatter YARD compatibile Claude. Non distruttivo: salta skill già installate.

## Consequences

Claude può scoprire le skill automaticamente. Doppia installazione (MCP + nativa) per massima compatibilità.

## Alternatives Considered

- Solo MCP (status quo, scartato: perde auto-discovery)
- Solo nativo (scartato: perde compatibilità MCP)
