/**
 * pix-galaxy-mcp Guardrail Definitions
 *
 * Single source of truth for all guardrail check functions.
 * Extracted from guardrails.js to keep the engine module lean.
 *
 * Each guardrail is: { id, label, description, check: (code, context) => { pass, failCount, detail, suggestion } }
 */

// ─── Shared guardrails (apply to all pix skills) ───

export const SHARED_GUARDRAILS = [
  {
    id: "no-css-classes",
    label: "Zero CSS classes in stylesheets",
    description: "CSS must use only element selectors + [data-part] + [data-*] attribute selectors. No .class selectors.",
    check: (code) => {
      const cssBlock = extractRealCSS(code);
      if (!cssBlock) return { pass: true, note: "No CSS block found, skipping" };
      const classRules = cssBlock.match(/^\s*\.[a-zA-Z][\w-]*\s*\{/gm);
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
    description: "Templates must not use style=\"...\" attributes. All styling in external CSS files.",
    check: (code) => {
      const inlineAttrs = code.match(/style\s*=\s*"[^"]*"/g) || [];
      const inlineSingle = code.match(/style\s*=\s*'[^']*'/g) || [];
      inlineAttrs.push(...inlineSingle);
      if (inlineAttrs.length === 0) return { pass: true, note: "No inline style attributes found" };
      const exceptions = code.match(/accent-option|contextmenu|context-menu/g);
      const effective = inlineAttrs.filter(a => !exceptions || !exceptions.some(e => a.includes(e)));
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
        if (m) violations.push(...m);
      }
      if (violations.length === 0) return { pass: true, note: "No semantic-violating <div> found" };
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
    description: "CSS must be loaded as external file. Use fetch→CSSStyleSheet.replaceSync→adoptedStyleSheets for vanilla, or framework-native imports (Angular styleUrls, Svelte <style>, CSS Modules for React).",
    check: (code, context) => {
      const framework = context?.framework || "vanilla";
      if (framework === "angular" && code.includes("styleUrls")) return { pass: true, note: "Angular styleUrls OK" };
      if (framework === "angular" && code.includes("@Component") && code.includes(".css")) return { pass: true, note: "Angular external CSS via component styles" };
      if (framework === "svelte" && (code.includes("import .*.css") || code.includes("<style>"))) return { pass: true, note: "Svelte CSS import or scoped style OK" };
      if ((framework === "react" || framework === "solid") && (code.includes("import .*.css") || code.includes(".module.css"))) return { pass: true, note: "CSS import or CSS Modules OK" };
      if (code.includes("adoptedStyleSheets") && code.includes("CSSStyleSheet")) return { pass: true, note: "adoptedStyleSheets OK" };
      const hasCssContent = extractRealCSS(code);
      if (!hasCssContent) return { pass: true, note: "No CSS content found, skipping" };
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
      if (!context?.fileName) return { pass: true, note: "No filename context" };
      const name = context.fileName;
      const isComponent = context.isComponent;
      if (!isComponent) return { pass: true, note: "Not a component file" };
      const valid = /^_[A-Z][a-zA-Z0-9]*\.\w+$/.test(name);
      return {
        pass: valid,
        failCount: valid ? 0 : 1,
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
      if (!hasChildren) return { pass: true, note: "No child elements found" };
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
      if (fileName === "index.js" || fileName === "index.ts") return { pass: true, note: "Barrel file, skipping JSDoc check" };

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
          const symbol = match[match.length - 1] || match[2] || "";
          if (!symbol) continue;
          const before = code.slice(Math.max(0, match.index - 200), match.index);
          if (!before.includes("/**")) missingDocs.push(symbol);
        }
      }

      if (missingDocs.length === 0) return { pass: true, note: "All exported symbols have JSDoc" };
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
      const hasCSSRules = /[\w-]+\s*\{/.test(code);
      if (!hasCSSRules) return { pass: true, note: "No CSS rules detected, skipping" };

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
      if (!hasPlaywright && !isTestFile) details.push("No @playwright/test import");
      if (!hasAxeImport) details.push("No @axe-core/playwright import");
      if (!hasAxeBuilder) details.push("No AxeBuilder usage");
      if (!hasViolationCheck) details.push("No violation assertion (expect(results.violations).toEqual([]))");

      if (context?.mode === "scaffold" || context?.fileName === "playwright.config.js") {
        const configValid = hasPlaywrightConfig || (hasPlaywright && hasAxeImport);
        return {
          pass: configValid,
          failCount: configValid ? 0 : 1,
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
        .map((name) => name.startsWith("@") ? name.split("/").slice(0, 2).join("/") : name.split("/")[0]);
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
// These check the LLM output file tree against pix galaxy conventions.
// They are registered in the FRAMEWORK_GUARDRAILS map for
// pix-styleguide, pix-architect, and all UI framework skills.

export const FILE_TREE_GUARDRAILS = [
  {
    id: "component-folder-barrel",
    label: "Component folder has index.js barrel file",
    description: "Every component folder must have an index.js (or index.ts) that re-exports the public API. The barrel must contain at least one export statement.",
    check: (code, context) => {
      const fileName = context?.fileName || "";
      if (!fileName.match(/^index\.(js|ts|jsx|tsx)$/)) {
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

      const valid = /^_[A-Z][a-zA-Z0-9]*\.\w+$/.test(fileName);
      if (valid) {
        return { pass: true, failCount: 0, detail: [], suggestion: "", note: "File name follows _PascalCase.ext convention" };
      }

      const correctName = fileName.startsWith("_") ? fileName : `_${fileName}`;
      return {
        pass: false,
        failCount: 1,
        detail: [`File "${fileName}" does not follow the _PascalCase.ext convention`],
        suggestion: `Rename to "${correctName}". Component files inside component folders must start with underscore + PascalCase.`,
      };
    },
  },
  {
    id: "barrel-exports-match-files",
    label: "Barrel exports match actual component files",
    description: "The barrel file's export statements must reference existing component files with the correct _PascalCase names.",
    check: (code, context) => {
      const fileName = context?.fileName || "";
      if (!fileName.match(/^index\.(js|ts|jsx|tsx)$/)) {
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
      if (!hooks) return { pass: true, note: "No hooks found" };
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

export const FRAMEWORK_GUARDRAILS = {
  react: [...REACT_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  vue: [...VUE_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  angular: [...ANGULAR_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  svelte: [...SVELTE_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  solid: [...FILE_TREE_GUARDRAILS],
  astro: [...FILE_TREE_GUARDRAILS],
  architect: [...FILE_TREE_GUARDRAILS],
  vanilla: [...FILE_TREE_GUARDRAILS],
};

// ─── Scaffold guardrails (check project config files exist) ───

const SCAFFOLD_CHECK = (fileName, label, checkFn) => ({
  id: `scaffold-${fileName.replace(/^[.]/, "")}`,
  label: `${fileName} present`,
  description: `Project must have ${fileName} file.`,
  check: (code, context) => {
    if (context?.mode !== "scaffold") return { pass: true, note: "Only checked in scaffold mode" };
    return checkFn(code, context);
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
  SCAFFOLD_CHECK(".eslintrc.json", "ESLint config present", (code) => {
    const hasEslint = code.includes('"eslint:recommended"') || code.includes('"extends"');
    return { pass: hasEslint, failCount: hasEslint ? 0 : 1, suggestion: "Create .eslintrc.json with eslint:recommended, browser+es2024+node env." };
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
      if (!hasAgentsDir) return { pass: false, failCount: 1, detail: [], suggestion: "Create .agents/ directory at project root with instructions/, prompts/, skills/, styleguides/ subdirectories." };
      const missing = [];
      if (!hasInstructions) missing.push("instructions/");
      if (!hasPrompts) missing.push("prompts/");
      if (!hasSkills) missing.push("skills/");
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
      if (!hasGoldenRules) results.push("Missing golden rules section");
      if (!hasWorkflow) results.push("Missing workflow section");
      if (!hasLocation) results.push("Missing 'where to look' section");
      if (results.length === 0) return { pass: true, note: "AGENTS.md structure OK" };
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
      if (missing.length === 0) return { pass: true, note: "All 7 SDD specs referenced" };
      if (missing.length <= 3) return { pass: true, note: missing.length + " specs still to create (in progress)" };
      return { pass: false, failCount: missing.length, detail: missing, suggestion: "Create " + missing.join(", ") + " in .context/specs/. Use pix_architect mode=scaffold to generate templates." };
    },
  },
  {
    id: "arch-placeholders-filled",
    label: "No unfilled placeholders in .context/",
    description: "All .context/ files must be generated with real values, not raw [PLACEHOLDER] markers.",
    check: (code) => {
      const unfilled = code.match(/\[PLACEHOLDER_\w+\]/g) || code.match(/\[UNFILLED\]/g) || [];
      if (unfilled.length === 0) return { pass: true, note: "No unfilled placeholders" };
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
      if (!hasCliDir) return { pass: false, failCount: 1, detail: ["Missing cli/ directory"], suggestion: "Create cli/ with cli.js and .context/ templates." };
      const missing = [];
      if (!hasTemplates) missing.push(".context/ templates");
      if (!hasCliJs) missing.push("cli.js entry point");
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
      if (found.length >= 4) return { pass: true, note: found.length + "/6 workflow phases found" };
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
      if (!hasCoding) missing.push("coding.instructions.md");
      if (!hasTesting) missing.push("testing.instructions.md");
      if (!hasDocs) missing.push("docs.instructions.md");
      if (missing.length === 0) return { pass: true, note: "All instruction files present" };
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

// ─── Utility (used by guardrail checks) ───

/**
 * Extract ONLY actual CSS content from code. Uses multiple strategies
 * to avoid false-positives from JS/JSX/TS code.
 */
function extractRealCSS(code) {
  const cssBlocks = [];

  const fencedCss = code.match(/```css\n([\s\S]*?)```/g);
  if (fencedCss) cssBlocks.push(...fencedCss.map(c => c.replace(/```css\n|```/g, "").trim()));

  const sheetCss = code.match(/CSSStyleSheet\.replaceSync\(`([\s\S]*?)`\)/g);
  if (sheetCss) cssBlocks.push(...sheetCss.map(c => c.match(/`([\s\S]*?)`/)?.[1] || "").filter(Boolean));

  const styleBlocks = code.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
  if (styleBlocks) cssBlocks.push(...styleBlocks.map(c => c.replace(/<style[^>]*>|<\/style>/g, "").trim()));

  return cssBlocks.join("\n\n");
}
