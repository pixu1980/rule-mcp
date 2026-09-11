#!/usr/bin/env bash
# =============================================================================
# rule-mcp - Quick Setup (one-liner)
# =============================================================================
#
# One-command setup: npm install + agent detection + configuration.
# Designed to be curl-pipe-able:
#
#   curl -fsSL https://raw.githubusercontent.com/pixu1980/rule-mcp/v0.1.0/scripts/setup.sh | bash
#
# Or local:
#
#   ./scripts/setup.sh
#
# What it does:
#   1. Checks prerequisites (Node.js >= 20, npm/pnpm)
#   2. Installs rule-mcp globally
#   3. Auto-detects all installed coding agents (23 supported)
#   4. Registers rule-mcp as MCP server in each detected agent
#   5. Prints next steps
#
# =============================================================================

set -euo pipefail

# ── Detect where we are ──
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTALL_SCRIPT="$SCRIPT_DIR/install.sh"

# If we're inside the repository, use the local install.sh
if [ -f "$INSTALL_SCRIPT" ]; then
  echo "Found local install.sh - running it..."
  exec bash "$INSTALL_SCRIPT" "$@"
fi

# Otherwise, fetch from GitHub and run
echo "Downloading rule-mcp installer..."
INSTALL_URL="https://raw.githubusercontent.com/pixu1980/rule-mcp/main/scripts/install.sh"

if command -v curl &>/dev/null; then
  bash -c "$(curl -fsSL "$INSTALL_URL")" -- "$@"
elif command -v wget &>/dev/null; then
  bash -c "$(wget -qO- "$INSTALL_URL")" -- "$@"
else
  echo "Error: need curl or wget to download installer"
  echo "Install Node.js >= 20, then run:"
  echo "  npx rule-mcp install --agent all"
  exit 1
fi
