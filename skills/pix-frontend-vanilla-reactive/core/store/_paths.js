// ═══════════════════════════════════════════════════════════════════════════════
//  Store — path helpers
// ═══════════════════════════════════════════════════════════════════════════════

'use strict';

export function toPathArray(path) {
  if (Array.isArray(path)) { return path; }
  if (path == null || path === '') {
    return [];
  }
  return String(path).split('.').filter(Boolean);
}
export function pathToString(path) { return toPathArray(path).join('.'); }

