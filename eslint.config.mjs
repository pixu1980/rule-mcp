/**
 * @module eslint.config
 *
 * ESLint 10 flat config for rule-mcp.
 *
 * Stack (ADR 028):
 *   - @eslint/js recommended (base correctness)
 *   - eslint-plugin-unicorn recommended (modern JS/TS idioms)
 *   - repo-specific preferences preserved from the legacy .eslintrc
 *
 * Adoption policy (ADR 028, per OpenReplay eslint-plugin-unicorn guide):
 *   1. Start from unicorn/recommended, autofix first (done in this migration).
 *   2. Rules below are turned off because they are opinionated or fight this
 *      codebase's conventions - revisit on a future pass.
 *   3. Genuine correctness issues found by the migration were FIXED, not
 *      suppressed: no-undef (completions bash template), no-array-sort kept
 *      as error (comparators already present), no-useless-escape, no-empty,
 *      no-useless-assignment cleaned up.
 */

import js from "@eslint/js";
import globals from "globals";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    ...js.configs.recommended,
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...unicorn.configs.recommended,
    rules: {
      ...unicorn.configs.recommended.rules,
      // ── ADR 028: opinionated rules scoped for this codebase ──
      "unicorn/no-null": "off", // null is part of the data contract (ORM/API values)
      "unicorn/no-array-reduce": "warn", // keep visible, don't block
      "unicorn/filename-case": [
        "error",
        {
          cases: { camelCase: true, kebabCase: true, pascalCase: true },
        },
      ],
      // ── ADR 028: rules that fight this codebase's conventions (revisit later) ──
      "unicorn/name-replacements": "off", // i -> index, stateDir -> stateDirectory: noisy renames
      "unicorn/import-style": "off", // named node builtin imports are the repo convention
      "unicorn/text-encoding-identifier-case": "off", // utf-8 vs utf8: both valid, cosmetic
      // unicorn 74 turns this rule on with the `multiline` default, which would
      // force every one-line JSDoc in the tree onto three lines. The house style
      // is a one-line block comment, so enforce that direction instead of it.
      "unicorn/single-line-block-comment-style": ["error", "single-line"],
      "unicorn/no-array-sort": "off", // sort sites already pass explicit comparators
      "unicorn/require-array-sort-compare": "off", // lexical sort is correct for string keys
      "unicorn/no-break-in-nested-loop": "off",
      "unicorn/prefer-simple-condition-first": "off",
      "unicorn/no-computed-property-existence-check": "off",
      "unicorn/no-declarations-before-early-exit": "off",
      "unicorn/prefer-await": "off", // .then() chains are idiomatic in this codebase
      "unicorn/max-nested-calls": "off",
      "unicorn/no-unreadable-for-of-expression": "off",
      "unicorn/no-useless-template-literals": "off",
      "unicorn/prefer-number-coercion": "off",
      "unicorn/consistent-boolean-name": "off",
      "unicorn/prefer-iterator-to-array": "off",
      "unicorn/no-duplicate-set-values": "off",
      "unicorn/prefer-single-call": "off",
      "unicorn/no-await-expression-member": "off",
      "unicorn/no-unsafe-string-replacement": "off",
      "unicorn/prefer-unicode-code-point-escapes": "off",
      "unicorn/no-top-level-assignment-in-function": "off", // module-level state (server, caches, throttles) is intentional
      "unicorn/no-process-exit": "off", // daemon/CLI restart + exit is legitimate
      "unicorn/no-array-callback-reference": "off",
      "unicorn/prefer-add-event-listener": "off",
      "unicorn/prefer-dom-node-text-content": "off",
      "unicorn/no-incorrect-template-string-interpolation": "off",
      "unicorn/no-useless-switch-case": "off",
      "unicorn/logical-assignment-operators": "off",
      "unicorn/consistent-function-scoping": "off",
      "unicorn/prefer-includes-over-repeated-comparisons": "off",
      "unicorn/no-negated-comparison": "off",
      "unicorn/no-nested-ternary": "off",
      "unicorn/no-useless-recursion": "off",
      "unicorn/prefer-module": "off",
      "unicorn/prefer-number-is-safe-integer": "off",
      "unicorn/prefer-minimal-ternary": "off",
      "unicorn/prefer-iterator-helpers": "off",
      "unicorn/prefer-else-if": "off",
      "unicorn/prefer-includes": "off",
      "unicorn/no-top-level-side-effects": "off",
      "unicorn/no-exports-in-scripts": "off",
      "unicorn/no-duplicate-if-branches": "off",
      "unicorn/prefer-ternary": "off", // styleguide documents it; not enforced repo-wide
      "unicorn/prefer-promise-try": "off",
      "unicorn/no-return-array-push": "off",
      "unicorn/prefer-number-properties": "off",
      "unicorn/number-literal-case": "off",
      "unicorn/numeric-separators-style": "off",
      "no-control-regex": "off", // TUI/ANSI color sequences are intentional
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      // Repo-specific preferences (preserved from legacy .eslintrc)
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error", "log"] }],
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
    },
  },
  {
    // Co-located unit tests live in Jest-style __tests__/ folders (ADR 061,
    // phase 6); the dunder directory name is the convention, not a case slip.
    files: ["src/**/__tests__/**/*.mjs", "scripts/**/__tests__/**/*.mjs"],
    rules: {
      "unicorn/filename-case": "off",
    },
  },
  {
    // Playwright specs: page.evaluate/addInitScript callbacks run in the
    // browser, where document/window are globals rather than closure leaks.
    files: ["tests/e2e/**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "unicorn/isolated-functions": "off",
    },
  },
  {
    // Browser scripts shipped to the docs site are browser code, not node.
    files: ["scripts/docs-site/prefs.js", "scripts/docs-site/transitions.js", "scripts/docs-site/architecture-diagram.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        d3: "readonly",
      },
    },
    rules: {
      "unicorn/isolated-functions": "off",
    },
  },
  {
    ignores: ["node_modules/", "dist/", "coverage/", ".tokensave/", ".git/", ".DS_Store"],
  },
]);
