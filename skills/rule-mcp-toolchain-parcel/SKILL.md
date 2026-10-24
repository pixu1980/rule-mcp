---
name: rule-mcp-toolchain-parcel
description: >-
  Use when building applications with Parcel 2+ bundler. Covers zero-config setup, entry points, code splitting, image optimization, and production builds.
tags:
  - "parcel"
  - "bundler"
  - "zero-config"
  - "build-tool"
  - "toolchain"
  - "frontend"
frameworks: [all]
---

# rule-mcp-toolchain-parcel - Parcel Bundler

## Overview

Parcel is a zero-configuration web application bundler. It requires no configuration file to start - it just works. Built-in support for TypeScript, JSX, CSS modules, images, and more.

## Quick Start

```bash
pnpm add -D parcel
```

Entry point convention: `src/index.html` is the default entry. Parcel automatically resolves all assets from the HTML file.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

## package.json Scripts

```json
{
  "scripts": {
    "dev": "parcel src/index.html --port 3000",
    "build": "parcel build src/index.html",
    "preview": "parcel build src/index.html && npx serve dist"
  }
}
```

## Configuration (parcelrc)

Parcel supports `.parcelrc` for extending the default pipeline, but 95% of projects need zero config. Only create `.parcelrc` when adding custom transformers or optimizers.

```json
{
  "extends": "@parcel/config-default",
  "transformers": {
    "*.svg": ["@parcel/transformer-svg-react"]
  }
}
```

## Key Features

- **Zero config**: no config file needed for most projects
- **Fast builds**: multicore compilation, file system cache
- **Automatic transformation**: TypeScript, JSX, CSS modules, PostCSS, images
- **Code splitting**: automatic with dynamic `import()`
- **Hot Module Replacement**: built-in dev server with HMR
- **Tree shaking**: production builds remove dead code

## Environment Variables

Parcel automatically injects env vars at build time. Only `NODE_ENV` is available by default.

For custom env vars, use a `.env` file (loaded automatically) or pass them explicitly:

```bash
MY_API_URL=https://api.example.com parcel build src/index.html
```

Access in code:

```javascript
process.env.MY_API_URL;
```

## Production Build

```bash
parcel build src/index.html
```

Output goes to `dist/`. Optimizations applied automatically:

- Minification (esbuild)
- Tree shaking
- Code splitting
- Image optimization
- Content hashing in filenames

## Migrating from Webpack/Vite

| Feature     | Webpack                      | Vite           | Parcel              |
| ----------- | ---------------------------- | -------------- | ------------------- |
| Config file | webpack.config.js            | vite.config.ts | None needed         |
| Dev server  | webpack-dev-server           | vite           | Built-in            |
| HMR         | webpack.HotModuleReplacement | Built-in       | Built-in            |
| TypeScript  | ts-loader/tsc                | esbuild        | Built-in            |
| CSS modules | css-loader                   | *.module.css   | *.module.css        |
| Build speed | Slow (single-core)           | Fast (esbuild) | Fastest (multicore) |

## See also

- [rule-mcp-toolchain-vite](../rule-mcp-toolchain-vite/SKILL.md) - Vite build tool
- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index
