/**
 * @module scripts/install/git-hooks/shim - the hook shim text.
 *
 * Each installed file is a shim that executes the tracked hook, so there
 * is one copy of the logic and drift has nowhere to happen.
 */

/**
 * The shim that stands in `.git/hooks/` for one tracked hook. It resolves the
 * root at run time, so the clone can be moved.
 *
 * @param {string} name
 * @returns {string}
 */
export function shim(name) {
  return [
    "#!/bin/sh",
    "# Installed by scripts/install/git-hooks. Do not edit:",
    `# the hook itself is tracked at .githooks/${name}.`,
    'root="$(git rev-parse --show-toplevel 2>/dev/null)"',
    `hook="$root/.githooks/${name}"`,
    '[ -x "$hook" ] || exit 0',
    'exec "$hook" "$@"',
    "",
  ].join("\n");
}
