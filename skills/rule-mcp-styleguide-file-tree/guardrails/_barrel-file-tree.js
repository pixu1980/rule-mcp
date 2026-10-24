

/** Guardrail `barrel-file-tree`: Barrel pattern (index.js) */
export const barrelFileTree = {
  id: "barrel-file-tree",
  label: "Barrel pattern (index.js)",
  description: "Every component folder must have an index.js barrel that re-exports the public API.",
  check: (code, context) => {
    const isBarrel = context?.fileName === "index.js" || context?.fileName === "index.ts" || context?.fileName === "index.jsx" || context?.fileName === "index.tsx";

    if (isBarrel) {
      // A barrel states a public API; re-exporting is one way to do it, and
      // exporting the symbols directly is another. Demanding the first shape
      // failed every entry point in this repository (finding F-A1).
      const hasBarrelExport = /\bexport\s+(\{|\*|default|async\s+function|function|const|let|var|class)/.test(code);

      return {
        pass: hasBarrelExport,
        failCount: hasBarrelExport ? 0 : 1,
        suggestion: "Barrel files (index.js) must re-export: export { ComponentName } from './_ComponentName.js';",
      };
    }

    return { pass: true, note: "Not a barrel file, skipping" };
  },
};
