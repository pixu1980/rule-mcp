---
name: rule-toolchain-eslint
description: >-
  Use when configuring ESLint for JavaScript/TypeScript projects. Covers ESLint 10 flat config, eslint-plugin-unicorn presets and high-value rules, type-aware linting with typescript-eslint, incremental adoption, and CI setup.
tags:
  - "eslint"
  - "linter"
  - "static-analysis"
  - "unicorn"
  - "javascript"
  - "typescript"
  - "toolchain"
  - "quality"
frameworks: [all]
---

# rule-toolchain-eslint - ESLint Configuration

## Flat Config is the only format

ESLint 10 removed the legacy `.eslintrc` system entirely: **flat config** (`eslint.config.mjs`) and **ESM** are the only supported formats. Any tutorial showing `.eslintrc.json` + `extends: "plugin:unicorn/recommended"` is out of date. Requirements: ESLint >= 10.4 and a current Node.js runtime (Node 20.19+, 22.13+, or 24+).

Scope Unicorn's JS rules to their own config object with `files` once you lint non-JavaScript languages in the same config.

## Minimal config with eslint-plugin-unicorn

```javascript
// eslint.config.mjs
import unicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    extends: [unicorn.configs.recommended],
    rules: {
      // overrides go here
    },
  },
]);
```

## Full TypeScript + React setup (recommended default)

Unicorn and typescript-eslint are **complementary and designed to run together**: Unicorn enforces modern idioms; the type-checked config catches bugs only the type system can see. Enable both as separate config objects.

```javascript
// eslint.config.mjs
import js from "@eslint/js";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked, // type-aware linting
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    extends: [unicorn.configs.recommended],
  },
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
]);
```

## eslint-plugin-unicorn

300+ rules, mostly **autofixable**, releases roughly monthly. `eslint-plugin-unicorn` v69+ requires ESLint >= 10.4, flat config, and ESM.

```bash
pnpm add -D eslint eslint-plugin-unicorn
```

### Presets

The plugin ships three presets - pick a starting point, don't enable rules one by one.

| Preset                          | Contents                                                                          | Use when                                                   |
| ------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `unicorn.configs.recommended`   | Curated default: correctness + opinionated rules                                  | Default starting point                                     |
| `unicorn.configs.unopinionated` | recommended minus the opinionated rules (`no-null`, `prevent-abbreviations`, ...) | Existing codebase where opinionated rules fight your style |
| `unicorn.configs.all`           | Every non-deprecated rule                                                         | Maximum coverage                                           |

### Highest-value rules (in recommended, autofixable)

These prevent a performance, correctness, or readability problem rather than enforcing taste.

| Rule                                          | Problem it solves                                                    | ❌ Before                                            | ✅ After                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `prefer-set-has`                              | O(n²) membership scans inside loops                                  | `allowed.includes(scope)` in a `.filter()`           | `new Set([...])` + `allowed.has(scope)` - O(1) per lookup                                 |
| `no-array-for-each` _(removed in unicorn 70)_ | `.forEach()` blocks `break`/`continue`/`await`, weakens TS narrowing | `users.forEach((u) => sendEmail(u))`                 | `for (const u of users) { sendEmail(u); }`                                                |
| `prefer-node-protocol`                        | Bare builtin imports can be shadowed by npm packages                 | `import fs from 'fs'`                                | `import fs from 'node:fs'`                                                                |
| `throw-new-error`                             | `throw Error()` works but is inconsistent                            | `throw Error('boom')`                                | `throw new Error('boom')`                                                                 |
| `prefer-string-replace-all`                   | Regex-with-`/g` is opaque vs a plain string pattern                  | `str.replace(/-/g, ' ')`                             | `str.replaceAll('-', ' ')`                                                                |
| `prefer-array-flat-map`                       | `map().flat()` allocates an intermediate array                       | `rows.map(r => r.cells).flat()`                      | `rows.flatMap(r => r.cells)`                                                              |
| `new-for-builtins`                            | Calling builtin constructors as functions is a bug-prone idiom       | `const cache = Map()`                                | `const cache = new Map()` (exceptions: `String`, `Number`, `Boolean`, `Symbol`, `BigInt`) |
| `better-regex`                                | Regexes can be shorter and consistent                                | `/[0-9]/`                                            | `/\d/`                                                                                    |
| `prefer-ternary`                              | Simple if/else that returns/assigns forces `let`                     | `if (ok) { return 'pass'; } else { return 'fail'; }` | `return ok ? 'pass' : 'fail';`                                                            |

### Controversial rules - tune, don't blindly accept

All four are enabled in `recommended` but enforce preference rather than correctness. The verdict column is the keep/warn/disable call for a typical codebase.

| Rule                    | Verdict                   | Reason                                                                                                                |
| ----------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `prevent-abbreviations` | `warn` or scope           | Renames `e` -> `error`, `req` -> `request`, `props` -> `properties`; fights names your framework and team already use |
| `no-null`               | Disable if you use `null` | Unicorn prefers `undefined`, but `null` is legitimate when an ORM or API returns it                                   |
| `no-array-reduce`       | Keep or `warn`            | Disallows `Array#reduce()`; reasonable for readability, but `reduce` is fine for many teams                           |
| `filename-case`         | Scope ignores             | Clashes with framework-mandated filenames; keep it but exclude the exceptions                                         |

The `unopinionated` preset leaves these off by default - the built-in middle ground.

### Example overrides

```javascript
{
  files: ['**/*.{js,ts,tsx}'],
  extends: [unicorn.configs.recommended],
  rules: {
    'unicorn/no-null': 'off',
    'unicorn/prevent-abbreviations': 'warn',
    'unicorn/filename-case': [
      'error',
      {
        cases: { pascalCase: true, camelCase: true },
        ignore: ['next-env\\.d\\.ts', 'vite\\.config\\.ts'],
      },
    ],
  },
}
```

## Incremental adoption on an existing codebase

Roll out in stages so the first run doesn't bury you in errors:

1. **Start from a preset.** Extend `unicorn/recommended`, or `unicorn/unopinionated` if the opinionated rules are too noisy.
2. **Autofix first.** Run `pnpm eslint . --fix`. Most rules are autofixable, so a large fraction of violations disappear as one mechanical diff.
3. **Downgrade noisy rules to `warn`.** Anything firing in volume that isn't a correctness issue - `prevent-abbreviations` is the usual offender - goes to `warn` so it doesn't block CI while you migrate.
4. **Scope ignores instead of disabling outright.** Use the `ignore` option (as with `filename-case`) and `files` globs to carve out exceptions.
5. **Layer in type-aware linting.** Add `@typescript-eslint/recommended-type-checked` alongside Unicorn.
6. **Treat your config as a living document.** Releases land roughly monthly - re-check the rules table for new rules and renames, and revisit which `warn` rules are ready to promote to `error`.

## Migrating a legacy eslintrc-style plugin

If a plugin ships only an eslintrc-style config, wrap it with `FlatCompat` from `@eslint/eslintrc` (use the latest `@eslint/eslintrc` on ESLint 10.x).

## Legacy Config (.eslintrc) - deprecated, removed in ESLint 10

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

This format only works on ESLint <= 9. New projects MUST use flat config.

## Migration from ESLint to Biome

```bash
# If migrating: remove ESLint + plugins, add Biome
pnpm remove eslint @typescript-eslint/* eslint-plugin-*
pnpm add -D @biomejs/biome
pnpm biome migrate eslint --include-prettier
```

## See also

- [rule-toolchain-biome](../rule-toolchain-biome/SKILL.md) - Alternative: Biome linter (faster, unified)
- [rule-toolchain-typescript](../rule-toolchain-typescript/SKILL.md) - tsconfig, strict mode, type discipline
- [rule-styleguide-javascript](../rule-styleguide-javascript/SKILL.md) - Modern JS/TS idioms these rules enforce
- [rule](../rule/SKILL.md) - Central skill index
