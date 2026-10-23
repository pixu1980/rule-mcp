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
# files, the guard hooks, skills, the daemon service, the health check - lives
# in node, under src/cli/setup/, and is covered by tests that run on every
# platform. The shell that used to do the binary resolution and the shim by
# hand was a second implementation of what the wizard already does, and the
# two drifted (ADR 080).
#
# Scope guarantee:
#   Every path written to lives under $HOME. Nothing is created, edited or
#   deleted inside the current directory or the repository this runs from.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/pixu1980/rule-mcp/v0.1.0-beta/scripts/install.sh | bash
#   ./scripts/install.sh [options]
#
# Every option is forwarded verbatim; run `./scripts/install.sh --help` for
# the list. A terminal gets the full-screen wizard, a pipe gets the plain
# runner with the same defaults.
# =============================================================================

set -euo pipefail

NODE_MIN=20

# Options `rule-mcp setup` accepts. The shell runs before node exists,
# so it cannot ask: this table is the contract, kept honest by the
# install-script-flags test against the `setup` command source.
KNOWN_SETUP_FLAGS="agent mode uninstall rules no-rules commands no-commands hooks no-hooks skills no-skills minimal no-minimal surface service no-service doctor no-doctor commands-preset commands-families commands-areas commands-skills purge keep-config force dry-run no-wizard no-interactive json help version"
VALUE_SETUP_FLAGS="agent mode commands-preset commands-families commands-areas commands-skills surface"

# Reject anything `setup` cannot spell before a byte is downloaded: a typo
# surfaces here, with the list, instead of deep in a fetched install. A
# separate value rides with its flag, the way commander parses it - so
# `--agent --mode` still means an agent called `--mode`, and a missing
# value is node's to report.
validate_setup_args() {
  while [ $# -gt 0 ]; do
    arg="$1"
    shift
    case "$arg" in
      --)
        # Everything past `--` is positional, and `setup` takes none.
        if [ $# -gt 0 ]; then
          die "unexpected argument '$1' - run 'rule-mcp setup --help' for the list"
        fi
        return 0
        ;;
      --*=*)
        flag="${arg%%=*}"
        flag="${flag#--}"
        ;;
      --*)
        flag="${arg#--}"
        ;;
      -*)
        # Short flags belong to node; commander owns `-h`.
        continue
        ;;
      *)
        die "unexpected argument '$arg' - run 'rule-mcp setup --help' for the list"
        ;;
    esac
    case " $KNOWN_SETUP_FLAGS " in
      *" $flag "*) ;;
      *) die "unknown option '--$flag' - run 'rule-mcp setup --help' for the list" ;;
    esac
    case " $VALUE_SETUP_FLAGS " in
      *" $flag "*)
        case "$arg" in
          --*=*) ;;
          *) if [ $# -gt 0 ]; then shift; fi ;;
        esac
        ;;
    esac
  done
}

die() {
  echo "rule-mcp: $1" >&2
  exit 1
}

validate_setup_args "$@"

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
