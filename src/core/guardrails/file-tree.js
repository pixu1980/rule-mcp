// Auto-split from src/core/guardrail-defs.js - see ./index.js
/** The file_tree guardrail family. */
export const FILE_TREE_GUARDRAILS = [
  {
    id: "component-folder-barrel",
    label: "Component folder has index.js barrel file",
    description:
      "Every component folder must have an index.js (or index.ts) that re-exports the public API. The barrel must contain at least one export statement.",
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
    description:
      "Component files inside component folders must start with an underscore and PascalCase: _Button.jsx, _Card.vue, _Modal.svelte.",
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
        return {
          pass: true,
          failCount: 0,
          detail: [],
          suggestion: "",
          note: "File name follows _PascalCase.ext convention",
        };
      }

      // _store.js, _data.js, _config.js - data helpers are snake_case, not components
      if (/^_[a-z][a-z_-]*\.js$/.test(fileName)) {
        return {
          pass: true,
          failCount: 0,
          detail: [],
          suggestion: "",
          note: "Helper file (_snake_case), not a component",
        };
      }

      const correctName = fileName.startsWith("_") ? fileName : `_${fileName}`;

      return {
        pass: false,
        failCount: 1,
        detail: [
          `File "${fileName}" does not follow _PascalCase.ext (component) or _snake_case.js (helper) convention`,
        ],
        suggestion: `Rename component to "${correctName}" or use _snake_case.js for helpers.`,
      };
    },
  },
  {
    id: "component-export-check",
    label: "Component file exports a class or function",
    description:
      "_PascalCase.js component files must export at least one class or function. Store/data files (_store.js) are exempt.",
    check: (code, context) => {
      const fileName = context?.fileName || "";
      // Only check _PascalCase files (actual components)
      if (!/^_[A-Z][a-zA-Z0-9]*\.\w+$/.test(fileName)) {
        return { pass: true, note: "Not a component file, skipping" };
      }

      const hasExport = /^export\s+(class|function|const)/m.test(code.trim());

      if (!hasExport) {
        return {
          pass: false,
          failCount: 1,
          detail: ["No exported class/function found"],
          suggestion: "Add: export class MyComponent extends HTMLElement { ... }",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "barrel-exports-match-files",
    label: "Barrel exports match actual component files",
    description:
      "The barrel file's export statements must reference existing component files with the correct _PascalCase names.",
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
          violations.push(
            `Export "${exportedName}" references "${sourcePath}" which does not start with underscore prefix`,
          );
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
