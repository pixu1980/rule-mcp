// Auto-split from src/core/guardrail-defs.js - see ./index.js
import { extractRealCSS } from "./util.js";

export const SHARED_GUARDRAILS = [
  {
    id: "no-css-classes",
    label: "Zero CSS classes in stylesheets",
    description:
      "CSS must use only element selectors + [data-part] + [data-*] attribute selectors. No .class selectors (including pseudo-classes and combinators).",
    check: (code, context) => {
      const cssBlock = extractRealCSS(code, context);
      if (!cssBlock) {
        return { pass: true, note: "No CSS block found, skipping" };
      }
      // Match class selectors including: .foo, .foo:hover, .foo > span, .foo.bar, .foo::before
      const classRules = cssBlock.match(/^\s*\.[a-zA-Z][\w-]*(?:\s*[{,:.\s>+~])/gm);
      return {
        pass: !classRules || classRules.length === 0,
        failCount: classRules?.length || 0,
        detail: classRules ? classRules.slice(0, 10).map((s) => s.trim()) : [],
        suggestion: 'Replace .class selectors with element selectors or [data-part="..."] attribute selectors.',
      };
    },
  },
  {
    id: "no-inline-styles",
    label: "Zero inline styles in templates",
    description:
      'Templates must not use style="..." attributes or JSX style={{...}} objects. All styling in external CSS files.',
    check: (code) => {
      const inlineAttributes = code.match(/style\s*=\s*"[^"]*"/g) || [];
      const inlineSingle = code.match(/style\s*=\s*'[^']*'/g) || [];
      // JSX/TSX: style={{...}} (React, Solid)
      const jsxStyle = code.match(/style\s*=\s*\{\{[^}]*\}\}/g) || [];
      inlineAttributes.push(...inlineSingle, ...jsxStyle);
      if (inlineAttributes.length === 0) {
        return { pass: true, note: "No inline style attributes found" };
      }
      const exceptions = code.match(/accent-option|contextmenu|context-menu/g);
      const effective = inlineAttributes.filter((a) => !exceptions || exceptions.every((e) => !a.includes(e)));
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
    description:
      "No <div> where <section>, <article>, <header>, <footer>, <nav>, <main>, <aside>, <form>, <ul>, <ol>, <li>, <search> exists.",
    check: (code) => {
      const nonSemanticDivPatterns = [
        /<div[^>]*data-part="(header|footer|body|modal|content|nav|search|form|tabs|card|summary|stats|list|item|sidebar|banner|main)"/gi,
        /<div[^>]*class="[^"]*(header|footer|nav|sidebar|main|content|list|card)[^"]*"/gi,
        /<div[^>]*role="(banner|contentinfo|navigation|main|complementary|form|search|tablist|list|listitem)"/gi,
      ];
      const violations = [];
      for (const re of nonSemanticDivPatterns) {
        const m = code.match(re);
        if (m) {
          violations.push(...m);
        }
      }
      if (violations.length === 0) {
        return { pass: true, note: "No semantic-violating <div> found" };
      }
      return {
        pass: false,
        failCount: violations.length,
        detail: violations.slice(0, 10),
        suggestion:
          'Replace <div data-part="header|footer|..."> with the matching semantic element. Use: <header>, <footer>, <section>, <article>, <nav>, <search>, <form>, <ul>, <ol>, <main>, <aside>.',
      };
    },
  },
  {
    id: "external-css",
    label: "External CSS via adoptedStyleSheets or framework-native import",
    description:
      "CSS must be loaded as external file. Use fetch→CSSStyleSheet.replaceSync→adoptedStyleSheets for vanilla, or framework-native imports (Angular styleUrls, Svelte <style>, CSS Modules or plain import for React/Solid).",
    check: (code, context) => {
      const framework = context?.framework || "vanilla";
      // CSS files are themselves external CSS
      if (context?.fileName && /\.css$/i.test(context.fileName)) {
        return { pass: true, note: "CSS file is external CSS by definition" };
      }
      if (framework === "angular" && code.includes("styleUrls")) {
        return { pass: true, note: "Angular styleUrls OK" };
      }
      if (framework === "angular" && code.includes("@Component") && code.includes(".css")) {
        return { pass: true, note: "Angular external CSS via component styles" };
      }
      if (framework === "svelte" && (/import\s+['"].*\.css['"]/.test(code) || code.includes("<style>"))) {
        return { pass: true, note: "Svelte CSS import or scoped style OK" };
      }
      // React/Solid: accept both `import "./foo.css"` and `import styles from "./foo.module.css"`
      if ((framework === "react" || framework === "solid") && /import\s+.*['"].*\.css['"]/.test(code)) {
        return { pass: true, note: "CSS import or CSS Modules OK" };
      }
      if (code.includes("adoptedStyleSheets") && code.includes("CSSStyleSheet")) {
        return { pass: true, note: "adoptedStyleSheets OK" };
      }
      const hasCssContent = extractRealCSS(code, context);
      if (!hasCssContent) {
        return { pass: true, note: "No CSS content found, skipping" };
      }
      return {
        pass: false,
        failCount: 1,
        suggestion:
          "Load CSS via an external file mechanism: adoptedStyleSheets (vanilla), styleUrls (Angular), <style> (Svelte), or CSS Modules (React).",
      };
    },
  },
  {
    id: "barrel-file-tree",
    label: "Barrel pattern (index.js)",
    description: "Every component folder must have an index.js barrel that re-exports the public API.",
    check: (code, context) => {
      const isBarrel =
        context?.fileName === "index.js" ||
        context?.fileName === "index.ts" ||
        context?.fileName === "index.jsx" ||
        context?.fileName === "index.tsx";
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
      if (!context?.fileName) {
        return { pass: true, note: "No filename context" };
      }
      const name = context.fileName;
      const isComponent = context.isComponent;
      if (!isComponent) {
        return { pass: true, note: "Not a component file" };
      }
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
    description: 'Component child elements with semantic roles must use data-part="role" attributes.',
    check: (code) => {
      const hasDataPart = code.includes('data-part="');
      const hasChildren =
        code.includes("<div") || code.includes("<section") || code.includes("<header") || code.includes("<nav");
      if (!hasChildren) {
        return { pass: true, note: "No child elements found" };
      }
      return {
        pass: hasDataPart,
        failCount: hasDataPart ? 0 : 1,
        suggestion:
          'Add data-part="role" attributes to child elements: <section data-part="list">, <button data-part="delete">.',
      };
    },
  },
  {
    id: "jsdoc-required",
    label: "JSDoc on every exported symbol",
    description:
      "Every JS/TS file must have JSDoc on all exported functions, classes, constants, and types. Module-level JSDoc recommended.",
    check: (code, context) => {
      const fileName = context?.fileName || "";
      if (fileName === "index.js" || fileName === "index.ts") {
        return { pass: true, note: "Barrel file, skipping JSDoc check" };
      }

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
          if (!symbol) {
            continue;
          }
          const before = code.slice(Math.max(0, match.index - 200), match.index);
          if (!before.includes("/**")) {
            missingDocs.push(symbol);
          }
        }
      }

      if (missingDocs.length === 0) {
        return { pass: true, note: "All exported symbols have JSDoc" };
      }
      return {
        pass: false,
        failCount: missingDocs.length,
        detail: missingDocs.slice(0, 10).map((s) => `Missing JSDoc: ${s}`),
        suggestion:
          "Add JSDoc blocks before each exported symbol. Format: /** ... */ with @param and @returns where applicable.",
      };
    },
  },
  {
    id: "css-comments-required",
    label: "CSS file-level comments",
    description:
      "Every CSS file must start with a file-level comment describing its purpose, scope, and usage. Sections should be separated by comment headers.",
    check: (code, context) => {
      // Only check CSS files or files with explicit CSS blocks
      const isCssFile = context?.fileName && /\.css$/i.test(context.fileName);
      const hasCssBlock = /```css|CSSStyleSheet|<style[^>]*>/i.test(code);
      if (!isCssFile && !hasCssBlock) {
        return { pass: true, note: "Not a CSS file and no CSS block detected, skipping" };
      }
      const hasCSSRules = /[\w-]+\s*\{/.test(code);
      if (!hasCSSRules) {
        return { pass: true, note: "No CSS rules detected, skipping" };
      }

      const trimmed = code.trimStart();
      const hasFileComment =
        /\/\*\*\s*\n/.test(trimmed) ||
        /\/\*\s*FILE:/i.test(trimmed) ||
        /\/\*\s*USAGE:/i.test(trimmed) ||
        /\/\*\s*SCOPE:/i.test(trimmed);
      if (!hasFileComment) {
        return {
          pass: false,
          failCount: 1,
          detail: ["Missing file-level comment"],
          suggestion:
            "Add a file-level comment at the top: /**\n * FILE: _Component.css\n * USAGE: Styles for ComponentName\n * SCOPE: selector\n */",
        };
      }

      const lines = code.split("\n").filter((l) => l.trim());
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
    description:
      "Every project MUST have automated a11y tests using Playwright and @axe-core/playwright. Tests must live in tests/a11y/ and must include an axe-core scan with expect(results.violations).toEqual([]).",
    check: (code, context) => {
      const isTestFile =
        context?.fileName?.includes(".spec.") || context?.fileName?.includes(".test.") || context?.mode === "test";
      const hasAxeImport = /@axe-core\/playwright/.test(code) || /from\s+['"]@axe-core\/playwright['"]/.test(code);
      const hasAxeBuilder = /new\s+AxeBuilder/.test(code) || /AxeBuilder/.test(code);
      const hasViolationCheck = /\.violations\s*\.toEqual/.test(code) || /expect\(.*\.violations\)/.test(code);
      const hasPlaywright = /from\s+['"]@playwright\/test['"]/.test(code);
      const hasPlaywrightConfig = /playwright\.config/.test(code);

      const details = [];
      if (!hasPlaywright && !isTestFile) {
        details.push("No @playwright/test import");
      }
      if (!hasAxeImport) {
        details.push("No @axe-core/playwright import");
      }
      if (!hasAxeBuilder) {
        details.push("No AxeBuilder usage");
      }
      if (!hasViolationCheck) {
        details.push("No violation assertion (expect(results.violations).toEqual([]))");
      }

      if (context?.mode === "scaffold" || context?.fileName === "playwright.config.js") {
        const isConfigValid = hasPlaywrightConfig || (hasPlaywright && hasAxeImport);
        return {
          pass: isConfigValid,
          failCount: isConfigValid ? 0 : 1,
          detail: ["Missing playwright.config.js or @axe-core/playwright dependency"],
          suggestion:
            "Create playwright.config.js and install: pnpm install --save-dev playwright @axe-core/playwright",
        };
      }

      if (isTestFile || hasPlaywright || hasAxeImport) {
        const failCount = details.length;
        return {
          pass: failCount === 0,
          failCount,
          detail: details,
          suggestion:
            failCount === 0
              ? ""
              : "Add the missing a11y test infrastructure: import AxeBuilder from @axe-core/playwright, run new AxeBuilder({ page }).analyze(), and assert expect(results.violations).toEqual([]).",
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
    description:
      "When allowedDependencies context is provided, every external import must exist in that manifest-derived list.",
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
        .map((name) => (name.startsWith("@") ? name.split("/").slice(0, 2).join("/") : name.split("/", 1)[0]));
      const unknown = [...new Set(packages.filter((name) => !allowed.has(name)))];
      return {
        pass: unknown.length === 0,
        failCount: unknown.length,
        detail: unknown,
        suggestion:
          "Use only dependencies declared by the project manifest or add an explicit, reviewed dependency decision.",
      };
    },
  },
];
