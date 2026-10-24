# 009: Toolchain Skill Isolation (Vite)

- **Date**: 2026-07-10
- **Status**: accepted
- **Tags**: skills, toolchain, vite, build
- **Author**: rule-mcp-architect

## Context

Build tool configuration was embedded inside `rule-mcp-scaffold-frontend-react-vite`, coupling Vite-specific settings with React scaffolding. This created a dependency where:

- Non-React projects (Vue + Vite, Svelte + Vite, Astro) had no access to Vite best practices
- React scaffolding was cluttered with build-tool configuration
- The `rule-mcp-toolchain-*` category provides a home for any build tool, linter, or formatter skill

## Decision

Extract all Vite-related content from `rule-mcp-scaffold-frontend-react-vite` into a new `rule-mcp-toolchain-vite` skill covering:

- `vite.config.ts` configuration (plugins, server, build)
- `vitest.config.ts` test configuration
- Environment variable conventions (`VITE_` prefix)
- Build optimization (code splitting, minification, target)
- Test setup (jsdom, testing-library)

The `rule-mcp-frontend-react` skill now references `rule-mcp-toolchain-vite` for build configuration, keeping the React skill focused on React-specific patterns.

## Consequences

**Positive:**

- Framework-agnostic Vite skill - usable by React, Vue, Svelte, Astro, and vanilla projects
- Single source of truth for Vite configuration
- `rule-mcp-toolchain-*` category is extensible (future: webpack, esbuild, tsc)
- Cleaner separation of concerns

**Negative:**

- React scaffolding now spans two skills (`frontend-react` + `toolchain-vite`)
- Agents must call both skills for complete project setup
