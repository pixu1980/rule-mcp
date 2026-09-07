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
  ["tests/cli/install-rules-idempotent.test.mjs", 184],
  ["tests/cli/install-script-shim-heal.test.mjs", 209],
  ["tests/cli/self-update-remote-pin.test.mjs", 217],
  ["tests/cli/self-update-throttle.test.mjs", 205],
  ["tests/cli/self-update.test.mjs", 182],
  ["tests/cli/uninstall-purge-home.test.mjs", 212],
  ["tests/core/agent-command-targets.test.mjs", 186],
  ["tests/core/caveman-efficacy.test.mjs", 168],
  ["tests/core/en-english-language.test.mjs", 199],
  ["tests/core/guardrails-precision-recall.test.mjs", 155],
  ["tests/core/manifest-guardrails.test.mjs", 184],
  ["tests/prompts/reminder-diet.test.mjs", 158],
  ["tests/roles/review-roles-surfaces.test.mjs", 156],
  ["tests/roles/review-roles.test.mjs", 166],
  ["tests/roles/roles-cli.test.mjs", 160],
  ["tests/skills/skill-surface-embedded-only.test.mjs", 163],
  ["tests/skills/skills-docs.test.mjs", 208],
  ["tests/tools/a11y-wcag.test.mjs", 216],
  ["tests/tools/apply-containment.test.mjs", 152],
  ["tests/tools/gateway-cache-receipt.test.mjs", 183],
  ["tests/tools/session-resume.test.mjs", 206],
  ["tests/transport/sse.test.mjs", 151],
]);
