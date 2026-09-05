// Auto-split from src/core/guardrail-defs.js - see ./index.js
import { FILE_TREE_GUARDRAILS } from "./file-tree.js";

export const REACT_GUARDRAILS = [
  {
    id: "react-no-classname",
    label: "No className, use data-part",
    description: "React components must use data-part instead of className for styling hooks.",
    check: (code) => {
      const cn = code.match(/className=/g);

      return {
        pass: !cn,
        failCount: cn?.length || 0,
        detail: cn || [],
        suggestion:
          'Replace className="..." with data-part="..." attributes. CSS uses [data-part="..."] selectors instead of .class selectors.',
      };
    },
  },
  {
    id: "react-hooks-rules",
    label: "React Hooks rules",
    description: "Hooks must be called at top level, not inside conditions, loops, or callbacks.",
    check: (code) => {
      const hooks = code.match(
        /\b(useState|useEffect|useMemo|useCallback|useRef|useReducer|useContext|useImperativeHandle|useLayoutEffect|useDebugValue|useTransition|useDeferredValue|useId|useSyncExternalStore|useInsertionEffect)\(/g,
      );

      if (!hooks) {
        return { pass: true, note: "No hooks found" };
      }

      const conditionalHooks = code.match(/if\s*\(.*\)\s*\{[^}]*\b(useState|useEffect|useMemo)\(/g);

      return {
        pass: !conditionalHooks,
        failCount: conditionalHooks?.length || 0,
        suggestion: "Move hooks to top level of the component function.",
      };
    },
  },
];

export const VUE_GUARDRAILS = [
  {
    id: "vue-no-class-binding",
    label: "No :class or v-bind:class",
    description: "Vue templates must use data-part instead of :class bindings.",
    check: (code) => {
      const classBindings = code.match(/:class\s*=|v-bind:class\s*=/g);

      return {
        pass: !classBindings,
        failCount: classBindings?.length || 0,
        suggestion: 'Replace :class with :data-part="..." bindings.',
      };
    },
  },
];

export const ANGULAR_GUARDRAILS = [
  {
    id: "angular-no-ngclass",
    label: "No ngClass directive",
    description: "Angular templates must use [attr.data-part] instead of [ngClass].",
    check: (code) => {
      const n = code.match(/\[ngClass\]/g);

      return { pass: !n, failCount: n?.length || 0, suggestion: 'Replace [ngClass] with [attr.data-part]="...".' };
    },
  },
];

export const SVELTE_GUARDRAILS = [
  {
    id: "svelte-no-class-directive",
    label: "No class: directives",
    description: "Svelte should use data-part attributes, not class:name directives.",
    check: (code) => {
      const n = code.match(/class:\w+/g);

      return {
        pass: !n,
        failCount: n?.length || 0,
        suggestion: 'Replace class:name with data-part="..." or data-state-* attributes.',
      };
    },
  },
];

// ─── Vanilla-Reactive guardrails (rule-frontend-vanilla-reactive) ───

// ── Generic JS Styleguard Rules ─────────────────────────────────────
// These apply to ALL JavaScript/TypeScript code, regardless of framework.

export const JS_GUARDRAILS = [
  {
    id: "js-if-braces",
    label: "if/else always use braces",
    description: "Every if, else, else if must use {} braces. Single-line if without braces is forbidden.",
    check: (code) => {
      // Line-oriented on purpose. Balancing parentheses means counting the
      // ones inside regex literals too, and a condition like
      // `/\([^)]*\)/.test(line)` then reads as a braceless if (finding F-A1).
      const offenders = [];
      const lines = code.split("\n");
      for (const [index, raw] of lines.entries()) {
        const line = raw.trim();
        if (!/\bif\s*\(/.test(line) || line.startsWith("*") || line.startsWith("//")) {
          continue;
        }
        if (line.endsWith("{") || /[&|(,+]$/.test(line)) {
          continue;
        }
        if (line.endsWith(")")) {
          const next = lines.slice(index + 1).find((candidate) => candidate.trim() !== "");
          if (next?.trim().startsWith("{")) {
            continue;
          }
        }
        offenders.push(line);
      }
      if (offenders.length > 0) {
        return {
          pass: false,
          failCount: offenders.length,
          detail: offenders.slice(0, 5),
          suggestion: "Add braces: if (condition) { ... }",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "js-no-inline-blocks",
    label: "Blocks must be multi-line (no inline { code })",
    description:
      "All { } blocks (if/for/while/arrow functions/promises) must span multiple lines. No inline { doThing(); }.",
    check: (code) => {
      // Match if/for/while/try/catch with { code } on the SAME line.
      //
      // Two things this pattern has to get right, and it got both wrong. The
      // leading \b is what stops `for` matching inside `platform`, `before` or
      // `information`; without it any such word followed anywhere by a braced
      // group was a violation, and JSDoc is full of `{HTMLElement}`. And the
      // block body excludes newlines, because a block that spans lines is the
      // thing this rule asks for rather than the thing it forbids.
      // A destructuring pattern in a header (`for (const { a, b } of xs)`) is
      // not an inline block: the block, when there is one, opens AFTER the
      // header's closing parenthesis (finding F-A1).
      const matches = code.match(
        /\b(?:if|for|while|switch|catch)\b\s*\([^\n]*\)\s*\{[^{}\n]+\}|\b(?:try|else)\b\s*\{[^{}\n]+\}|=>\s*\{[^{}\n]+\}/g,
      );

      if (matches && matches.length > 0) {
        const filtered = matches.filter((m) => m !== "=> {}");

        if (filtered.length > 0) {
          return {
            pass: false,
            failCount: filtered.length,
            detail: filtered.slice(0, 5),
            suggestion: "Split block across multiple lines.",
          };
        }
      }

      return { pass: true };
    },
  },
  {
    id: "js-no-blank-lines-in-blocks",
    label: "No blank line immediately after { or before }",
    description: "Blocks must not have blank lines at start or end: {\n\ncode → forbidden. code\n\n} → forbidden.",
    check: (code) => {
      const issues = [];
      const lines = code.split("\n");

      for (let index = 0; index < lines.length; index++) {
        if (/\{\s*$/.test(lines[index]) && index + 1 < lines.length && /^\s*$/.test(lines[index + 1])) {
          issues.push(`Line ${index + 1}: blank line after {`);
        }

        if (/^\s*\}\s*$/.test(lines[index]) && index > 0 && /^\s*$/.test(lines[index - 1])) {
          issues.push(`Line ${index + 1}: blank line before }`);
        }
      }

      if (issues.length > 0) {
        return {
          pass: false,
          failCount: issues.length,
          detail: issues.slice(0, 5),
          suggestion: "Remove blank lines at block start/end.",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "js-single-line-method",
    label: "Class method bodies must be multi-line",
    description: "Every method body must span multiple lines. No method() { stmt; } on one line.",
    check: (code) => {
      // Judged per line: a 2-line owner over a single statement must not read
      // as a one-liner once the surrounding newlines are trimmed (F-A1), and
      // `\w+\s*\(` stays linear on a long generated line (F-S1).
      const filtered = [];
      const scannable = code.split("\n").filter((l) => l.length > 0 && l.length <= 2000);

      for (const line of scannable) {
        for (const m of line.match(/(?:constructor|\w+)\s*\([^)]*\)\s*\{[^}]+\}/g) ?? []) {
          const inner = m
            .replace(/^\w+\s*\([^)]*\)\s*\{/, "")
            .replace(/\}$/, "")
            .trim();

          if (inner.length > 0) {
            filtered.push(m);
          }
        }
      }

      if (filtered.length > 0) {
        return {
          pass: false,
          failCount: filtered.length,
          detail: filtered.slice(0, 5),
          suggestion: "Split method body across multiple lines.",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "js-for-loop-braces",
    label: "for loops must have braces and be multi-line",
    description: "Every for/for...of/for...in body must use {} and span multiple lines. No for (...) stmt;",
    check: (code) => {
      // Judged per line: a two-line for over a single statement must not read
      // as a one-liner once the surrounding newlines are trimmed (F-A1).
      const filtered = [];
      const scannable = code.split("\n").filter((l) => l.length > 0 && l.length <= 2000);

      for (const line of scannable) {
        for (const m of line.match(/for\s*\([^)]*\)\s*\{[^}]+\}/g) ?? []) {
          const inner = m
            .replace(/^for\s*\([^)]*\)\s*\{/, "")
            .replace(/\}$/, "")
            .trim();

          if (inner.length > 0) {
            filtered.push(m);
          }
        }
      }

      if (filtered.length > 0) {
        return {
          pass: false,
          failCount: filtered.length,
          detail: filtered.slice(0, 5),
          suggestion: "Place for loop body on separate lines.",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "js-blank-line-before-return",
    label: "Blank line before return statements",
    description: "Every return statement must have a blank line before it (unless first in block).",
    check: (code) => {
      const issues = [];
      const lines = code.split("\n");

      for (let index = 1; index < lines.length; index++) {
        const line = lines[index].trim();
        const previous = lines[index - 1].trim();

        if (
          (line.startsWith("return ") || line === "return;") &&
          previous !== "" &&
          !previous.endsWith("{") &&
          !previous.endsWith("(") &&
          !previous.startsWith("//") &&
          !previous.startsWith("/*")
        ) {
          issues.push(`Line ${index + 1}: no blank line before return`);
        }
      }

      if (issues.length > 0) {
        return {
          pass: false,
          failCount: issues.length,
          detail: issues.slice(0, 5),
          suggestion: "Add a blank line before each return statement.",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "js-blank-line-between-methods",
    label: "Blank line between class methods",
    description: "Every pair of class methods must have a blank line between them.",
    check: (code) => {
      const issues = [];

      if (!code.includes("class ")) {
        return { pass: true, note: "Not a class - skipping" };
      }

      const lines = code.split("\n");

      for (let index = 0; index < lines.length - 1; index++) {
        // Check if line is a closing brace of a method, followed by another method
        if (/^\s*\}\s*$/.test(lines[index]) && /^\s*(\w+|static|get|set)\s/.test(lines[index + 1])) {
          issues.push(`Line ${index + 1}: no blank line before method`);
        }
      }

      if (issues.length > 0) {
        return {
          pass: false,
          failCount: issues.length,
          detail: issues.slice(0, 5),
          suggestion: "Add a blank line between class methods.",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "js-blank-lines-blocks",
    label: "Multi-line blocks have blank lines above/below",
    description:
      "if/for/while/switch/try/return/promise/method chains spanning >1 line must have a blank line above and below.",
    check: (code) => {
      const issues = [];
      const lines = code.split("\n");

      for (let index = 1; index < lines.length - 1; index++) {
        const line = lines[index];
        const previous = lines[index - 1];
        const next = lines[index + 1];
        // Check if this line starts a block that spans multiple lines
        if (
          /^\s*(if|for|while|switch|try)\s*\(/.test(line) ||
          /^\.(then|catch|finally|map|filter|reduce|forEach)\s*\(/.test(line)
        ) {
          // A line that opens or continues a block (`{`, `} else {`,
          // `} finally {`, `} catch (e) {`) is scaffolding, not a statement
          // that needs separating from the block below it (finding F-A1).
          const previousTrimmed = previous.trim();
          const isScaffolding =
            previousTrimmed === "" ||
            previousTrimmed.endsWith("{") ||
            previousTrimmed.startsWith("}") ||
            /^\s*(\/\/|\/\*|\*|if|for|while|switch|try|case|default)/.test(previous);

          if (!isScaffolding) {
            issues.push(`Line ${index + 1}: no blank line before block`);
          }
        }
        // Check closing brace followed by code
        if (/^\s*\}\s*$/.test(line) && !/catch|else|finally/.test(next)) {
          // `:` `,` `.` and `]` after a closing brace continue an expression
          // (an object literal in a ternary, an argument list, a chain) - the
          // brace closed a value, not a block, and a blank line there splits
          // the expression instead of separating two of them.
          const hasNextCode = next.trim() && !/^\s*(\/\/|\/\*|\*|\}|\)|\]|[:,.]|case|default)/.test(next);

          if (hasNextCode && next.trim() !== "{" && index > 2) {
            // Check this is not the last block in parent
            const afterBlock = lines
              .slice(index + 1)
              .join("\n")
              .trim();

            if (afterBlock && !afterBlock.startsWith("}") && !afterBlock.startsWith(")")) {
              issues.push(`Line ${index + 1}: no blank line after closing brace`);
            }
          }
        }
      }

      if (issues.length > 0) {
        return {
          pass: false,
          failCount: issues.length,
          detail: issues.slice(0, 5),
          suggestion: "Add blank lines around multi-line blocks (see styleguide).",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "js-const-top",
    label: "Variable declarations grouped at top",
    description:
      "const/let/var declarations should be grouped at the top of their scope, separated from code by a blank line.",
    check: (code) => {
      const lines = code.split("\n");
      let lastDeclaration = -1;
      // A declaration can span lines (an arrow function, an object literal, a
      // template string). Its continuation lines belong to the declaration, so
      // the separator this rule asks for goes after the statement ENDS - not
      // after its first line, which used to flag every multi-line const in the
      // repository (finding F-A1).
      for (let index = 0; index < lines.length; index++) {
        if (!/^(const|let|var)\s/.test(lines[index].trim())) {
          continue;
        }

        let depth = 0;
        let end = index;

        for (; end < lines.length; end++) {
          for (const char of lines[end]) {
            if ("({[".includes(char)) {
              depth += 1;
            } else if (")}]".includes(char)) {
              depth -= 1;
            }
          }
          // A statement ends at its semicolon. Bracket balance alone stops at
          // the first line of a multi-line ternary, which has no brackets at
          // all and would ask for a blank line inside the expression.
          if (depth <= 0 && lines[end].trimEnd().endsWith(";")) {
            break;
          }
        }

        lastDeclaration = Math.min(end, lines.length - 1);
        index = lastDeclaration;
      }

      if (lastDeclaration > 0 && lastDeclaration < lines.length - 1) {
        const nextLine = lines[lastDeclaration + 1].trim();

        if (nextLine && !/^(\/\/|\/\*|\*|export|import|'use strict'|}|case|default)/.test(nextLine)) {
          return {
            pass: false,
            failCount: 1,
            detail: [`Line ${lastDeclaration + 1}: no blank line after declarations`],
            suggestion: "Add a blank line after the last const/let/var declaration.",
          };
        }
      }

      return { pass: true };
    },
  },
  {
    id: "js-throw-new-error",
    label: "throw requires new for error constructors",
    description:
      "Errors must be created with new: throw new Error('...'). Calling error constructors as functions (throw Error('...')) is forbidden.",
    check: (code) => {
      const violations =
        code.match(
          /throw\s+(?!new\s+)(?:Error|TypeError|RangeError|SyntaxError|ReferenceError|EvalError|URIError)\s*\(/g,
        ) || [];

      if (violations.length === 0) {
        return { pass: true, note: "No bare error constructor throws found" };
      }

      return {
        pass: false,
        failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion: "Use new when throwing errors: throw new Error('message').",
      };
    },
  },
  {
    id: "js-new-for-builtins",
    label: "new required for Map/Set/Date/Array/WeakMap/WeakSet",
    description:
      "Builtin constructors Map, Set, Date, Array, WeakMap, WeakSet must be called with new. Calling them as functions (const m = Map()) is forbidden. String, Number, Boolean, Symbol, BigInt are exempt.",
    check: (code) => {
      const violations = [];

      for (const name of ["Map", "Set", "Date", "Array", "WeakMap", "WeakSet"]) {
        const re = new RegExp(String.raw`(?:=|:)\s*${name}\s*\(`, "g");
        let m;

        while ((m = re.exec(code)) !== null) {
          violations.push(m[0].trim());
        }
      }

      if (violations.length === 0) {
        return { pass: true, note: "No bare builtin constructor calls found" };
      }

      return {
        pass: false,
        failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion: "Use new with builtin constructors: const cache = new Map();",
      };
    },
  },
  {
    id: "js-array-flat-map",
    label: "prefer flatMap over map().flat()",
    description:
      "rows.map(fn).flat() allocates an intermediate array; use rows.flatMap(fn) instead. Only .flat() with no depth argument is flagged.",
    check: (code) => {
      const violations = code.match(/\.map\s*\([^()]*(?:\([^()]*\))?[^()]*\)\s*\.flat\s*\(\s*\)/g) || [];

      if (violations.length === 0) {
        return { pass: true, note: "No map().flat() chains found" };
      }

      return {
        pass: false,
        failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion: "Use Array.prototype.flatMap: rows.flatMap(r => r.cells).",
      };
    },
  },
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
  },
];

export const VANILLA_REACTIVE_GUARDRAILS = [
  // Pattern A: Custom Element + html``
  {
    id: "vanilla-ce-extends",
    label: "Custom Element extends HTMLElement",
    description: "Pattern A components must extend HTMLElement with a static {} block for customElements.define().",
    check: (code) => {
      const isExtendsHtmlelement = /extends\s+HTMLElement/.test(code);
      const hasStaticBlock = /static\s*\{/.test(code) && /customElements\.define\(/.test(code);
      const hasVrComponent = /vrComponent\(/.test(code);
      const isClass = /^export\s+class\s/.test(code.trim()) || /^class\s/.test(code.trim());

      if (!isClass) {
        return { pass: true, note: "Not a class - skipping Pattern A check" };
      }

      if (isExtendsHtmlelement && (hasStaticBlock || hasVrComponent)) {
        return { pass: true };
      }

      const failures = [];

      if (!isExtendsHtmlelement) {
        failures.push("Must extend HTMLElement");
      }

      if (!hasStaticBlock && !hasVrComponent) {
        failures.push("Must have static {} block with vrComponent() or customElements.define()");
      }

      return {
        pass: false,
        failCount: failures.length,
        detail: failures,
        suggestion: "Add: static { vrComponent(this, { tag: 'my-component', css: import.meta.url }); }",
      };
    },
  },
  {
    id: "vanilla-html-template",
    label: "Component uses html`` tagged template",
    description: "Pattern A and B components must return html`` (TemplateResult) for their template.",
    check: (code) => {
      const isUsesHtml = /html`/.test(code);
      const isFunction =
        /^export\s+function\s/.test(code.trim()) || /^function\s/.test(code.trim()) || /=>\s*\{/.test(code);
      const isCe = /extends\s+HTMLElement/.test(code);

      if (!isFunction && !isCe) {
        return { pass: true, note: "Not a component \u{2014} skipping" };
      }

      if (!isUsesHtml) {
        return {
          pass: false,
          failCount: 1,
          detail: ["No html`` found"],
          suggestion: "Use html`` tagged template for the template.",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "vanilla-mount-guard",
    label: "connectedCallback has re-mount guard",
    description: "Pattern A connectedCallback must check _isMounted to prevent double-mounting.",
    check: (code) => {
      if (!code.includes("connectedCallback")) {
        return { pass: true, note: "No connectedCallback - skipping" };
      }

      const hasGuard = /_isMounted/.test(code) || /_pixBound/.test(code) || /bindElement/.test(code);

      if (hasGuard) {
        return { pass: true };
      }

      return {
        pass: false,
        failCount: 1,
        detail: ["No re-mount guard found"],
        suggestion: "Add: if (this._isMounted) return; this._isMounted = true; at start of connectedCallback().",
      };
    },
  },
  {
    id: "vanilla-adopted-stylesheets",
    label: "CSS via adoptedStyleSheets in static {} block",
    description:
      "Pattern CEs must load external CSS via fetch(`.css`).text() → CSSStyleSheet.replaceSync() → adoptedStyleSheets.",
    check: (code) => {
      const hasCssFetch = /CSSStyleSheet/.test(code) && /replaceSync/.test(code) && /adoptedStyleSheets/.test(code);
      const isCe = /extends\s+HTMLElement/.test(code);

      if (!isCe) {
        return { pass: true, note: "Not a CE - skipping" };
      }

      if (hasCssFetch) {
        return { pass: true };
      }

      const isNoFetch = /\.css['"]/.test(code) && !code.includes("CSSStyleSheet");

      if (isNoFetch) {
        return {
          pass: false,
          failCount: 1,
          detail: ["CSS file referenced but not loaded via adoptedStyleSheets"],
          suggestion:
            "Use: const cssText = await (await fetch(new URL('./_Comp.css', import.meta.url))).text(); const sheet = new CSSStyleSheet(); sheet.replaceSync(cssText);",
        };
      }

      return { pass: true, note: "No CSS detected - skipping" };
    },
  },

  // Pattern B: Functional Component
  {
    id: "vanilla-fn-component",
    label: "Functional component is a plain function",
    description: "Pattern B components must be plain functions, NOT classes extending HTMLElement.",
    check: (code) => {
      const isPlainFunction =
        /^export\s+function\s/.test(code.trim()) ||
        /^function\s/.test(code.trim()) ||
        /^export\s+const\s/.test(code.trim());
      const isClass = /extends\s+HTMLElement/.test(code);

      if (isClass) {
        return { pass: true, note: "This is a Pattern A (CE). Pattern B check not applicable." };
      }

      if (!isPlainFunction) {
        return { pass: true, note: "Not a Pattern B component - skipping" };
      }

      const isReturnsHtml = /return\s+html`/.test(code);

      if (!isReturnsHtml) {
        return {
          pass: false,
          failCount: 1,
          detail: ["Function does not return html``"],
          suggestion: "Add: return html`...`; at the end of the function.",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "vanilla-fn-no-register",
    label: "Functional component does NOT call customElements.define",
    description:
      "Pattern B functions must NOT register themselves as custom elements. That is the parent CE's responsibility.",
    check: (code) => {
      const isPlainFunction = /^export\s+function\s/.test(code.trim()) || /^function\s/.test(code.trim());

      if (!isPlainFunction) {
        return { pass: true, note: "Not a functional component - skipping" };
      }

      const hasDefine = /customElements\.define\(/.test(code);

      if (hasDefine) {
        return {
          pass: false,
          failCount: 1,
          detail: ["Functional component calls customElements.define()"],
          suggestion:
            "Remove customElements.define() from functional components. Register in the parent CE's static {} block.",
        };
      }

      return { pass: true };
    },
  },

  // Pattern C: External HTML Template
  {
    id: "vanilla-no-dollar-braces",
    label: "External templates do NOT contain ${} closures",
    description: ".template.html files can only use {{ }}, <for>, <if>, and @action. No ${} closures.",
    check: (code, context) => {
      const isTemplate = context?.fileName?.endsWith(".template.html") || false;
      const hasDollarBraces = /\${[^}]+\}/.test(code);

      if (!isTemplate && hasDollarBraces) {
        return { pass: true, note: "Not a .template.html file - ${} is valid here" };
      }

      if (isTemplate && hasDollarBraces) {
        return {
          pass: false,
          failCount: 1,
          detail: ["${} found in external template"],
          suggestion: 'Replace ${} closures with @click="handler" and use {{ expr }} for data expressions.',
        };
      }

      return { pass: true };
    },
  },
  {
    id: "vanilla-template-data-part",
    label: "External templates use data-part selectors",
    description: '.template.html files must use data-part="role" attributes, not CSS class names.',
    check: (code, context) => {
      const isTemplate = context?.fileName?.endsWith(".template.html") || false;

      if (!isTemplate) {
        return { pass: true, note: "Not a template file - skipping" };
      }

      const classAttributes = code.match(/class\s*=\s*["'][^"']*["']/g);
      const dataPart = code.match(/data-part\s*=\s*["']/g);

      if (classAttributes && (!dataPart || classAttributes.length > dataPart.length)) {
        return {
          pass: false,
          failCount: classAttributes.length,
          detail: (classAttributes || []).slice(0, 5),
          suggestion: 'Replace class="..." with data-part="role" attributes.',
        };
      }

      return { pass: true };
    },
  },
  {
    id: "vanilla-template-load",
    label: "Template loaded via fetch or bundle-text",
    description: "Pattern C templates must be loaded via fetch() at runtime or bundle-text: import at build time.",
    check: (code) => {
      const hasFetch = /fetch\(/.test(code) && /\.template\.html/.test(code);
      const hasBundleImport = /bundle-text:/.test(code) && /\.template\.html/.test(code);
      const isCe = /extends\s+HTMLElement/.test(code);

      if (!isCe) {
        return { pass: true, note: "Not a CE - skipping" };
      }

      const hasHtmlCall = /html\(/.test(code) && /\.template\.html/.test(code);

      if (hasHtmlCall && (hasFetch || hasBundleImport)) {
        return { pass: true };
      }

      if (hasHtmlCall && !hasFetch && !hasBundleImport) {
        return {
          pass: false,
          failCount: 1,
          detail: ["html() used with template but no fetch/import"],
          suggestion:
            "Add: const templateStr = await (await fetch(new URL('./_Comp.template.html', import.meta.url))).text();",
        };
      }

      return { pass: true, note: "No Pattern C detection needed - skipping" };
    },
  },
];

export const FRAMEWORK_GUARDRAILS = {
  react: [...REACT_GUARDRAILS, ...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  vue: [...VUE_GUARDRAILS, ...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  angular: [...ANGULAR_GUARDRAILS, ...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  svelte: [...SVELTE_GUARDRAILS, ...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  solid: [...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  astro: [...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  vanilla: [...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  "vanilla-reactive": [...JS_GUARDRAILS, ...VANILLA_REACTIVE_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
};
