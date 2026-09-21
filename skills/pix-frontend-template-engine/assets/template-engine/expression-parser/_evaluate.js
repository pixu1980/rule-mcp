// Template Engine - Expression evaluation against data + filters

import { evaluateJavaScriptExpression } from "./_js-expression.js";
import { parseExpression } from "./_parse.js";
import { getValueFromPath } from "./_path.js";

/**
 * Evaluate an expression against data context
 * @param {object} expression - Parsed expression
 * @param {object} data - Data context
 * @param {object} filters - Available filters
 * @returns {any} Evaluated value
 */
export function evaluateExpression(expression, data, filters) {
  // Handle JavaScript expressions
  if (expression.jsExpression) {
    return evaluateJavaScriptExpression(expression.jsExpression, data, filters || {});
  }

  // Get initial value from data for regular variable expressions
  let value = getValueFromPath(data, expression.variable);

  // Apply filters in sequence
  for (const filter of expression.filters) {
    if (filters[filter.name]) {
      value = filters[filter.name](value, ...filter.args);
    } else {
      console.warn(`Unknown filter: ${filter.name}`);
    }
  }

  return value;
}

/**
 * Check if a condition expression is truthy
 * @param {string} condition - Condition expression
 * @param {object} data - Data context
 * @returns {boolean} Condition result
 */
export function evaluateCondition(condition, data) {
  // Parse the condition as an expression
  const parsed = parseExpression(condition);

  // Evaluate it and convert to boolean
  const result = evaluateExpression(parsed, data, {});
  return Boolean(result);
}
