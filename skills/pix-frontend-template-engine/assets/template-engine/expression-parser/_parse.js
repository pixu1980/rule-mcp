// Template Engine - Expression parse (tokenizer + parser)

/**
 * Parse a template expression like "variable | filter1 | filter2:arg"
 * or JavaScript expressions like "a > b", "x + y", etc.
 * @param {string} expression - The expression to parse
 * @returns {object} Parsed expression object
 */
export function parseExpression(expression) {
  const trimmed = expression.trim();

  // Check if this is a JavaScript expression (contains operators)
  if (isJavaScriptExpression(trimmed)) {
    return {
      variable: null,
      filters: [],
      jsExpression: trimmed,
      toString: () => expression,
    };
  }

  // Split by pipe character to separate variable from filters
  const parts = trimmed.split("|").map((part) => part.trim());
  const variable = parts[0];
  const filters = parts.slice(1).map(parseFilter);

  return {
    variable,
    filters,
    jsExpression: null,
    toString: () => expression,
  };
}

/**
 * Check if expression contains JavaScript operators
 * @param {string} expression - Expression to check
 * @returns {boolean} True if contains JS operators
 */
export function isJavaScriptExpression(expression) {
  // First check: if it contains a single pipe character (not || or &&), it's a filter expression
  if (expression.includes("|") && !expression.includes("||") && !expression.includes("&&")) {
    return false;
  }

  // Common JavaScript operators and patterns
  const jsOperators = [
    "+",
    "-",
    "*",
    "/",
    "%", // arithmetic (but check it's not in string)
    ">",
    "<",
    ">=",
    "<=",
    "==",
    "===",
    "!=",
    "!==", // comparison
    "&&",
    "||",
    "!", // logical
    "?",
    ":", // ternary
    "(",
    ")", // grouping
  ];

  // Check for operators that indicate JavaScript expressions
  const hasJsOperator = jsOperators.some((op) => {
    if (op === "+" || op === "-") {
      // Only treat as JS if surrounded by non-string contexts
      const regex = new RegExp(`[^'"]\\s*\\${op.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[^'"]`);
      return regex.test(expression);
    }
    return expression.includes(op);
  });

  // If it contains JS operators, it's a JS expression
  if (hasJsOperator) {
    return true;
  }

  return false;
}

/**
 * Parse a filter with optional arguments
 * Support both "filterName:arg1:arg2" and "filterName(arg1, arg2)" syntax
 * @param {string} filterStr - Filter string
 * @returns {object} Filter object
 */
function parseFilter(filterStr) {
  const trimmed = filterStr.trim();

  // Check for function-style syntax: filterName(arg1, arg2)
  const functionMatch = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)$/);
  if (functionMatch) {
    const name = functionMatch[1];
    const argsStr = functionMatch[2].trim();
    const args = argsStr ? argsStr.split(",").map((arg) => parseValue(arg.trim())) : [];
    return { name, args };
  }

  // Fall back to colon syntax: filterName:arg1:arg2
  const parts = trimmed.split(":").map((part) => part.trim());
  const name = parts[0];
  const args = parts.slice(1).map(parseValue);

  return { name, args };
}

/**
 * Parse a value, attempting to convert to appropriate type
 * @param {string} value - Value string
 * @returns {any} Parsed value
 */
function parseValue(value) {
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Try to parse as number
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }

  if (/^\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }

  // Try to parse as boolean
  if (value === "true") return true;
  if (value === "false") return false;

  // Return as string
  return value;
}
