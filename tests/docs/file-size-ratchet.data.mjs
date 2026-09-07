/**
 * File-size ratchet: every file that exceeded the 150-line cap when the
 * budget test landed, with the line count it had then. A file may only
 * shrink: going over its recorded size fails the build, and dropping to
 * 150 or less means its entry must be deleted. New entries are forbidden.
 * Data file: exempt from the size cap itself.
 */

export const FILE_SIZE_RATCHET = new Map([
  ["src/cli/commands/_daemon.js", 219],
  ["src/core/guardrails/_guarded.js", 179],
  ["src/core/session/_lifecycle.js", 228],
  ["src/tools/router/_call.js", 188],
  ["src/transport/_session-registry.js", 221],
]);
