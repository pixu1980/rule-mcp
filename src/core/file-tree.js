/**
 * @module core/file-tree
 *
 * File tree validation and auto-fix engine.
 * Enforces the rule AI barrel file tree convention:
 *
 *   src/components/PascalCase/
 *     ├── _PascalCase.ext    ← Component file (underscore + PascalCase)
 *     ├── _PascalCase.css    ← Optional stylesheet
 *     └── index.js           ← Barrel file re-exporting public API
 *
 * Two modes of operation:
 *   1. **Lint** — scan a directory and report all violations
 *   2. **Fix** — auto-correct violations where possible (rename, create barrels, etc.)
 *
 * @see module:tools/fix — MCP tool registration
 * @see module:cli/commands — CLI fix command
 */

import {
  existsSync,
// eslint-disable-next-line no-unused-vars
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
// eslint-disable-next-line no-unused-vars
  statSync,
// eslint-disable-next-line no-unused-vars
  unlinkSync,
} from "node:fs";
// eslint-disable-next-line no-unused-vars
import { join, dirname, basename, extname, relative, parse } from "node:path";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Directories to ignore during scan. */
const IGNORE_DIRS = new Set(["node_modules", ".git", ".tokensave", "dist", "build", ".next", ".nuxt", ".output", "coverage", ".vscode", ".idea", ".agents"]);

const BARREL_FILE_NAMES = new Set(["index.js", "index.ts", "index.jsx", "index.tsx"]);

const COMPONENT_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte", "css"]);

// ─── Issue types ─────────────────────────────────────────────────────────────

/**
 * @typedef {"missing-barrel"|"wrong-prefix"|"missing-css"|"bare-file"|"wrong-folder-name"|"orphan-css"|"empty-barrel"|"stale-file"|"extra-file"} IssueType
 */

/**
 * @typedef {Object} FileTreeIssue
 * @property {IssueType} type — Type of issue detected
 * @property {string} path — Absolute path to the problematic file/directory
 * @property {string} message — Human-readable description
 * @property {boolean} fixable — Whether auto-fix is available
 * @property {string} [suggestion] — How to fix it
 * @property {string} [fixAction] — Description of what auto-fix would do
 * @property {number} [line] — Line number if applicable
 */

/**
 * @typedef {Object} FileTreeReport
 * @property {boolean} pass — true if zero issues
 * @property {FileTreeIssue[]} issues — All detected issues
 * @property {Object} stats — Summary statistics
 * @property {number} stats.totalFiles — Files scanned
 * @property {number} stats.totalDirs — Directories scanned
 * @property {number} stats.missingBarrel — Barrel count
 * @property {number} stats.wrongPrefix — Wrong prefix count
 * @property {number} stats.bareFiles — Bare file count
 * @property {number} stats.fixable — Fixable issue count
 */

// ─── Scanning logic ──────────────────────────────────────────────────────────

/**
 * Check if a path should be ignored based on its name.
 */
function isIgnored(name) {
  return IGNORE_DIRS.has(name) || name.startsWith(".");
}

/**
 * Check if a directory is a potential component folder:
 * contains at least one component-like file.
 */
// eslint-disable-next-line no-unused-vars
function isComponentDir(dirPath, entries) {
  for (const entry of entries) {
    if (!entry.isFile()) {
    	continue;
    }

    const extension = extname(entry.name);
    if (COMPONENT_EXTENSIONS.has(extension)) {return true;}
  }
  return false;
}

/**
 * Check if a file is a barrel file (index.js/ts/jsx/tsx).
 */
function isBarrelFile(name) {
  return BARREL_FILE_NAMES.has(name);
}

/**
 * Check if a file follows the underscore + PascalCase convention.
 */
function isPrefixedComponent(name) {
  return /^_[A-Z][a-zA-Z0-9]*\.[a-z]+$/.test(name);
}

/**
 * Check if a file looks like a component but lacks the underscore prefix.
 * Matches: PascalCase.ext, kebab-case.ext, camelCase.ext
 */
function isBareComponent(name) {
  if (isBarrelFile(name)) {return false;}
  if (name.startsWith("_")) {return false;}
  const extension = extname(name);
  if (!COMPONENT_EXTENSIONS.has(extension)) {return false;}
  // Exclude utility files that belong at the folder root
  if (/^[a-z][a-z0-9-]*\.[a-z]+$/.test(name)) {return false;} // kebab-case utils
  // Match files that look like components: PascalCase, camelCase starting with uppercase
  return /^[A-Z][a-zA-Z0-9]*\./.test(name);
}

/**
 * Scan a directory recursively and collect all file tree issues.
 *
 * @param {string} rootDir — Project root to scan
 * @param {object} [options]
 * @param {string} [options.srcDir="src"] — Source directory to scan (default: src)
 * @param {boolean} [options.autoFix=false] — Whether to apply fixes
 * @returns {FileTreeReport}
 */
export function scanFileTree(rootDir, options = {}) {
  const srcDir = options.srcDir || "src";
  const target = join(rootDir, srcDir);
  const issues = [];

  let totalFiles = 0;
  let totalDirectories = 0;

  if (!existsSync(target)) {
    return {
      pass: true,
      issues: [],
      stats: { totalFiles: 0, totalDirs: 0, missingBarrel: 0, wrongPrefix: 0, bareFiles: 0, fixable: 0 },
    };
  }

  /** Recursive scanner */
  function scan(currentPath, depth = 0) {
    let entries;
    try {
      entries = readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    const directories = entries.filter((e) => e.isDirectory());
    const files = entries.filter((e) => e.isFile());

    totalDirectories += directories.length;
    totalFiles += files.length;

    const dirName = basename(currentPath);
    const isComponentLike = /^[A-Z]/.test(dirName) && directories.length + files.length > 0;

    // Only validate component folders (PascalCase directories under src/)
    if (isComponentLike && depth >= 1) {
      const hasBarrel = files.some((f) => isBarrelFile(f.name));
      const componentFiles = files.filter((f) => COMPONENT_EXTENSIONS.has(extname(f.name)) && !isBarrelFile(f.name));

      // ── Check 1: Barrel file present ──
      if (!hasBarrel && componentFiles.length > 0) {
        issues.push({
          type: "missing-barrel",
          path: currentPath,
          message: `Component folder "${dirName}" is missing an index.js barrel file.`,
          fixable: true,
          fixAction: `Create index.js re-exporting all components`,
          suggestion: `Create ${join(currentPath, "index.js")} with:\nexport { ${dirName} } from './_${dirName}.js';`,
        });
      }

      // ── Check 2: Component files should start with _ ──
      for (const file of componentFiles) {
        if (isPrefixedComponent(file.name)) {
        	continue;
        }

        const correctName = `_${file.name}`;
        issues.push({
          type: "wrong-prefix",
          path: join(currentPath, file.name),
          message: `Component file "${file.name}" should be prefixed with underscore: "${correctName}".`,
          fixable: true,
          fixAction: `Rename to ${correctName}`,
          suggestion: `Rename "${file.name}" to "${correctName}".`,
        });
      }

      // ── Check 3: Bare PascalCase files (not in a component folder) ──
      // This is checked at the parent level — files that look like components
      // but are directly inside a non-component folder
    }

    // ── Check 4: Bare component files in non-component folders ──
    if (!isComponentLike || depth === 0) {
      for (const file of files) {
        if (isBareComponent(file.name)) {
          issues.push({
            type: "bare-file",
            path: join(currentPath, file.name),
            message: `Bare component file "${file.name}" is not inside a PascalCase component folder.`,
            fixable: true,
            fixAction: `Create folder and move file, or add underscore prefix if it's a utility`,
            suggestion: `Create a PascalCase folder and move "${file.name}" inside it, renaming to "_${file.name}".`,
          });
        }
      }
    }

    // ── Check 5: Orphan CSS files (CSS without matching component) ──
    const cssFiles = files.filter((f) => extname(f.name) === ".css");
    for (const css of cssFiles) {
      if (!css.name.startsWith("_")) {
      	continue;
      }

      // Check if there's a matching component
      const baseName = css.name.replace(extname(css.name), "");
      const matchingComponent = files.some(
        (f) => parse(f.name).name === baseName && f.name !== css.name
      );
      if (!matchingComponent) {
        issues.push({
          type: "orphan-css",
          path: join(currentPath, css.name),
          message: `Orphan CSS file "${css.name}" has no matching component file.`,
          fixable: false,
          suggestion: `Remove "${css.name}" or create the matching component file.`,
        });
      }
    }

    // ── Check 6: Stale barrel files (index.js that doesn't re-export) ──
    for (const file of files) {
      if (!isBarrelFile(file.name)) {
      	continue;
      }

      const fullPath = join(currentPath, file.name);
      try {
        const content = readFileSync(fullPath, "utf8").trim();
        if (content.length === 0) {
          issues.push({
            type: "empty-barrel",
            path: fullPath,
            message: `Barrel file "${file.name}" is empty. It should re-export components.`,
            fixable: true,
            fixAction: `Add re-export statements based on sibling files`,
            suggestion: `Add export statements to ${fullPath}.`,
          });
        } else if (
          !content.includes("export ") &&
          !content.includes("module.exports")
        ) {
          issues.push({
            type: "empty-barrel",
            path: fullPath,
            message: `Barrel file "${file.name}" has no exports.`,
            fixable: true,
            fixAction: `Add re-export statements`,
            suggestion: `Add export { ... } from '...' or export * from '...' to ${fullPath}.`,
          });
        }
      } catch {
        // skip unreadable
      }
    }

    // Recurse
    for (const dir of directories) {
      if (!isIgnored(dir.name)) {
        scan(join(currentPath, dir.name), depth + 1);
      }
    }
  }

  scan(target);

  const stats = {
    totalFiles,
    totalDirs: totalDirectories,
    missingBarrel: issues.filter((index) => index.type === "missing-barrel").length,
    wrongPrefix: issues.filter((index) => index.type === "wrong-prefix").length,
    bareFiles: issues.filter((index) => index.type === "bare-file").length,
    fixable: issues.filter((index) => index.fixable).length,
  };

  return {
    pass: issues.length === 0,
    issues,
    stats,
  };
}

// ─── Auto-fix logic ──────────────────────────────────────────────────────────

/**
 * Auto-fix file tree issues in a directory.
 * Applies fixes in a safe order:
 *   1. Create missing barrel files
 *   2. Rename unprefixed component files
 *   3. Report unfixable issues
 *
 * @param {string} rootDir — Project root
 * @param {object} [options]
 * @param {string} [options.srcDir="src"] — Source directory
 * @param {boolean} [options.dryRun=false] — Preview without applying
 * @returns {{
 *   ok: boolean,
 *   fixed: Array<{ path: string, action: string }>,
 *   errors: Array<{ path: string, error: string }>,
 *   remaining: FileTreeIssue[]
 * }}
 */
export function autoFixFileTree(rootDir, options = {}) {
// eslint-disable-next-line no-unused-vars
  const srcDir = options.srcDir || "src";
  const isDryRun = options.dryRun !== false;
  const report = scanFileTree(rootDir, options);
  const fixed = [];
  const errors = [];

  // Phase 1: Rename unprefixed component files (must happen before barrel creation)
  for (const issue of report.issues) {
    if (!(issue.type === "wrong-prefix" && issue.fixable)) {
    	continue;
    }

    const oldPath = issue.path;
    const dir = dirname(oldPath);
    const oldName = basename(oldPath);
    const newName = `_${oldName}`;
    const newPath = join(dir, newName);

    if (isDryRun) {
      fixed.push({ path: oldPath, action: `[DRY RUN] Rename to ${newName}` });
    } else {
      try {
        if (existsSync(newPath)) {
          errors.push({ path: oldPath, error: `Target "${newName}" already exists. Skipping.` });
          continue;
        }
        renameSync(oldPath, newPath);
        fixed.push({ path: oldPath, action: `Renamed to ${newName}` });
      } catch (error) {
        errors.push({ path: oldPath, error: error.message });
      }
    }
  }

  // Phase 2: Create missing barrel files
  for (const issue of report.issues) {
    if (!(issue.type === "missing-barrel" && issue.fixable)) {
    	continue;
    }

    const dir = issue.path;
    const folderName = basename(dir);

    // Find all prefixed component files in the directory to build exports
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      errors.push({ path: dir, error: `Cannot read directory: ${error.message}` });
      continue;
    }

    const files = entries.filter((e) => e.isFile());
    const componentExports = [];

    for (const file of files) {
      const name = file.name;
// eslint-disable-next-line no-unused-vars
      const extension = extname(name);

      // Get the component name from _PascalCase.ext
      const componentMatch = name.match(/^_([A-Z][a-zA-Z0-9]*)\.\w+$/);
      if (componentMatch) {
        const componentName = componentMatch[1];
        componentExports.push(componentName);
      }
    }

    // Build barrel content
    let barrelContent;
    if (componentExports.length > 0) {
      const esm = componentExports
        .map((c) => {
          const fileName = `_${c}`;
          return `export { ${c} } from './${fileName}';\n`;
        })
        .join("");
      barrelContent = `/**\n * @module ${folderName}\n * @description Component barrel\n */\n\n${esm}`;
    } else {
      // No underscore-prefixed files found; try to build from what's available
      const jsFiles = files.filter(
        (f) => COMPONENT_EXTENSIONS.has(extname(f.name)) && !isBarrelFile(f.name)
      );
      if (jsFiles.length > 0) {
        const firstFile = parse(jsFiles[0].name).name;
        const componentName = firstFile.startsWith("_") ? firstFile.slice(1) : firstFile;
        barrelContent = `/**\n * @module ${folderName}\n * @description Component barrel\n */\n\nexport { ${componentName} } from './_${componentName}';\n`;
      } else {
        barrelContent = `/**\n * @module ${folderName}\n * @description Component barrel\n */\n\n`;
      }
    }

    const barrelPath = join(dir, "index.js");

    if (isDryRun) {
      fixed.push({ path: barrelPath, action: `[DRY RUN] Create index.js` });
    } else {
      try {
        writeFileSync(barrelPath, barrelContent, "utf8");
        fixed.push({ path: barrelPath, action: "Created index.js" });
      } catch (error) {
        errors.push({ path: barrelPath, error: `Cannot write: ${error.message}` });
      }
    }
  }

  // Phase 3: Fix empty barrel files
  for (const issue of report.issues) {
    if (!(issue.type === "empty-barrel" && issue.fixable)) {
    	continue;
    }

    const dir = dirname(issue.path);
    const folderName = basename(dir);

    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    const files = entries.filter((e) => e.isFile());
    const componentExports = [];

    for (const file of files) {
      const name = file.name;
      const componentMatch = name.match(/^_([A-Z][a-zA-Z0-9]*)\.\w+$/);
      if (componentMatch) {
        componentExports.push(componentMatch[1]);
      }
    }

    if (componentExports.length > 0) {
      const content = componentExports
        .map((c) => `export { ${c} } from './_${c}';\n`)
        .join("");

      if (isDryRun) {
        fixed.push({ path: issue.path, action: "[DRY RUN] Populate barrel with exports" });
      } else {
        try {
          writeFileSync(issue.path, `/**\n * @module ${folderName}\n * @description Component barrel\n */\n\n${content}`, "utf8");
          fixed.push({ path: issue.path, action: "Populated barrel with exports" });
        } catch (error) {
          errors.push({ path: issue.path, error: error.message });
        }
      }
    }
  }

  // Determine remaining unfixable issues
  const fixableTypes = new Set(["missing-barrel", "wrong-prefix", "empty-barrel"]);
  const remaining = report.issues.filter((index) => !fixableTypes.has(index.type));

  return {
    ok: errors.length === 0,
    fixed,
    errors,
    remaining,
    dryRun: isDryRun,
  };
}

// ─── Guardrail check functions for the guardrails engine ─────────────────────

/**
 * Guardrail: check if the code represents a valid barrel file.
 * Used by the guardrails engine in guardrail-defs.js.
 *
 * @param {string} code — File content
 * @param {object} context — { fileName, srcDir, ... }
 * @returns {{ pass: boolean, failCount: number, detail: string[], suggestion: string, note?: string }}
 */
export function checkBarrelFile(code, context = {}) {
  const fileName = context.fileName || "index.js";

  if (!isBarrelFile(fileName)) {
    return { pass: true, failCount: 0, detail: [], suggestion: "", note: "Not a barrel file, skipping" };
  }

  const trimmed = code.trim();
  if (trimmed.length === 0) {
    return {
      pass: false,
      failCount: 1,
      detail: ["Barrel file is empty"],
      suggestion: `Add re-export statements: export { ComponentName } from './_ComponentName.ext';`,
    };
  }

  const hasExport = trimmed.includes("export ") || trimmed.includes("module.exports");
  if (!hasExport) {
    return {
      pass: false,
      failCount: 1,
      detail: ["Barrel file has no exports"],
      suggestion: `Add export statements. Expected format: export { ComponentName } from './_ComponentName.js';`,
    };
  }

  return { pass: true, failCount: 0, detail: [], suggestion: "", note: "Barrel file is valid" };
}

/**
 * Guardrail: check if a component file name follows the _PascalCase convention.
 *
 * @param {string} code — File content (unused, we check the fileName context)
 * @param {object} context — { fileName, isComponent }
 * @returns {{ pass: boolean, failCount: number, detail: string[], suggestion: string, note?: string }}
 */
export function checkFileNameConvention(code, context = {}) {
  const fileName = context.fileName || "";
  const isComponent = context.isComponent;

  if (!isComponent) {
    return { pass: true, failCount: 0, detail: [], suggestion: "", note: "Not a component, skipping" };
  }

  if (!fileName) {
    return { pass: true, failCount: 0, detail: [], suggestion: "", note: "No filename context, skipping" };
  }

  const isValid = /^_[A-Z][a-zA-Z0-9]*\.\w+$/.test(fileName);
  if (isValid) {
    return { pass: true, failCount: 0, detail: [], suggestion: "", note: "File name follows _PascalCase.ext convention" };
  }

  const correctName = `_${fileName}`;
  return {
    pass: false,
    failCount: 1,
    detail: [`File "${fileName}" does not follow the _PascalCase.ext convention`],
    suggestion: `Rename to "${correctName}". Component files inside component folders must start with underscore + PascalCase.`,
  };
}

// ─── Component folder generator ──────────────────────────────────────────────

/**
 * Convert PascalCase to kebab-case (e.g. MyButton → my-button).
 * @param {string} name
 * @returns {string}
 */
function toKebab(name) {
  return name.replaceAll(/([a-z])([A-Z])/g, "$1-$2").replaceAll(/([A-Z]+)([A-Z][a-z])/g, "$1-$2").toLowerCase();
}

/**
 * Generate the full file tree for a component following rule AI conventions.
 * Returns an array of { path, content } objects.
 *
 * @param {object} options
 * @param {string} options.name — Component name (PascalCase)
 * @param {string} options.framework — Framework (react, vue, svelte, angular, solid, astro, vanilla)
 * @param {string} [options.baseDir="src/components"] — Base output directory
 * @returns {Array<{ path: string, content: string }>}
 */
export function generateComponentFiles(options) {
  const { name, framework = "vanilla", baseDir = "src/components" } = options;
  const tag = toKebab(name); // guarantees a valid custom element tag with hyphen
  const folderPath = join(baseDir, name);
  const files = [];

  // Barrel file
  const barrelContent = `/**\n * @module ${name}\n * @description ${name} component\n */\n\nexport { ${name} } from './_${name}';\n`;
  files.push({ path: join(folderPath, "index.js"), content: barrelContent });

  // Component file
  let componentContent;
  const componentFilePath = join(folderPath, `_${name}`);

  switch (framework) {
    case "react":
    case "solid": {
      componentContent = `/**\n * @module ${name}\n * @description ${name} component\n */\n\nexport function ${name}({ children }) {\n  return (\n    <article data-part="${name.toLowerCase()}">\n      {children}\n    </article>\n  );\n}\n`;
      files.push({ path: `${componentFilePath}.jsx`, content: componentContent });
      break;
    }
    case "vue": {
      componentContent = `<script setup>\n/**\n * @module ${name}\n * @description ${name} component\n */\ndefineProps({});\n</script>\n\n<template>\n  <article data-part="${name.toLowerCase()}">\n    <slot />\n  </article>\n</template>\n`;
      files.push({ path: `${componentFilePath}.vue`, content: componentContent });
      break;
    }
    case "svelte": {
      componentContent = `<script>\n/**\n * @module ${name}\n * @description ${name} component\n */\nlet { children } = $props();\n</script>\n\n<article data-part="${name.toLowerCase()}">\n  {@render children()}\n</article>\n`;
      files.push({ path: `${componentFilePath}.svelte`, content: componentContent });
      break;
    }
    case "angular": {
      componentContent = `import { Component } from '@angular/core';\n\n/**\n * @module ${name}\n * @description ${name} component\n */\n@Component({\n  selector: '${tag}',\n  standalone: true,\n  template: \`<article data-part="${name.toLowerCase()}"><ng-content /></article>\`,\n})\nexport class ${name} {}\n`;
      files.push({ path: `${componentFilePath}.ts`, content: componentContent });
      break;
    }
    case "astro": {
      componentContent = `---\n/**\n * @module ${name}\n * @description ${name} component\n */\n---\n<article data-part="${name.toLowerCase()}">\n  <slot />\n</article>\n`;
      files.push({ path: `${componentFilePath}.astro`, content: componentContent });
      break;
    }
    case "vanilla":
    default: {
      componentContent = `/**\n * @module ${name}\n * @description ${name} component\n */\n\nexport class ${name} extends HTMLElement {\n  connectedCallback() {\n    this.innerHTML = \`<article data-part="${name.toLowerCase()}"></article>\`;\n  }\n}\n\ncustomElements.define("${tag}", ${name});\n`;
      files.push({ path: `${componentFilePath}.js`, content: componentContent });
      break;
    }
  }

  return files;
}
