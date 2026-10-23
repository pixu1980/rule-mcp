#!/usr/bin/env bash
# =============================================================================
# rule-mcp - uninstaller bootstrap
# =============================================================================
#
# The mirror of scripts/install.sh: check node, resolve the binary, hand over
# to `rule-mcp setup --uninstall`. The removal logic - the scan, the
# per-group choices, the purge - lives in src/cli/setup/ (ADR 080).
#
# Scope guarantee:
#   Every path removed lives under $HOME. The project files in the directory
#   this runs from are never touched.
#
# Usage:
#   ./scripts/uninstall.sh [options]
#   curl -fsSL https://raw.githubusercontent.com/pixu1980/rule-mcp/v0.1.0-beta/scripts/uninstall.sh | bash
#
# Options are forwarded verbatim, with one translation kept for
# compatibility: `--force` used to mean "do not ask for confirmation", which
# is now `--no-interactive` - run the plan with defaults and no wizard.
# =============================================================================

set -euo pipefail

NODE_MIN=20

die() {
  echo "rule-mcp: $1" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || die "Node.js >= ${NODE_MIN} is required - https://nodejs.org"

node_major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$node_major" -ge "$NODE_MIN" ] || die "Node.js >= ${NODE_MIN} is required (found $(node --version))"

args=()
for arg in "$@"; do
  if [ "$arg" = "--force" ]; then
    args+=(--no-interactive)
  else
    args+=("$arg")
  fi
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
local_bin="${script_dir}/../bin/rule-mcp.js"

if [ -f "$local_bin" ]; then
  set -- node "$local_bin" setup --uninstall ${args[@]+"${args[@]}"}
elif command -v rule-mcp >/dev/null 2>&1 && rule-mcp --version >/dev/null 2>&1; then
  set -- rule-mcp setup --uninstall ${args[@]+"${args[@]}"}
elif command -v pnpm >/dev/null 2>&1; then
  set -- pnpm dlx rule-mcp setup --uninstall ${args[@]+"${args[@]}"}
elif command -v npx >/dev/null 2>&1; then
  set -- npx --yes rule-mcp setup --uninstall ${args[@]+"${args[@]}"}
else
  die "no rule-mcp binary and no pnpm/npx to fetch one"
fi

# Same reason as the installer: a piped run still deserves the wizard.
# The `[ -t 1 ]` half is what tells the two piped cases apart. Under
# `curl | bash` stdin is the script but stdout is still the terminal, so the
# user is there and wants the wizard. A scripted run redirects stdout too,
# and must stay non-interactive or it hangs waiting for a keystroke nobody
# is going to send. `[ -r /dev/tty ]` is true in sandboxes where opening it
# still fails, so the probe is a real open, discarded.
if [ ! -t 0 ] && [ -t 1 ] && { : </dev/tty; } 2>/dev/null; then
  exec "$@" </dev/tty
fi

exec "$@"
