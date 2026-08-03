# 028: Migrare il tooling del repo a ESLint 10 flat config con eslint-plugin-unicorn

- **Date**: 2026-08-03
- **Status**: accepted
- **Tags**: eslint, toolchain, unicorn, flat-config, migration, security, brace-expansion
- **Author**: rule-architect

## Context

Dopo l'adozione di eslint-plugin-unicorn nelle skill (ADR 027), migrare il tooling interno del repo: ESLint 10 ha rimosso il sistema .eslintrc, quindi .eslintrc.json va sostituito con flat config (eslint.config.mjs). Il repo usa eslint 9 + .eslintrc legacy, node 24, nessun TypeScript. L'override di sicurezza brace-expansion in pnpm-workspace.yaml (GHSA-mh99-v99m-4gvg) era incompatibile con minimatch@10 di ESLint 10 (richiede brace-expansion ^5.0.8): va esteso alle linee patched mantenendo l'esclusione delle versioni vulnerabili.

## Decision

Migrare il repo a ESLint 10.8 flat config (eslint.config.mjs: @eslint/js + eslint-plugin-unicorn recommended + preferenze repo preservate). Eseguire il pass di autofix (circa 1300 fix), poi disattivare le regole opinionate che combattono il codebase (name-replacements, import-style, text-encoding-identifier-case, no-array-sort, no-top-level-assignment-in-function, no-process-exit, no-control-regex e coda) e correggere a mano i problemi reali emersi (no-undef, no-empty, no-useless-escape, no-useless-assignment). Aggiornare override brace-expansion in pnpm-workspace.yaml a '>=1.1.17 <2 || >=2.1.3 <3 || >=3.0.3 <4 || >=5.0.8' con override annidato per minimatch@>=10 (5.0.9). Aggiornare CI (senza --ext), guardrail scaffold e docs a eslint.config.mjs.

## Consequences

pnpm lint passa con 0 errori e 48 warning (budget CI 50); il codice segue idiomi moderni (node:, replaceAll, flatMap, new per builtin, ternari, assert.ok) e 2 veri bug sono stati corretti (interpolazione ${words} nel template bash di completions, catch vuoti). Le regole opinionate restano documentate come off e rivisitabili nei passi successivi. La gate prettier era già rossa sul baseline e resta tale: un pass separato di format:fix è il follow-up. L'articolo citava no-array-for-each come regola recommended, ma è stata rimossa in unicorn 70: l'idioma for...of resta imposto dal guardrail js-no-array-for-each.

## Alternatives Considered

1. Rimanere su ESLint 9 + .eslintrc (rinviato: legacy system rimosso in ESLint 10, nessuna via di aggiornamento)
1. Migrare solo la config senza autofix (perso il valore delle regole autofixable)
1. Usare il preset unopinionated (equivalente a disattivare a priori le stesse regole, meno trasparente)
