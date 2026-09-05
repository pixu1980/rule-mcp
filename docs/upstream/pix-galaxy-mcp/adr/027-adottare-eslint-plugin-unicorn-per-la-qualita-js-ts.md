# 027: Adottare eslint-plugin-unicorn per la qualità JS/TS

- **Date**: 2026-08-03
- **Status**: accepted
- **Tags**: eslint, toolchain, unicorn, javascript, typescript, styleguide, guardrails, quality
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

L'articolo OpenReplay su eslint-plugin-unicorn: ESLint 10 ha rimosso il sistema .eslintrc - flat config (eslint.config.mjs) ed ESM sono le uniche forme supportate. Unicorn (v69+, ESLint >=10.4) porta 300+ regole per lo più autofixable con tre preset (recommended, unopinionated, all) e regole ad alto valore (prefer-set-has, no-array-for-each, prefer-node-protocol, throw-new-error, prefer-string-replace-all, prefer-array-flat-map, new-for-builtins). Alcune regole sono opinionate (prevent-abbreviations, no-null, no-array-reduce, filename-case) e vanno calibrate per codicebase esistenti.

## Decision

Aggiornare rule-toolchain-eslint a ESLint 10 flat config + eslint-plugin-unicorn (preset e regole ad alto valore, tabella keep/warn/disable per le regole opinionate, strategia di adozione incrementale, pairing con @typescript-eslint/recommended-type-checked). Aggiungere gli idiomi moderni (Set.has, for...of, node: protocol, replaceAll, flatMap, new per builtin, ternary) a rule-styleguide-javascript e al cheat sheet rule-styleguide-patterns. Aggiungere 7 guardrail deterministiche JS/TS (js-throw-new-error, js-new-for-builtins, js-array-flat-map, js-prefer-set-has, js-node-protocol, js-prefer-replace-all, js-no-array-for-each) a JS_GUARDRAILS, applicate a tutti i framework JS. Le regole opinionate restano documentate come tunable, non imposte.

## Consequences

Il tooling ESLint è allineato a ESLint 10 e flat config; il codice validato da pix_check segue idiomi moderni e performanti (Set.has O(1) invece di includes O(n²) nei loop, for...of con narrowing TS, import node: non shadowabili, replaceAll/flatMap/new per builtin). Le guardrail sono deterministiche e autofixable, senza imporre preferenze stilistiche controverse. La migrazione del tooling interno del repo (eslint 9 + .eslintrc) a ESLint 10 resta fuori scope e va valutata separatamente.

## Alternatives Considered

1. Migrare anche il tooling interno del repo a ESLint 10 + unicorn (rimandato: impatto ampio su lint:fix e config)
1. Aggiungere solo le regole non controverse senza toccare styleguide e pattern
1. Creare una skill separata rule-toolchain-unicorn (evitato: l'articolo lo tratta come parte di ESLint)
