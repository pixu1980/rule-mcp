---
name: pix-toolchain-eslint
description: >
  ESLint 9+ flat config: rule sets for TypeScript, React, and Node.js,
  plugin integration, custom rules, and CI integration.
  Use when Biome's rule set is insufficient and you need full plugin ecosystem.
tags:
  - "eslint"
  - "linter"
  - "static-analysis"
  - "javascript"
  - "typescript"
  - "toolchain"
  - "quality"
frameworks: [all]
---

# pix-toolchain-eslint — ESLint Configuration

## Flat Config (ESLint 9+)

```javascript
// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ignores: ["dist/", "node_modules/", "*.config.*"],
  },
];
```

## Legacy Config (.eslintrc) — Not recommended for new projects

```json
{
  "env": { "browser": true, "es2024": true, "node": true },
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "ecmaVersion": "latest", "sourceType": "module" },
  "rules": {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"]
  }
}
```

## Migration from ESLint to Biome

```bash
# If migrating: remove ESLint + plugins, add Biome
pnpm remove eslint @typescript-eslint/* eslint-plugin-*
pnpm add -D @biomejs/biome
pnpm biome migrate eslint --include-prettier
```

## See also

- [pix-toolchain-biome](../pix-toolchain-biome/SKILL.md) — Alternative: Biome linter (faster, unified)
- [pix](../pix/SKILL.md) — Central skill index
