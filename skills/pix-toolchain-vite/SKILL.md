---
name: rule-toolchain-vite
description: >-
  Use when configuring Vite as build tool. Covers vite.config.ts, environment variables, build optimization, and production deployment.
tags:
  - "vite"
  - "build-tool"
  - "bundler"
  - "toolchain"
  - "frontend"
frameworks: [all]
---

# rule-toolchain-vite - Vite Build Toolchain

## Overview

Vite is the build tool and development server for modern frontend projects.
This skill covers configuration, optimization, testing setup, and production builds.

## Vite Configuration (vite.config.ts)

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
```

## Vite Test Configuration (vitest.config.ts)

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
});
```

## Vite Environment Variables

- All public env vars must be prefixed with `VITE_`
- Type-safe env access via `zod` validation
- Example `.env.example`:

```
VITE_API_BASE_URL=http://localhost:3000
```

## Vite Build Optimization

- Enable `sourcemap: true` for development, `false` for production
- Use `rollupOptions.output.manualChunks` for code splitting
- Set `build.target: "es2022"` for modern browsers
- Use `build.minify: "esbuild"` for production (faster than terser)

## Vite Test Setup

- `tests/setup.ts` must import `@testing-library/jest-dom` matchers
- Use `vitest` as test runner (not Jest)
- Coverage thresholds: 60/50/60/60 (statements/branches/functions/lines)

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
