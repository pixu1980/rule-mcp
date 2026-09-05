# 026: Rafforzare la disciplina TypeScript per grandi codebase

- **Date**: 2026-08-02
- **Status**: accepted
- **Tags**: typescript, toolchain, strict, monorepo, quality
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

L'articolo OpenReplay propone pratiche utili per mantenere refactorabilità e type safety in grandi progetti TypeScript: flag strict aggiuntivi, tipi di dominio, contratti generati, validazione runtime, project references e guardrail CI.

## Decision

Aggiornare rule-toolchain-typescript con exactOptionalPropertyTypes, verbatimModuleSyntax, controlli strict espliciti, migrazione incrementale, discriminated unions, branded types, unknown, boundary validation, generated types, project references e type-coverage ratcheting. Le affermazioni legate a TypeScript 6/7 restano version-gated e non diventano dipendenze della baseline.

## Consequences

La skill fornisce una baseline più sicura per grandi codebase e rende esplicita la differenza tra garanzie compile-time e runtime; l'abilitazione di exactOptionalPropertyTypes può richiedere migrazione dei call site.

## Alternatives Considered

1. Limitarsi ad aggiungere i due flag strict mancanti
1. Creare una skill separata per TypeScript large projects
1. Adottare senza qualifiche le versioni future e i default descritti dall'articolo
