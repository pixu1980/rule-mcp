# Documentazione e See also nelle skill

- **Status:** accepted
- **Date:** 2026-07-19
- **Tags:** architecture, security

## Context

Tre skill (rule-data-duckdb, rule-data-indexed-db, rule-data-sqlite) mancavano della sezione ## See also, rompendo i test di documentazione.

## Decision

Aggiunta sezione ## See also con link alle skill correlate in tutte le skill mancanti.

## Consequences

Test docs passano. Skill correttamente collegate tra loro.

## Alternatives Considered

- Rimuovere il test (scartato: abbassa qualità)
