

/** Guardrail `file-naming`: File naming convention (_PascalCase.js) */
export const fileNaming = {
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
};
