

/** @module core/guardrails/file-tree/component-file-prefix */

export const componentFilePrefix = {
  id: "component-file-prefix",
  label: "Component file has _PascalCase prefix",
  description: "Component files inside component folders must start with an underscore and PascalCase: _Button.jsx, _Card.vue, _Modal.svelte.",
  check: (code, context) => {
    const { passResult } = context.helpers;

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
      return passResult("File name follows _PascalCase.ext convention");
    }

    // _store.js, _data.js, _config.js - data helpers are snake_case, not components
    if (/^_[a-z][a-z_-]*\.js$/.test(fileName)) {
      return passResult("Helper file (_snake_case), not a component");
    }

    const correctName = fileName.startsWith("_") ? fileName : `_${fileName}`;

    return {
      pass: false,
      failCount: 1,
      detail: [`File "${fileName}" does not follow _PascalCase.ext (component) or _snake_case.js (helper) convention`],
      suggestion: `Rename component to "${correctName}" or use _snake_case.js for helpers.`,
    };
  },
};
