/** @module core/guardrails/file-tree/component-export-check */

export const componentExportCheck = {
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
      return {
        pass: false,
        failCount: 1,
        detail: ["No exported class/function found"],
        suggestion: "Add: export class MyComponent extends HTMLElement { ... }",
      };
    }

    return { pass: true };
  },
};
