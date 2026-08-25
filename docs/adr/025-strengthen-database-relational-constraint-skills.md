# 025: Strengthen database relational constraint skills

- **Date**: 2026-08-02
- **Status**: accepted
- **Tags**: database, sql, postgresql, mysql, schema
- **Author**: rule-mcp-architect

## Context

The OpenReplay article review highlighted that SQL skills already covered many patterns, but didn't emphasize enough the database as the authority for integrity, migration verification, EAV limits, and foreign key index differences.

## Decision

Integrate these rules into the rule-data-sql, rule-data-postgresql, and rule-data-mysql skills, keeping version-specific details of PostgreSQL 18 and MySQL/MariaDB separate.

## Consequences

Skills will guide toward database-verifiable constraints, schema and migration testing, column documentation, and more informed indexing choices; PostgreSQL 18 examples remain opt-in and won't be treated as PostgreSQL 16+ baseline.

## Alternatives Considered

1. Add a new dedicated relational design skill
1. Copy the entire article into an existing skill
1. Don't modify skills because core patterns were already present
