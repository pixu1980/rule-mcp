

/** Guardrail checks the engine runs on barrels and component file names. */
import { passResult } from "../../shared/index.js";
import { isBarrelFile } from "./_conventions.js";

/**
 * Guardrail: check if the code represents a valid barrel file.
 * Used by the guardrails engine in guardrail-defs.js.
 *
 * @param {string} code - File content
 * @param {object} context - { fileName, srcDir, ... }
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
 * @param {string} code - File content (unused, we check the fileName context)
 * @param {object} context - { fileName, isComponent }
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
    return passResult("File name follows _PascalCase.ext convention");
  }

  const correctName = `_${fileName}`;

  return {
    pass: false,
    failCount: 1,
    detail: [`File "${fileName}" does not follow the _PascalCase.ext convention`],
    suggestion: `Rename to "${correctName}". Component files inside component folders must start with underscore + PascalCase.`,
  };
}
