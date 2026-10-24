# 016 - Documentation and See also in skills

- **Status:** accepted
- **Date:** 2026-07-19
- **Tags:** architecture, security
- **Author:** Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Three skills (rule-data-duckdb, rule-data-indexed-db, rule-data-sqlite) were missing the ## See also section, breaking documentation tests.

## Decision

Added ## See also section with links to related skills in all missing skills.

## Consequences

Docs tests pass. Skills correctly cross-linked.

## Alternatives Considered

- Remove the test (rejected: lowers quality)
