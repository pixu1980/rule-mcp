---
name: rule-toolchain
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

# rule-toolchain - Toolchain Skills Index

## Build Tools

| Skill                                                    | Tool   | Best For                                            |
| -------------------------------------------------------- | ------ | --------------------------------------------------- |
| [rule-toolchain-vite](../rule-toolchain-vite/SKILL.md)     | Vite   | Modern frontend (default choice, Vite 8 + Rolldown) |
| [rule-toolchain-rspack](../rule-toolchain-rspack/SKILL.md) | Rspack | Rust-based webpack-compatible bundler, fast HMR     |
| [rule-toolchain-parcel](../rule-toolchain-parcel/SKILL.md) | Parcel | Zero-config bundler, rapid prototyping              |

## Linting & Formatting

| Skill                                                    | Tool   | Best For                                                         |
| -------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| [rule-toolchain-biome](../rule-toolchain-biome/SKILL.md)   | Biome  | Fast, unified linter+formatter (Rust, recommended)               |
| [rule-toolchain-eslint](../rule-toolchain-eslint/SKILL.md) | ESLint | ESLint 10 flat config, eslint-plugin-unicorn, type-aware linting |

## Package Management & Monorepo

| Skill                                                          | Tool      | Best For                                         |
| -------------------------------------------------------------- | --------- | ------------------------------------------------ |
| [rule-toolchain-pnpm](../rule-toolchain-pnpm/SKILL.md)           | pnpm      | Package management, workspace, monorepo          |
| [rule-toolchain-turborepo](../rule-toolchain-turborepo/SKILL.md) | Turborepo | Monorepo orchestration, parallel builds, caching |

## Configuration & Hooks

| Skill                                                            | Tool              | Best For                                                                    |
| ---------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| [rule-toolchain-typescript](../rule-toolchain-typescript/SKILL.md) | TypeScript        | tsconfig, strict mode, path aliases                                         |
| [rule-toolchain-project](../rule-toolchain-project/SKILL.md)       | Project Config    | .gitignore, .editorconfig, .nvmrc, .env                                     |
| [rule-toolchain-husky](../rule-toolchain-husky/SKILL.md)           | Husky             | Git hooks, lint-staged, commitlint                                          |
| [rule-toolchain-commits](../rule-toolchain-commits/SKILL.md)       | Commit Discipline | Atomic Conventional Commits with mandatory scope, commit-msg/pre-push hooks |

## Quick Selection Guide

```
Need a build tool?                      → rule-toolchain-vite (default), rule-toolchain-rspack, or rule-toolchain-parcel
Need linting + formatting?              → rule-toolchain-biome (fast, unified) or rule-toolchain-eslint (ESLint 10 + unicorn)
Need a package manager?                 → rule-toolchain-pnpm
Need monorepo orchestration?            → rule-toolchain-turborepo
Need TypeScript config?                 → rule-toolchain-typescript
Need base project files?                → rule-toolchain-project
Need Git hooks?                         → rule-toolchain-husky
Need commit/push discipline (atomic, scope)? → rule-toolchain-commits
```

## See also

- [rule-devops-testing](../rule-devops-testing/SKILL.md) - Test configuration
- [rule](../rule/SKILL.md) - Central skill index
