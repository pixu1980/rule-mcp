#!/usr/bin/env pwsh
# =============================================================================
# rule-mcp - Universal Uninstaller (Windows / PowerShell)
# =============================================================================
#
# Reverses all changes made by install.ps1:
#   1. Removes rule-mcp entries from ALL coding agent configs (18+)
#   2. Removes rule-mcp rules from CLAUDE.md / AGENTS.md / GEMINI.md
#   3. Removes IDE configurations (VS Code, Neovim, JetBrains)
#   4. Removes config directory (~/.config/rule-mcp/)
#   5. Removes environment variables
#   6. Removes global npm package
#
# Usage:
#   .\scripts\uninstall.ps1
#   powershell -c "irm https://rule-mcp.domain.example/uninstall.ps1 | iex"
#
# Parameters:
#   -Agent <name>    Uninstall for a specific agent only
#   -Purge           Also delete ~/.config/rule-mcp/ and API keys
#   -KeepConfig      Keep ~/.config/rule-mcp/ (default with -Purge)
#   -DryRun          Preview changes without writing
#   -Force           Don't ask for confirmation
#   -Help            Show this help
#
# =============================================================================

param(
  [string]$Agent = "",
  [switch]$Purge = $false,
  [switch]$KeepConfig = $false,
  [switch]$DryRun = $false,
  [switch]$Force = $false,
  [switch]$Help = $false
)

if ($Help) {
  Write-Host "rule-mcp - Universal Uninstaller (PowerShell)" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Usage:" -ForegroundColor Yellow
  Write-Host "  .\scripts\uninstall.ps1"
  Write-Host "  powershell -c `"irm https://rule-mcp.domain.example/uninstall.ps1 | iex`""
  Write-Host ""
  Write-Host "Parameters:" -ForegroundColor Yellow
  Write-Host "  -Agent <name>    Uninstall for a specific agent only"
  Write-Host "  -Purge           Also delete ~/.config/rule-mcp/ and API keys"
  Write-Host "  -KeepConfig      Keep ~/.config/rule-mcp/ (default with -Purge)"
  Write-Host "  -DryRun          Preview changes without writing"
  Write-Host "  -Force           Don't ask for confirmation"
  exit 0
}

# ── Config ──
$McpServerName = "rule-mcp"
$ScriptUrl = "https://rule-mcp.domain.example/uninstall.ps1"

# ── State ──
$RemovedCount = 0
$SkippedCount = 0
$HasError = $false
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

# ── JSON entry removal helper ──
function Remove-McpEntryDual {
  param(
    [string]$FilePath,
    [string]$Label,
    [string]$ServiceName = $McpServerName
  )
  Remove-McpEntry -FilePath $FilePath -Label $Label -ServiceName $ServiceName
  Remove-McpEntry -FilePath $FilePath -Label "$Label (legacy)" -ServiceName "pix_ai_mcp"
}

function Remove-McpEntry {
  param(
    [string]$FilePath,
    [string]$Label,
    [string]$ServiceName = $McpServerName
  )

  if (-not (Test-Path $FilePath -PathType Leaf)) {
    Write-Step "${Label}: config not found, skipping"
    return $false
  }

  $content = Get-Content $FilePath -Raw -ErrorAction SilentlyContinue
  if (-not $content) {
    Write-Step "${Label}: could not read, skipping"
    return $false
  }

  if (-not $content.Contains($ServiceName)) {
    Write-Step "${Label}: ${ServiceName} not found, skipping"
    return $false
  }

  if ($DryRun) {
    Write-Step "[dry-run] Would remove ${ServiceName} from: ${FilePath}"
    return $true
  }

  try {
    $json = $content | ConvertFrom-Json -ErrorAction Stop

    # Convert to a mutable object we can manipulate
    if ($json.mcpServers) {
      $mcpServers = $json.mcpServers
      if ($mcpServers.$ServiceName) {
        $mcpServers.PSObject.Properties.Remove($ServiceName)
      }
      # Remove empty mcpServers
      $remaining = @($mcpServers.PSObject.Properties)
      if ($remaining.Count -eq 0) {
        $json.PSObject.Properties.Remove('mcpServers')
      }
    }

    # VS Code uses json.servers (not mcpServers)
    if ($json.servers) {
      $servers = $json.servers
      if ($servers.$ServiceName) {
        $servers.PSObject.Properties.Remove($ServiceName)
      }
      # Remove empty servers
      $remaining = @($servers.PSObject.Properties)
      if ($remaining.Count -eq 0) {
        $json.PSObject.Properties.Remove('servers')
      }
    }

    $json | ConvertTo-Json -Depth 10 | Set-Content $FilePath
    Write-Ok "${Label}: ${ServiceName} removed"
    return $true
  }
  catch {
    # JSON parse failed - try line-based removal
    Write-Warn "${Label}: JSON parse error, trying line-based removal"
    try {
      $backup = "${FilePath}.bak"
      Copy-Item $FilePath $backup -ErrorAction SilentlyContinue

      $lines = Get-Content $FilePath
      $result = @()
      $inBlock = 0
      foreach ($line in $lines) {
        if ($line -match '"' + [regex]::Escape($ServiceName) + '"') { $inBlock = 1 }
        if ($inBlock -gt 0) {
          if ($line -match '{' -and $line -notmatch '}') { $inBlock++ }
          if ($line -match '}') { $inBlock-- }
          if ($inBlock -eq 0) { $inBlock = 0; continue }
          continue
        }
        $result += $line
      }
      Set-Content $FilePath $result
      Write-Ok "${Label}: ${ServiceName} removed (line-based)"
      return $true
    }
    catch {
      Write-Warn "${Label}: failed to remove entry"
      return $false
    }
  }
}

# ── Rule block removal helper ──
function Remove-RulesBlock {
  param(
    [string]$FilePath,
    [string]$Label
  )

  if (-not (Test-Path $FilePath -PathType Leaf)) {
    Write-Step "${Label}: not found, skipping"
    return
  }

  $content = Get-Content $FilePath -Raw -ErrorAction SilentlyContinue
  if (-not $content -or -not $content.Contains('rule-mcp-rules')) {
    Write-Step "${Label}: no rule rules found, skipping"
    return
  }

  if ($DryRun) {
    Write-Step "[dry-run] Would remove rule rules from: ${FilePath}"
    return
  }

  try {
    $backup = "${FilePath}.bak"
    Copy-Item $FilePath $backup -ErrorAction SilentlyContinue

    # Remove lines between the comments (inclusive)
    $lines = Get-Content $FilePath
    $inBlock = $false
    $newLines = @()
    foreach ($line in $lines) {
      if ($line -match '<!-- rule-mcp-rules -->') { $inBlock = $true; continue }
      if ($line -match '<!-- /rule-mcp-rules -->') { $inBlock = $false; continue }
      if (-not $inBlock) { $newLines += $line }
    }
    Set-Content $FilePath $newLines
    Write-Ok "${Label}: rules removed"
  }
  catch {
    Write-Warn "${Label}: failed to remove rules"
  }
}

# ── Line removal helper ──
function Remove-Lines {
  param(
    [string]$FilePath,
    [string]$Label,
    [string]$Pattern
  )

  if (-not (Test-Path $FilePath -PathType Leaf)) {
    return
  }

  $content = Get-Content $FilePath -Raw -ErrorAction SilentlyContinue
  if (-not $content -or -not $content.Contains($Pattern)) {
    return
  }

  if ($DryRun) {
    Write-Step "[dry-run] Would remove matching lines from: ${FilePath}"
    return
  }

  try {
    $backup = "${FilePath}.bak"
    Copy-Item $FilePath $backup -ErrorAction SilentlyContinue
    $lines = Get-Content $FilePath | Where-Object { $_ -notmatch $Pattern }
    Set-Content $FilePath $lines
    Write-Ok "${Label}: entries removed"
  }
  catch {
    Write-Warn "${Label}: failed to remove entries"
  }
}

# ── Confirmation ──
if (-not $DryRun -and -not $Force) {
  Write-Host ""
  Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Yellow
  Write-Host "║      rule-mcp - Uninstall Confirmation         ║" -ForegroundColor Yellow
  Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  This will remove rule-mcp configuration from:"
  Write-Host "   • All detected coding agents (mcp.json entries)"
  Write-Host "   • Agent instruction files (CLAUDE.md, AGENTS.md, GEMINI.md)"
  Write-Host "   • IDE configurations (VS Code, Neovim, JetBrains)"
  Write-Host "   • Environment variables"
  if ($Purge) {
    Write-Host "   • ~/.config/rule-mcp/ (API keys & config)" -ForegroundColor Red
  }
  Write-Host ""
  Write-Host "  The npm package and project files will NOT be deleted." -ForegroundColor Yellow
  Write-Host "  Run with -Purge to also remove config/keys." -ForegroundColor Yellow
  Write-Host ""

  $confirmation = Read-Host "  Continue? [y/N]"
  if ($confirmation -notmatch '^[Yy]') {
    Write-Host ""
    Write-Host "  Uninstall cancelled." -ForegroundColor Cyan
    exit 0
  }
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║       rule-mcp - Universal Uninstaller        ║" -ForegroundColor Red
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 1: Agent MCP Configs
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 1: Agent MCP Configurations"

$HomeDir = $HOME

$AgentConfigs = @{
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

$ProjectDir = (Get-Location).Path
$VscodeMcp = "$ProjectDir\.vscode\mcp.json"

if ($TargetAgent) {
  Write-Info "Targeting agent: $TargetAgent"

  if ($TargetAgent -eq "vscode") {
    # VS Code global + project
    $vscodeGlobal = Join-Path $env:APPDATA "Code\User\mcp.json"
    if (Test-Path $vscodeGlobal) { Remove-McpEntryDual -FilePath $vscodeGlobal -Label "VS Code (global)" }
    Remove-McpEntryDual -FilePath $VscodeMcp -Label "VS Code (project)"
  } elseif ($AgentConfigs.ContainsKey($TargetAgent)) {
    $path = $AgentConfigs[$TargetAgent]
    if ($TargetAgent -eq "codex") {
      Remove-Lines -FilePath $path -Label "Codex CLI" -Pattern "rule"
    } else {
      Remove-McpEntry -FilePath $path -Label $TargetAgent
    }
  } else {
    Write-Warn "Unknown agent: $TargetAgent"
  }
} else {
  Write-Info "Cleaning agent configs..."

  foreach ($agent in $AgentConfigs.Keys) {
    $path = $AgentConfigs[$agent]
    if (Test-Path $path -PathType Leaf -ErrorAction SilentlyContinue) {
      if ($agent -eq "codex") {
        Remove-Lines -FilePath $path -Label "Codex CLI" -Pattern "rule"
      } else {
        Remove-McpEntry -FilePath $path -Label $agent
      }
    }
  }

  # VS Code global config (user-level - where VS Code 1.90+ stores MCP)
  $vscodeGlobalDirs = @()
  if ($env:APPDATA) {
    $vscodeGlobalDirs += @(
      "$env:APPDATA\Code\User",
      "$env:APPDATA\Cursor\User"
    )
  }
  foreach ($dir in $vscodeGlobalDirs) {
    $mcp = "$dir\mcp.json"
    if (Test-Path $mcp) {
      Remove-McpEntryDual -FilePath $mcp -Label "$(Split-Path $dir -Leaf) (global)"
    }
  }

  # VS Code project-level
  if (Test-Path $VscodeMcp -PathType Leaf) {
    Remove-McpEntryDual -FilePath $VscodeMcp -Label "VS Code (project)"
    if (-not $DryRun) {
      $remaining = Get-Content $VscodeMcp -Raw
      if ($remaining -and -not $remaining.Contains('mcpServers') -and -not $remaining.Contains('servers')) {
        Remove-Item $VscodeMcp -Force -ErrorAction SilentlyContinue
        Write-Step "VS Code (project): removed empty mcp.json"
      }
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2: Agent Instruction Files
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 2: Agent Instruction Files"

Remove-RulesBlock -FilePath "$HomeDir\.claude\CLAUDE.md" -Label "Claude Code"
Remove-RulesBlock -FilePath "$HomeDir\.gemini\GEMINI.md" -Label "Gemini CLI"
Remove-RulesBlock -FilePath "$HomeDir\.codex\AGENTS.md" -Label "Codex CLI"
Remove-RulesBlock -FilePath "$HomeDir\.cursor\.cursorrules" -Label "Cursor"
Remove-RulesBlock -FilePath "$ProjectDir\CLAUDE.md" -Label "Project CLAUDE.md"

$piAgentsMd = "$HomeDir\.pi\agent\AGENTS.md"
if (Test-Path $piAgentsMd) {
  Remove-RulesBlock -FilePath $piAgentsMd -Label "Pi AGENTS.md"
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3: IDE Configurations
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 3: IDE Configurations"

# VS Code global config (macOS/Linux - covered in Phase 1 for Windows)
if ($IsMacOS -or $IsLinux) {
  $vscodeGlobalDirs = @()
  if ($IsMacOS) {
    $vscodeGlobalDirs += @(
      "$HomeDir/Library/Application Support/Code/User",
      "$HomeDir/Library/Application Support/Code - Insiders/User",
      "$HomeDir/Library/Application Support/Code - OSS/User"
    )
  } else {
    $vscodeGlobalDirs += @(
      "$HomeDir/.config/Code/User",
      "$HomeDir/.config/Code - Insiders/User",
      "$HomeDir/.config/Code - OSS/User"
    )
  }

  # Cursor and Windsurf global
  $vscodeGlobalDirs += @(
    "$HomeDir/.cursor",
    "$HomeDir/.config/windsurf"
  )

  foreach ($dir in $vscodeGlobalDirs) {
    $mcp = Join-Path $dir "mcp.json"
    $label = Split-Path $dir -Leaf
    if ($dir -match "Code - Insiders") { $label = "VS Code Insiders" }
    elseif ($dir -match "Code - OSS") { $label = "Code-OSS" }
    elseif ($dir -match "Code/User") { $label = "VS Code" }
    if (Test-Path $mcp -PathType Leaf) {
      Remove-McpEntryDual -FilePath $mcp -Label $label
    }
  }
}

# Neovim
$NeovimMcp = ""
if ($IsMacOS -or $IsLinux) {
  $NeovimMcp = "$HomeDir/.config/nvim/mcp.json"
} else {
  $NeovimMcp = "$HomeDir\AppData\Local\nvim\mcp.json"
}
if (Test-Path $NeovimMcp) {
  Remove-McpEntryDual -FilePath $NeovimMcp -Label "Neovim"
  if (-not $DryRun) {
    $remaining = Get-Content $NeovimMcp -Raw
    if ($remaining -and -not $remaining.Contains('mcpServers') -and -not $remaining.Contains('servers')) {
      Remove-Item $NeovimMcp -Force -ErrorAction SilentlyContinue
      Write-Step "Neovim: removed empty mcp.json"
    }
  }
}

# JetBrains
$IdeaDir = "$ProjectDir\.idea"
$IdeaMcp = "$IdeaDir\mcp.json"
if (Test-Path $IdeaMcp) {
  Remove-McpEntryDual -FilePath $IdeaMcp -Label "JetBrains"
  if (-not $DryRun) {
    $remaining = Get-Content $IdeaMcp -Raw
    if ($remaining -and -not $remaining.Contains('mcpServers') -and -not $remaining.Contains('servers')) {
      Remove-Item $IdeaMcp -Force -ErrorAction SilentlyContinue
      Write-Step "JetBrains: removed empty mcp.json"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3b: IDE Extensions (VS Code, Cursor, Windsurf)
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 3b: IDE Extensions"

function Remove-Extension {
  param([string]$Label, [string]$Cli)

  $extId = "rule.rule-vanilla-reactive"

  # Try via CLI
  if ($Cli -and (Get-Command $Cli -ErrorAction SilentlyContinue)) {
    $installed = & $Cli --list-extensions 2>&1 | Select-String -Pattern $extId
    if ($installed) {
      if ($DryRun) {
        Write-Step "[dry-run] Would uninstall $Label extension: $extId"
      } else {
        Write-Host "  Uninstalling $Label extension: $extId..." -ForegroundColor Cyan
        $result = & $Cli --uninstall-extension $extId 2>&1
        if ($LASTEXITCODE -eq 0) {
          Write-Ok "$Label extension uninstalled via CLI"
        } else {
          Write-Warn "$Label CLI uninstall failed, removing directory directly"
        }
      }
    }
  }
}

# Extension directories to check for removal
$extDirs = @(
  "$HomeDir\.vscode\extensions",
  "$HomeDir\.vscode-oss\extensions",
  "$HomeDir\.cursor\extensions",
  "$HomeDir\.windsurf\extensions"
)
if ($env:APPDATA) {
  $extDirs += "$env:APPDATA\Code - Insiders\extensions"
}

Remove-Extension -Label "VS Code" -Cli "code"
Remove-Extension -Label "Cursor" -Cli "cursor"
Remove-Extension -Label "Windsurf" -Cli "windsurf"
Remove-Extension -Label "Code-OSS" -Cli "code-oss"
Remove-Extension -Label "VS Code Insiders" -Cli "code-insiders"
Remove-Extension -Label "Codium" -Cli "codium"

# Always also remove any remaining extension directories as safety net
$foundAny = $false
foreach ($dir in $extDirs) {
  if (Test-Path $dir) {
    $matches = Get-ChildItem $dir -Filter "rule.rule-vanilla-reactive*" -Directory -ErrorAction SilentlyContinue
    foreach ($m in $matches) {
      $foundAny = $true
      if ($DryRun) {
        Write-Step "[dry-run] Would remove extension directory: $($m.FullName)"
      } else {
        Remove-Item $m.FullName -Recurse -Force -ErrorAction SilentlyContinue
        Write-Ok "Removed extension directory: $($m.Name)"
      }
    }
  }
}
if (-not $foundAny -and -not $DryRun) {
  Write-Ok "No rule extension directories remain on disk"
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 4: Config Directory & API Keys
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 4: Config Directory"

$configDir = "$HomeDir\.config\rule-mcp"
if (Test-Path $configDir -PathType Container) {
  if ($KeepConfig) {
    Write-Step "Keeping config directory (-KeepConfig): $configDir"
  } elseif ($Purge) {
    if ($DryRun) {
      Write-Step "[dry-run] Would delete: $configDir"
    } else {
      Remove-Item $configDir -Recurse -Force -ErrorAction SilentlyContinue
      Write-Ok "Config directory deleted: $configDir"
    }
  } else {
    $keyCount = (Get-ChildItem $configDir -File).Count
    Write-Step "Config directory exists with $keyCount file(s): $configDir"
    Write-Step "Use -Purge to delete API keys and config"
  }
} else {
  Write-Step "No config directory found, skipping"
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 5: Environment Variables
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 5: Environment Variables"

if ($DryRun) {
  Write-Step "[dry-run] Would remove User environment variables:"
  Write-Step "  OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, XAI_API_KEY"
} else {
  $envVars = @("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "XAI_API_KEY")
  foreach ($var in $envVars) {
    $current = [Environment]::GetEnvironmentVariable($var, "User")
    if ($current) {
      [Environment]::SetEnvironmentVariable($var, $null, "User")
      Write-Ok "Removed User env var: $var"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 6: Global npm Package
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 6: Global Package"

if (Test-Command rule-mcp) {
  $globalPath = (Get-Command rule-mcp).Source
  Write-Step "Global binary found: $globalPath"

  if ($DryRun) {
    Write-Step "[dry-run] Would run: npm uninstall -g rule-mcp"
  } else {
    $result = npm uninstall -g rule-mcp 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "Global package removed"
    } else {
      Write-Step "Package not installed globally or already removed"
    }
  }
} else {
  Write-Step "No global rule-mcp found, skipping"
}

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Uninstall Summary"

if ($DryRun) {
  Write-Host "⚠ Dry-run mode - no changes were made" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "To apply:  .\scripts\uninstall.ps1"
  Write-Host ""
  exit 0
}

Write-Host ""
Write-Host "✓ rule-mcp has been uninstalled from your system." -ForegroundColor Green
Write-Host "The following were removed:" -ForegroundColor Cyan
Write-Host " • MCP server entries from coding agent configs"
Write-Host " • Instruction rules from agent instruction files"
Write-Host " • IDE configurations (VS Code, Neovim, JetBrains)"
Write-Host " • Environment variables"
if ($Purge) {
  Write-Host " • Config directory and API keys"
}
Write-Host ""

Write-Host "Note: The project files were NOT deleted." -ForegroundColor Yellow
Write-Host "To remove them manually:  Remove-Item -Recurse -Force $ProjectDir" -ForegroundColor Yellow
Write-Host ""

Write-Host "To reinstall later:" -ForegroundColor Cyan
Write-Host "  powershell -c `"irm https://rule-mcp.domain.example/install.ps1 | iex`""
Write-Host "  # OR"
Write-Host "  .\scripts\install.ps1"
Write-Host ""

if ($HasError) {
  Write-Host "⚠ Uninstall completed with warnings. Manual cleanup may be needed." -ForegroundColor Yellow
} else {
  Write-Host "✓ Uninstall complete! Restart your coding agent for changes to take effect." -ForegroundColor Green
}
Write-Host ""
