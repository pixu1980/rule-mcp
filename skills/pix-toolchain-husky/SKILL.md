---
name: rule-toolchain-husky
description: >-
  Use when setting up Git hooks with Husky. Covers commit hooks, pre-push validation, lint-staged, commitlint, and CI-friendly configuration.
tags:
  - "husky"
  - "git-hooks"
  - "lint-staged"
  - "commitlint"
  - "pre-commit"
  - "toolchain"
  - "quality"
frameworks: [all]
---

# rule-toolchain-husky — Git Hooks & Commit Quality

## Overview

Husky manages Git hooks for your project. Combined with lint-staged and commitlint, it enforces code quality and commit conventions before code reaches CI.

## Installation

```bash
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional
pnpm exec husky init
```

This creates `.husky/` directory with a sample `pre-commit` hook.

## Configuration

### lint-staged

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["biome check --fix", "biome format --write"],
    "*.{json,md,yaml}": ["biome format --write"],
    "*.css": ["biome check --fix"]
  }
}
```

### commitlint

```javascript
// commitlint.config.js
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "docs", "style", "refactor", "perf", "test", "chore", "ci", "revert"]],
    "subject-case": [2, "never", ["start-case", "pascal-case"]],
  },
};
```

### .husky/pre-commit

```bash
#!/usr/bin/env sh
pnpm exec lint-staged
```

### .husky/commit-msg

```bash
#!/usr/bin/env sh
pnpm exec commitlint --edit $1
```

## Alternative: lefthook (faster, Rust-based)

For teams that want faster hook execution, use lefthook instead of Husky:

```yaml
# lefthook.yml
pre-commit:
  commands:
    lint:
      glob: "*.{ts,tsx}"
      run: pnpm biome check --fix {staged_files}
    format:
      glob: "*.{ts,tsx,json,md}"
      run: pnpm biome format --write {staged_files}
commit-msg:
  commands:
    commitlint:
      run: pnpm exec commitlint --edit {1}
```

## Conventional Commits Reference

```
feat: add user authentication
fix: resolve race condition in WebSocket handler
docs: update API reference
refactor: extract validation logic
perf: memoize expensive computation
test: add edge cases for pagination
chore: upgrade dependencies
ci: parallelize test matrix
revert: rollback to v1.2.0
```

## See also

- [rule-toolchain-biome](../rule-toolchain-biome/SKILL.md) — Linting & formatting
- [rule-toolchain-project](../rule-toolchain-project/SKILL.md) — Repo conventions
- [rule](../rule/SKILL.md) — Central skill index
