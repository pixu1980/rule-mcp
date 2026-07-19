# 015 — Migrazione wizard architect a rule-architect-cli/web

- **Status:** accepted
- **Date:** 2026-07-19
- **Tags:** architecture, security

## Context

Il wizard architect era implementato in un unico file context-server.mjs. La nuova architettura separa CLI e web in due skill distinte.

## Decision

Migrazione a rule-architect-cli (terminal) e rule-architect-web (browser). pix_architect tool agganciato al nuovo sistema.

## Consequences

Separazione chiara tra interfaccia CLI e web. Manutenibilità migliorata.

## Alternatives Considered

- Mantenere il vecchio context-server.mjs (scartato: obsoleto)
