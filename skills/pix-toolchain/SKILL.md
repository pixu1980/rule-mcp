---
name: rule-toolchain
description: >-
  Use when configuring build tools, linters, or package managers to route to the correct toolchain skill. Covers Vite, Rspack, Parcel, Biome, ESLint, pnpm, Turborepo, and Husky.
tags:
  - "toolchain"
  - "build"
  - "vite"
  - "rspack"
  - "parcel"
  - "biome"
  - "eslint"
  - "pnpm"
  - "turborepo"
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

| Skill                                                  | Tool  | Best For                           |
| ------------------------------------------------------ | ----- | ---------------------------------- |
| [rule-toolchain-husky](../rule-toolchain-husky/SKILL.md) | Husky | Git hooks, lint-staged, commitlint |

## Quick Selection Guide

```
Need a build tool?                      → rule-toolchain-vite (default), rule-toolchain-rspack, or rule-toolchain-parcel
Need linting + formatting?              → rule-toolchain-biome (fast, unified) or rule-toolchain-eslint (ESLint 10 + unicorn)
Need a package manager?                 → rule-toolchain-pnpm
Need monorepo orchestration?            → rule-toolchain-turborepo
Need Git hooks?                         → rule-toolchain-husky
```

## Choosing a formatter and a linter: Prettier, Biome, ESLint, dprint, oxfmt

Two different jobs that get confused. A **formatter** rewrites layout and never
changes meaning. A **linter** finds problems, and only some are about layout.

| Tool                   | Job                          | When it fits                                                       |
| ---------------------- | ---------------------------- | ------------------------------------------------------------------ |
| Prettier               | Formatter                    | The default answer. Widest ecosystem and editor support            |
| Biome                  | Formatter + linter           | One fast Rust binary instead of two tools; smaller rule set        |
| ESLint                 | Linter                       | The rules that catch bugs, not layout. Plugins for every framework |
| eslint-config-prettier | Peacekeeper                  | Turns off ESLint's layout rules so the two stop fighting           |
| ESLint Stylistic       | Formatting inside the linter | If you want one tool and already run ESLint                        |
| dprint                 | Formatter                    | Pluggable and configurable, Rust, smaller community                |
| oxfmt                  | Formatter                    | Very fast newcomer, part of the Oxc toolchain                      |
| Standard               | Formatter + linter           | Zero configuration, and no configuration                           |
| EditorConfig           | The layer underneath         | Indentation and line endings for editors that read nothing else    |
| husky + lint-staged    | Automation                   | Run both on staged files, at commit time                           |

**The rule default: Prettier for formatting, ESLint 10 flat config with
`eslint-plugin-unicorn` for linting, `eslint-config-prettier` between them, and
husky plus lint-staged to run them.** See ADR 026 and ADR 027 for why.

One gotcha worth knowing: line endings. Set `end_of_line` in `.editorconfig` and
`* text=auto eol=lf` in `.gitattributes`, or every Windows checkout produces a
diff nobody wrote.

The choice matters less than making it once and enforcing it in CI. A formatter
argument settled by a config file costs nothing; one settled per pull request
costs a review every time.

## See also

- [rule-devops-testing](../rule-devops-testing/SKILL.md) - Test configuration
- [rule](../rule/SKILL.md) - Central skill index
