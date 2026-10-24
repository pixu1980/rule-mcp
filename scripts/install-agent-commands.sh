#!/usr/bin/env bash
# Install rule-mcp agent commands for all supported coding agents.
#
# Registry-driven: each target directory is fed to `rule-mcp
# agent-commands --dir <dir>`, which renders the command set from the same
# generator that serves the MCP prompt registry (src/core/agent-commands.js).
# A command renamed or deleted in the registry disappears from this installer
# too - there is no second, hand-maintained list to drift. The set includes
# the /rule router, the /rule-area-* commands, the one-shot workflow prompts
# and the review-persona commands (rule-persona-*-plan / rule-persona-*-audit / rule-persona-*-review).
#
# Supported agents: Pi, Claude Code, Gemini CLI, Windsurf, Cline, Cursor

set -euo pipefail

DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --force) FORCE=true; shift ;;
    --preset) PRESET="${2:-}"; shift 2 ;;
    --areas) AREAS="${2:-}"; shift 2 ;;
    --help|-h)
      echo "Usage: ./scripts/install-agent-commands.sh [--dry-run] [--force] [--preset minimal|standard|full] [--areas a,b]"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

command_files() {
  local dir="$1" format="$2" label="$3"
  local extra=()
  [[ "$FORCE" == "true" ]] && extra+=(--force)
  [[ "$DRY_RUN" == "true" ]] && extra+=(--dry-run)
  # The selection is resolved by the CLI, which owns it for every caller.
  [[ -n "${PRESET:-}" ]] && extra+=(--preset "$PRESET")
  [[ -n "${AREAS:-}" ]] && extra+=(--areas "$AREAS")

  # ${extra[@]+...}: keep `set -u` happy when the array is empty
  node --import "${REPO_ROOT}/scripts/alias-hook.mjs" "${REPO_ROOT}/bin/rule-mcp.js" agent-commands --dir "$dir" --format "$format" \
    "${extra[@]+"${extra[@]}"}" 2>/dev/null | sed "s/^/  [${label}] /"
}

HOME_DIR="${HOME:-}"
CWD="$(pwd)"

command_files "${HOME_DIR}/.pi/agent/prompts"                             "args"     "Pi"
command_files "${HOME_DIR}/.claude/commands"                              "args"     "Claude Code"
command_files "${HOME_DIR}/.gemini/commands"                              "gemini"   "Gemini CLI"
command_files "${HOME_DIR}/.codeium/windsurf/global_workflows"            "workflow" "Windsurf global"
command_files "${HOME_DIR}/.config/windsurf/global_workflows"             "workflow" "Windsurf global"
command_files "${HOME_DIR}/.cline/data/workflows"                         "workflow" "Cline global"
command_files "${HOME_DIR}/.config/cline/data/workflows"                  "workflow" "Cline global"
command_files "${CWD}/.cursor/commands"                                   "args"     "Cursor project"
command_files "${CWD}/.windsurf/workflows"                                "workflow" "Windsurf project"
command_files "${CWD}/.clinerules/workflows"                              "workflow" "Cline project"

echo ""
echo "Agent commands installed for all targets above"