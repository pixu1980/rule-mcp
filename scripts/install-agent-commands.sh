#!/usr/bin/env bash
# Install rule-mcp agent commands for all supported coding agents.
#
# Installs prompt templates / commands for:
#   rule-mcp    — Route via rule-mcp
#   rule-architect     — Route via rule-architect skill
#   rule-handoff       — Generate handoff summary
#   rule-grill         — Grill-me (code review/QA)
#   rule-tdd           — Test-driven development workflow
#   rule-adr           — Architecture Decision Record
#   rule-fix           — Validate/fix file tree
#   rule-check         — Check code against guardrails
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
    "rule-mcp")
      cat <<'EOF'
---
description: Explicitly route a request through rule-mcp
argument-hint: "[request]"
---
Use the rule-mcp MCP server explicitly for this request: $ARGUMENTS

Call `rule` first to select the correct skill, follow the returned guidance, and use `pix_check` to validate relevant code before finishing. If no arguments were supplied, apply this workflow to the current user request.
EOF
      ;;
    "rule-architect")
      cat <<'EOF'
---
description: Route to rule-architect for project scaffolding and ADR decisions
argument-hint: "<request>"
---
Process this request through rule-architect skill: $ARGUMENTS

1. Call `rule` to route to architect skill.
2. Load full rule-architect skill evidence.
3. Execute architect workflow: project scaffolding, skill mapping, context generation, ADR.
4. Use `pix_process_adr` for architecture decisions.
EOF
      ;;
    "rule-handoff")
      cat <<'EOF'
---
description: Generate compressed LLM handoff summary via rule-process-handoff
argument-hint: "[mode] [projectDir]"
---
Generate a handoff summary for session continuity: $ARGUMENTS

1. Call `pix_process_handoff` with provided arguments.
2. Default mode "handoff" with all includes enabled.
3. Use mode "close-session" for full git diff + roadmap + doc scan.
4. Output result for pasting into next session.
EOF
      ;;
    "rule-grill")
      cat <<'EOF'
---
description: Run grill-me code review / interrogation via rule
argument-hint: "<target>"
---
Run grill-me skill for code review or interrogation: $ARGUMENTS

1. Call `rule` to route to grill-me skill.
2. Load full grill-me skill evidence.
3. Follow the guided interrogation workflow.
EOF
      ;;
    "rule-tdd")
      cat <<'EOF'
---
description: Run test-driven development workflow via rule
argument-hint: "<feature>"
---
Run test-driven development workflow: $ARGUMENTS

1. Call `rule` to route to test-driven-development skill.
2. Load full TDD skill evidence.
3. Follow the Red-Green-Refactor cycle.
4. Write failing tests before implementation.
EOF
      ;;
    "rule-adr")
      cat <<'EOF'
---
description: Record an Architecture Decision Record via pix_process_adr
argument-hint: "<title>"
---
Record an Architecture Decision Record: $ARGUMENTS

1. Call `pix_process_adr` with the ADR details.
2. Uses Nygard template with auto-numbering.
3. Saves to docs/adr/ with index maintenance.
EOF
      ;;
    "rule-fix")
      cat <<'EOF'
---
description: Validate and fix project file tree structure via pix_fix
argument-hint: "[path]"
---
Validate and fix project file tree: $ARGUMENTS

1. Call `pix_fix` to scan project structure.
2. Fixes barrel files, naming conventions, directory layout.
3. Pass path parameter to limit scope.
EOF
      ;;
    "rule-check")
      cat <<'EOF'
---
description: Check code against rule guardrails via pix_check
argument-hint: "<skill> <code>"
---
Check code against rule guardrails: $ARGUMENTS

1. Call `pix_check` with the target skill name and code.
2. Fix every failure.
3. Rerun until allPass: true.
EOF
      ;;
  esac
}

content_workflow() {
  local name="$1"
  case "$name" in
    "rule-mcp")
      cat <<'EOF'
# rule-mcp

Explicitly use the rule-mcp MCP server for the request supplied with this command.

1. Call `rule` first to select the correct skill.
2. Follow the routed skill guidance while completing the request.
3. Run `pix_check` against relevant code before finishing.
EOF
      ;;
    "rule-architect")
      cat <<'EOF'
# rule-architect

Route through rule-architect for project structure, ADRs, and skill mapping.

1. Call `rule` to route to architect skill.
2. Execute architect workflow with ADR recording.
EOF
      ;;
    "rule-handoff")
      cat <<'EOF'
# rule-handoff

Generate handoff summary for session continuity.

1. Call `pix_process_handoff`.
2. Default: mode "handoff" with all includes.
EOF
      ;;
    "rule-grill")
      cat <<'EOF'
# rule-grill

Run grill-me code review or interrogation.

1. Call `rule` to route to grill-me skill.
2. Execute guided interrogation workflow.
EOF
      ;;
    "rule-tdd")
      cat <<'EOF'
# rule-tdd

Run test-driven development workflow (Red-Green-Refactor).

1. Call `rule` to route to test-driven-development skill.
2. Write failing tests first, then implement, then refactor.
EOF
      ;;
    "rule-adr")
      cat <<'EOF'
# rule-adr

Record an Architecture Decision Record.

1. Call `pix_process_adr` with title and details.
2. Auto-numbered in docs/adr/ with Nygard template.
EOF
      ;;
    "rule-fix")
      cat <<'EOF'
# rule-fix

Validate and fix project file tree structure.

1. Call `pix_fix` to scan and fix.
2. Barrel files, naming, directory layout.
EOF
      ;;
    "rule-check")
      cat <<'EOF'
# rule-check

Check code against rule guardrails.

1. Call `pix_check` with skill name and code.
2. Fix failures and rerun until all pass.
EOF
      ;;
  esac
}

content_gemini() {
  local name="$1"
  case "$name" in
    "rule-mcp")
      cat <<'EOF'
description = "Explicitly route a request through rule-mcp"
prompt = """
Use the rule-mcp MCP server explicitly for this request: {{args}}

Call `rule` first to select the correct skill, follow the returned guidance, and use `pix_check` to validate relevant code before finishing. If no arguments were supplied, apply this workflow to the current user request.
"""
EOF
      ;;
    "rule-architect")
      cat <<'EOF'
description = "Route to rule-architect for project scaffolding"
prompt = """
Process through rule-architect skill: {{args}}

1. Call `rule` to route to architect skill.
2. Load skill evidence and execute architect workflow.
3. Use `pix_process_adr` for decisions.
"""
EOF
      ;;
    "rule-handoff")
      cat <<'EOF'
description = "Generate LLM handoff summary"
prompt = """
Generate handoff summary via pix_process_handoff: {{args}}

Default mode "handoff". Use "close-session" for full context dump.
"""
EOF
      ;;
    "rule-grill")
      cat <<'EOF'
description = "Run grill-me code review"
prompt = """
Run grill-me skill for code review: {{args}}

Call `rule` to route to grill-me skill and execute.
"""
EOF
      ;;
    "rule-tdd")
      cat <<'EOF'
description = "Run test-driven development workflow"
prompt = """
Run TDD workflow: {{args}}

Call `rule` to route to test-driven-development skill.
Follow Red-Green-Refactor cycle. Write failing tests first.
"""
EOF
      ;;
    "rule-adr")
      cat <<'EOF'
description = "Record Architecture Decision Record"
prompt = """
Record ADR via pix_process_adr: {{args}}

Auto-numbered Nygard template in docs/adr/.
"""
EOF
      ;;
    "rule-fix")
      cat <<'EOF'
description = "Validate/fix project file tree"
prompt = """
Fix project file tree via pix_fix: {{args}}

Scans and fixes barrel files, naming, directory layout.
"""
EOF
      ;;
    "rule-check")
      cat <<'EOF'
description = "Check code against rule guardrails"
prompt = """
Check code via pix_check: {{args}}

Call with skill name and code. Fix failures. Rerun until all pass.
"""
EOF
      ;;
  esac
}

COMMAND_NAMES=(
  "rule-mcp"
  "rule-architect"
  "rule-handoff"
  "rule-grill"
  "rule-tdd"
  "rule-adr"
  "rule-fix"
  "rule-check"
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
echo "Installing rule-mcp agent commands..."
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
echo "Available commands for Pi: /rule-mcp, /rule-architect, /rule-handoff,"
echo "  /rule-grill, /rule-tdd, /rule-adr, /rule-fix, /rule-check"
