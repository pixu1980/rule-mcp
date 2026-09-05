# 007: Vanilla JS over TypeScript

**Status**: Accepted  
**Date**: 2026-06-20  
**Deciders**: Project owner

## Context

The rule-mcp server needs a language choice for implementation. Options considered:

- Vanilla JavaScript (ESM)
- TypeScript with compilation step

## Decision

Use **Vanilla JavaScript (ESM)** throughout.

## Rationale

1. **Zero build step** - `node src/index.js serve` works instantly. No `tsc`, no bundler, no source maps.
2. **SDK ships `.d.ts`** - the `@modelcontextprotocol/sdk` provides TypeScript declarations. Editors (VS Code, Cursor) provide autocomplete even for vanilla JS projects.
3. **Small project** - 23 modules, all <=300 lines. TypeScript's type safety provides less benefit at this scale.
4. **Skills are markdown** - the core domain logic is SKILL.md files, not TypeScript types.
5. **Zero npm deps** - the project prides itself on having only 2 dependencies (SDK + Zod). Adding TypeScript would add a dev dependency and build step.

## Consequences

- No compile-time type checking. Caught by smoke tests and CI.
- Consumers who prefer TypeScript get autocomplete via SDK's `.d.ts` files.
- JSDoc annotations on all exports provide inline documentation.
