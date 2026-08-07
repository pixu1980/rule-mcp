#!/usr/bin/env bash
# Install pix-galaxy-mcp agent commands for all supported coding agents.
#
# Installs prompt templates / commands for:
#   pix-galaxy-mcp    - Route via pix-galaxy-mcp
#   pix-architect     - Route via pix-architect skill
#   pix-handoff       - Generate handoff summary
#   pix-tdd           - Test-driven development workflow
#   pix-adr           - Architecture Decision Record
#   pix-fix           - Validate/fix file tree
#   pix-check         - Check code against guardrails
#
# Supported agents: Pi, Claude Code, Gemini CLI, Windsurf, Cline, Cursor

set -euo pipefail

DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --force) FORCE=true; shift ;;
    --help|-h)
      echo "Usage: ./scripts/install-agent-commands.sh [--dry-run] [--force]"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

installed=0
skipped=0

write_command() {
  local label="$1"
  local destination="$2"
  local content="$3"

  if [[ -f "$destination" && "$FORCE" != "true" ]]; then
    echo "  - ${label}: already exists (${destination})"
    skipped=$((skipped + 1))
    return
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  → [dry-run] ${label}: ${destination}"
  else
    mkdir -p "$(dirname "$destination")"
    printf '%s\n' "$content" > "$destination"
    echo "  ✓ ${label}: ${destination}"
  fi
  installed=$((installed + 1))
}

# ── Commands ─────────────────────────────────────────────────────────────────

content_args() {
  local name="$1"
  case "$name" in
    "pix-galaxy-mcp")
      cat <<'EOF'
---
description: Explicitly route a request through pix-galaxy-mcp
argument-hint: "[request]"
---
Use the pix-galaxy-mcp MCP server explicitly for this request: $ARGUMENTS

Call `pix_tool` first to select the correct skill, follow the returned guidance, and use `pix_tool_check` to validate relevant code before finishing. If no arguments were supplied, apply this workflow to the current user request.
EOF
      ;;
    "pix-architect")
      cat <<'EOF'
---
description: Route to pix-architect for project scaffolding and ADR decisions
argument-hint: "<request>"
---
Process this request through pix-architect skill: $ARGUMENTS

1. Call `pix_tool` to route to architect skill.
2. Load full pix-architect skill evidence.
3. Execute architect workflow: project scaffolding, skill mapping, context generation, ADR.
4. Use `pix_tool_process_adr` for architecture decisions.
EOF
      ;;
    "pix-handoff")
      cat <<'EOF'
---
description: Generate compressed LLM handoff summary via pix-process-handoff
argument-hint: "[mode] [projectDir]"
---
Generate a handoff summary for session continuity: $ARGUMENTS

1. Call `pix_tool_process_handoff` with provided arguments.
2. Default mode "handoff" with all includes enabled.
3. Use mode "close-session" for full git diff + roadmap + doc scan.
4. Output result for pasting into next session.
EOF
      ;;
    "pix-tdd")
      cat <<'EOF'
---
description: Run test-driven development workflow via pix
argument-hint: "<feature>"
---
Run test-driven development workflow: $ARGUMENTS

1. Call `pix_tool` to route to test-driven-development skill.
2. Load full TDD skill evidence.
3. Follow the Red-Green-Refactor cycle.
4. Write failing tests before implementation.
EOF
      ;;
    "pix-adr")
      cat <<'EOF'
---
description: Record an Architecture Decision Record via pix_tool_process_adr
argument-hint: "<title>"
---
Record an Architecture Decision Record: $ARGUMENTS

1. Call `pix_tool_process_adr` with the ADR details.
2. Uses Nygard template with auto-numbering.
3. Saves to docs/adr/ with index maintenance.
EOF
      ;;
    "pix-fix")
      cat <<'EOF'
---
description: Validate and fix project file tree structure via pix_tool_fix
argument-hint: "[path]"
---
Validate and fix project file tree: $ARGUMENTS

1. Call `pix_tool_fix` to scan project structure.
2. Fixes barrel files, naming conventions, directory layout.
3. Pass path parameter to limit scope.
EOF
      ;;
    "pix-check")
      cat <<'EOF'
---
description: Check code against pix guardrails via pix_tool_check
argument-hint: "<skill> <code>"
---
Check code against pix guardrails: $ARGUMENTS

1. Call `pix_tool_check` with the target skill name and code.
2. Fix every failure.
3. Rerun until allPass: true.
EOF
      ;;
  esac
}

content_workflow() {
  local name="$1"
  case "$name" in
    "pix-galaxy-mcp")
      cat <<'EOF'
# pix-galaxy-mcp

Explicitly use the pix-galaxy-mcp MCP server for the request supplied with this command.

1. Call `pix_tool` first to select the correct skill.
2. Follow the routed skill guidance while completing the request.
3. Run `pix_tool_check` against relevant code before finishing.
EOF
      ;;
    "pix-architect")
      cat <<'EOF'
# pix-architect

Route through pix-architect for project structure, ADRs, and skill mapping.

1. Call `pix_tool` to route to architect skill.
2. Execute architect workflow with ADR recording.
EOF
      ;;
    "pix-handoff")
      cat <<'EOF'
# pix-handoff

Generate handoff summary for session continuity.

1. Call `pix_tool_process_handoff`.
2. Default: mode "handoff" with all includes.
EOF
      ;;
    "pix-tdd")
      cat <<'EOF'
# pix-tdd

Run test-driven development workflow (Red-Green-Refactor).

1. Call `pix_tool` to route to test-driven-development skill.
2. Write failing tests first, then implement, then refactor.
EOF
      ;;
    "pix-adr")
      cat <<'EOF'
# pix-adr

Record an Architecture Decision Record.

1. Call `pix_tool_process_adr` with title and details.
2. Auto-numbered in docs/adr/ with Nygard template.
EOF
      ;;
    "pix-fix")
      cat <<'EOF'
# pix-fix

Validate and fix project file tree structure.

1. Call `pix_tool_fix` to scan and fix.
2. Barrel files, naming, directory layout.
EOF
      ;;
    "pix-check")
      cat <<'EOF'
# pix-check

Check code against pix guardrails.

1. Call `pix_tool_check` with skill name and code.
2. Fix failures and rerun until all pass.
EOF
      ;;
  esac
}

content_gemini() {
  local name="$1"
  case "$name" in
    "pix-galaxy-mcp")
      cat <<'EOF'
description = "Explicitly route a request through pix-galaxy-mcp"
prompt = """
Use the pix-galaxy-mcp MCP server explicitly for this request: {{args}}

Call `pix_tool` first to select the correct skill, follow the returned guidance, and use `pix_tool_check` to validate relevant code before finishing. If no arguments were supplied, apply this workflow to the current user request.
"""
EOF
      ;;
    "pix-architect")
      cat <<'EOF'
description = "Route to pix-architect for project scaffolding"
prompt = """
Process through pix-architect skill: {{args}}

1. Call `pix_tool` to route to architect skill.
2. Load skill evidence and execute architect workflow.
3. Use `pix_tool_process_adr` for decisions.
"""
EOF
      ;;
    "pix-handoff")
      cat <<'EOF'
description = "Generate LLM handoff summary"
prompt = """
Generate handoff summary via pix_tool_process_handoff: {{args}}

Default mode "handoff". Use "close-session" for full context dump.
"""
EOF
      ;;
    "pix-tdd")
      cat <<'EOF'
description = "Run test-driven development workflow"
prompt = """
Run TDD workflow: {{args}}

Call `pix_tool` to route to test-driven-development skill.
Follow Red-Green-Refactor cycle. Write failing tests first.
"""
EOF
      ;;
    "pix-adr")
      cat <<'EOF'
description = "Record Architecture Decision Record"
prompt = """
Record ADR via pix_tool_process_adr: {{args}}

Auto-numbered Nygard template in docs/adr/.
"""
EOF
      ;;
    "pix-fix")
      cat <<'EOF'
description = "Validate/fix project file tree"
prompt = """
Fix project file tree via pix_tool_fix: {{args}}

Scans and fixes barrel files, naming, directory layout.
"""
EOF
      ;;
    "pix-check")
      cat <<'EOF'
description = "Check code against pix guardrails"
prompt = """
Check code via pix_tool_check: {{args}}

Call with skill name and code. Fix failures. Rerun until all pass.
"""
EOF
      ;;
  esac
}

COMMAND_NAMES=(
  "pix-galaxy-mcp"
  "pix-architect"
  "pix-handoff"
  "pix-tdd"
  "pix-adr"
  "pix-fix"
  "pix-check"
)

install_for_agent() {
  local agent_label="$1"
  local dest_dir="$2"
  local format="$3"

  local ext=".md"
  [[ "$format" == "gemini" ]] && ext=".toml"

  for cmd in "${COMMAND_NAMES[@]}"; do
    local content
    content=$("content_${format}" "$cmd" 2>/dev/null) || continue
    [[ -z "$content" ]] && continue

    local destination="${dest_dir}/${cmd}${ext}"
    write_command "${agent_label}:${cmd}" "$destination" "$content"
  done
}

echo ""
echo "Installing pix-galaxy-mcp agent commands..."
echo ""

# ── Pi (global prompt templates) ──
if [[ -d "$HOME/.pi" ]]; then
  install_for_agent "Pi" "$HOME/.pi/agent/prompts" "args"
fi

# ── Claude Code (global commands) ──
if [[ -d "$HOME/.claude" ]]; then
  install_for_agent "Claude Code" "$HOME/.claude/commands" "args"
fi

# ── Gemini CLI (global commands) ──
if [[ -d "$HOME/.gemini" ]]; then
  install_for_agent "Gemini CLI" "$HOME/.gemini/commands" "gemini"
fi

# ── Windsurf (global workflows) ──
if [[ -d "$HOME/.codeium/windsurf" ]]; then
  install_for_agent "Windsurf" "${HOME}/.codeium/windsurf/global_workflows" "workflow"
elif [[ -d "$HOME/.config/windsurf" ]]; then
  install_for_agent "Windsurf" "${HOME}/.config/windsurf/global_workflows" "workflow"
fi

# ── Cline (global workflows) ──
if [[ -d "$HOME/.cline" ]]; then
  install_for_agent "Cline" "${HOME}/.cline/data/workflows" "workflow"
elif [[ -d "$HOME/.config/cline" ]]; then
  install_for_agent "Cline" "${HOME}/.config/cline/data/workflows" "workflow"
fi

# ── Cursor (project commands) ──
if [[ -d ".cursor" ]]; then
  install_for_agent "Cursor" ".cursor/commands" "workflow"
fi

# ── Windsurf (project workflows) ──
if [[ -d ".windsurf" ]]; then
  install_for_agent "Windsurf project" ".windsurf/workflows" "workflow"
fi

# ── Cline (project workflows) ──
if [[ -d ".clinerules" ]]; then
  install_for_agent "Cline project" ".clinerules/workflows" "workflow"
fi

echo ""
echo "Installed ${installed} command(s); skipped ${skipped}."
echo ""
echo "Available commands for Pi: /pix-galaxy-mcp, /pix-architect, /pix-handoff,"
echo "  /pix-tdd, /pix-adr, /pix-fix, /pix-check"
