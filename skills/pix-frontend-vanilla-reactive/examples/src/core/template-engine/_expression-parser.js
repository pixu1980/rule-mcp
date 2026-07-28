// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3 — Expression parser
// ═══════════════════════════════════════════════════════════════════════════════

import { FILTERS } from './_filters.js';

export function parseExpression(expr) {
  const trimmed = expr.trim();
  const pipes = trimmed.split('|').map(s => s.trim());
  const variable = pipes[0];
  const filters = pipes.slice(1).map(f => {
    const fnMatch = f.match(/^([a-zA-Z_$][\w$]*)\s*\(([^)]*)\)$/);
    if (fnMatch) {
      const args = fnMatch[2].trim() ? fnMatch[2].split(',').map(a => parseArg(a.trim())) : [];
      return { name: fnMatch[1], args };
    }
    const parts = f.split(':').map(s => s.trim());
    return { name: parts[0], args: parts.slice(1).map(parseArg) };
  });
  return { variable, filters };
}

export function parseArg(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export function getFromPath(obj, path) {
  if (!path || !obj) return undefined;
  let cur = obj;
  for (const key of path.replace(/\[(\d+)\]/g, '.$1').split('.')) {
    if (cur == null) return undefined;
    cur = cur[key];
  }
  return cur;
}

export function evaluateExpression(parsed, ctx) {
  let value = getFromPath(ctx, parsed.variable);
  for (const filter of parsed.filters) {
    const fn = FILTERS[filter.name];
    if (fn) value = fn(value, ...filter.args);
  }
  return value;
}
