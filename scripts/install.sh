#!/usr/bin/env bash
# =============================================================================
# rule-mcp - installer bootstrap
# =============================================================================
#
# This script does three things and then gets out of the way:
#
#   1. checks that Node is new enough to run the wizard
#   2. resolves the server binary (repo checkout, global shim, or npx)
#   3. hands the arguments to `rule-mcp setup`
#
# Everything else - agent detection, the picker, install modes, instruction
# files, skills, the daemon service, the health check - lives in Node, under
# src/cli/setup/, and is covered by tests that run on every platform. The
# 1100 lines of shell that used to live here were a second implementation of
# that logic, and the two drifted (ADR 080).
#
# Usage:
#   curl -fsSL https://rule-mcp.domain.example/install.sh | bash
#   ./scripts/install.sh [options]
#
# Every option is forwarded verbatim; run `./scripts/install.sh --help` for
# the list. A terminal gets the full-screen wizard, a pipe gets the plain
# runner with the same defaults.
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

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
local_bin="${script_dir}/../bin/rule-mcp.js"

# Prefer the checkout this script came from, then a working global shim, then
# a one-off fetch. Each candidate is verified by running it: a shim that
# points at a moved repo stays on PATH and fails only when launched.
if [ -f "$local_bin" ]; then
  set -- node "$local_bin" setup "$@"
elif command -v rule-mcp >/dev/null 2>&1 && rule-mcp --version >/dev/null 2>&1; then
  set -- rule-mcp setup "$@"
elif command -v pnpm >/dev/null 2>&1; then
  set -- pnpm dlx rule-mcp setup "$@"
elif command -v npx >/dev/null 2>&1; then
  set -- npx --yes rule-mcp setup "$@"
else
  die "no rule-mcp binary and no pnpm/npx to fetch one"
fi

# `curl ... | bash` leaves stdin holding the script, so the wizard would see
# no terminal and fall back to the plain runner. Borrowing /dev/tty gives the
# piped install the same interactive wizard as a local one.
#
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
