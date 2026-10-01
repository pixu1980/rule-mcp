#!/usr/bin/env bash


#
# Reinstall this checkout from scratch: purge node_modules (and optionally the
# lockfile), install again, and refresh the global rule-mcp bin.
#
# Three entry points, one implementation: `pnpm reinstall`,
# `rule-mcp reinstall`, and this script directly.
#
#   --keep-lock   keep pnpm-lock.yaml (what a release-tag update needs)
#
# The script runs from the checkout it lives in (scripts/ -> root), so a test
# copies `scripts/` into a scratch tree and exercises it there.

set -euo pipefail

keep_lock=0
for arg in "$@"; do
  case "$arg" in
    --keep-lock) keep_lock=1 ;;
    *)
      echo "reinstall: unknown flag $arg" >&2
      exit 1
      ;;
  esac
done

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

# A purge in a directory that is not this checkout is the one mistake worth
# refusing: without the manifest there is no install to come back from.
if [ ! -f package.json ]; then
  echo "reinstall: no package.json in $root - run this from the checkout" >&2
  exit 1
fi

if [ "$keep_lock" -eq 1 ]; then
  echo "reinstall: purging node_modules (keeping pnpm-lock.yaml)"
  rm -rf node_modules
else
  echo "reinstall: purging node_modules and pnpm-lock.yaml"
  rm -rf node_modules pnpm-lock.yaml
fi

echo "reinstall: pnpm install"
pnpm install

echo "reinstall: pnpm install -g . (global rule-mcp)"
pnpm install -g .

echo "reinstall: done - $(command -v rule-mcp || echo 'global bin not on PATH yet')"
