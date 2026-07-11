#!/usr/bin/env pwsh
# =============================================================================
# pix-galaxy-mcp — Universal Installer (Windows / PowerShell)
# =============================================================================
#
# Integrates pix-galaxy-mcp with ALL coding agents, IDEs, and model providers.
# Inspired by the tokensave architecture (18+ agent integrations).
#
# What this does:
#   1. Installs/updates the pix-galaxy-mcp npm package globally
#   2. Auto-detects installed coding agents on your system (18+ supported)
#   3. Registers pix-galaxy-mcp as an MCP server in each detected agent
#   4. Installs IDE extensions / configs for supported editors
#   5. Optionally configures model provider API keys
#   6. Runs a health check to confirm everything works
#
# Prerequisites:
#   - Node.js >= 20 (https://nodejs.org)
#   - pnpm (recommended) or npm
#
# Usage:
#   powershell -c "irm https://pix-galaxy.dev/install.ps1 | iex"
#   # OR
#   .\scripts\install.ps1
#
# Parameters:
#   -Agent <name>    Install for a specific agent only
#   -Models          Prompt to configure model API keys
#   -NoRules         Skip agent instruction files
#   -DryRun          Preview changes without writing
#   -Force           Override existing configurations
#   -Help            Show this help
#
# =============================================================================

param(
  [string]$Agent = "",
  [switch]$Models = $false,
  [switch]$NoRules = $false,
  [switch]$DryRun = $false,
  [switch]$Force = $false,
  [switch]$Help = $false
)

if ($Help) {
  Write-Host "pix-galaxy-mcp — Universal Installer (PowerShell)" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Usage:" -ForegroundColor Yellow
  Write-Host "  powershell -c `"irm https://pix-galaxy.dev/install.ps1 | iex`""
  Write-Host "  .\scripts\install.ps1"
  Write-Host ""
  Write-Host "Parameters:" -ForegroundColor Yellow
  Write-Host "  -Agent <name>    Install for a specific agent only"
  Write-Host "  -Models          Prompt to configure model API keys"
  Write-Host "  -NoRules         Skip agent instruction files"
  Write-Host "  -DryRun          Preview changes without writing"
  Write-Host "  -Force           Override existing configurations"
  exit 0
}

# ── Config ──
$McpServerName = "pix_galaxy_mcp"
$NodeMin = 20
$NpmPackage = "pix-galaxy-mcp"
$PackageVersion = "latest"
$ScriptUrl = "https://pix-galaxy.dev/install.ps1"

# ── State ──
$InstalledAgents = @()
$ConfiguredCount = 0
$SkippedCount = 0
$HasError = $false
$InstallRules = -not $NoRules
$TargetAgent = $Agent

# ── Helpers ──
function Write-Info  { Write-Host "ℹ $($args[0])" -ForegroundColor Cyan }
function Write-Ok    { Write-Host "✓ $($args[0])" -ForegroundColor Green }
function Write-Warn  { Write-Host "⚠ $($args[0])" -ForegroundColor Yellow }
function Write-Fail  { Write-Host "✗ $($args[0])" -ForegroundColor Red; $global:HasError = $true }
function Write-Header{ Write-Host "`n── $($args[0]) ──`n" -ForegroundColor Blue }
function Write-Step  { Write-Host "  → $($args[0])" -ForegroundColor Cyan }

function Test-Command($cmd) {
  try { Get-Command $cmd -ErrorAction Stop; return $true }
  catch { return $false }
}

# ── Banner ──
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         pix-galaxy-mcp — Universal Installer        ║" -ForegroundColor Cyan
Write-Host "║   MCP Server for the pix-* Skill Ecosystem      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 1: Prerequisites
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 1: Prerequisites"

if (-not (Test-Command node)) {
  Write-Fail "Node.js not found. Install Node.js >= $NodeMin from: https://nodejs.org"
  exit 1
}

$nodeVer = [int](node --version).Replace("v", "").Split(".")[0]
if ($nodeVer -lt $NodeMin) {
  Write-Fail "Node.js >= $NodeMin required (found $(node --version))"
  exit 1
}
Write-Ok "Node.js $(node --version) detected"

$PM = ""
if (Test-Command pnpm) {
  $PM = "pnpm"
  Write-Ok "pnpm detected (preferred)"
} elseif (Test-Command npm) {
  $PM = "npm"
  Write-Ok "npm detected"
} else {
  Write-Fail "No package manager found."
  exit 1
}

if (Test-Command git) {
  Write-Ok "git detected"
} else {
  Write-Warn "git not found (hooks skipped)"
}

$HomeDir = $HOME
Write-Ok "Home: $HomeDir"

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2: Install/Update npm Package
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 2: Install pix-galaxy-mcp"

if ($DryRun) {
  Write-Step "[dry-run] Would install: $PM add -g ${NpmPackage}@${PackageVersion}"
} else {
  Write-Info "Installing ${NpmPackage}@${PackageVersion} via $PM..."

  if ($PM -eq "pnpm") {
    $result = pnpm add -g "${NpmPackage}@${PackageVersion}" 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "${NpmPackage} installed globally via pnpm"
    } else {
      Write-Warn "pnpm install failed — trying npm..."
      $result = npm install -g "${NpmPackage}@${PackageVersion}" 2>&1
      if ($LASTEXITCODE -eq 0) {
        Write-Ok "${NpmPackage} installed globally via npm"
      } else {
        Write-Warn "Global install failed. Will continue with npx fallback."
      }
    }
  } else {
    $result = npm install -g "${NpmPackage}@${PackageVersion}" 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "${NpmPackage} installed globally via npm"
    } else {
      Write-Warn "Global install failed. Will continue with npx fallback."
    }
  }
}

# Determine the command
$BinCmd = ""
if (Test-Command pix-galaxy-mcp) {
  $BinCmd = "pix-galaxy-mcp"
  Write-Ok "Global binary found: $(Get-Command pix-galaxy-mcp).Source"
} elseif ($PM -eq "pnpm") {
  $BinCmd = "pnpx pix-galaxy-mcp"
  Write-Warn "Using: $BinCmd"
} else {
  $BinCmd = "npx pix-galaxy-mcp"
  Write-Warn "Using: $BinCmd"
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3: Agent Detection & Installation
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 3: Agent Integration"

if ($TargetAgent) {
  Write-Info "Targeting: $TargetAgent"
  if ($DryRun) {
    Write-Step "[dry-run] Would run: $BinCmd install --agent $TargetAgent"
  } else {
    $result = Invoke-Expression "& $BinCmd install --agent $TargetAgent" 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "Installed for $TargetAgent"
    } else {
      Write-Warn "Failed to install for $TargetAgent"
    }
  }
} else {
  Write-Info "Auto-detecting installed agents..."

  # Agent detection map (Windows paths)
  $AgentChecks = @{
    "claude"      = "$HomeDir\.claude.json"
    "cursor"      = "$HomeDir\.cursor\mcp.json"
    "codex"       = "$HomeDir\.codex\config.toml"
    "copilot"     = "$HomeDir\.config\github-copilot"
    "gemini"      = "$HomeDir\.gemini\settings.json"
    "pi"          = "$HomeDir\.pi\agent\mcp.json"
    "cline"       = "$HomeDir\.config\cline\mcp.json"
    "roo"         = "$HomeDir\.config\roo\mcp.json"
    "zed"         = "$HomeDir\.config\zed\mcp.json"
    "opencode"    = "$HomeDir\.config\opencode\mcp.json"
    "antigravity" = "$HomeDir\.config\antigravity\mcp.json"
    "windsurf"    = "$HomeDir\.config\windsurf\mcp.json"
    "kilo"        = "$HomeDir\.config\kilo\mcp.json"
    "kimi"        = "$HomeDir\.config\kimi\mcp.json"
    "vibe"        = "$HomeDir\.config\vibe\mcp.json"
    "grok"        = "$HomeDir\.config\grok\mcp.json"
    "droid"       = "$HomeDir\.config\factory\mcp.json"
    "kiro"        = "$HomeDir\.config\kiro\mcp.json"
    "qwen"        = "$HomeDir\.config\qwen\mcp.json"
  }

  $DetectedAgents = @()
  foreach ($agent in $AgentChecks.Keys) {
    $path = $AgentChecks[$agent]
    if (Test-Path $path -PathType Leaf -ErrorAction SilentlyContinue) {
      $DetectedAgents += $agent
    } elseif (Test-Path $path -PathType Container -ErrorAction SilentlyContinue) {
      $DetectedAgents += $agent
    }
  }

  if ($DetectedAgents.Count -eq 0) {
    Write-Warn "No supported coding agents detected."
    Write-Warn "Install an agent first, or use -Agent <name>."
  } else {
    Write-Info "Detected $($DetectedAgents.Count) agent(s): $($DetectedAgents -join ', ')"

    if ($DryRun) {
      foreach ($agent in $DetectedAgents) {
        Write-Step "[dry-run] Would configure: $agent"
      }
    } else {
      foreach ($agent in $DetectedAgents) {
        Write-Step "Configuring $agent..."
        $result = Invoke-Expression "& $BinCmd install --agent $agent" 2>&1
        if ($LASTEXITCODE -eq 0) {
          Write-Ok "$agent configured"
          $InstalledAgents += $agent
          $ConfiguredCount++
        } else {
          Write-Warn "$agent skipped (may already be configured)"
          $SkippedCount++
        }
      }
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 4: IDE Integration
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 4: IDE Integration"

# VS Code
$VscodeDir = Join-Path (Get-Location) ".vscode"
if (Test-Path $VscodeDir -PathType Container -or $Force) {
  if ($DryRun) {
    Write-Step "[dry-run] Would configure: VS Code (.vscode/mcp.json)"
  } else {
    Write-Step "Configuring VS Code..."
    New-Item -ItemType Directory -Force -Path $VscodeDir | Out-Null
    $result = Invoke-Expression "& $BinCmd install --agent vscode" 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "VS Code configured (.vscode/mcp.json)"
    } else {
      Write-Warn "VS Code skipped"
    }
  }
}

# Neovim
if (Test-Command nvim) {
  $NeovimDir = "$HomeDir\AppData\Local\nvim"
  $NeovimMcp = "$NeovimDir\mcp.json"
  if ($DryRun) {
    Write-Step "[dry-run] Would configure: Neovim ($NeovimMcp)"
  } else {
    Write-Step "Configuring Neovim..."
    New-Item -ItemType Directory -Force -Path $NeovimDir | Out-Null
    $mcpConfig = @{
      mcpServers = @{
        pix_galaxy_mcp = @{
          command = if ($BinCmd -match " ") { $BinCmd.Split(" ")[0] } else { $BinCmd }
          args = @(if ($BinCmd -match " ") { $BinCmd.Split(" ")[1] } else { "npx" }, "serve")
          directTools = $true
          lifecycle = "keep-alive"
        }
      }
    }
    if (-not (Test-Path $NeovimMcp) -or $Force) {
      $mcpConfig | ConvertTo-Json -Depth 10 | Set-Content $NeovimMcp
      Write-Ok "Neovim configured ($NeovimMcp)"
    } else {
      Write-Warn "Neovim already configured (use -Force)"
    }
  }
} else {
  Write-Step "Neovim not detected, skipping"
}

# JetBrains
$JetBrainsCheck = @(
  "$HomeDir\AppData\Roaming\JetBrains",
  "$HomeDir\.config\JetBrains"
)
$JetBrainsFound = $false
foreach ($p in $JetBrainsCheck) {
  if (Test-Path $p) { $JetBrainsFound = $true; break }
}
if ($JetBrainsFound) {
  $IdeaDir = Join-Path (Get-Location) ".idea"
  $IdeaMcp = "$IdeaDir\mcp.json"
  if ($DryRun) {
    Write-Step "[dry-run] Would configure: JetBrains ($IdeaMcp)"
  } else {
    Write-Step "Configuring JetBrains..."
    New-Item -ItemType Directory -Force -Path $IdeaDir | Out-Null
    $ideaConfig = @{
      mcpServers = @{
        pix_galaxy_mcp = @{
          command = if ($BinCmd -match " ") { $BinCmd.Split(" ")[0] } else { $BinCmd }
          args = @(if ($BinCmd -match " ") { $BinCmd.Split(" ")[1] } else { "npx" }, "serve")
          directTools = $true
          lifecycle = "keep-alive"
        }
      }
    }
    if (-not (Test-Path $IdeaMcp) -or $Force) {
      $ideaConfig | ConvertTo-Json -Depth 10 | Set-Content $IdeaMcp
      Write-Ok "JetBrains configured (.idea/mcp.json)"
    } else {
      Write-Warn "JetBrains already configured (use -Force)"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 5: Model Provider Configuration
# ─────────────────────────────────────────────────────────────────────────────
if ($Models) {
  Write-Header "Phase 5: Model Provider Configuration"
  Write-Info "pix-galaxy-mcp is model-agnostic. Setting API keys for your providers."

  $openaiKey = Read-Host "OpenAI API Key (sk-..., blank to skip)"
  if ($openaiKey) {
    if ($DryRun) {
      Write-Step "[dry-run] Would set: OPENAI_API_KEY"
    } else {
      [Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $openaiKey, "User")
      $configDir = "$HomeDir\.config\pix-galaxy-mcp"
      New-Item -ItemType Directory -Force -Path $configDir | Out-Null
      Set-Content "$configDir\openai-key" $openaiKey
      Write-Ok "OpenAI API key saved"
    }
  }

  $anthropicKey = Read-Host "Anthropic API Key (sk-ant-..., blank to skip)"
  if ($anthropicKey) {
    if ($DryRun) {
      Write-Step "[dry-run] Would set: ANTHROPIC_API_KEY"
    } else {
      [Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", $anthropicKey, "User")
      $configDir = "$HomeDir\.config\pix-galaxy-mcp"
      New-Item -ItemType Directory -Force -Path $configDir | Out-Null
      Set-Content "$configDir\anthropic-key" $anthropicKey
      Write-Ok "Anthropic API key saved"
    }
  }

  $geminiKey = Read-Host "Google Gemini API Key (blank to skip)"
  if ($geminiKey) {
    if ($DryRun) {
      Write-Step "[dry-run] Would set: GEMINI_API_KEY"
    } else {
      [Environment]::SetEnvironmentVariable("GEMINI_API_KEY", $geminiKey, "User")
      $configDir = "$HomeDir\.config\pix-galaxy-mcp"
      New-Item -ItemType Directory -Force -Path $configDir | Out-Null
      Set-Content "$configDir\gemini-key" $geminiKey
      Write-Ok "Gemini API key saved"
    }
  }

  $xaiKey = Read-Host "xAI Grok API Key (blank to skip)"
  if ($xaiKey) {
    if ($DryRun) {
      Write-Step "[dry-run] Would set: XAI_API_KEY"
    } else {
      [Environment]::SetEnvironmentVariable("XAI_API_KEY", $xaiKey, "User")
      $configDir = "$HomeDir\.config\pix-galaxy-mcp"
      New-Item -ItemType Directory -Force -Path $configDir | Out-Null
      Set-Content "$configDir\xai-key" $xaiKey
      Write-Ok "xAI API key saved"
    }
  }

  Write-Info "Model keys stored in ~\.config\pix-galaxy-mcp\ and User environment variables."
  Write-Info "Restart your terminal for changes to take effect."
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 6: Windows Service Installation
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 6: Windows Service"

if ($DryRun) {
  Write-Step "[dry-run] Would install Windows Service: pix-galaxy-mcp"
  Write-Step "  Would run: sc create pix-galaxy-mcp ..."
  Write-Step "  Result: appears in services.msc and can be set to auto-start"
} else {
  Write-Info "Installing Windows Service..."
  $serviceName = "pix-galaxy-mcp"

  # Check if service already exists
  $existing = sc.exe query $serviceName 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Warn "Service '$serviceName' already exists — updating..."
  }

  if (Test-Command pix-galaxy-mcp) {
    $result = Invoke-Expression "& pix-galaxy-mcp daemon install" 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "Windows Service installed and started"
      Write-Step "  The service appears in services.msc as 'pix-galaxy-mcp MCP Server'"
      Write-Step "  It is configured to start automatically"
      Write-Step "  Manage with: sc start/stop/query pix-galaxy-mcp"
    } else {
      Write-Warn "Windows Service installation had issues"
      Write-Step "  Run: pix-galaxy-mcp daemon install"
    }
  } else {
    Write-Warn "pix-galaxy-mcp not on PATH — cannot install service automatically"
    Write-Step "  After installing globally, run: pix-galaxy-mcp daemon install"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 7: Health Check
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 7: Health Check"

if ($DryRun) {
  Write-Step "[dry-run] Would run: $BinCmd doctor"
} elseif (Test-Command pix-galaxy-mcp) {
  $result = Invoke-Expression "& pix-galaxy-mcp doctor" 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Ok "Health check passed"
  } else {
    Write-Warn "Health check had issues"
  }
} else {
  Write-Warn "Cannot run doctor: pix-galaxy-mcp not on PATH"
  Write-Step "Run: $BinCmd doctor"
}

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Installation Summary"

if ($DryRun) {
  Write-Host "⚠ Dry-run mode — no changes were made" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "To apply:  .\scripts\install.ps1"
  Write-Host ""
  exit 0
}

Write-Host ""
Write-Host "Package:      ${NpmPackage}@${PackageVersion}" -ForegroundColor White
Write-Host "Entry point:  ${BinCmd} serve" -ForegroundColor White
Write-Host "Agents:       ${ConfiguredCount} configured, ${SkippedCount} skipped" -ForegroundColor White
if ($InstalledAgents.Count -gt 0) {
  Write-Host "Installed for: $($InstalledAgents -join ', ')" -ForegroundColor White
}
Write-Host ""

Write-Host "Quick start:" -ForegroundColor Cyan
Write-Host "  ${BinCmd} doctor" -ForegroundColor Gray
Write-Host "  ${BinCmd} serve" -ForegroundColor Gray
Write-Host "  ${BinCmd} config --global" -ForegroundColor Gray
Write-Host "  ${BinCmd} daemon status" -ForegroundColor Gray
Write-Host "  ${BinCmd} daemon install" -ForegroundColor Gray
Write-Host ""

Write-Host "Daemon service (Windows):" -ForegroundColor Cyan
Write-Host "  The service appears in services.msc as 'pix-galaxy-mcp MCP Server'" -ForegroundColor Gray
Write-Host "  It starts automatically with Windows" -ForegroundColor Gray
Write-Host "  sc start pix-galaxy-mcp  # Start now" -ForegroundColor Gray
Write-Host ""


Write-Host "Add to any agent's mcp.json:" -ForegroundColor Cyan
Write-Host "{" -ForegroundColor Green
Write-Host '  "mcpServers": {' -ForegroundColor Green
Write-Host '    "pix_galaxy_mcp": {' -ForegroundColor Green
$cmdPart = if ($BinCmd -match " ") { $BinCmd.Split(" ")[0] } else { $BinCmd }
$argPart = if ($BinCmd -match " ") { $BinCmd.Split(" ")[1] } else { "npx" }
Write-Host "      `"command`": `"$cmdPart`"," -ForegroundColor Green
Write-Host "      `"args`": [`"$argPart`", `"serve`"]," -ForegroundColor Green
Write-Host '      "directTools": true,' -ForegroundColor Green
Write-Host '      "lifecycle": "keep-alive"' -ForegroundColor Green
Write-Host '    }' -ForegroundColor Green
Write-Host '  }' -ForegroundColor Green
Write-Host '}' -ForegroundColor Green
Write-Host ""

if ($HasError) {
  Write-Host "⚠ Installation completed with warnings. Run '${BinCmd} doctor' for details." -ForegroundColor Yellow
} else {
  Write-Host "✓ Installation complete!" -ForegroundColor Green
  Write-Host "  Restart your coding agent to start using pix-galaxy-mcp tools." -ForegroundColor Cyan
}
Write-Host ""
