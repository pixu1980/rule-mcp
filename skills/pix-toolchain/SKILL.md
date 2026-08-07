---
name: pix-toolchain
description: >-
  Use when configuring build tools, linters, or package managers to route to the correct toolchain skill. Covers Vite, Biome, ESLint, pnpm, Husky, and TypeScript.
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

# pix-toolchain - Toolchain Skills Index

## Build Tools

| Skill                                                    | Tool   | Best For                                            |
| -------------------------------------------------------- | ------ | --------------------------------------------------- |
| [pix-toolchain-vite](../pix-toolchain-vite/SKILL.md)     | Vite   | Modern frontend (default choice, Vite 8 + Rolldown) |
| [pix-toolchain-rspack](../pix-toolchain-rspack/SKILL.md) | Rspack | Rust-based webpack-compatible bundler, fast HMR     |
| [pix-toolchain-parcel](../pix-toolchain-parcel/SKILL.md) | Parcel | Zero-config bundler, rapid prototyping              |

## Linting & Formatting

| Skill                                                    | Tool   | Best For                                                         |
| -------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| [pix-toolchain-biome](../pix-toolchain-biome/SKILL.md)   | Biome  | Fast, unified linter+formatter (Rust, recommended)               |
| [pix-toolchain-eslint](../pix-toolchain-eslint/SKILL.md) | ESLint | ESLint 10 flat config, eslint-plugin-unicorn, type-aware linting |

## Package Management & Monorepo

| Skill                                                          | Tool      | Best For                                         |
| -------------------------------------------------------------- | --------- | ------------------------------------------------ |
| [pix-toolchain-pnpm](../pix-toolchain-pnpm/SKILL.md)           | pnpm      | Package management, workspace, monorepo          |
| [pix-toolchain-turborepo](../pix-toolchain-turborepo/SKILL.md) | Turborepo | Monorepo orchestration, parallel builds, caching |

## Configuration & Hooks

| Skill                                                            | Tool              | Best For                                                                    |
| ---------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| [pix-toolchain-typescript](../pix-toolchain-typescript/SKILL.md) | TypeScript        | tsconfig, strict mode, path aliases                                         |
| [pix-toolchain-project](../pix-toolchain-project/SKILL.md)       | Project Config    | .gitignore, .editorconfig, .nvmrc, .env                                     |
| [pix-toolchain-husky](../pix-toolchain-husky/SKILL.md)           | Husky             | Git hooks, lint-staged, commitlint                                          |
| [pix-toolchain-commits](../pix-toolchain-commits/SKILL.md)       | Commit Discipline | Atomic Conventional Commits with mandatory scope, commit-msg/pre-push hooks |

## Quick Selection Guide

```
Need a build tool?                      → pix-toolchain-vite (default), pix-toolchain-rspack, or pix-toolchain-parcel
Need linting + formatting?              → pix-toolchain-biome (fast, unified) or pix-toolchain-eslint (ESLint 10 + unicorn)
Need a package manager?                 → pix-toolchain-pnpm
Need monorepo orchestration?            → pix-toolchain-turborepo
Need TypeScript config?                 → pix-toolchain-typescript
Need base project files?                → pix-toolchain-project
Need Git hooks?                         → pix-toolchain-husky
Need commit/push discipline (atomic, scope)? → pix-toolchain-commits
```

## See also

- [pix-devops-testing](../pix-devops-testing/SKILL.md) - Test configuration
- [pix](../pix/SKILL.md) - Central skill index
