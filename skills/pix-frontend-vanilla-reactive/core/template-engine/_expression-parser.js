// ═══════════════════════════════════════════════════════════════════════════════
//  Expression parser 
//  ═══════════════════════════════════════════════════════════════════════════════
//  Data expressions with filters AND function calls (FnName(args)).
//
//  parseExpression() detects FnName(args) vs variable|filter automatically.
//  evaluateExpression() now takes an optional scope for function resolution.
//  ═══════════════════════════════════════════════════════════════════════════════

'use strict';

import { FILTERS } from './_filters.js';

/**
 * Parse a {{ }} expression.
 *
 * Detects:
 *   {{ title }}                 → { kind: 'data', variable: 'title', filters: [] }
 *   {{ title | upper }}         → { kind: 'data', variable: 'title', filters: [{name:'upper',args:[]}] }
 *   {{ TodoList(todos) }}       → { kind: 'fn', name: 'TodoList', args: [parsedExpr] }
 *   {{ Card(todo, ctx.n) }}     → { kind: 'fn', name: 'Card', args: [parsedExpr, parsedExpr] }
 */
export function parseExpression(expr) {
  const trimmed = expr.trim();

  // Function call: FnName(arg1, arg2) — parens before any pipe char
  const fnMatch = trimmed.match(/^([a-zA-Z_$][\w$]*)\s*\(([^)]*)\)\s*$/);
  if (fnMatch) {
    const name = fnMatch[1];
    const argsStr = fnMatch[2].trim();
    const args = argsStr
      ? argsStr.split(',').map(a => parseExpression(a.trim()))
      : [];
    return { kind: 'fn', name, args };
  }

  // Data expression with optional filter pipeline
  const pipes = trimmed.split('|').map(s => s.trim());
  const variable = pipes[0];
  const filters = pipes.slice(1).map(f => {
    const fMatch = f.match(/^([a-zA-Z_$][\w$]*)\s*\(([^)]*)\)$/);
    if (fMatch) {
      const args = fMatch[2].trim() ? fMatch[2].split(',').map(a => parseArg(a.trim())) : [];
      return { name: fMatch[1], args };
    }
    const parts = f.split(':').map(s => s.trim());
    return { name: parts[0], args: parts.slice(1).map(parseArg) };
  });
  return { kind: 'data', variable, filters };
}

export function parseArg(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }


  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }


  if (/^\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }


  if (value === 'true') {
    return true;
  }


  if (value === 'false') {
    return false;
  }

  return value;
}

export function getFromPath(obj, path) {
  if (!path || !obj) {
    return undefined;
  }
  let cur = obj;
  for (const key of path.replace(/\[(\d+)\]/g, '.$1').split('.')) {
    if (cur == null) {
      return undefined;
    }
    // Block prototype chain access
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    cur = cur[key];
  }
  return cur;
}

/**
 * Evaluate a parsed expression against a context and optional scope.
 *
 * For 'fn' kind: resolve fn name from scope→context→ctx, evaluate args, call.
 * For 'data' kind: resolve variable from ctx, apply filters.
 *
 * @param {object} parsed - Output of parseExpression()
 * @param {object} ctx - Data context for {{ }} resolution
 * @param {object} [scope] - Function scope for @click and fn call resolution
 * @returns {*}
 */
export function evaluateExpression(parsed, ctx, scope) {
  if (parsed.kind === 'fn') {
    // Resolve function: scope → context → ctx itself
    const fn = (scope && scope[parsed.name]) || ctx[parsed.name];
    if (typeof fn !== 'function') {
      if (typeof fn === 'undefined') {
        console.warn('vr: function not found in scope/context:', parsed.name);
        return '';
      }
    }
    const resolvedArgs = parsed.args.map(a => evaluateExpression(a, ctx, scope));
    return fn(...resolvedArgs);
  }

  // Data expression with optional filter pipeline
  let value = getFromPath(ctx, parsed.variable);
  for (const filter of parsed.filters) {
    const f = FILTERS[filter.name];
    if (f) {
      value = f(value, ...filter.args);
    }
  }
  return value;
}

