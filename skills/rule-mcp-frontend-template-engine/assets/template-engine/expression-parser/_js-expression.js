// Template Engine - Safe JavaScript expression evaluation (with + filter rewrite)

import { getSimpleValueFromPath } from "./_path.js";

/**
 * Safely evaluate a JavaScript expression with data context
 * @param {string} jsExpr - JavaScript expression
 * @param {object} data - Data context
 * @param {object} [filters] - Available filters for pipe rewrite
 * @returns {any} Evaluation result
 */
export function evaluateJavaScriptExpression(jsExpr, data, filters) {
  try {
    // Convert template-style logical operators to JavaScript operators
    let processedExpr = jsExpr.replace(/\band\b/g, "&&").replace(/\bor\b/g, "||");

    // Support filter pipes inside JS expressions when wrapped in parentheses, e.g. (tag | slugify)
    // Rewrites "(value | filter:arg1:arg2)" to "__applyFilter('filter', (value), arg1, arg2)"
    const rewritePipes = (expr) => {
      let changed = true;
      let out = expr;
      const pipeRegex = /\(([^()]*?)\s\|\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?::\s*([^)]*?))?\)/g;
      while (changed) {
        changed = false;
        out = out.replace(pipeRegex, (_m, inner, fname, args) => {
          changed = true;
          const argsList = args?.trim()
            ? "," +
              args
                .split(":")
                .map((a) => a.trim())
                .filter(Boolean)
                .join(",")
            : "";
          return `__applyFilter('${fname}', (${inner})${argsList})`;
        });
      }
      return out;
    };

    processedExpr = rewritePipes(processedExpr);

    // Preprocess `.length` access: for expressions like `items.length > 0`
    // treat length as array-only: if the base is not an array, length should be 0
    const lengthRegex = /([a-zA-Z_$][a-zA-Z0-9_$.[\]]*)\.length\b/g;
    const modifiedExpr = processedExpr.replace(lengthRegex, (_, path) => `__len("${path}")`);

    // Use the data object with a helper __len that uses getSimpleValueFromPath
    const func = new Function(
      "data",
      "getVal",
      "filters",
      "__applyFilter",
      `with(data) { const __len = (p) => { const v = getVal(data, p); return Array.isArray(v) ? v.length : 0; }; return (${modifiedExpr}); }`,
    );

    const applyFilter = (name, value, ...args) => {
      try {
        if (filters && typeof filters[name] === "function") {
          return filters[name](value, ...args);
        }
        console.warn(`Unknown filter in JS expression: ${name}`);
        return value;
      } catch (e) {
        console.warn(`Filter '${name}' failed:`, e?.message || e);
        return value;
      }
    };

    return func(data, getSimpleValueFromPath, filters || {}, applyFilter);
  } catch (error) {
    console.error(`Failed to evaluate expression: ${jsExpr}`, error);
    return undefined;
  }
}
