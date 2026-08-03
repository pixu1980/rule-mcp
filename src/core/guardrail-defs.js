/**
 * rule-mcp Guardrail Definitions
 *
 * Single source of truth for all guardrail check functions.
 * Extracted from guardrails.js to keep the engine module lean.
 *
 * Each guardrail is: { id, label, description, check: (code, context) => { pass, failCount, detail, suggestion } }
 */

// ─── Shared guardrails (apply to all rule skills) ───

export const SHARED_GUARDRAILS = [
  {
    id: "no-css-classes",
    label: "Zero CSS classes in stylesheets",
    description: "CSS must use only element selectors + [data-part] + [data-*] attribute selectors. No .class selectors (including pseudo-classes and combinators).",
    check: (code, context) => {
      const cssBlock = extractRealCSS(code, context);
      if (!cssBlock) {return { pass: true, note: "No CSS block found, skipping" };}
      // Match class selectors including: .foo, .foo:hover, .foo > span, .foo.bar, .foo::before
      const classRules = cssBlock.match(/^\s*\.[a-zA-Z][\w-]*(?:\s*[{,:.\s>+~])/gm);
      return {
        pass: !classRules || classRules.length === 0,
        failCount: classRules?.length || 0,
        detail: classRules ? classRules.slice(0, 10).map(s => s.trim()) : [],
        suggestion: "Replace .class selectors with element selectors or [data-part=\"...\"] attribute selectors.",
      };
    },
  },
  {
    id: "no-inline-styles",
    label: "Zero inline styles in templates",
    description: "Templates must not use style=\"...\" attributes or JSX style={{...}} objects. All styling in external CSS files.",
    check: (code) => {
      const inlineAttributes = code.match(/style\s*=\s*"[^"]*"/g) || [];
      const inlineSingle = code.match(/style\s*=\s*'[^']*'/g) || [];
      // JSX/TSX: style={{...}} (React, Solid)
      const jsxStyle = code.match(/style\s*=\s*\{\{[^}]*\}\}/g) || [];
      inlineAttributes.push(...inlineSingle, ...jsxStyle);
      if (inlineAttributes.length === 0) {return { pass: true, note: "No inline style attributes found" };}
      const exceptions = code.match(/accent-option|contextmenu|context-menu/g);
      const effective = inlineAttributes.filter(a => !exceptions || exceptions.every(e => !a.includes(e)));
      return {
        pass: effective.length === 0,
        failCount: effective.length,
        detail: effective.slice(0, 10),
        suggestion: "Move styles to external .css file and use data-* attributes for dynamic values.",
      };
    },
  },
  {
    id: "semantic-html",
    label: "Semantic HTML mandatory",
    description: "No <div> where <section>, <article>, <header>, <footer>, <nav>, <main>, <aside>, <form>, <ul>, <ol>, <li>, <search> exists.",
    check: (code) => {
      const nonSemanticDivPatterns = [
        /<div[^>]*data-part="(header|footer|body|modal|content|nav|search|form|tabs|card|summary|stats|list|item|sidebar|banner|main)"/gi,
        /<div[^>]*class="[^"]*(header|footer|nav|sidebar|main|content|list|card)[^"]*"/gi,
        /<div[^>]*role="(banner|contentinfo|navigation|main|complementary|form|search|tablist|list|listitem)"/gi,
      ];
      const violations = [];
      for (const re of nonSemanticDivPatterns) {
        const m = code.match(re);
        if (m) {violations.push(...m);}
      }
      if (violations.length === 0) {return { pass: true, note: "No semantic-violating <div> found" };}
      return {
        pass: false,
        failCount: violations.length,
        detail: violations.slice(0, 10),
        suggestion: "Replace <div data-part=\"header|footer|...\"> with the matching semantic element. Use: <header>, <footer>, <section>, <article>, <nav>, <search>, <form>, <ul>, <ol>, <main>, <aside>.",
      };
    },
  },
  {
    id: "external-css",
    label: "External CSS via adoptedStyleSheets or framework-native import",
    description: "CSS must be loaded as external file. Use fetch→CSSStyleSheet.replaceSync→adoptedStyleSheets for vanilla, or framework-native imports (Angular styleUrls, Svelte <style>, CSS Modules or plain import for React/Solid).",
    check: (code, context) => {
      const framework = context?.framework || "vanilla";
      // CSS files are themselves external CSS
      if (context?.fileName && /\.css$/i.test(context.fileName)) {return { pass: true, note: "CSS file is external CSS by definition" };}
      if (framework === "angular" && code.includes("styleUrls")) {return { pass: true, note: "Angular styleUrls OK" };}
      if (framework === "angular" && code.includes("@Component") && code.includes(".css")) {return { pass: true, note: "Angular external CSS via component styles" };}
      if (framework === "svelte" && (/import\s+['"].*\.css['"]/.test(code) || code.includes("<style>"))) {return { pass: true, note: "Svelte CSS import or scoped style OK" };}
      // React/Solid: accept both `import "./foo.css"` and `import styles from "./foo.module.css"`
      if ((framework === "react" || framework === "solid") && /import\s+.*['"].*\.css['"]/.test(code)) {return { pass: true, note: "CSS import or CSS Modules OK" };}
      if (code.includes("adoptedStyleSheets") && code.includes("CSSStyleSheet")) {return { pass: true, note: "adoptedStyleSheets OK" };}
      const hasCssContent = extractRealCSS(code, context);
      if (!hasCssContent) {return { pass: true, note: "No CSS content found, skipping" };}
      return {
        pass: false,
        failCount: 1,
        suggestion: "Load CSS via an external file mechanism: adoptedStyleSheets (vanilla), styleUrls (Angular), <style> (Svelte), or CSS Modules (React).",
      };
    },
  },
  {
    id: "barrel-file-tree",
    label: "Barrel pattern (index.js)",
    description: "Every component folder must have an index.js barrel that re-exports the public API.",
    check: (code, context) => {
      const isBarrel = context?.fileName === "index.js" || context?.fileName === "index.ts" || context?.fileName === "index.jsx" || context?.fileName === "index.tsx";
      if (isBarrel) {
        const hasBarrelExport = code.includes("export {") || code.includes("export * from");
        return {
          pass: hasBarrelExport,
          failCount: hasBarrelExport ? 0 : 1,
          suggestion: "Barrel files (index.js) must re-export: export { ComponentName } from './_ComponentName.js';",
        };
      }
      return { pass: true, note: "Not a barrel file, skipping" };
    },
  },
  {
    id: "file-naming",
    label: "File naming convention (_PascalCase.js)",
    description: "Component files inside folders must be _PascalCase.js. Utils are _kebab-case.js.",
    check: (code, context) => {
      if (!context?.fileName) {return { pass: true, note: "No filename context" };}
      const name = context.fileName;
      const isComponent = context.isComponent;
      if (!isComponent) {return { pass: true, note: "Not a component file" };}
      const isValid = /^_[A-Z][a-zA-Z0-9]*\.\w+$/.test(name);
      return {
        pass: isValid,
        failCount: isValid ? 0 : 1,
        suggestion: `Rename "${name}" to "_PascalCase.ext" (e.g., _TodoItem.jsx). Component files inside folders must start with underscore + PascalCase.`,
      };
    },
  },
  {
    id: "data-part-naming",
    label: "data-part attribute for child elements",
    description: "Component child elements with semantic roles must use data-part=\"role\" attributes.",
    check: (code) => {
      const hasDataPart = code.includes('data-part="');
      const hasChildren = code.includes("<div") || code.includes("<section") || code.includes("<header") || code.includes("<nav");
      if (!hasChildren) {return { pass: true, note: "No child elements found" };}
      return {
        pass: hasDataPart,
        failCount: hasDataPart ? 0 : 1,
        suggestion: "Add data-part=\"role\" attributes to child elements: <section data-part=\"list\">, <button data-part=\"delete\">.",
      };
    },
  },
  {
    id: "jsdoc-required",
    label: "JSDoc on every exported symbol",
    description: "Every JS/TS file must have JSDoc on all exported functions, classes, constants, and types. Module-level JSDoc recommended.",
    check: (code, context) => {
      const fileName = context?.fileName || "";
      if (fileName === "index.js" || fileName === "index.ts") {return { pass: true, note: "Barrel file, skipping JSDoc check" };}

      const exportPatterns = [
        /export\s+(async\s+)?function\s+(\w+)/g,
        /export\s+(default\s+)?class\s+(\w+)/g,
        /export\s+(default\s+)?(const|let|var)\s+(\w+)/g,
        /export\s+default\s+(async\s+)?function\s+(\w+)/g,
        /export\s+default\s+(async\s+)?\w+/g,
      ];

      const missingDocs = [];
      for (const pattern of exportPatterns) {
        const re = new RegExp(pattern.source, "g");
        let match;
        while ((match = re.exec(code)) !== null) {
          const symbol = match.at(-1) || match[2] || "";
          if (!symbol) {continue;}
          const before = code.slice(Math.max(0, match.index - 200), match.index);
          if (!before.includes("/**")) {missingDocs.push(symbol);}
        }
      }

      if (missingDocs.length === 0) {return { pass: true, note: "All exported symbols have JSDoc" };}
      return {
        pass: false,
        failCount: missingDocs.length,
        detail: missingDocs.slice(0, 10).map(s => `Missing JSDoc: ${s}`),
        suggestion: "Add JSDoc blocks before each exported symbol. Format: /** ... */ with @param and @returns where applicable.",
      };
    },
  },
  {
    id: "css-comments-required",
    label: "CSS file-level comments",
    description: "Every CSS file must start with a file-level comment describing its purpose, scope, and usage. Sections should be separated by comment headers.",
    check: (code, context) => {
      // Only check CSS files or files with explicit CSS blocks
      const isCssFile = context?.fileName && /\.css$/i.test(context.fileName);
      const hasCssBlock = /```css|CSSStyleSheet|<style[^>]*>/i.test(code);
      if (!isCssFile && !hasCssBlock) {return { pass: true, note: "Not a CSS file and no CSS block detected, skipping" };}
      const hasCSSRules = /[\w-]+\s*\{/.test(code);
      if (!hasCSSRules) {return { pass: true, note: "No CSS rules detected, skipping" };}

      const trimmed = code.trimStart();
      const hasFileComment = /\/\*\*\s*\n/.test(trimmed) || /\/\*\s*FILE:/i.test(trimmed) || /\/\*\s*USAGE:/i.test(trimmed) || /\/\*\s*SCOPE:/i.test(trimmed);
      if (!hasFileComment) {
        return {
          pass: false,
          failCount: 1,
          detail: ["Missing file-level comment"],
          suggestion: "Add a file-level comment at the top: /**\n * FILE: _Component.css\n * USAGE: Styles for ComponentName\n * SCOPE: selector\n */",
        };
      }

      const lines = code.split("\n").filter(l => l.trim());
      if (lines.length > 30) {
        const sectionComments = code.match(/\/\*\s*─{2,}/g) || code.match(/\/\*\s*[A-Z]/g) || [];
        if (sectionComments.length < 2) {
          return {
            pass: false,
            failCount: 1,
            detail: ["Missing section comments in a file with >30 lines"],
            suggestion: "Add section comment headers (/* ─── Layout ─── */) for each logical group of rules.",
          };
        }
      }

      return { pass: true, note: "CSS file-level comment and section comments present" };
    },
  },
  {
    id: "a11y-test-required",
    label: "Playwright + axe-core a11y tests",
    description: "Every project MUST have automated a11y tests using Playwright and @axe-core/playwright. Tests must live in tests/a11y/ and must include an axe-core scan with expect(results.violations).toEqual([]).",
    check: (code, context) => {
      const isTestFile = context?.fileName?.includes(".spec.") || context?.fileName?.includes(".test.") || context?.mode === "test";
      const hasAxeImport = /@axe-core\/playwright/.test(code) || /from\s+['"]@axe-core\/playwright['"]/.test(code);
      const hasAxeBuilder = /new\s+AxeBuilder/.test(code) || /AxeBuilder/.test(code);
      const hasViolationCheck = /\.violations\s*\.toEqual/.test(code) || /expect\(.*\.violations\)/.test(code);
      const hasPlaywright = /from\s+['"]@playwright\/test['"]/.test(code);
      const hasPlaywrightConfig = /playwright\.config/.test(code);

      const details = [];
      if (!hasPlaywright && !isTestFile) {details.push("No @playwright/test import");}
      if (!hasAxeImport) {details.push("No @axe-core/playwright import");}
      if (!hasAxeBuilder) {details.push("No AxeBuilder usage");}
      if (!hasViolationCheck) {details.push("No violation assertion (expect(results.violations).toEqual([]))");}

      if (context?.mode === "scaffold" || context?.fileName === "playwright.config.js") {
        const isConfigValid = hasPlaywrightConfig || (hasPlaywright && hasAxeImport);
        return {
          pass: isConfigValid,
          failCount: isConfigValid ? 0 : 1,
          detail: ["Missing playwright.config.js or @axe-core/playwright dependency"],
          suggestion: "Create playwright.config.js and install: pnpm install --save-dev playwright @axe-core/playwright",
        };
      }

      if (isTestFile || hasPlaywright || hasAxeImport) {
        const failCount = details.length;
        return {
          pass: failCount === 0,
          failCount,
          detail: details,
          suggestion: failCount === 0 ? "" : "Add the missing a11y test infrastructure: import AxeBuilder from @axe-core/playwright, run new AxeBuilder({ page }).analyze(), and assert expect(results.violations).toEqual([]).",
        };
      }

      return { pass: true, note: "Not a test file, skipping a11y test check" };
    },
  },
  {
    id: "no-placeholder-implementation",
    label: "No placeholder or unfinished implementation",
    description: "Generated code must not contain TODO/FIXME markers, placeholder comments, or not-implemented throws.",
    check: (code) => {
      const patterns = [
        /\b(?:TODO|FIXME|XXX)\b/gi,
        /\/\*\s*placeholder\s*\*\//gi,
        /throw\s+new\s+Error\s*\(\s*["'](?:not implemented|todo)/gi,
      ];
      const violations = patterns.flatMap((pattern) => code.match(pattern) || []);
      return {
        pass: violations.length === 0,
        failCount: violations.length,
        detail: violations.slice(0, 10),
        suggestion: "Replace placeholders with complete, executable implementation before returning code.",
      };
    },
  },
  {
    id: "no-suppressed-errors",
    label: "No suppressed type, lint, or runtime errors",
    description: "Generated code must not silence errors with ignore directives or empty catch blocks.",
    check: (code) => {
      const patterns = [/@ts-ignore/g, /eslint-disable/g, /biome-ignore/g, /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g];
      const violations = patterns.flatMap((pattern) => code.match(pattern) || []);
      return {
        pass: violations.length === 0,
        failCount: violations.length,
        detail: violations.slice(0, 10),
        suggestion: "Handle errors explicitly and fix type/lint violations instead of suppressing them.",
      };
    },
  },
  {
    id: "verified-dependencies-only",
    label: "Only manifest-verified dependencies",
    description: "When allowedDependencies context is provided, every external import must exist in that manifest-derived list.",
    check: (code, context) => {
      if (!Array.isArray(context?.allowedDependencies)) {
        return { pass: true, note: "No manifest dependency context supplied, skipping" };
      }
      const allowed = new Set(context.allowedDependencies);
      const specifiers = [
        ...code.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g),
        ...code.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g),
      ].map((match) => match[1]);
      const packages = specifiers
        .filter((name) => !name.startsWith(".") && !name.startsWith("/") && !name.startsWith("node:"))
        .map((name) => name.startsWith("@") ? name.split("/").slice(0, 2).join("/") : name.split("/", 1)[0]);
      const unknown = [...new Set(packages.filter((name) => !allowed.has(name)))];
      return {
        pass: unknown.length === 0,
        failCount: unknown.length,
        detail: unknown,
        suggestion: "Use only dependencies declared by the project manifest or add an explicit, reviewed dependency decision.",
      };
    },
  },
];

// ─── File tree guardrails (validate structure, not content) ───
// These check the LLM output file tree against rule AI conventions.
// They are registered in the FRAMEWORK_GUARDRAILS map for
// rule-styleguide, rule-architect, and all UI framework skills.

export const FILE_TREE_GUARDRAILS = [
  {
    id: "component-folder-barrel",
    label: "Component folder has index.js barrel file",
    description: "Every component folder must have an index.js (or index.ts) that re-exports the public API. The barrel must contain at least one export statement.",
    check: (code, context) => {
      const fileName = context?.fileName || "";
      if (!/^index\.(js|ts|jsx|tsx)$/.test(fileName)) {
        return { pass: true, note: "Not a barrel file, skipping" };
      }
      const trimmed = (code || "").trim();
      if (trimmed.length === 0) {
        return { pass: false, failCount: 1, detail: ["Barrel file is empty"], suggestion: "Add export statements." };
      }
      const hasExport = trimmed.includes("export ") || trimmed.includes("module.exports");
      return {
        pass: hasExport,
        failCount: hasExport ? 0 : 1,
        detail: hasExport ? [] : ["No exports found"],
        suggestion: "Add: export { ComponentName } from './_ComponentName.js';",
      };
    },
  },
  {
    id: "component-file-prefix",
    label: "Component file has _PascalCase prefix",
    description: "Component files inside component folders must start with an underscore and PascalCase: _Button.jsx, _Card.vue, _Modal.svelte.",
    check: (code, context) => {
      const fileName = context?.fileName || "";
      const isComponent = context?.isComponent === true;

      if (!isComponent) {
        return { pass: true, failCount: 0, detail: [], suggestion: "", note: "Not a component file, skipping" };
      }
      if (!fileName) {
        return { pass: true, failCount: 0, detail: [], suggestion: "", note: "No filename context, skipping" };
      }

      // Barrel files are exempt
      if (/^index\.(js|ts|jsx|tsx)$/.test(fileName)) {
        return { pass: true, failCount: 0, detail: [], suggestion: "", note: "Barrel file, skipping" };
      }

      const isValid = /^_[A-Z][a-zA-Z0-9]*\.\w+$/.test(fileName);
      if (isValid) {
        return { pass: true, failCount: 0, detail: [], suggestion: "", note: "File name follows _PascalCase.ext convention" };
      }

      // _store.js, _data.js, _config.js — data helpers are snake_case, not components
      if (/^_[a-z][a-z_-]*\.js$/.test(fileName)) {
        return { pass: true, failCount: 0, detail: [], suggestion: "", note: "Helper file (_snake_case), not a component" };
      }

      const correctName = fileName.startsWith("_") ? fileName : `_${fileName}`;
      return {
        pass: false,
        failCount: 1,
        detail: [`File "${fileName}" does not follow _PascalCase.ext (component) or _snake_case.js (helper) convention`],
        suggestion: `Rename component to "${correctName}" or use _snake_case.js for helpers.`,
      };
    },
  },
  {
    id: "component-export-check",
    label: "Component file exports a class or function",
    description: "_PascalCase.js component files must export at least one class or function. Store/data files (_store.js) are exempt.",
    check: (code, context) => {
      const fileName = context?.fileName || "";
      // Only check _PascalCase files (actual components)
      if (!/^_[A-Z][a-zA-Z0-9]*\.\w+$/.test(fileName)) {
        return { pass: true, note: "Not a component file, skipping" };
      }
      const hasExport = /^export\s+(class|function|const)/m.test(code.trim());
      if (!hasExport) {
        return { pass: false, failCount: 1, detail: ["No exported class/function found"], suggestion: "Add: export class MyComponent extends HTMLElement { ... }" };
      }
      return { pass: true };
    },
  },
  {
    id: "barrel-exports-match-files",
    label: "Barrel exports match actual component files",
    description: "The barrel file's export statements must reference existing component files with the correct _PascalCase names.",
    check: (code, context) => {
      const fileName = context?.fileName || "";
      if (!/^index\.(js|ts|jsx|tsx)$/.test(fileName)) {
        return { pass: true, note: "Not a barrel file, skipping" };
      }

      const exports = [...code.matchAll(/export\s+\{\s*(\w+)\s*\}\s+from\s+['"]\.\/([^'"]+)['"]/g)];
      if (exports.length === 0) {
        return { pass: true, note: "No named exports with relative paths found, skipping" };
      }

      const violations = [];
      for (const [, exportedName, sourcePath] of exports) {
        // Check that the source path starts with _ and matches PascalCase
        const sourceBase = sourcePath.replace(/\.[a-z]+$/, "");
        if (!sourceBase.startsWith("_")) {
          violations.push(`Export "${exportedName}" references "${sourcePath}" which does not start with underscore prefix`);
        }
        if (!/^_[A-Z]/.test(sourceBase)) {
          violations.push(`Export "${exportedName}" references "${sourcePath}" which is not PascalCase`);
        }
        // Check that the exported name matches the file name
        const expectedFile = `_${exportedName}`;
        if (sourceBase !== expectedFile) {
          violations.push(`Export "${exportedName}" should reference "./${expectedFile}" but got "${sourcePath}"`);
        }
      }

      if (violations.length === 0) {
        return { pass: true, note: "All barrel exports match conventions" };
      }

      return {
        pass: false,
        failCount: violations.length,
        detail: violations.slice(0, 10),
        suggestion: "Fix each export to use: export { PascalName } from './_PascalName.ext';",
      };
    },
  },
];

// ─── Framework-specific guardrails ───

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
        suggestion: "Replace className=\"...\" with data-part=\"...\" attributes. CSS uses [data-part=\"...\"] selectors instead of .class selectors.",
      };
    },
  },
  {
    id: "react-hooks-rules",
    label: "React Hooks rules",
    description: "Hooks must be called at top level, not inside conditions, loops, or callbacks.",
    check: (code) => {
      const hooks = code.match(/\b(useState|useEffect|useMemo|useCallback|useRef|useReducer|useContext|useImperativeHandle|useLayoutEffect|useDebugValue|useTransition|useDeferredValue|useId|useSyncExternalStore|useInsertionEffect)\(/g);
      if (!hooks) {return { pass: true, note: "No hooks found" };}
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
        suggestion: "Replace :class with :data-part=\"...\" bindings.",
      };
    },
  },
];

export const ANGULAR_GUARDRAILS = [
  {
    id: "angular-no-ngclass",
    label: "No ngClass directive",
    description: "Angular templates must use [attr.data-part] instead of [ngClass].",
    check: (code) => { const n = code.match(/\[ngClass\]/g); return { pass: !n, failCount: n?.length || 0, suggestion: "Replace [ngClass] with [attr.data-part]=\"...\"." }; },
  },
];

export const SVELTE_GUARDRAILS = [
  {
    id: "svelte-no-class-directive",
    label: "No class: directives",
    description: "Svelte should use data-part attributes, not class:name directives.",
    check: (code) => { const n = code.match(/class:\w+/g); return { pass: !n, failCount: n?.length || 0, suggestion: "Replace class:name with data-part=\"...\" or data-state-* attributes." }; },
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
      const matches = code.match(/if\s*\([^)]*\)\s*[^{]*(?:;|\n)/g);
      if (matches && matches.length > 0) {
        return { pass: false, failCount: matches.length, detail: matches.slice(0, 5), suggestion: "Add braces: if (condition) { ... }" };
      }
      return { pass: true };
    },
  },
  {
    id: "js-no-inline-blocks",
    label: "Blocks must be multi-line (no inline { code })",
    description: "All { } blocks (if/for/while/arrow functions/promises) must span multiple lines. No inline { doThing(); }.",
    check: (code) => {
      // Match if/for/while/try/catch with { code } on same line
      const matches = code.match(/(?:if|for|while|switch|try|catch|else|=>)\s*\(?[^)]*\)?\s*\{[^{}]+\}/g);
      if (matches && matches.length > 0) {
        const filtered = matches.filter(m => m !== '=> {}');
        if (filtered.length > 0) {
          return { pass: false, failCount: filtered.length, detail: filtered.slice(0, 5), suggestion: "Split block across multiple lines." };
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
      const lines = code.split('\n');
      for (let index = 0; index < lines.length; index++) {
        if (/\{\s*$/.test(lines[index]) && index + 1 < lines.length && /^\s*$/.test(lines[index + 1])) {
          issues.push(`Line ${index + 1}: blank line after {`);
        }
        if (/^\s*\}\s*$/.test(lines[index]) && index > 0 && /^\s*$/.test(lines[index - 1])) {
          issues.push(`Line ${index + 1}: blank line before }`);
        }
      }
      if (issues.length > 0) {
        return { pass: false, failCount: issues.length, detail: issues.slice(0, 5), suggestion: "Remove blank lines at block start/end." };
      }
      return { pass: true };
    },
  },
  {
    id: "js-single-line-method",
    label: "Class method bodies must be multi-line",
    description: "Every method body must span multiple lines. No method() { stmt; } on one line.",
    check: (code) => {
      const matches = code.match(/(?:constructor|\w+)\s*\([^)]*\)\s*\{[^}]+\}/g);
      if (matches && matches.length > 0) {
        const filtered = matches.filter(m => {
          const inner = m.replace(/^\w+\s*\([^)]*\)\s*\{/, '').replace(/\}$/, '').trim();
          return inner.length > 0 && !inner.includes('\n');
        });
        if (filtered.length > 0) {
          return { pass: false, failCount: filtered.length, detail: filtered.slice(0, 5), suggestion: "Split method body across multiple lines." };
        }
      }
      return { pass: true };
    },
  },
  {
    id: "js-for-loop-braces",
    label: "for loops must have braces and be multi-line",
    description: "Every for/for...of/for...in body must use {} and span multiple lines. No for (...) stmt;",
    check: (code) => {
      const matches = code.match(/for\s*\([^)]*\)\s*\{[^}]+\}/g);
      if (matches && matches.length > 0) {
        const filtered = matches.filter(m => {
          const inner = m.replace(/^for\s*\([^)]*\)\s*\{/, '').replace(/\}$/, '').trim();
          return !inner.includes('\n');
        });
        if (filtered.length > 0) {
          return { pass: false, failCount: filtered.length, detail: filtered.slice(0, 5), suggestion: "Place for loop body on separate lines." };
        }
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
      const lines = code.split('\n');
      for (let index = 1; index < lines.length; index++) {
        const line = lines[index].trim();
        const previous = lines[index - 1].trim();
        if ((line.startsWith('return ') || line === 'return;') &&
            previous !== '' && !previous.endsWith('{') && !previous.endsWith('(') &&
            !previous.startsWith('//') && !previous.startsWith('/*')) {
          issues.push(`Line ${index + 1}: no blank line before return`);
        }
      }
      if (issues.length > 0) {
        return { pass: false, failCount: issues.length, detail: issues.slice(0, 5), suggestion: "Add a blank line before each return statement." };
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
      if (!code.includes('class ')) {return { pass: true, note: "Not a class — skipping" };}
      const lines = code.split('\n');
      for (let index = 0; index < lines.length - 1; index++) {
        // Check if line is a closing brace of a method, followed by another method
        if (/^\s*\}\s*$/.test(lines[index]) && /^\s*(\w+|static|get|set)\s/.test(lines[index + 1])) {
          issues.push(`Line ${index + 1}: no blank line before method`);
        }
      }
      if (issues.length > 0) {
        return { pass: false, failCount: issues.length, detail: issues.slice(0, 5), suggestion: "Add a blank line between class methods." };
      }
      return { pass: true };
    },
  },
  {
    id: "js-blank-lines-blocks",
    label: "Multi-line blocks have blank lines above/below",
    description: "if/for/while/switch/try/return/promise/method chains spanning >1 line must have a blank line above and below.",
    check: (code) => {
      const issues = [];
      const lines = code.split('\n');
      for (let index = 1; index < lines.length - 1; index++) {
        const line = lines[index];
        const previous = lines[index - 1];
        const next = lines[index + 1];
        // Check if this line starts a block that spans multiple lines
        if (/^\s*(if|for|while|switch|try)\s*\(/.test(line) || /^\.(then|catch|finally|map|filter|reduce|forEach)\s*\(/.test(line)) {
          const hasPreviousCode = previous.trim() && !/^\s*(\/\/|\/\*|\*|\}\s*$|\{\s*$|if|for|while|switch|try|case|default)/.test(previous);
          if (hasPreviousCode && previous.trim() !== '{' && !previous.trimStart().startsWith('//')) {
            issues.push(`Line ${index + 1}: no blank line before block`);
          }
        }
        // Check closing brace followed by code
        if (/^\s*\}\s*$/.test(line) && !/catch|else|finally/.test(next)) {
          const hasNextCode = next.trim() && !/^\s*(\/\/|\/\*|\*|\}|\)|case|default)/.test(next);
          if (hasNextCode && next.trim() !== '{' && index > 2) {
            // Check this is not the last block in parent
            const afterBlock = lines.slice(index + 1).join('\n').trim();
            if (afterBlock && !afterBlock.startsWith('}') && !afterBlock.startsWith(')')) {
              issues.push(`Line ${index + 1}: no blank line after closing brace`);
            }
          }
        }
      }
      if (issues.length > 0) {
        return { pass: false, failCount: issues.length, detail: issues.slice(0, 5), suggestion: "Add blank lines around multi-line blocks (see styleguide)." };
      }
      return { pass: true };
    },
  },
  {
    id: "js-const-top",
    label: "Variable declarations grouped at top",
    description: "const/let/var declarations should be grouped at the top of their scope, separated from code by a blank line.",
    check: (code) => {
      const lines = code.split('\n');
      let lastDeclaration = -1;
      let firstNonDeclaration = -1;
      for (const [index, line] of lines.entries()) {
        const trimmed = line.trim();
        if (/^(const|let|var)\s/.test(trimmed)) {
          lastDeclaration = index;
          if (firstNonDeclaration < 0) {firstNonDeclaration = index;}
        } else if (trimmed && !/^(\/\/|\/\*|\*|\s*$|import|export|'use strict'|})/.test(trimmed) && lastDeclaration >= 0) {
          break;
        }
      }
      if (lastDeclaration > 0 && lastDeclaration < lines.length - 1) {
        const nextLine = lines[lastDeclaration + 1].trim();
        if (nextLine && !/^(\/\/|\/\*|\*|export|import|'use strict'|}|case|default)/.test(nextLine)) {
          return { pass: false, failCount: 1, detail: [`Line ${lastDeclaration + 1}: no blank line after declarations`], suggestion: "Add a blank line after the last const/let/var declaration." };
        }
      }
      return { pass: true };
    },
  },
  {
    id: "js-throw-new-error",
    label: "throw requires new for error constructors",
    description: "Errors must be created with new: throw new Error('...'). Calling error constructors as functions (throw Error('...')) is forbidden.",
    check: (code) => {
      const violations = code.match(/throw\s+(?!new\s+)(?:Error|TypeError|RangeError|SyntaxError|ReferenceError|EvalError|URIError)\s*\(/g) || [];
      if (violations.length === 0) {return { pass: true, note: "No bare error constructor throws found" };}
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
    description: "Builtin constructors Map, Set, Date, Array, WeakMap, WeakSet must be called with new. Calling them as functions (const m = Map()) is forbidden. String, Number, Boolean, Symbol, BigInt are exempt.",
    check: (code) => {
      const violations = [];
      for (const name of ["Map", "Set", "Date", "Array", "WeakMap", "WeakSet"]) {
        const re = new RegExp(String.raw`(?:=|:)\s*${name}\s*\(`, "g");
        let m;
        while ((m = re.exec(code)) !== null) {violations.push(m[0].trim());}
      }
      if (violations.length === 0) {return { pass: true, note: "No bare builtin constructor calls found" };}
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
    description: "rows.map(fn).flat() allocates an intermediate array; use rows.flatMap(fn) instead. Only .flat() with no depth argument is flagged.",
    check: (code) => {
      const violations = code.match(/\.map\s*\([^()]*(?:\([^()]*\))?[^()]*\)\s*\.flat\s*\(\s*\)/g) || [];
      if (violations.length === 0) {return { pass: true, note: "No map().flat() chains found" };}
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
    description: "Array.prototype.includes() inside a loop or iteration callback (for/filter/map/some/every/find) is O(n) per call — O(n²) total. Build a Set once and use Set.prototype.has() for O(1) membership.",
    check: (code) => {
      const violations = [];
      const arrayNames = [...code.matchAll(/const\s+(\w+)\s*=\s*\[/g)].map((m) => m[1]);
      if (arrayNames.length === 0) {return { pass: true, note: "No array literals found, skipping" };}
      const lines = code.split("\n");
      for (const line of lines) {
        const isInIteration = /\bfor\s*\(|\.filter\s*\(|\.map\s*\(|\.some\s*\(|\.every\s*\(|\.find\s*\(|\.findIndex\s*\(/.test(line);
        if (!isInIteration) {continue;}
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
        const multi = code.match(new RegExp(String.raw`\.(?:filter|map|some|every|find)\s*\([\s\S]{0,200}?\b${name}\.includes\(`, "g"));
        if (multi) {violations.push(...multi.map((v) => v.replaceAll('\n', " ").trim().slice(0, 80)));}
      }
      if (violations.length === 0) {return { pass: true, note: "No includes-in-loop lookups found" };}
      return {
        pass: false,
        failCount: violations.length,
        detail: [...new Set(violations)].slice(0, 5),
        suggestion: "Build a Set once outside the loop and use set.has(x): const allowed = new Set([...]); allowed.has(scope).",
      };
    },
  },
  {
    id: "js-node-protocol",
    label: "node: protocol for Node builtins",
    description: "Node builtin imports must use the explicit node: prefix (import fs from 'node:fs'). The bare form can be shadowed by a same-named npm package.",
    check: (code) => {
      const builtins = ["fs", "path", "util", "url", "os", "http", "https", "crypto", "stream", "events", "buffer", "child_process", "assert", "querystring", "readline", "worker_threads", "perf_hooks", "zlib", "dns", "net", "tls", "timers", "string_decoder", "vm", "module", "process", "async_hooks", "cluster", "constants", "domain", "inspector", "punycode", "repl", "sys", "trace_events", "tty", "v8", "wasi", "test"];
      const re = new RegExp(String.raw`from\s*['"](?:${builtins.join("|")})(?:/[\w.-]*)?['"]`, "g");
      const violations = code.match(re) || [];
      if (violations.length === 0) {return { pass: true, note: "No bare node builtin imports found" };}
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
      if (violations.length === 0) {return { pass: true, note: "No global-regex replace found" };}
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
    description: "Prefer for...of loops over Array.prototype.forEach: better type narrowing, direct await, and break/continue support.",
    check: (code) => {
      const violations = code.match(/\b\w+\.forEach\s*\(/g) || [];
      if (violations.length === 0) {return { pass: true, note: "No .forEach() calls found" };}
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
      if (!isClass) {return { pass: true, note: "Not a class — skipping Pattern A check" };}
      if (isExtendsHtmlelement && (hasStaticBlock || hasVrComponent)) {return { pass: true };}
      const failures = [];
      if (!isExtendsHtmlelement) {failures.push("Must extend HTMLElement");}
      if (!hasStaticBlock && !hasVrComponent) {failures.push("Must have static {} block with vrComponent() or customElements.define()");}
      return { pass: false, failCount: failures.length, detail: failures, suggestion: "Add: static { vrComponent(this, { tag: 'my-component', css: import.meta.url }); }" };
    },
  },
  {
    id: "vanilla-html-template",
    label: "Component uses html`` tagged template",
    description: "Pattern A and B components must return html`` (TemplateResult) for their template.",
    check: (code) => {
      const isUsesHtml = /html`/.test(code);
      const isFunction = /^export\s+function\s/.test(code.trim()) || /^function\s/.test(code.trim()) || /=>\s*\{/.test(code);
      const isCe = /extends\s+HTMLElement/.test(code);
      if (!isFunction && !isCe) {return { pass: true, note: "Not a component \u{2014} skipping" };}
      if (!isUsesHtml) {return { pass: false, failCount: 1, detail: ["No html`` found"], suggestion: "Use html`` tagged template for the template." };}
      return { pass: true };
    },
  },
  {
    id: "vanilla-mount-guard",
    label: "connectedCallback has re-mount guard",
    description: "Pattern A connectedCallback must check _isMounted to prevent double-mounting.",
    check: (code) => {
      if (!code.includes("connectedCallback")) {return { pass: true, note: "No connectedCallback — skipping" };}
      const hasGuard = /_isMounted/.test(code) || /_pixBound/.test(code) || /bindElement/.test(code);
      if (hasGuard) {return { pass: true };}
      return { pass: false, failCount: 1, detail: ["No re-mount guard found"], suggestion: "Add: if (this._isMounted) return; this._isMounted = true; at start of connectedCallback()." };
    },
  },
  {
    id: "vanilla-adopted-stylesheets",
    label: "CSS via adoptedStyleSheets in static {} block",
    description: "Pattern CEs must load external CSS via fetch(`.css`).text() → CSSStyleSheet.replaceSync() → adoptedStyleSheets.",
    check: (code) => {
      const hasCssFetch = /CSSStyleSheet/.test(code) && /replaceSync/.test(code) && /adoptedStyleSheets/.test(code);
      const isCe = /extends\s+HTMLElement/.test(code);
      if (!isCe) {return { pass: true, note: "Not a CE — skipping" };}
      if (hasCssFetch) {return { pass: true };}
      const isNoFetch = /\.css['"]/.test(code) && !code.includes("CSSStyleSheet");
      if (isNoFetch) {return { pass: false, failCount: 1, detail: ["CSS file referenced but not loaded via adoptedStyleSheets"], suggestion: "Use: const cssText = await (await fetch(new URL('./_Comp.css', import.meta.url))).text(); const sheet = new CSSStyleSheet(); sheet.replaceSync(cssText);" };}
      return { pass: true, note: "No CSS detected — skipping" };
    },
  },

  // Pattern B: Functional Component
  {
    id: "vanilla-fn-component",
    label: "Functional component is a plain function",
    description: "Pattern B components must be plain functions, NOT classes extending HTMLElement.",
    check: (code) => {
      const isPlainFunction = /^export\s+function\s/.test(code.trim()) || /^function\s/.test(code.trim()) || /^export\s+const\s/.test(code.trim());
      const isClass = /extends\s+HTMLElement/.test(code);
      if (isClass) {return { pass: true, note: "This is a Pattern A (CE). Pattern B check not applicable." };}
      if (!isPlainFunction) {return { pass: true, note: "Not a Pattern B component — skipping" };}
      const isReturnsHtml = /return\s+html`/.test(code);
      if (!isReturnsHtml) {return { pass: false, failCount: 1, detail: ["Function does not return html``"], suggestion: "Add: return html`...`; at the end of the function." };}
      return { pass: true };
    },
  },
  {
    id: "vanilla-fn-no-register",
    label: "Functional component does NOT call customElements.define",
    description: "Pattern B functions must NOT register themselves as custom elements. That is the parent CE's responsibility.",
    check: (code) => {
      const isPlainFunction = /^export\s+function\s/.test(code.trim()) || /^function\s/.test(code.trim());
      if (!isPlainFunction) {return { pass: true, note: "Not a functional component — skipping" };}
      const hasDefine = /customElements\.define\(/.test(code);
      if (hasDefine) {return { pass: false, failCount: 1, detail: ["Functional component calls customElements.define()"], suggestion: "Remove customElements.define() from functional components. Register in the parent CE's static {} block." };}
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
      if (!isTemplate && hasDollarBraces) {return { pass: true, note: "Not a .template.html file — ${} is valid here" };}
      if (isTemplate && hasDollarBraces) {return { pass: false, failCount: 1, detail: ["${} found in external template"], suggestion: "Replace ${} closures with @click=\"handler\" and use {{ expr }} for data expressions." };}
      return { pass: true };
    },
  },
  {
    id: "vanilla-template-data-part",
    label: "External templates use data-part selectors",
    description: ".template.html files must use data-part=\"role\" attributes, not CSS class names.",
    check: (code, context) => {
      const isTemplate = context?.fileName?.endsWith(".template.html") || false;
      if (!isTemplate) {return { pass: true, note: "Not a template file — skipping" };}
      const classAttributes = code.match(/class\s*=\s*["'][^"']*["']/g);
      const dataPart = code.match(/data-part\s*=\s*["']/g);
      if (classAttributes && (!dataPart || classAttributes.length > dataPart.length)) {
        return { pass: false, failCount: classAttributes.length, detail: (classAttributes || []).slice(0, 5), suggestion: "Replace class=\"...\" with data-part=\"role\" attributes." };
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
      if (!isCe) {return { pass: true, note: "Not a CE — skipping" };}
      const hasHtmlCall = /html\(/.test(code) && /\.template\.html/.test(code);
      if (hasHtmlCall && (hasFetch || hasBundleImport)) {return { pass: true };}
      if (hasHtmlCall && !hasFetch && !hasBundleImport) {return { pass: false, failCount: 1, detail: ["html() used with template but no fetch/import"], suggestion: "Add: const templateStr = await (await fetch(new URL('./_Comp.template.html', import.meta.url))).text();" };}
      return { pass: true, note: "No Pattern C detection needed — skipping" };
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
  architect: [...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  vanilla: [...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  "vanilla-reactive": [...JS_GUARDRAILS, ...VANILLA_REACTIVE_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
};

// ─── Scaffold guardrails (check project config files exist) ───

const SCAFFOLD_CHECK = (fileName, label, checkFunction) => ({
  id: `scaffold-${fileName.replace(/^[.]/, "")}`,
  label: `${fileName} present`,
  description: `Project must have ${fileName} file.`,
  check: (code, context) => {
    if (context?.mode !== "scaffold") {return { pass: true, note: "Only checked in scaffold mode" };}
    return checkFunction(code, context);
  },
});

export const SCAFFOLD_GUARDRAILS = [
  SCAFFOLD_CHECK(".prettierrc", "Prettier config present", (code) => {
    const hasConfig = code.includes('"printWidth"') && code.includes('"tabWidth"') && code.includes('"semi"');
    return { pass: hasConfig, failCount: hasConfig ? 0 : 1, suggestion: "Create .prettierrc at project root with printWidth=120, tabWidth=2, semi=true, trailingComma=all, singleQuote=false." };
  }),
  SCAFFOLD_CHECK(".nvmrc", "NVM config present", (code) => {
    const hasNvmrc = code.trim() === "lts/*" || code.includes("lts/*");
    return { pass: hasNvmrc, failCount: hasNvmrc ? 0 : 1, suggestion: "Create .nvmrc with content: lts/*" };
  }),
  SCAFFOLD_CHECK(".editorconfig", "EditorConfig present", (code) => {
    const hasEc = code.includes("root = true") && code.includes("indent_size = 2");
    return { pass: hasEc, failCount: hasEc ? 0 : 1, suggestion: "Create .editorconfig at project root with indent_size=2, charset=utf-8, end_of_line=lf." };
  }),
  SCAFFOLD_CHECK(".gitignore", "Gitignore present", (code) => {
    const hasOs = code.includes(".DS_Store") || code.includes("Thumbs.db");
    const hasNode = code.includes("node_modules/");
    const hasBuild = code.includes("dist/") || code.includes("build/");
    return { pass: hasOs && hasNode && hasBuild, failCount: [hasOs, hasNode, hasBuild].filter(Boolean).length, suggestion: "Create .gitignore with OS entries (.DS_Store, Thumbs.db), node_modules/, dist/, .env, coverage/." };
  }),
  SCAFFOLD_CHECK("eslint.config.mjs", "ESLint flat config present", (code) => {
    const hasEslint = code.includes("unicorn") || code.includes("@eslint/js") || code.includes("defineConfig");
    return { pass: hasEslint, failCount: hasEslint ? 0 : 1, suggestion: "Create eslint.config.mjs with @eslint/js + eslint-plugin-unicorn (see rule-toolchain-eslint)." };
  }),
  SCAFFOLD_CHECK("tsconfig.json", "TypeScript config present", (code) => {
    const hasTs = code.includes('"strict"') && code.includes('"include"') && code.includes('"src"');
    return { pass: hasTs, failCount: hasTs ? 0 : 1, suggestion: "Create tsconfig.json with strict=true, target=ES2022, module=ESNext, moduleResolution=bundler." };
  }),
  SCAFFOLD_CHECK("jsconfig.json", "JSConfig present", (code) => {
    const hasJs = code.includes('"checkJs"') && code.includes('"include"') && code.includes('"src"');
    return { pass: hasJs, failCount: hasJs ? 0 : 1, suggestion: "Create jsconfig.json with checkJs=true, strict=true, target=ES2022." };
  }),
];

// ─── Architect guardrails ───

export const ARCHITECT_GUARDRAILS = [
  {
    id: "arch-agents-dir",
    label: ".agents/ directory exists",
    description: "Project must have .agents/ directory with instructions, prompts, skills, styleguides subdirectories.",
    check: (code) => {
      const hasAgentsDir = code.includes(".agents/");
      const hasInstructions = code.includes("instructions/");
      const hasPrompts = code.includes("prompts/");
      const hasSkills = code.includes("skills/");
      if (!hasAgentsDir) {return { pass: false, failCount: 1, detail: [], suggestion: "Create .agents/ directory at project root with instructions/, prompts/, skills/, styleguides/ subdirectories." };}
      const missing = [];
      if (!hasInstructions) {missing.push("instructions/");}
      if (!hasPrompts) {missing.push("prompts/");}
      if (!hasSkills) {missing.push("skills/");}
      if (missing.length > 0) {
        return { pass: false, failCount: missing.length, detail: missing.map(m => "Missing: " + m), suggestion: "Create missing subdirectories: " + missing.join(", ") };
      }
      return { pass: true, note: ".agents/ structure looks complete" };
    },
  },
  {
    id: "arch-agents-md",
    label: "AGENTS.md entry point",
    description: "Project must have AGENTS.md with golden rules, where to look, and workflow.",
    check: (code) => {
      const hasGoldenRules = /golden\s*rule/i.test(code) || /project\s*rule/i.test(code);
      const hasWorkflow = /spec|plan|implement|test|docs|pr/i.test(code);
      const hasLocation = /where\s*to\s*look|directory|structure/i.test(code);
      const results = [];
      if (!hasGoldenRules) {results.push("Missing golden rules section");}
      if (!hasWorkflow) {results.push("Missing workflow section");}
      if (!hasLocation) {results.push("Missing 'where to look' section");}
      if (results.length === 0) {return { pass: true, note: "AGENTS.md structure OK" };}
      return { pass: false, failCount: results.length, detail: results, suggestion: "AGENTS.md must include: golden rules, project structure overview, and workflow (Spec → Plan → Implement → Test → Docs → PR)." };
    },
  },
  {
    id: "arch-sdd-specs",
    label: "All 7 SDD specs present",
    description: "Project must have all 7 SDD spec documents in .context/specs/ or cli/.context/specs/.",
    check: (code) => {
      const specs = ["00-sdd", "01-product", "02-domain-glossary", "03-business-logic", "04-config", "05-architecture", "06-quality"];
      const missing = specs.filter(s => !code.includes(s));
      if (missing.length === 0) {return { pass: true, note: "All 7 SDD specs referenced" };}
      if (missing.length <= 3) {return { pass: true, note: missing.length + " specs still to create (in progress)" };}
      return { pass: false, failCount: missing.length, detail: missing, suggestion: "Create " + missing.join(", ") + " in .context/specs/. Use pix_architect mode=scaffold to generate templates." };
    },
  },
  {
    id: "arch-placeholders-filled",
    label: "No unfilled placeholders in .context/",
    description: "All .context/ files must be generated with real values, not raw [PLACEHOLDER] markers.",
    check: (code) => {
      const unfilled = code.match(/\[PLACEHOLDER_\w+\]/g) || code.match(/\[UNFILLED\]/g) || [];
      if (unfilled.length === 0) {return { pass: true, note: "No unfilled placeholders" };}
      return { pass: false, failCount: unfilled.length, detail: unfilled.slice(0, 10), suggestion: "Fill all remaining placeholders. Use pix_architect mode=interview for the guided wizard, or manually edit .context/ files." };
    },
  },
  {
    id: "arch-context-cli",
    label: "Context generation CLI",
    description: "Project must have cli/ directory with context generation scripts.",
    check: (code) => {
      const hasCliDir = code.includes("cli/");
      const hasTemplates = code.includes(".context/");
      const hasCliJs = code.includes("cli.js");
      if (!hasCliDir) {return { pass: false, failCount: 1, detail: ["Missing cli/ directory"], suggestion: "Create cli/ with cli.js and .context/ templates." };}
      const missing = [];
      if (!hasTemplates) {missing.push(".context/ templates");}
      if (!hasCliJs) {missing.push("cli.js entry point");}
      if (missing.length > 0) {
        return { pass: false, failCount: missing.length, detail: missing, suggestion: "Add missing: " + missing.join(", ") };
      }
      return { pass: true, note: "CLI structure OK" };
    },
  },
  {
    id: "arch-workflow-prompt",
    label: "AI_WORKFLOW.md describes workflow",
    description: "Project must have AI_WORKFLOW.md or equivalent describing the Spec → Plan → Implement → Test → Docs → PR process.",
    check: (code) => {
      const phases = ["spec", "plan", "implement", "test", "docs", "pr"];
      const found = phases.filter(p => code.toLowerCase().includes(p));
      if (found.length >= 4) {return { pass: true, note: found.length + "/6 workflow phases found" };}
      return { pass: false, failCount: 6 - found.length, detail: phases.filter(p => !found.includes(p)), suggestion: "Document the workflow: Spec → Plan → Implement → Test → Docs → PR in AI_WORKFLOW.md." };
    },
  },
  {
    id: "arch-instructions",
    label: "Instructions for coding, testing, docs",
    description: "Project must have .agents/instructions/ with coding.instructions.md, testing.instructions.md, and docs.instructions.md.",
    check: (code) => {
      const hasCoding = code.includes("coding");
      const hasTesting = code.includes("testing");
      const hasDocs = code.includes("docs");
      const missing = [];
      if (!hasCoding) {missing.push("coding.instructions.md");}
      if (!hasTesting) {missing.push("testing.instructions.md");}
      if (!hasDocs) {missing.push("docs.instructions.md");}
      if (missing.length === 0) {return { pass: true, note: "All instruction files present" };}
      return { pass: false, failCount: missing.length, detail: missing, suggestion: "Create " + missing.join(", ") + " in .agents/instructions/." };
    },
  },
  {
    id: "arch-domain-glossary",
    label: "Domain glossary defined",
    description: "Spec 02 (Domain Glossary) must exist with key terms defined.",
    check: (code) => {
      const hasGlossary = /domain\s*glossary|#\s*glossary|core\s*entity|term\s*definition/i.test(code);
      return { pass: hasGlossary, failCount: hasGlossary ? 0 : 1, suggestion: "Create a domain glossary (Spec 02) with all key terms, entities, and relationships." };
    },
  },
];

// ─── Backend guardrails (Express, Fastify, NestJS, Hono, Node) ───

export const BACKEND_GUARDRAILS = [
  {
    id: "sql-injection",
    label: "No SQL injection via string concatenation",
    description: "All SQL queries must use parameterized placeholders ($1, ?, :name). No string concatenation with user input.",
    check: (code) => {
      const concatPatterns = [
        /db\.query\(["']SELECT[^"']*["']\s*\+\s*\w+/gi,
        /db\.query\(["']INSERT[^"']*["']\s*\+\s*\w+/gi,
        /db\.query\(["']UPDATE[^"']*["']\s*\+\s*\w+/gi,
        /db\.query\(["']DELETE[^"']*["']\s*\+\s*\w+/gi,
        /db\.query\(`SELECT[^`]*\${/gi,
        /db\.query\(`INSERT[^`]*\${/gi,
        /db\.query\(`UPDATE[^`]*\${/gi,
        /db\.query\(`DELETE[^`]*\${/gi,
        /\.query\(["']SELECT.*["']\s*\+\s*req\./gi,
        /\.query\(["']SELECT.*["']\s*\+\s*ctx\./gi,
      ];
      const violations = [];
      for (const re of concatPatterns) {
        const m = code.match(re);
        if (m) {violations.push(...m);}
      }
      const hasQuery = /\.query\(|\.execute\(|Model\.find/i.test(code);
      if (!hasQuery) {return { pass: true, note: "No SQL queries found, skipping" };}
      return {
        pass: violations.length === 0,
        failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion: "Use parameterized queries: db.query('SELECT ... WHERE id = $1', [id]). Never concatenate user input into SQL strings.",
      };
    },
  },
  {
    id: "error-exposure",
    label: "No internal error details in responses",
    description: "Production error responses must not expose stack traces or internal error messages.",
    check: (code) => {
      const patterns = [
        /res\.(?:status|json|send)\(.*err\.stack/gi,
        /res\.(?:status|json|send)\(.*error\.stack/gi,
        /\.json\(\{\s*error:\s*err\.message/gi,
        /\.json\(\{\s*error:\s*e\.message/gi,
        /\.send\(err\.message\)/gi,
      ];
      const violations = [];
      for (const re of patterns) { const m = code.match(re); if (m) {violations.push(...m);} }
      return {
        pass: violations.length === 0,
        failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion: "Return generic messages: res.status(500).json({ error: 'Internal server error' }). Log details server-side only.",
      };
    },
  },
  {
    id: "input-validation",
    label: "Input validation present",
    description: "Request body and params must be validated (Zod, Joi, class-validator).",
    check: (code) => {
      const hasInput = /req\.body|req\.params|req\.query|request\.body|@Body\(\)|@Param\(\)|@Query\(\)/i.test(code);
      if (!hasInput) {return { pass: true, note: "No request input detected, skipping" };}
      const hasValidation = /z\.(?:object|string|number|boolean)|\.parse\(|\.safeParse\(|Joi\.(?:object|string)|class-validator|@Validate|express-validator/i.test(code);
      return {
        pass: hasValidation, failCount: hasValidation ? 0 : 1,
        detail: hasValidation ? [] : ["No input validation found"],
        suggestion: "Add input validation with Zod, Joi, or class-validator before processing request data.",
      };
    },
  },
  {
    id: "cors-explicit",
    label: "CORS configured with explicit origins",
    description: "CORS must not use wildcard origin (*). Specify explicit allowed origins.",
    check: (code) => {
      const hasCors = /cors\(\)|@fastify\/cors|app\.enableCors/i.test(code);
      if (!hasCors) {return { pass: true, note: "CORS not configured, skipping" };}
      const isCorsWildcard = /origin:\s*["']\*["']/gi.test(code);
      return {
        pass: !isCorsWildcard, failCount: isCorsWildcard ? 1 : 0,
        detail: isCorsWildcard ? ["Wildcard origin (*) found"] : [],
        suggestion: "Replace origin: '*' with an explicit allowlist of allowed origins.",
      };
    },
  },
  {
    id: "rate-limiting",
    label: "Rate limiting configured",
    description: "API endpoints should have rate limiting enabled.",
    check: (code) => {
      const isServer = /app\.(?:listen|get|post|put|delete|patch)/i.test(code) || /createServer/i.test(code) || /bootstrap\(\)/i.test(code);
      if (!isServer) {return { pass: true, note: "Not a server file, skipping" };}
      const hasRateLimit = /express-rate-limit|rateLimit\(|@fastify\/rate-limit|ThrottlerModule|@Throttle/i.test(code);
      return {
        pass: hasRateLimit, failCount: hasRateLimit ? 0 : 1,
        detail: hasRateLimit ? [] : ["No rate limiting detected"],
        suggestion: "Add rate limiting: express-rate-limit (Express), @fastify/rate-limit (Fastify), ThrottlerModule (NestJS).",
      };
    },
  },
  {
    id: "helmet-headers",
    label: "Security headers via helmet",
    description: "HTTP security headers should be set via helmet or framework equivalent.",
    check: (code) => {
      const isServer = /app\.(?:listen|get|post|use)/i.test(code) || /createServer/i.test(code) || /bootstrap\(\)/i.test(code);
      if (!isServer) {return { pass: true, note: "Not a server file, skipping" };}
      const hasHelmet = /helmet\(\)|require\(["']helmet["']\)|@fastify\/helmet|from ["']helmet["']/i.test(code);
      return {
        pass: hasHelmet, failCount: hasHelmet ? 0 : 1,
        detail: hasHelmet ? [] : ["No security headers detected"],
        suggestion: "Add helmet: app.use(helmet()) in Express, register @fastify/helmet in Fastify, app.use(helmet()) in NestJS.",
      };
    },
  },
];

// ─── Database guardrails (PostgreSQL, MySQL, MongoDB, SQLite, DuckDB, SQL) ───

export const DATABASE_GUARDRAILS = [
  {
    id: "migration-safety",
    label: "Safe DDL operations",
    description: "DDL must use IF NOT EXISTS / IF EXISTS for idempotent migrations.",
    check: (code) => {
      const hasDdl = /CREATE\s+TABLE|DROP\s+TABLE|ALTER\s+TABLE/i.test(code);
      if (!hasDdl) {return { pass: true, note: "No DDL found, skipping" };}
      const unsafeCreate = code.match(/CREATE\s+TABLE\s+(?!.*IF\s+NOT\s+EXISTS)/gi) || [];
      const unsafeDrop = code.match(/DROP\s+TABLE\s+(?!.*IF\s+EXISTS)/gi) || [];
      const violations = [...unsafeCreate, ...unsafeDrop];
      return {
        pass: violations.length === 0, failCount: violations.length,
        detail: violations.slice(0, 5),
        suggestion: "Use CREATE TABLE IF NOT EXISTS, DROP TABLE IF EXISTS for safe, idempotent migrations.",
      };
    },
  },
  {
    id: "parameterized-queries",
    label: "Parameterized database queries",
    description: "Queries must use placeholders ($1, ?, :name), not string concatenation.",
    check: (code) => {
      const hasQuery = /\.query\(|\.execute\(|db\.run\(|db\.all\(|db\.get\(|Model\.find|Model\.aggregate/i.test(code);
      if (!hasQuery) {return { pass: true, note: "No database queries found, skipping" };}
      const isBad = /\.query\(`[^`]*\${[^}]+\}[^`]*`\)|\.query\(["'][^"']*["']\s*\+\s*\w+/gi.test(code);
      return {
        pass: !isBad, failCount: isBad ? 1 : 0,
        detail: isBad ? ["Query uses string concatenation or template substitution"] : [],
        suggestion: "Use parameterized queries: db.query('SELECT * FROM t WHERE id = $1', [id]).",
      };
    },
  },
  {
    id: "transaction-safety",
    label: "Multi-statement transactions",
    description: "Multiple mutations should be wrapped in a transaction.",
    check: (code) => {
      const mutations = (code.match(/\.(?:insert|create|update|delete|save)\s*\(/gi) || []);
      if (mutations.length < 2) {return { pass: true, note: "Less than 2 mutations, transaction not required" };}
      const hasTx = /BEGIN|COMMIT|ROLLBACK|transaction\(|tx\s*=>|@Transactional/i.test(code);
      return {
        pass: hasTx, failCount: hasTx ? 0 : 1,
        detail: hasTx ? [] : [`${mutations.length} mutations without transaction`],
        suggestion: "Wrap multiple mutations in a transaction: await db.transaction(async (tx) => { ... }).",
      };
    },
  },
  {
    id: "connection-pool",
    label: "Connection pooling",
    description: "Database clients should use connection pooling with explicit max pool size.",
    check: (code) => {
      const hasPool = /new\s+Pool\(|createPool\(|maxPoolSize|connectionLimit|pool_size|max\s*:\s*\d+/i.test(code);
      const hasClient = /new\s+(?:pg\.)?Client\(|createConnection\(/i.test(code);
      if (hasClient && !hasPool) {
        const isServer = /app\.(?:listen|get|post)|createServer/i.test(code);
        if (!isServer) {return { pass: true, note: "Script-style DB client, pool not required" };}
        return { pass: false, failCount: 1, detail: ["Client without pool in server code"], suggestion: "Use Pool instead of Client for servers: new Pool({ max: 20 })." };
      }
      if (!hasClient && !hasPool && !/Pool|pool/i.test(code)) {return { pass: true, note: "No DB client or ORM-managed pooling, skipping" };}
      return { pass: true, note: hasPool ? "Connection pool detected" : "ORM likely handles pooling" };
    },
  },
];

// ─── DevOps & security guardrails (Docker, CI, secrets) ───

export const DEVOPS_GUARDRAILS = [
  {
    id: "docker-non-root",
    label: "Container runs as non-root user",
    description: "Docker containers must switch to a non-root user.",
    check: (code) => {
      if (!/^FROM\s+/im.test(code)) {return { pass: true, note: "Not a Dockerfile, skipping" };}
      const hasUser = /^USER\s+(?!root\b)\w+/im.test(code);
      return {
        pass: hasUser, failCount: hasUser ? 0 : 1,
        detail: hasUser ? [] : ["No non-root USER instruction"],
        suggestion: "Add 'USER node' (or USER 1001) after installing dependencies.",
      };
    },
  },
  {
    id: "docker-healthcheck",
    label: "HEALTHCHECK defined",
    description: "Production images should include a HEALTHCHECK.",
    check: (code) => {
      if (!/^FROM\s+/im.test(code)) {return { pass: true, note: "Not a Dockerfile, skipping" };}
      const isOk = /^HEALTHCHECK\s+/im.test(code);
      return {
        pass: isOk, failCount: isOk ? 0 : 1,
        detail: isOk ? [] : ["No HEALTHCHECK found"],
        suggestion: "Add: HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/health || exit 1",
      };
    },
  },
  {
    id: "secret-detection",
    label: "No hardcoded secrets",
    description: "Passwords, API keys, and tokens must use environment variables.",
    check: (code) => {
      const secrets = code.match(/(?:password|passwd|secret|apiKey|api_key|token|api_secret)\s*[:=]\s*["'][^"']{8,}["']/gi) || [];
      const nonEnvironment = secrets.filter(s => !/process\.env/i.test(code.slice(Math.max(0, code.indexOf(s) - 80), code.indexOf(s))));
      return {
        pass: nonEnvironment.length === 0, failCount: nonEnvironment.length,
        detail: nonEnvironment.slice(0, 3).map(s => s.slice(0, 60)),
        suggestion: "Store secrets in environment variables: process.env.DB_PASSWORD. Never hardcode credentials.",
      };
    },
  },
  {
    id: "env-gitignore",
    label: ".env in .gitignore",
    description: ".env files must be in .gitignore to prevent committing secrets.",
    check: (code, context) => {
      if (!context?.fileName?.includes(".gitignore")) {return { pass: true, note: "Not .gitignore, skipping" };}
      const isOk = /\.env\b/.test(code);
      return {
        pass: isOk, failCount: isOk ? 0 : 1,
        detail: isOk ? [] : [".env not in .gitignore"],
        suggestion: "Add .env to .gitignore to prevent committing environment files.",
      };
    },
  },
];

// ─── Utility (used by guardrail checks) ───

/**
 * Extract ONLY actual CSS content from code. Uses multiple strategies
 * to avoid false-positives from JS/JSX/TS code.
 * If the filename context indicates a CSS file, returns the full code.
 */
function extractRealCSS(code, context = {}) {
  const cssBlocks = [];

  // If this is a CSS file, the entire content is CSS
  if (context?.fileName && /\.css$/i.test(context.fileName)) {
    return code;
  }

  const fencedCss = code.match(/```css\n([\s\S]*?)```/g);
  if (fencedCss) {cssBlocks.push(...fencedCss.map(c => c.replaceAll(/```css\n|```/g, "").trim()));}

  const sheetCss = code.match(/CSSStyleSheet\.replaceSync\(`([\s\S]*?)`\)/g);
  if (sheetCss) {cssBlocks.push(...sheetCss.map(c => c.match(/`([\s\S]*?)`/)?.[1] || "").filter(Boolean));}

  const styleBlocks = code.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
  if (styleBlocks) {cssBlocks.push(...styleBlocks.map(c => c.replaceAll(/<style[^>]*>|<\/style>/g, "").trim()));}

  return cssBlocks.join("\n\n");
}
