# 027: Adopt eslint-plugin-unicorn for JS/TS quality

- **Date**: 2026-08-03
- **Status**: accepted
- **Tags**: eslint, toolchain, unicorn, javascript, typescript, styleguide, guardrails, quality
- **Author**: rule-mcp-architect

## Context

The OpenReplay article on eslint-plugin-unicorn: ESLint 10 removed the .eslintrc system - flat config (eslint.config.mjs) and ESM are the only supported forms. Unicorn (v69+, ESLint ≥10.4) brings 300+ mostly autofixable rules with three presets (recommended, unopinionated, all) and high-value rules (prefer-set-has, no-array-for-each, prefer-node-protocol, throw-new-error, prefer-string-replace-all, prefer-array-flat-map, new-for-builtins). Some rules are opinionated (prevent-abbreviations, no-null, no-array-reduce, filename-case) and need calibration for existing codebases.

## Decision

Update rule-toolchain-eslint to ESLint 10 flat config + eslint-plugin-unicorn (preset and high-value rules, keep/warn/disable table for opinionated rules, incremental adoption strategy, pairing with @typescript-eslint/recommended-type-checked). Add modern idioms (Set.has, for...of, node: protocol, replaceAll, flatMap, new for builtins, ternary) to rule-styleguide-javascript and the rule-styleguide-patterns cheat sheet. Add 7 deterministic JS/TS guardrails (js-throw-new-error, js-new-for-builtins, js-array-flat-map, js-prefer-set-has, js-node-protocol, js-prefer-replace-all, js-no-array-for-each) to JS_GUARDRAILS, applied to all JS frameworks. Opinionated rules remain documented as tunable, not enforced.

## Consequences

ESLint tooling is aligned with ESLint 10 and flat config; code validated by pix_check follows modern, performant idioms (Set.has O(1) instead of includes O(n²) in loops, for...of with TS narrowing, non-shadowable node: imports, replaceAll/flatMap/new for builtins). Guardrails are deterministic and autofixable, without imposing controversial style preferences. Migration of the repo's internal tooling (eslint 9 + .eslintrc) to ESLint 10 remains out of scope and should be evaluated separately.

## Alternatives Considered

1. Also migrate the repo's internal tooling to ESLint 10 + unicorn (deferred: broad impact on lint:fix and config)
1. Only add non-controversial rules without touching styleguide and patterns
1. Create a separate rule-toolchain-unicorn skill (avoided: the article treats it as part of ESLint)
