// Template Engine - Dot-path and simple math path resolution

/**
 * Get value from object using dot notation path or evaluate simple expressions
 * @param {object} obj - Object to search
 * @param {string} path - Dot notation path or expression
 * @returns {any} Found value or evaluated result
 */
export function getValueFromPath(obj, path) {
  if (!path || !obj) return undefined;

  // Check if it's a simple mathematical expression (numbers and basic operators)
  const mathExprRegex = /^[\d\s+\-*/().]+$/;
  if (mathExprRegex.test(path)) {
    try {
      // Safely evaluate simple math expressions
      return Function(`"use strict"; return (${path})`)();
    } catch (_error) {
      console.warn(`Failed to evaluate math expression: ${path}`);
      return path; // Return original if evaluation fails
    }
  }

  // Check for property access with expressions (like posts.length * 2)
  if (path.includes("*") || path.includes("+") || path.includes("-") || path.includes("/")) {
    try {
      // Replace object paths with their values
      let expression = path;
      const pathRegex = /([a-zA-Z_$][a-zA-Z0-9_$.]*)/g;

      expression = expression.replace(pathRegex, (match) => {
        // Don't replace if it's just a number or Math
        if (/^\d+$/.test(match) || match.startsWith("Math.")) {
          return match;
        }

        // Get the value from the data object
        const value = getSimpleValueFromPath(obj, match);
        return value !== undefined ? value : match;
      });

      // Safely evaluate the expression
      return Function(`"use strict"; return (${expression})`)();
    } catch (_error) {
      console.warn(`Failed to evaluate expression: ${path}`);
      return getSimpleValueFromPath(obj, path);
    }
  }

  return getSimpleValueFromPath(obj, path);
}

/**
 * Simple path resolution without expression evaluation
 * @param {object} obj - Object to search
 * @param {string} path - Dot notation path (supports array access like posts[0])
 * @returns {any} Found value or undefined
 */
export function getSimpleValueFromPath(obj, path) {
  if (!path || !obj) return undefined;

  // Handle array access notation: posts[0] becomes posts.0
  const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");

  const keys = normalizedPath.split(".");
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}
