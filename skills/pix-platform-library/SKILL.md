---
name: rule-platform-library
description: >-
  Use when developing reusable npm packages. Covers pnpm structure, public API design, TypeScript exports, dual CJS/ESM, and semantic versioning.
tags:
  - "platform"
  - "library"
frameworks: [all]
---

# rule-platform-library — Library / Package Development with rule Principles

This skill covers **reusable code packages** published to pnpm or bundled into other projects.

## When to use rule-platform-library

- Creating a reusable JavaScript/TypeScript library
- Extracting shared logic from a monorepo into a package
- Publishing a component library, utility package, or SDK
- Setting up dual CJS/ESM distribution
- Establishing API surface contracts and deprecation policies

## Core Rules

1. **Public API is explicit** — every exported symbol is intentional and documented
2. **Zero runtime dependencies** where possible — if needed, audit carefully
3. **Semantic versioning** — breaking changes bump major, new features bump minor, fixes bump patch
4. **ES modules first** — CJS provided via wrapper for compatibility
5. **Barrel pattern** — `index.js` re-exports the public API, internal files prefixed with `_`
6. **JSDoc required** on all public exports — types, params, returns, examples
7. **Tests required** — node:test or Vitest, minimum 80% coverage on public API
8. **CHANGELOG.md** — keep a human-readable changelog per release

## Tree-Shaking & Bundle Size

- **`sideEffects: false`** in package.json — enables bundlers to tree-shake unused exports
- **Barrel trade-off**: For large libraries (>50 exports), consider direct imports instead of barrel to avoid circular references and improve tree-shaking
- **No side-effect imports**: Never `import "./setup"` — use explicit initialization instead
- **Size budget**: Use `size-limit` or `bundlesize` to cap the library's gzipped weight

## File Tree Convention

```
project/
├── src/
│   ├── index.js           ← Public API barrel (re-export only)
│   ├── _internal.js       ← Internal implementation (underscore prefix)
│   ├── _helpers.js        ← Private utilities
│   └── __tests__/
│       └── index.test.js
├── dist/                  ← Build output (gitignored)
│   ├── index.mjs          ← ESM build
│   ├── index.d.mts        ← TypeScript declarations (generated)
│   ├── index.cjs          ← CJS build
│   └── index.d.cts        ← CJS declarations
├── CHANGELOG.md
├── LICENSE
├── README.md
├── package.json
└── tsconfig.json          ← For JSDoc type checking + declaration generation
```

## Package.json Structure

```json
{
  "name": "@scope/package-name",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.mts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.mts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./utils": {
      "import": {
        "types": "./dist/utils.d.mts",
        "default": "./dist/utils.mjs"
      }
    }
  },
  "files": ["dist", "CHANGELOG.md", "LICENSE", "README.md"],
  "sideEffects": false,
  "scripts": {
    "build": "node scripts/build.js && tsc --declaration --emitDeclarationOnly",
    "test": "node --test",
    "prepublishOnly": "pnpm build && pnpm test"
  }
}
```

### Sub-path Exports

For larger libraries, expose sub-paths so consumers import only what they need:

```json
"exports": {
  ".": { ... },
  "./react": { ... },
  "./utils": { ... },
  "./types": { ... }
}
```

This enables `import { useStore } from "@scope/lib/react"` without pulling in the full library.

## Monorepo Integration

When developing in a pnpm workspace:

```json
// In dependent package's package.json:
"dependencies": {
  "@scope/lib": "workspace:*"
}
```

- Use `workspace:*` protocol for local development, `^x.y.z` before publishing
- Run `pnpm publish` from the library's directory
- Use `pnpm changeset` for versioning across multiple packages

## Public API Contract

### Barrel Pattern

```js
// src/index.js — public API barrel
// Only re-export what consumers should use.
// Everything else stays private via underscore prefix.

export { createStore } from "./_store.js";
export { defineComponent } from "./_component.js";
export { html, render } from "./_template.js";

// NOT exported: _internal.js, _helpers.js, _scheduler.js
```

### Deprecation Policy

```js
// Use @deprecated JSDoc tag with migration path
/**
 * @deprecated Use `createStore` instead. Will be removed in v3.
 * @param {string} name
 * @returns {object}
 */
export function makeStore(name) {
  return createStore(name);
}
```

## Build (Dual ESM/CJS)

Use a simple build script or tsup/microbundle:

```js
// scripts/build.js
import { build } from "esbuild";

await Promise.all([
  build({
    entryPoints: ["src/index.js"],
    outfile: "dist/index.mjs",
    format: "esm",
    bundle: true,
    platform: "neutral",
  }),
  build({
    entryPoints: ["src/index.js"],
    outfile: "dist/index.cjs",
    format: "cjs",
    bundle: true,
    platform: "neutral",
  }),
]);
```

## Testing

```
Tool:     node:test (built-in) or Vitest
Coverage: minimum 80% on public API
Pattern:  describe → it (BDD-style)
Focus:    public API contracts, edge cases, error paths
```

## Publishing

```
1. pnpm changeset     # Describe changes (semver bumps)
2. pnpm changeset version  # Update versions + changelog
3. pnpm build         # Build dist/
4. pnpm test          # Run tests
5. pnpm publish       # Publish to pnpm

Or manually:
1. Update CHANGELOG.md
2. Bump version in package.json (semver)
3. pnpm build && pnpm test
4. pnpm publish --access public
```

## Changelog Format

Keep a human-readable `CHANGELOG.md`:

```markdown
# Changelog

## [1.1.0] — 2026-06-15

### Added

- `createStore(options)` now accepts `onError` callback
- New `defineComponent(schema)` for typed component definitions

### Fixed

- Memory leak in `html`` template engine when used with SVG
- Type export for `StoreOptions` interface

## [1.0.0] — 2026-05-01

### Added

- Initial release: `createStore`, `html`, `render`, `defineComponent`
```

## Quick Reference

```
┌────────────────────────────────────────────────────────────┐
│  Structure:  src/   dist/   CHANGELOG.md   LICENSE         │
│  API:        index.js barrel, _internal.js private         │
│  Format:     ESM (dist/index.mjs) + CJS (dist/index.cjs)  │
│  Build:      esbuild / tsup / microbundle                  │
│  Test:       node:test / Vitest, ≥80% coverage            │
│  Version:    semver, CHANGELOG.md per release              │
│  Deploy:     pnpm publish —access public                    │
│  Deps:       zero runtime preferred, audit before adding   │
└────────────────────────────────────────────────────────────┘
```

---

## See also

- [rule](../rule/SKILL.md) — Central skill index and dispatcher
- [rule-platform](../rule-platform/SKILL.md) — Platform skill index
