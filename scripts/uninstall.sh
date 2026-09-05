#!/usr/bin/env bash
# =============================================================================
# rule-mcp - Universal Uninstaller
# =============================================================================
#
# Reverses all changes made by install.sh:
#   1. Removes rule-mcp entries from ALL coding agent configs (18+)
#   2. Removes rule-mcp rules from CLAUDE.md / AGENTS.md / GEMINI.md
#   3. Removes IDE configurations (VS Code, Neovim, JetBrains, Emacs)
#   4. Removes config directory (~/.config/rule-mcp/)
#   5. Removes environment variables from shell profiles
#   6. Removes git hooks
#   7. Optionally unlinks/removes global npm package
#
# Usage:
#   ./scripts/uninstall.sh
#   curl -fsSL https://rule-mcp.domain.example/uninstall.sh | bash
#
# Options:
#   --agent <name>       Uninstall for a specific agent only
#   --purge              Also delete ~/.config/rule-mcp/ and API keys
#   --keep-config        Keep ~/.config/rule-mcp/ (default with --purge)
#   --dry-run            Preview changes without writing
#   --force              Don't ask for confirmation
#
# =============================================================================

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
MCP_SERVER_NAME="rule-mcp"
SCRIPT_URL="https://rule-mcp.domain.example/uninstall.sh"

# ── Terminal rendering ──────────────────────────────────────────────────────
# Colors and box-drawing only render on a real TTY without NO_COLOR: piped and
# CI output stays plain and machine-parseable.
USE_COLOR=false
if [[ -t 1 ]] && [[ "${TERM:-dumb}" != "dumb" ]] && [[ -z "${NO_COLOR:-}" ]]; then
  USE_COLOR=true
fi
if [[ "$USE_COLOR" == "true" ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  CYAN='\033[0;36m'
  BLUE='\033[1;34m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  CYAN=''
  BLUE=''
  BOLD=''
  NC=''
fi

# Multi-line box banner; degrades to plain separator lines when not a TTY.
box_banner() {
  local color="${1:-$CYAN}"
  shift
  if [[ "$USE_COLOR" == "true" ]]; then
    echo -e "${BOLD}${color}╔══════════════════════════════════════════════════════╗${NC}"
    for line in "$@"; do
      echo -e "${BOLD}${color}║  ${line}${NC}"
    done
    echo -e "${BOLD}${color}╚══════════════════════════════════════════════════════╝${NC}"
  else
    for line in "$@"; do
      echo -e "${BOLD}── ${line} ──${NC}"
    done
  fi
  echo ""
}

# ── State ───────────────────────────────────────────────────────────────────
REMOVED_COUNT=0
SKIPPED_COUNT=0
HAS_ERROR=0
DRY_RUN=false
FORCE=false
PURGE=false
KEEP_CONFIG=false
TARGET_AGENT=""

# ── Helpers ──────────────────────────────────────────────────────────────────
info()  { echo -e "${CYAN}ℹ${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; HAS_ERROR=1; }
header(){ echo -e "\n${BOLD}${BLUE}── $1 ──${NC}\n"; }
sub()   { echo -e "  ${CYAN}→${NC} $1"; }

# Cross-platform sed -i
sed_inplace() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# Detect OS
detect_os() {
  case "$OSTYPE" in
    darwin*)  echo "macos" ;;
    linux*)   echo "linux" ;;
    msys*|cygwin*|mingw*) echo "windows" ;;
    *)        echo "$OSTYPE" ;;
  esac
}
OS=$(detect_os)
HOME_DIR="$HOME"

# ── Parse arguments ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent)      TARGET_AGENT="$2"; shift 2 ;;
    --purge)      PURGE=true; shift ;;
    --keep-config) KEEP_CONFIG=true; shift ;;
    --dry-run)    DRY_RUN=true; shift ;;
    --force)      FORCE=true; shift ;;
    --help|-h)
      echo "Usage: ./scripts/uninstall.sh"
      echo ""
      echo "Options:"
      echo "  --agent <name>   Uninstall for a specific agent only"
      echo "  --purge          Also delete ~/.config/rule-mcp/ and API keys"
      echo "  --keep-config    Keep ~/.config/rule-mcp/ (default with --purge)"
      echo "  --dry-run        Preview changes without writing"
      echo "  --force          Don't ask for confirmation"
      echo "  --help           Show this help"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Confirmation ─────────────────────────────────────────────────────────────
# Count agents that currently reference this server, so the confirmation
# screen reflects reality instead of a fixed list.
RULE_MCP_FOUND_COUNT=0
for cfg_path in \
  "$HOME_DIR/.claude.json" \
  "$HOME_DIR/.cursor/mcp.json" \
  "$HOME_DIR/.codex/config.toml" \
  "$HOME_DIR/.config/github-copilot/hosts.json" \
  "$HOME_DIR/.gemini/settings.json" \
  "$HOME_DIR/.pi/agent/mcp.json" \
  "$HOME_DIR/.config/cline/mcp.json" \
  "$HOME_DIR/.config/roo/mcp.json" \
  "$HOME_DIR/.config/zed/mcp.json" \
  "$HOME_DIR/.config/opencode/mcp.json" \
  "$HOME_DIR/.config/antigravity/mcp.json" \
  "$HOME_DIR/.config/windsurf/mcp.json"
do
  if [[ -f "$cfg_path" ]] && grep -q "rule-mcp" "$cfg_path" 2>/dev/null; then
    RULE_MCP_FOUND_COUNT=$((RULE_MCP_FOUND_COUNT + 1))
  fi
done

if [[ "$DRY_RUN" == "false" && "$FORCE" == "false" ]]; then
  box_banner "$YELLOW" "rule-mcp - Uninstall Confirmation"
  echo ""
  echo -e "  This will remove rule-mcp configuration from:"
  echo -e "   • ${RULE_MCP_FOUND_COUNT} agent config(s) currently reference rule-mcp"
  echo -e "   • Agent instruction files (CLAUDE.md, AGENTS.md, GEMINI.md)"
  echo -e "   • IDE configurations (VS Code, Neovim, JetBrains, Emacs)"
  echo -e "   • Shell profile environment variables"
  echo -e "   • Git hooks"
  if [[ "$PURGE" == "true" ]]; then
    echo -e "   • ${RED}~/.config/rule-mcp/ (API keys & config)${NC}"
  fi
  echo ""
  echo -e "  ${YELLOW}The npm package and project files will NOT be deleted.${NC}"
  echo -e "  ${YELLOW}Run with --purge to also remove config/keys.${NC}"
  echo ""
  if [[ ! -t 0 ]]; then
    CONFIRM="y"
    sub "Non-interactive shell detected, auto-confirming"
  else
    read -r -p "  Continue? [y/N] " CONFIRM
  fi
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "  ${CYAN}Uninstall cancelled.${NC}"
    exit 0
  fi
fi

box_banner "$RED" \
  "rule-mcp - Universal Uninstaller"

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 1: Agent MCP Configs
# ─────────────────────────────────────────────────────────────────────────────
header "Phase 1: Agent MCP Configurations"

# JSON removal helper: removes a server entry from mcp.json
# Handles both mcpServers (most agents) and servers (VS Code global config)
# Keeps the JSON valid by handling trailing commas
remove_mcp_entry() {
  local file="$1"
  local agent_name="$2"
  local mcp_name="${3:-$MCP_SERVER_NAME}"

  if [[ ! -f "$file" ]]; then
    sub "${agent_name}: config not found, skipping"
    return 0
  fi

  if grep -q "\"$mcp_name\"" "$file" 2>/dev/null; then
    if [[ "$DRY_RUN" == "true" ]]; then
      sub "[dry-run] Would remove ${mcp_name} from: ${file}"
    else
      # Use node to safely remove the entry and keep JSON valid
      node -e "
const fs = require('fs');
let c = fs.readFileSync('$file', 'utf-8');
try {
  const j = JSON.parse(c);
  let changed = false;
  if (j.mcpServers && j.mcpServers['$mcp_name']) {
    delete j.mcpServers['$mcp_name'];
    if (Object.keys(j.mcpServers).length === 0) {
      delete j.mcpServers;
    }
    changed = true;
  }
  if (j.servers && j.servers['$mcp_name']) {
    delete j.servers['$mcp_name'];
    if (Object.keys(j.servers).length === 0) {
      delete j.servers;
    }
    changed = true;
  }
  if (changed) {
    fs.writeFileSync('$file', JSON.stringify(j, null, 2) + '\n');
  }
} catch(e) {
  let lines = c.split('\n');
  let result = [];
  let inBlock = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('\"$mcp_name\"')) { inBlock = 1; }
    if (inBlock > 0) {
      if (lines[i].includes('{') && !lines[i].includes('}')) inBlock++;
      if (lines[i].includes('}')) inBlock--;
      if (inBlock === 0) {
        inBlock = 0;
        continue;
      }
      continue;
    }
    result.push(lines[i]);
  }
  fs.writeFileSync('$file', result.join('\n'));
}
" 2>/dev/null && ok "${agent_name}: ${mcp_name} removed" || warn "${agent_name}: failed to remove entry"
    fi
    return 0
  else
    sub "${agent_name}: ${mcp_name} not found, skipping"
    return 0
  fi
}

# Line-based removal for non-JSON agent files (e.g., Codex config.toml)
remove_lines_containing() {
  local file="$1"
  local agent_name="$2"
  local pattern="$3"

  if [[ ! -f "$file" ]]; then
    return 0
  fi

  if grep -q "$pattern" "$file" 2>/dev/null; then
    if [[ "$DRY_RUN" == "true" ]]; then
      sub "[dry-run] Would remove matching lines from: ${file}"
    else
      grep -v "$pattern" "$file" > "${file}.tmp" 2>/dev/null && mv "${file}.tmp" "$file"
      ok "${agent_name}: entries removed"
    fi
  fi
  return 0
}

if [[ -n "$TARGET_AGENT" ]]; then
  info "Targeting specific agent: ${TARGET_AGENT}"

  # Map agent name to config path
  case "$TARGET_AGENT" in
    claude)       FILE="$HOME_DIR/.claude.json" ;;
    claudemcp)    FILE="$HOME_DIR/.claude/mcp.json" ;;
    cursor)       FILE="$HOME_DIR/.cursor/mcp.json" ;;
    codex)        FILE="$HOME_DIR/.codex/config.toml" ;;
    copilot)      FILE="$HOME_DIR/.config/github-copilot/mcp.json" ;;
    gemini)       FILE="$HOME_DIR/.gemini/settings.json" ;;
    pi)           FILE="$HOME_DIR/.pi/agent/mcp.json" ;;
    cline)        FILE="$HOME_DIR/.config/cline/mcp.json" ;;
    roo)          FILE="$HOME_DIR/.config/roo/mcp.json" ;;
    zed)          FILE="$HOME_DIR/.config/zed/mcp.json" ;;
    opencode)     FILE="$HOME_DIR/.config/opencode/mcp.json" ;;
    antigravity)  FILE="$HOME_DIR/.config/antigravity/mcp.json" ;;
    windsurf)     FILE="$HOME_DIR/.config/windsurf/mcp.json" ;;
    kilo)         FILE="$HOME_DIR/.config/kilo/mcp.json" ;;
    kimi)         FILE="$HOME_DIR/.config/kimi/mcp.json" ;;
    vibe)         FILE="$HOME_DIR/.config/vibe/mcp.json" ;;
    grok)         FILE="$HOME_DIR/.config/grok/mcp.json" ;;
    droid)        FILE="$HOME_DIR/.config/factory/mcp.json" ;;
    kiro)         FILE="$HOME_DIR/.config/kiro/mcp.json" ;;
    qwen)         FILE="$HOME_DIR/.config/qwen/mcp.json" ;;
    vscode)       FILE="$(pwd)/.vscode/mcp.json" ;;
    *)
      warn "Unknown agent: ${TARGET_AGENT}"
      warn "Supported agents: claude, cursor, codex, copilot, gemini, pi, cline, roo, zed, opencode, antigravity, windsurf, kilo, kimi, vibe, grok, droid, kiro, qwen, vscode"
      exit 1
      ;;
  esac

  if [[ "$TARGET_AGENT" == "codex" ]]; then
    remove_lines_containing "$FILE" "$TARGET_AGENT" "rule"
  else
    remove_mcp_entry "$FILE" "$TARGET_AGENT"
  fi
else
  info "Cleaning agent configs..."

  # ── Agent detection matrix (same as install.sh) ──
  AGENT_NAMES=(
    "claude" "cursor" "codex" "copilot" "gemini" "pi"
    "cline" "roo" "zed" "opencode" "antigravity"
    "windsurf" "kilo" "kimi" "vibe" "grok"
    "droid" "kiro" "qwen" "vscode" "jetbrains"
  )
  AGENT_PATHS=(
    "$HOME_DIR/.claude.json"
    "$HOME_DIR/.cursor/mcp.json"
    "$HOME_DIR/.codex/config.toml"
    "$HOME_DIR/.config/github-copilot"
    "$HOME_DIR/.gemini/settings.json"
    "$HOME_DIR/.pi/agent/mcp.json"
    "$HOME_DIR/.config/cline/mcp.json"
    "$HOME_DIR/.config/roo/mcp.json"
    "$HOME_DIR/.config/zed/mcp.json"
    "$HOME_DIR/.config/opencode/mcp.json"
    "$HOME_DIR/.config/antigravity/mcp.json"
    "$HOME_DIR/.config/windsurf/mcp.json"
    "$HOME_DIR/.config/kilo/mcp.json"
    "$HOME_DIR/.config/kimi/mcp.json"
    "$HOME_DIR/.config/vibe/mcp.json"
    "$HOME_DIR/.config/grok/mcp.json"
    "$HOME_DIR/.config/factory/mcp.json"
    "$HOME_DIR/.config/kiro/mcp.json"
    "$HOME_DIR/.config/qwen/mcp.json"
    "$(pwd)/.vscode/mcp.json"
    ""
  )
  if [[ "$OS" == "macos" ]]; then
    AGENT_PATHS[20]="$HOME_DIR/Library/Application Support/JetBrains"
  elif [[ "$OS" == "linux" ]]; then
    AGENT_PATHS[20]="$HOME_DIR/.config/JetBrains"
  fi

  for i in "${!AGENT_NAMES[@]}"; do
    agent="${AGENT_NAMES[$i]}"
    local_path="${AGENT_PATHS[$i]}"
    [[ -z "$local_path" ]] && continue

    if [[ "$agent" == "codex" ]]; then
      remove_lines_containing "$local_path" "$agent" "rule"
    elif [[ "$agent" == "jetbrains" ]]; then
      # jetbrains uses .idea/mcp.json in project dir
      JB_FILE=".idea/mcp.json"
      if [[ -f "$JB_FILE" ]]; then
        remove_mcp_entry "$JB_FILE" "$agent"
      else
        # Also check for per-product configs
        for product_dir in "$local_path"*"/options"; do
          [ -d "$product_dir" ] || break
          mcp_xml="${product_dir}/mcp.xml"
          [[ -f "$mcp_xml" ]] && remove_lines_containing "$mcp_xml" "$agent" "rule"
        done 2>/dev/null
      fi
    elif [[ -f "$local_path" ]] || [[ -d "$local_path" ]]; then
      remove_mcp_entry "$local_path" "$agent"
    fi
  done
fi

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2: Agent Instruction Files
# ─────────────────────────────────────────────────────────────────────────────
header "Phase 2: Agent Instruction Files"

# Remove rule-mcp-rules section from a file
remove_rules_block() {
  local file="$1"
  local label="$2"

  if [[ ! -f "$file" ]]; then
    sub "${label}: not found, skipping"
    return 0
  fi

  if grep -q "rule-mcp-rules" "$file" 2>/dev/null; then
    if [[ "$DRY_RUN" == "true" ]]; then
      sub "[dry-run] Would remove rule rules from: ${file}"
    else
      # Remove the entire block from <!-- rule-mcp-rules --> to <!-- /rule-mcp-rules -->
      if [[ "$OS" == "macos" ]]; then
        sed -i '' '/<!-- rule-mcp-rules -->/,/<!-- \/rule-mcp-rules -->/d' "$file" 2>/dev/null || true
      else
        sed -i '/<!-- rule-mcp-rules -->/,/<!-- \/rule-mcp-rules -->/d' "$file" 2>/dev/null || true
      fi
      # Collapse trailing blank lines left by the removed block so the file
      # returns to its pre-install state (no blank-line accumulation).
      perl -0pi -e 's/\n*\z/\n/' "$file" 2>/dev/null || true
      ok "${label}: rules removed"
    fi
  else
    sub "${label}: no rule rules found, skipping"
  fi
}

remove_rules_block "$HOME_DIR/.claude/CLAUDE.md" "Claude Code"
remove_rules_block "$HOME_DIR/.gemini/GEMINI.md" "Gemini CLI"
remove_rules_block "$HOME_DIR/.codex/AGENTS.md" "Codex CLI"
remove_rules_block "$HOME_DIR/.cursor/.cursorrules" "Cursor"

# Check for project-level CLAUDE.md in common locations
for project_claude in "CLAUDE.md" "../CLAUDE.md"; do
  if [[ -f "$project_claude" ]]; then
    remove_rules_block "$project_claude" "Project $(basename "$project_claude")"
  fi
done

# Check for AGENTS.md per pi convention
if [[ -f "$HOME_DIR/.pi/agent/AGENTS.md" ]]; then
  remove_rules_block "$HOME_DIR/.pi/agent/AGENTS.md" "Pi AGENTS.md"
fi

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2b: Agent Command Files (prompts, workflows, commands)
# ─────────────────────────────────────────────────────────────────────────────
header "Phase 2b: Agent Command Files"

remove_command_files() {
  local label="$1"
  local dir="$2"
  local ext="$3"

  if [[ ! -d "$dir" ]]; then
    return
  fi

  local found=0
  for file in "$dir"/rule-*"$ext"; do
    # No rule-* file matches: the glob stays literal under `set -o nullglob` off
    [[ -e "$file" ]] || continue

    if [[ "$DRY_RUN" == "true" ]]; then
      sub "[dry-run] Would remove: ${file}"
    else
      rm -f "$file"
    fi
    found=$((found + 1))
  done

  if [[ "$DRY_RUN" != "true" && $found -gt 0 ]]; then
    ok "${label}: removed ${found} command file(s)"
  elif [[ $found -eq 0 ]]; then
    sub "${label}: no command files found"
  else
    sub "[dry-run] ${label}: would remove ${found} file(s)"
  fi
}

remove_command_files "Pi" "$HOME_DIR/.pi/agent/prompts" ".md"
remove_command_files "Claude Code" "$HOME_DIR/.claude/commands" ".md"
remove_command_files "Gemini CLI" "$HOME_DIR/.gemini/commands" ".toml"

if [[ -d "$HOME_DIR/.codeium/windsurf" ]]; then
  remove_command_files "Windsurf global" "$HOME_DIR/.codeium/windsurf/global_workflows" ".md"
fi
if [[ -d "$HOME_DIR/.config/windsurf" ]]; then
  remove_command_files "Windsurf global" "$HOME_DIR/.config/windsurf/global_workflows" ".md"
fi
if [[ -d "$HOME_DIR/.cline" ]]; then
  remove_command_files "Cline global" "$HOME_DIR/.cline/data/workflows" ".md"
fi
if [[ -d "$HOME_DIR/.config/cline" ]]; then
  remove_command_files "Cline global" "$HOME_DIR/.config/cline/data/workflows" ".md"
fi

CWD="$(pwd 2>/dev/null || echo '.')"
remove_command_files "Cursor project" "${CWD}/.cursor/commands" ".md"
remove_command_files "Windsurf project" "${CWD}/.windsurf/workflows" ".md"
remove_command_files "Cline project" "${CWD}/.clinerules/workflows" ".md"

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3: IDE Configurations
# ─────────────────────────────────────────────────────────────────────────────
header "Phase 3: IDE Configurations"

# ── Helper: remove the MCP entry for this server ──
remove_mcp_entry_dual() {
  local file="$1"
  local label="$2"
  remove_mcp_entry "$file" "$label" "rule-mcp"
}

# VS Code global config (user-level - this is where VS Code 1.90+ stores MCP)
VSCODE_GLOBAL_DIR=""
if [[ "$OS" == "macos" ]]; then
  VSCODE_GLOBAL_DIR="$HOME_DIR/Library/Application Support/Code/User"
elif [[ "$OS" == "linux" ]]; then
  VSCODE_GLOBAL_DIR="$HOME_DIR/.config/Code/User"
elif [[ "$OS" == "windows" ]]; then
  VSCODE_GLOBAL_DIR="$HOME_DIR/AppData/Roaming/Code/User"
fi
if [[ -n "$VSCODE_GLOBAL_DIR" ]]; then
  VSCODE_GLOBAL_MCP="$VSCODE_GLOBAL_DIR/mcp.json"
  if [[ -f "$VSCODE_GLOBAL_MCP" ]]; then
    remove_mcp_entry_dual "$VSCODE_GLOBAL_MCP" "VS Code (global)"
    if [[ "$DRY_RUN" == "false" && -f "$VSCODE_GLOBAL_MCP" ]]; then
      node -e "
const fs = require('fs');
let c = fs.readFileSync('$VSCODE_GLOBAL_MCP', 'utf-8');
try {
  const j = JSON.parse(c);
  if (j.servers && Object.keys(j.servers).length === 0) delete j.servers;
  fs.writeFileSync('$VSCODE_GLOBAL_MCP', JSON.stringify(j, null, 2) + '\n');
} catch(e) {}
" 2>/dev/null || true
    fi
  else
    sub "VS Code: no global mcp.json found, skipping"
  fi
fi

# VS Code project-level config
VSCODE_MCP="$(pwd)/.vscode/mcp.json"
if [[ -f "$VSCODE_MCP" ]]; then
  remove_mcp_entry_dual "$VSCODE_MCP" "VS Code (project)"
  if [[ "$DRY_RUN" == "false" ]]; then
    if [[ -f "$VSCODE_MCP" ]] && ! grep -q "mcpServers" "$VSCODE_MCP" 2>/dev/null && ! grep -q "\"servers\"" "$VSCODE_MCP" 2>/dev/null; then
      rm "$VSCODE_MCP" 2>/dev/null && sub "VS Code (project): removed empty mcp.json"
    fi
  fi
else
  sub "VS Code (project): no .vscode/mcp.json, skipping"
fi

# Code-OSS global config (open-source build)
if [[ "$OS" == "macos" ]]; then
  CODEOSS_GLOBAL_DIR="$HOME_DIR/Library/Application Support/Code - OSS/User"
elif [[ "$OS" == "linux" ]]; then
  CODEOSS_GLOBAL_DIR="$HOME_DIR/.config/Code - OSS/User"
fi
if [[ -n "$CODEOSS_GLOBAL_DIR" && -d "$CODEOSS_GLOBAL_DIR" ]]; then
  CODEOSS_MCP="$CODEOSS_GLOBAL_DIR/mcp.json"
  [[ -f "$CODEOSS_MCP" ]] && remove_mcp_entry_dual "$CODEOSS_MCP" "Code-OSS (global)"
fi

# VS Code Insiders
if [[ "$OS" == "macos" ]]; then
  VSCODE_INSIDERS_DIR="$HOME_DIR/Library/Application Support/Code - Insiders/User"
elif [[ "$OS" == "linux" ]]; then
  VSCODE_INSIDERS_DIR="$HOME_DIR/.config/Code - Insiders/User"
fi
if [[ -n "$VSCODE_INSIDERS_DIR" && -d "$VSCODE_INSIDERS_DIR" ]]; then
  VSCODE_INSIDERS_MCP="$VSCODE_INSIDERS_DIR/mcp.json"
  [[ -f "$VSCODE_INSIDERS_MCP" ]] && remove_mcp_entry_dual "$VSCODE_INSIDERS_MCP" "VS Code Insiders (global)"
fi

# Cursor global config
CURSOR_GLOBAL_MCP="$HOME_DIR/.cursor/mcp.json"
if [[ -f "$CURSOR_GLOBAL_MCP" ]]; then
  remove_mcp_entry_dual "$CURSOR_GLOBAL_MCP" "Cursor"
fi

# Windsurf global config
WINDSURF_GLOBAL_MCP="$HOME_DIR/.config/windsurf/mcp.json"
if [[ -f "$WINDSURF_GLOBAL_MCP" ]]; then
  remove_mcp_entry_dual "$WINDSURF_GLOBAL_MCP" "Windsurf"
fi

# Neovim config
NEOVIM_MCP=""
if [[ "$OS" == "macos" ]]; then
  NEOVIM_MCP="$HOME_DIR/.config/nvim/mcp.json"
elif [[ "$OS" == "linux" ]]; then
  NEOVIM_MCP="$HOME_DIR/.config/nvim/mcp.json"
fi
if [[ -n "$NEOVIM_MCP" && -f "$NEOVIM_MCP" ]]; then
  remove_mcp_entry_dual "$NEOVIM_MCP" "Neovim"
  if [[ "$DRY_RUN" == "false" ]]; then
    if [[ -f "$NEOVIM_MCP" ]] && ! grep -q "mcpServers" "$NEOVIM_MCP" 2>/dev/null && ! grep -q "\"servers\"" "$NEOVIM_MCP" 2>/dev/null; then
      rm "$NEOVIM_MCP" 2>/dev/null && sub "Neovim: removed empty mcp.json"
    fi
  fi
else
  sub "Neovim: no mcp.json found, skipping"
fi

# JetBrains project-level config
JB_MCP="$(pwd)/.idea/mcp.json"
if [[ -f "$JB_MCP" ]]; then
  remove_mcp_entry_dual "$JB_MCP" "JetBrains"
  if [[ "$DRY_RUN" == "false" ]]; then
    if [[ -f "$JB_MCP" ]] && ! grep -q "mcpServers" "$JB_MCP" 2>/dev/null && ! grep -q "\"servers\"" "$JB_MCP" 2>/dev/null; then
      rm "$JB_MCP" 2>/dev/null && sub "JetBrains: removed empty mcp.json"
    fi
  fi
else
  sub "JetBrains: no .idea/mcp.json, skipping"
fi

# Emacs config
EMACS_CONFIG="$HOME_DIR/.emacs.d/init.el"
if [[ -f "$EMACS_CONFIG" ]]; then
  if grep -q "rule-mcp" "$EMACS_CONFIG" 2>/dev/null; then
    if [[ "$DRY_RUN" == "true" ]]; then
      sub "[dry-run] Would remove rule-mcp lines from: ${EMACS_CONFIG}"
    else
      cp "$EMACS_CONFIG" "${EMACS_CONFIG}.bak" 2>/dev/null || true
      if [[ "$OS" == "macos" ]]; then
        sed -i '' '/rule-mcp/d' "$EMACS_CONFIG"
        sed -i '' '/;; rule-mcp/d' "$EMACS_CONFIG"
      else
        sed -i '/rule-mcp/d' "$EMACS_CONFIG"
        sed -i '/;; rule-mcp/d' "$EMACS_CONFIG"
      fi
      ok "Emacs: rule-mcp lines removed"
    fi
  else
    sub "Emacs: no rule-mcp config found, skipping"
  fi
else
  sub "Emacs: no init.el found, skipping"
fi

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 4: Shell Profile Environment Variables
# ─────────────────────────────────────────────────────────────────────────────
header "Phase 4: Shell Profiles"

clean_shell_profile() {
  local profile="$1"
  if [[ ! -f "$profile" ]]; then
    sub "${profile}: not found, skipping"
    return 0
  fi

  if grep -q "rule-mcp" "$profile" 2>/dev/null || grep -q "# rule-mcp:" "$profile" 2>/dev/null; then
    if [[ "$DRY_RUN" == "true" ]]; then
      sub "[dry-run] Would remove rule-mcp env vars from: ${profile}"
    else
      if [[ "$OS" == "macos" ]]; then
        sed -i '' '/# rule-mcp:/d' "$profile" 2>/dev/null || true
        sed -i '' '/export OPENAI_API_KEY=".*"/d' "$profile" 2>/dev/null || true
        sed -i '' '/export ANTHROPIC_API_KEY=".*"/d' "$profile" 2>/dev/null || true
        sed -i '' '/export GEMINI_API_KEY=".*"/d' "$profile" 2>/dev/null || true
        sed -i '' '/export XAI_API_KEY=".*"/d' "$profile" 2>/dev/null || true
      else
        sed -i '/# rule-mcp:/d' "$profile" 2>/dev/null || true
        sed -i '/export OPENAI_API_KEY=".*"/d' "$profile" 2>/dev/null || true
        sed -i '/export ANTHROPIC_API_KEY=".*"/d' "$profile" 2>/dev/null || true
        sed -i '/export GEMINI_API_KEY=".*"/d' "$profile" 2>/dev/null || true
        sed -i '/export XAI_API_KEY=".*"/d' "$profile" 2>/dev/null || true
      fi
      ok "Cleaned: ${profile}"
    fi
  else
    sub "${profile}: no rule-mcp entries, skipping"
  fi
  return 0
}

if [[ "$OS" == "macos" ]] || [[ "$OS" == "linux" ]]; then
  clean_shell_profile "$HOME_DIR/.bashrc"
  clean_shell_profile "$HOME_DIR/.zshrc"
  clean_shell_profile "$HOME_DIR/.bash_profile"
  clean_shell_profile "$HOME_DIR/.profile"
  clean_shell_profile "$HOME_DIR/.config/fish/config.fish"
  clean_shell_profile "$HOME_DIR/.config/elvish/rc.elv"
fi

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 5: Config Directory & API Keys
# ─────────────────────────────────────────────────────────────────────────────
header "Phase 5: Config Directory"

CONFIG_DIR="$HOME_DIR/.config/rule-mcp"

if [[ -d "$CONFIG_DIR" ]]; then
  if [[ "$KEEP_CONFIG" == "true" ]]; then
    sub "Keeping config directory (--keep-config): ${CONFIG_DIR}"
  elif [[ "$PURGE" == "true" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
      sub "[dry-run] Would delete: ${CONFIG_DIR}/"
    else
      rm -rf "$CONFIG_DIR"
      ok "Config directory deleted: ${CONFIG_DIR}"
    fi
  else
    # Default: list what's there without deleting
    key_count=$(find "$CONFIG_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
    sub "Config directory exists with ${key_count} file(s): ${CONFIG_DIR}"
    sub "Use --purge to delete API keys and config"
  fi
else
  sub "No config directory found, skipping"
fi

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 6: Git Hooks
# ─────────────────────────────────────────────────────────────────────────────
header "Phase 6: Git Hooks"

HOOKS_DIR=".git/hooks"
POST_COMMIT="$HOOKS_DIR/post-commit"

if [[ -f "$POST_COMMIT" ]]; then
  if grep -q "rule" "$POST_COMMIT" 2>/dev/null; then
    if [[ "$DRY_RUN" == "true" ]]; then
      sub "[dry-run] Would remove rule-mcp lines from: ${POST_COMMIT}"
    else
      cp "$POST_COMMIT" "${POST_COMMIT}.bak" 2>/dev/null || true
      # Remove the WHOLE block, not just the lines matching "rule-mcp":
      # a line-wise delete strips the `if`/body but leaves the closing `fi`,
      # which makes every later commit fail with a shell syntax error.
      # Marker-delimited blocks go first; any orphan `fi` an earlier removal
      # already left behind is repaired after.
      if [[ "$OS" == "macos" ]]; then
        SED_INPLACE=(sed -i '')
      else
        SED_INPLACE=(sed -i)
      fi
      "${SED_INPLACE[@]}" '/^# >>> rule-mcp >>>$/,/^# <<< rule-mcp <<<$/d' "$POST_COMMIT" 2>/dev/null || true
      # Repair orphan `fi` lines a previous line-wise uninstall left behind:
      # drop any `fi` that has no still-open `if` above it.
      if ! sh -n "$POST_COMMIT" 2>/dev/null; then
        awk '
          /^[[:space:]]*if([[:space:]]|$)/ { depth++; print; next }
          /^[[:space:]]*fi[[:space:]]*$/   { if (depth > 0) { depth--; print } next }
                                          { print }
        ' "$POST_COMMIT" > "${POST_COMMIT}.tmp" 2>/dev/null &&
          mv "${POST_COMMIT}.tmp" "$POST_COMMIT" && chmod +x "$POST_COMMIT"
        rm -f "${POST_COMMIT}.tmp"
      fi
      if ! sh -n "$POST_COMMIT" 2>/dev/null; then
        warn "post-commit hook still has a syntax error after cleaning; backup at ${POST_COMMIT}.bak"
      fi
      ok "Git post-commit hook cleaned"
    fi
  else
    sub "Git hooks: no rule-mcp entries, skipping"
  fi
else
  sub "Git hooks: not found, skipping"
fi

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 7: Global npm Package (optional)
# ─────────────────────────────────────────────────────────────────────────────
header "Phase 7: Global Package"

# install.sh creates a `pnpm link --global` shim (scripts/install.sh →
# ensure_global_shim) so agent configs can call `rule-mcp` directly.
# Uninstall must reverse that: unlink the linked package, then remove the bin
# shim and any leftover link in the per-user pnpm store.
if command -v rule-mcp &>/dev/null; then
  global_path=$(command -v rule-mcp 2>/dev/null || true)
  if [[ -n "$global_path" ]]; then
    sub "Global binary found: ${global_path}"
    if [[ "$DRY_RUN" == "true" ]]; then
      sub "[dry-run] Would unlink/remove the global rule-mcp shim"
    else
      # pnpm-linked packages need `pnpm unlink --global`, not `remove -g`.
      if command -v pnpm &>/dev/null; then
        pnpm unlink --global rule-mcp >/dev/null 2>&1 && ok "Global package unlinked (pnpm unlink)" || true
      fi
      # Fallback to npm for a real global install.
      if command -v rule-mcp &>/dev/null && command -v npm &>/dev/null; then
        npm uninstall -g rule-mcp >/dev/null 2>&1 && ok "Global package removed (npm)" || true
      fi
    fi
  fi
else
  sub "No global rule-mcp binary found, skipping"
fi

# Belt-and-braces: remove the bin shims + linked store entry even when pnpm
# metadata is gone. A stale shim keeps `command -v rule-mcp` resolving
# forever and silently breaks reinstalls.
shim_candidates=()
[[ -n "${PNPM_HOME:-}" ]] && shim_candidates+=("$PNPM_HOME/bin/rule-mcp")
shim_candidates+=(
  "$HOME_DIR/Library/pnpm/bin/rule-mcp"
  "$HOME_DIR/.local/share/pnpm/bin/rule-mcp"
  "$HOME_DIR/.pnpm-global/bin/rule-mcp"
  "$HOME_DIR/.npm-global/bin/rule-mcp"
)
shim_seen=()
for shim in "${shim_candidates[@]}"; do
  # Skip duplicates (e.g. PNPM_HOME coinciding with the default dir).
  if [[ ${#shim_seen[@]} -gt 0 ]] && [[ " ${shim_seen[*]} " == *" $shim "* ]]; then
    continue
  fi
  shim_seen+=("$shim")
  if [[ -f "$shim" ]] || [[ -L "$shim" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
      sub "[dry-run] Would remove global shim: ${shim}"
    else
      rm -f "$shim"
      ok "Removed global shim: ${shim}"
    fi
  fi
done
# Linked package entry inside pnpm's per-user global store (a symlink to the
# project repo when created by `pnpm link --global .`).
for linked in \
  "$HOME_DIR/Library/pnpm/global/"*/node_modules/rule-mcp \
  "$HOME_DIR/.local/share/pnpm/global/"*/node_modules/rule-mcp
do
  if [[ -e "$linked" ]] || [[ -L "$linked" ]]; then
    if [[ "$DRY_RUN" == "true" ]]; then
      sub "[dry-run] Would remove global link: ${linked}"
    else
      rm -rf "$linked"
      ok "Removed global link: ${linked}"
    fi
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 8: Daemon Service Removal
# ─────────────────────────────────────────────────────────────────────────────
header "Phase 8: Daemon Service"

if command -v rule-mcp &>/dev/null; then
  if [[ "$DRY_RUN" == "true" ]]; then
    sub "[dry-run] Would uninstall daemon service for $(detect_os)"
    if [[ "$OS" == "macos" ]]; then
      sub "  Would unload: ~/Library/LaunchAgents/io.github.rule.rule-mcp.plist"
      sub "  Would remove: plist file"
    fi
  else
    info "Removing ${OS} daemon service..."
    if rule-mcp daemon uninstall 2>/dev/null; then
      ok "Daemon service removed"
      if [[ "$OS" == "macos" ]]; then
        sub "  LaunchAgent plist deleted and unloaded"
        sub "  No longer appears in System Settings → Login Items"
      fi
    else
      warn "Daemon service removal had issues"
      sub "  Run: rule-mcp daemon uninstall"
    fi
  fi
else
  # Manual cleanup without the binary
  if [[ "$OS" == "macos" ]]; then
    PLIST="$HOME_DIR/Library/LaunchAgents/io.github.rule.rule-mcp.plist"
    if [[ -f "$PLIST" ]]; then
      if [[ "$DRY_RUN" == "true" ]]; then
        sub "[dry-run] Would remove: ${PLIST}"
      else
        launchctl unload -w "$PLIST" 2>/dev/null || true
        rm -f "$PLIST"
        ok "LaunchAgent removed: ${PLIST}"
      fi
    else
      sub "No LaunchAgent found, skipping"
    fi
  elif [[ "$OS" == "linux" ]]; then
    UNIT="$HOME_DIR/.config/systemd/user/rule-mcp.service"
    if [[ -f "$UNIT" ]]; then
      if [[ "$DRY_RUN" == "true" ]]; then
        sub "[dry-run] Would remove: ${UNIT}"
      else
        systemctl --user stop rule-mcp 2>/dev/null || true
        systemctl --user disable rule-mcp 2>/dev/null || true
        rm -f "$UNIT"
        systemctl --user daemon-reload
        ok "systemd service removed: ${UNIT}"
      fi
    else
      sub "No systemd unit found, skipping"
    fi
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 9: Cleanup empty backup files
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$DRY_RUN" == "false" ]]; then
  # Remove empty .bak files
  find "$HOME_DIR" -maxdepth 4 -name "*.bak" -empty 2>/dev/null | xargs rm -f 2>/dev/null || true
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
header "Uninstall Summary"

if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "  ${YELLOW}⚠ Dry-run mode - no changes were made${NC}"
  echo ""
  echo "  To apply:  ./scripts/uninstall.sh"
  echo "  To run live: curl -fsSL ${SCRIPT_URL} | bash"
  echo ""
  exit 0
fi

echo ""
echo -e "  ${GREEN}✓ rule-mcp has been uninstalled from your system.${NC}"
echo -e "  ${CYAN}The following were removed:${NC}"
echo -e "   • MCP server entries from coding agent configs"
echo -e "   • Global pnpm shim/link (so \`command -v rule-mcp\` resolves to nothing)"
echo -e "   • Instruction rules from agent instruction files"
echo -e "   • IDE configurations (VS Code, Neovim, JetBrains, Emacs)"
echo -e "   • Daemon service (LaunchAgent / systemd / Windows Service)"
echo -e "   • Environment variables from shell profiles"
echo -e "   • Git hooks"
if [[ "$PURGE" == "true" ]]; then
  echo -e "   • Config directory and API keys"
fi
echo ""

echo -e "  ${YELLOW}Note: The project files in $(pwd) were NOT deleted.${NC}"
echo -e "  ${YELLOW}To remove them manually:  rm -rf $(pwd)${NC}"
echo ""

echo -e "  ${CYAN}To reinstall later:${NC}"
echo -e "    curl -fsSL https://rule-mcp.domain.example/install.sh | bash"
echo -e "    # OR"
echo -e "    cd $(pwd) && ./scripts/install.sh"
echo ""

if [[ "$HAS_ERROR" -eq 1 ]]; then
  echo -e "  ${RED}${BOLD}⚠ Uninstall completed with warnings.${NC}"
  echo -e "  ${YELLOW}Manual cleanup may be needed.${NC}"
else
  echo -e "  ${GREEN}${BOLD}✓ Uninstall complete!${NC}"
  echo -e "  ${CYAN}Restart your coding agent for changes to take effect.${NC}"
fi
echo ""
