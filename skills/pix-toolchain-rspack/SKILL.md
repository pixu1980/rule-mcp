---
name: rule-toolchain-rspack
description: >-
  Use when configuring Rspack as build tool. Covers rspack.config.ts, CSS, bundle optimization, code splitting, type checking, and debugging.
tags:
  - "rspack"
  - "build-tool"
  - "bundler"
  - "toolchain"
  - "frontend"
frameworks: [all]
---

# rule-toolchain-rspack - Rspack Build Toolchain

## Overview

Rspack is a Rust-based bundler compatible with webpack 5 APIs and plugin ecosystem.
This skill covers configuration, CSS strategy, bundle optimization, split chunks, type checking, and debugging.

Official docs: http://rspack.rs/llms.txt (v2) - http://v1.rspack.rs/llms.txt (v1)

## Rspack Configuration (rspack.config.ts)

```typescript
import { defineConfig } from "@rspack/cli";

export default defineConfig({
  entry: { main: "./src/index.js" },
  output: {
    path: "./dist",
    filename: "[name].[contenthash].js",
  },
  target: "es2022",
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  devtool: process.env.NODE_ENV === "production" ? false : "source-map",
  experiments: {
    css: true,
  },
  builtins: {
    html: [{ template: "./src/index.html" }],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [/node_modules/],
        loader: "builtin:swc-loader",
        options: {
          sourceMap: true,
          jsc: { parser: { syntax: "ecmascript" } },
        },
      },
    ],
  },
});
```

## CLI

If `@rspack/cli` is installed:

- `rspack dev` - local development server with HMR
- `rspack build` - production build
- `rspack preview` - local production preview

## CSS Strategy

Choose one of three approaches:

| Approach                                | Config                                  | Best For                           |
| --------------------------------------- | --------------------------------------- | ---------------------------------- |
| **Built-in CSS**                        | `experiments: { css: true }`            | Modern projects, no legacy loaders |
| **css-loader + CssExtractRspackPlugin** | `css-loader` + `CssExtractRspackPlugin` | Webpack migration compat           |
| **style-loader**                        | `style-loader`                          | Pure style-in-JS injection         |

### Built-in CSS (recommended for new projects)

```typescript
experiments: {
  css: true,
},
```

This enables native CSS handling without extra loaders. Supports:

- `type: "css"` - global CSS
- `type: "css/auto"` - auto-detect CSS modules via `*.module.css`
- `type: "css/module"` - CSS Modules

Optional enhancements:

- `builtin:lightningcss-loader` - syntax downgrade + vendor prefixing
- `sass-loader` / `less-loader` - Sass/Less preprocessing
- If using Tailwind CSS: use `@tailwindcss/vite` or PostCSS plugin with `postcss-loader`

## Bundle Optimization

- Prefer dynamic `import()` for non-critical code paths
- Keep `target` aligned with real compatibility requirements (default: `"es2022"`)
- Use `RspackCssExtractPlugin` or built-in CSS to avoid FOUC
- Enable `sourcemap: true` for development, `false` for production

## Code Splitting (splitChunks)

### Default production baseline

```typescript
optimization: {
  splitChunks: {
    chunks: "all",
  },
}
```

### Split a large shared chunk

```typescript
optimization: {
  splitChunks: {
    chunks: "all",
    maxSize: 200_000,
  },
}
```

### Named vendor chunk (only when cache reuse across routes is intentional)

```typescript
optimization: {
  splitChunks: {
    cacheGroups: {
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        chunks: "all",
        name: "vendors",
        priority: 10,
      },
    },
  },
}
```

**Warning**: Fixed `name` merges all matching modules into one chunk, increasing coupling between routes. Prefer keeping `name` unset and using `idHint` for filename identity.

### Key rules

1. `splitChunks` only changes chunk topology - it does NOT affect JS execution order or tree shaking
2. `maxSize` is safer than broad manual vendor buckets for reducing chunk size
3. Keep default cache groups (`default`, `defaultVendors`) unless there's a concrete reason to replace them
4. `chunks: "all"` deduplicates across both initial and async chunks without loading unnecessary modules

## Type Checking

- Use `ts-checker-rspack-plugin` for integrated dev/build type checks
- Or run `tsc --noEmit` / `vue-tsc --noEmit` as an explicit script step

## Asset Management

- Import source-managed assets from project source directories, not from `public`
- Reference `public` files by absolute URL path
- Prefer asset modules (`asset`, `asset/resource`, `asset/inline`, `asset/source`) over legacy loaders

## Profiling and Debugging

### Quick performance trace

```bash
RSPACK_PROFILE=TRACE RSPACK_TRACE_LAYER=logger RSPACK_TRACE_OUTPUT=./trace.json rspack build
```

### Crash debugging (Segmentation fault / deadlock)

1. Install LLDB: `xcode-select --install` (macOS) or `apt-get install lldb` (Linux)
2. Replace production packages with debug versions via `@rspack-debug/*` series
3. Run the automatic setup script:
   ```bash
   node node_modules/@rspack-debug/core/scripts/setup_debug_deps.cjs
   ```
4. Rebuild with `rspack build` and capture backtrace

### Slow build diagnosis

1. Capture a trace: `RSPACK_PROFILE=TRACE RSPACK_TRACE_LAYER=logger RSPACK_TRACE_OUTPUT=./trace.json rspack build`
2. Run analysis: `node node_modules/@rspack/tracing/scripts/analyze_trace.js trace.json`
3. Map slow spans to actionable fixes using the official bottleneck reference

## Migration: Rspack 1.x -> v2

1. Read the official migration guide: https://rspack.rs/guide/migration/rspack_1.x
2. Upgrade packages: `@rspack/core`, `@rspack/cli`, `@rspack/dev-server`, `@rspack/plugin-react-refresh`
3. Remove deprecated options
4. Run build and test commands

## Security

- Do not publish `.map` files to public servers/CDNs when production source maps are enabled

## See also

- [rule-toolchain-vite](../rule-toolchain-vite/SKILL.md) - Vite build tool (alternative bundler)
- [rule-toolchain-parcel](../rule-toolchain-parcel/SKILL.md) - Parcel zero-config bundler
- [rule-toolchain-pnpm](../rule-toolchain-pnpm/SKILL.md) - Package management
- [rule-styleguide-typescript](../rule-styleguide-typescript/COMPILER.md) - TypeScript config
- [rule](../rule/SKILL.md) - Central skill index
