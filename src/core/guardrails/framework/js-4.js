// Auto-split from src/core/guardrails/framework.js - see ./framework/index.js

export const JS_GUARDRAILS_PART4 = [
  {
    id: "js-prefer-set-has",
    label: "Set.has() over Array.includes() inside loops",
    description:
      "Array.prototype.includes() inside a loop or iteration callback (for/filter/map/some/every/find) is O(n) per call - O(n²) total. Build a Set once and use Set.prototype.has() for O(1) membership.",
    check: (code) => {
      const violations = [];
      const arrayNames = [...code.matchAll(/const\s+(\w+)\s*=\s*\[/g)].map((m) => m[1]);

      if (arrayNames.length === 0) {
        return { pass: true, note: "No array literals found, skipping" };
      }

      const lines = code.split("\n");

      for (const line of lines) {
        const isInIteration =
          /\bfor\s*\(|\.filter\s*\(|\.map\s*\(|\.some\s*\(|\.every\s*\(|\.find\s*\(|\.findIndex\s*\(/.test(line);

        if (!isInIteration) {
          continue;
        }

        for (const name of arrayNames) {
          if (new RegExp(String.raw`\b${name}\.includes\(`).test(line)) {
            violations.push(line.trim());
            break;
          }
        }
      }
      // Multi-line callbacks: .filter(
      //   x => allowed.includes(x)
      for (const name of arrayNames) {
        const multi = code.match(
          new RegExp(String.raw`\.(?:filter|map|some|every|find)\s*\([\s\S]{0,200}?\b${name}\.includes\(`, "g"),
        );

        if (multi) {
          violations.push(...multi.map((v) => v.replaceAll("\n", " ").trim().slice(0, 80)));
        }
      }

      if (violations.length === 0) {
        return { pass: true, note: "No includes-in-loop lookups found" };
      }

      return {
        pass: false,
        failCount: violations.length,
        detail: [...new Set(violations)].slice(0, 5),
        suggestion:
          "Build a Set once outside the loop and use set.has(x): const allowed = new Set([...]); allowed.has(scope).",
      };
    },
  },
  {
    id: "js-node-protocol",
    label: "node: protocol for Node builtins",
    description:
      "Node builtin imports must use the explicit node: prefix (import fs from 'node:fs'). The bare form can be shadowed by a same-named npm package.",
    check: (code) => {
      const builtins = [
        "fs",
        "path",
        "util",
        "url",
        "os",
        "http",
        "https",
        "crypto",
        "stream",
        "events",
        "buffer",
        "child_process",
        "assert",
        "querystring",
        "readline",
        "worker_threads",
        "perf_hooks",
        "zlib",
        "dns",
        "net",
        "tls",
        "timers",
        "string_decoder",
        "vm",
        "module",
        "process",
        "async_hooks",
        "cluster",
        "constants",
        "domain",
        "inspector",
        "punycode",
        "repl",
        "sys",
        "trace_events",
        "tty",
        "v8",
        "wasi",
        "test",
      ];
      const re = new RegExp(String.raw`from\s*['"](?:${builtins.join("|")})(?:/[\w.-]*)?['"]`, "g");
      const violations = code.match(re) || [];

      if (violations.length === 0) {
        return { pass: true, note: "No bare node builtin imports found" };
      }

      return {
        pass: false,
        failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion: "Use the node: prefix: import fs from 'node:fs'; import { join } from 'node:path'.",
      };
    },
  },
  {
    id: "js-prefer-replace-all",
    label: "replaceAll over replace with /g regex",
    description: "str.replace(/x/g, y) with a global regex literal should be str.replaceAll('x', y).",
    check: (code) => {
      const violations = code.match(/\.replace\s*\(\s*\/[^/]*\/g\s*[,)]/g) || [];

      if (violations.length === 0) {
        return { pass: true, note: "No global-regex replace found" };
      }

      return {
        pass: false,
        failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion: "Use String.prototype.replaceAll with a string pattern: str.replaceAll('-', ' ').",
      };
    },
  },
  {
    id: "js-no-array-for-each",
    label: "for...of over Array.forEach()",
    description:
      "Prefer for...of loops over Array.prototype.forEach: better type narrowing, direct await, and break/continue support.",
    check: (code) => {
      const violations = code.match(/\b\w+\.forEach\s*\(/g) || [];

      if (violations.length === 0) {
        return { pass: true, note: "No .forEach() calls found" };
      }

      return {
        pass: false,
        failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion: "Rewrite .forEach() as a for...of loop: for (const item of items) { ... }.",
      };
    },
  },];
