/** @module core/guardrails/file-tree/component-folder-barrel */

export const componentFolderBarrel = {
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
};
