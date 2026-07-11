---
name: pix-toolchain-turborepo
description: >
  Turborepo monorepo orchestration: pipeline configuration, caching,
  remote caching, task dependency graphs, and workspace management.
  Use with pnpm workspaces for fast, parallel monorepo builds.
tags:
  - "turborepo"
  - "turbo"
  - "monorepo"
  - "build-system"
  - "caching"
  - "parallel"
  - "toolchain"
  - "pnpm"
frameworks: [all]
---

# pix-toolchain-turborepo — Turborepo Monorepo Orchestration

## Overview

Turborepo is a high-performance build system for JavaScript/TypeScript monorepos.
It caches task outputs, parallelizes execution, and only rebuilds changed packages.

## turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "inputs": ["src/**", "tsconfig.json"]
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["src/**", "tests/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

## package.json Scripts

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean && rm -rf node_modules"
  }
}
```

## Task Pipeline Semantics

- `^build` — wait for all dependency builds before building this package
- `outputs` — cached artifacts (restored on cache hit)
- `inputs` — file globs that invalidate the cache
- `persistent: true` — long-running dev servers (no caching)

## Remote Caching

```bash
pnpm dlx turbo login       # Authenticate with Vercel
pnpm dlx turbo link        # Link to remote cache
```

## Key Commands

```bash
pnpm turbo run build        # Build all packages in dependency order
pnpm turbo run test         # Test only changed packages (with --filter)
pnpm turbo run lint --filter=@myapp/web  # Lint specific package
pnpm turbo run dev --parallel            # Parallel dev servers
```

## Migration from Lerna/Nx

```bash
pnpm add -D turbo
# Remove lerna.json / nx.json — turbo.json replaces both
# Add turbo.json with your pipeline
pnpm turbo run build
```

## See also

- [pix-toolchain-pnpm](../pix-toolchain-pnpm/SKILL.md) — pnpm workspace setup
- [pix-devops-testing](../pix-devops-testing/SKILL.md) — Testing in CI
- [pix](../pix/SKILL.md) — Central skill index
