---
name: pix-toolchain
description: >
  Index of all toolchain skills: build tools (Vite, Parcel), linters (Biome, ESLint),
  package management (pnpm), monorepo orchestration (Turborepo), Git hooks (Husky),
  TypeScript configuration, and project base configs.
tags:
  - "toolchain"
  - "build"
  - "vite"
  - "parcel"
  - "biome"
  - "eslint"
  - "pnpm"
  - "turborepo"
  - "typescript"
  - "husky"
  - "index"
frameworks: [all]
---

# pix-toolchain — Toolchain Skills Index

## Build Tools

| Skill | Tool | Best For |
|-------|------|----------|
| [pix-toolchain-vite](../pix-toolchain-vite/SKILL.md) | Vite | Modern frontend (default choice, Vite 8 + Rolldown) |
| [pix-toolchain-parcel](../pix-toolchain-parcel/SKILL.md) | Parcel | Zero-config bundler, rapid prototyping |

## Linting & Formatting

| Skill | Tool | Best For |
|-------|------|----------|
| [pix-toolchain-biome](../pix-toolchain-biome/SKILL.md) | Biome | Fast, unified linter+formatter (Rust, recommended) |
| [pix-toolchain-eslint](../pix-toolchain-eslint/SKILL.md) | ESLint | Legacy projects needing full plugin ecosystem |

## Package Management & Monorepo

| Skill | Tool | Best For |
|-------|------|----------|
| [pix-toolchain-pnpm](../pix-toolchain-pnpm/SKILL.md) | pnpm | Package management, workspace, monorepo |
| [pix-toolchain-turborepo](../pix-toolchain-turborepo/SKILL.md) | Turborepo | Monorepo orchestration, parallel builds, caching |

## Configuration & Hooks

| Skill | Tool | Best For |
|-------|------|----------|
| [pix-toolchain-typescript](../pix-toolchain-typescript/SKILL.md) | TypeScript | tsconfig, strict mode, path aliases |
| [pix-toolchain-project](../pix-toolchain-project/SKILL.md) | Project Config | .gitignore, .editorconfig, .nvmrc, .env |
| [pix-toolchain-husky](../pix-toolchain-husky/SKILL.md) | Husky | Git hooks, lint-staged, commitlint |

## Quick Selection Guide

```
Need a build tool?                      → pix-toolchain-vite (default) or pix-toolchain-parcel
Need linting + formatting?              → pix-toolchain-biome (new) or pix-toolchain-eslint (legacy)
Need a package manager?                 → pix-toolchain-pnpm
Need monorepo orchestration?            → pix-toolchain-turborepo
Need TypeScript config?                 → pix-toolchain-typescript
Need base project files?                → pix-toolchain-project
Need Git hooks?                         → pix-toolchain-husky
```

## See also

- [pix-devops-testing](../pix-devops-testing/SKILL.md) — Test configuration
- [pix](../pix/SKILL.md) — Central skill index
