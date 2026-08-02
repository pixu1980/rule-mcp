# 025: Rafforzare le skill sui vincoli relazionali del database

- **Date**: 2026-08-02
- **Status**: accepted
- **Tags**: database, sql, postgresql, mysql, schema
- **Author**: rule-architect

## Context

La revisione dell'articolo OpenReplay ha evidenziato che le skill SQL coprivano già molti pattern, ma non esplicitavano abbastanza il database come autorità per l'integrità, la verifica delle migration, i limiti dell'EAV e le differenze sugli indici delle foreign key.

## Decision

Integrare queste regole nelle skill rule-data-sql, rule-data-postgresql e rule-data-mysql, mantenendo separati i dettagli version-specifici di PostgreSQL 18 e MySQL/MariaDB.

## Consequences

Le skill guideranno verso vincoli verificabili nel database, test di schema e migration, documentazione delle colonne e scelte di indicizzazione più consapevoli; gli esempi PostgreSQL 18 resteranno opt-in e non verranno trattati come baseline PostgreSQL 16+.

## Alternatives Considered

1. Aggiungere una nuova skill dedicata al design relazionale
1. Copiare integralmente l'articolo in una skill esistente
1. Non modificare le skill perché i pattern principali erano già presenti
