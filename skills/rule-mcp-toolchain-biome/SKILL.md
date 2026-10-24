---
name: rule-mcp-toolchain-biome
description: >-
  Use when configuring Biome linter and formatter. Covers zero-config setup, migration from ESLint + Prettier, rule customization, and CI integration.
tags:
  - "biome"
  - "linter"
  - "formatter"
  - "toolchain"
  - "static-analysis"
  - "dx"
frameworks: [all]
---

# rule-mcp-toolchain-biome - Biome Linter & Formatter

## Overview

Biome is a unified linter and formatter for JavaScript, TypeScript, and JSON/JSX.
It replaces ESLint + Prettier with a single, fast binary - written in Rust.

## Configuration (biome.json)

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noUselessConstructor": "error"
      },
      "correctness": {
        "noUnusedVariables": "error"
      },
      "style": {
        "noNonNullAssertion": "warn",
        "useShorthandAssign": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 120,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  }
}
```

## Migration from ESLint + Prettier

```bash
pnpm remove eslint prettier eslint-config-*
pnpm add -D @biomejs/biome
pnpm biome migrate
# Follow prompts to convert .eslintrc + .prettierrc → biome.json
```

## CLI Commands

```bash
pnpm biome check src/          # Lint + format check
pnpm biome check --fix src/    # Auto-fix
pnpm biome format --write src/ # Format only
pnpm biome ci src/              # CI mode (fails on issues)
```

## CI Integration

```yaml
lint:
  script:
    - pnpm install
    - pnpm biome ci src/
```

## See also

- [rule-mcp-toolchain-vite](../rule-mcp-toolchain-vite/SKILL.md) - Vite build tool
- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index
