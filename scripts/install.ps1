#!/usr/bin/env pwsh
# =============================================================================
# rule-mcp - Universal Installer (Windows / PowerShell)
# =============================================================================
#
# Integrates rule-mcp with ALL coding agents, IDEs, and model providers.
# Inspired by the tokensave architecture (18+ agent integrations).
#
# What this does:
#   1. Installs/updates the rule-mcp npm package globally
#   2. Auto-detects installed coding agents on your system (18+ supported)
#   3. Registers rule-mcp as an MCP server in each detected agent
#   4. Writes IDE configs / user settings for supported editors
#   5. Optionally configures model provider API keys
#   6. Runs a health check to confirm everything works
#
# Prerequisites:
#   - Node.js >= 20 (https://nodejs.org)
#   - pnpm (recommended) or npm
#
# Usage:
#   powershell -c "irm https://rule-mcp.domain.example/install.ps1 | iex"
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
  [string]$Mode = "",
  [switch]$NoInteractive = $false,
  [switch]$Help = $false
)

if ($Help) {
  Write-Host "rule-mcp - Universal Installer (PowerShell)" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Usage:" -ForegroundColor Yellow
  Write-Host "  powershell -c `"irm https://rule-mcp.domain.example/install.ps1 | iex`""
  Write-Host "  .\scripts\install.ps1"
  Write-Host ""
  Write-Host "Parameters:" -ForegroundColor Yellow
  Write-Host "  -Agent <name>    Install for a specific agent only"
  Write-Host "  -Models          Prompt to configure model API keys"
  Write-Host "  -NoRules         Skip agent instruction files"
  Write-Host "  -DryRun          Preview changes without writing"
  Write-Host "  -Force           Override existing configurations"
  Write-Host "  -Mode <name>     stdio (default), daemon, or docker"
  Write-Host "  -NoInteractive   Skip interactive selection and install everywhere"
  exit 0
}

# ── Config ──
$McpServerName = "rule-mcp"
$NodeMin = 20
$NpmPackage = "rule-mcp"
$PackageVersion = "latest"
$ScriptUrl = "https://rule-mcp.domain.example/install.ps1"

# ── State ──
$InstalledAgents = @()
$ConfiguredCount = 0
$SkippedCount = 0
$HasError = $false
$InstallRules = -not $NoRules
$TargetAgent = $Agent
$InstallMode = if ($Mode -eq 'sse') { 'daemon' } else { $Mode }
if ($InstallMode -and $InstallMode -notin @('stdio', 'daemon', 'docker')) {
  Write-Fail "Unsupported mode: $InstallMode. Use stdio, daemon, or docker."
  exit 1
}

# ── Helpers ──
function Write-Info  { Write-Host "ℹ $($args[0])" -ForegroundColor Cyan }
function Write-Ok    { Write-Host "✓ $($args[0])" -ForegroundColor Green }
function Write-Warn  { Write-Host "⚠ $($args[0])" -ForegroundColor Yellow }
function Write-Fail  { Write-Host "✗ $($args[0])" -ForegroundColor Red; $global:HasError = $true }
function Write-Header{ Write-Host "`n── $($args[0]) ──`n" -ForegroundColor Blue }
function Write-Step  { Write-Host "  → $($args[0])" -ForegroundColor Cyan }
function Show-Banner([string]$Subtitle) {
  if ($script:NoColor) {
    Write-Host "`n── $Subtitle ──`n"
    return
  }
  Clear-Host
  Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
  Write-Host "║         rule-mcp - Universal Installer        ║" -ForegroundColor Cyan
  Write-Host ("║  " + $Subtitle.PadRight(50) + "║") -ForegroundColor Cyan
  Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
  Write-Host ""
}
function Select-AgentsInteractive([string[]]$Items) {
  # Differential renderer (parity with install.sh): draws the frame once,
  # then rewrites only the rows a key changes via SetCursorPosition. No
  # Clear-Host and no full re-render per key -> no flicker.
  try { [Console]::CursorVisible = $false } catch {}
  try { $cols = [Console]::WindowWidth } catch { $cols = 80 }
  if ($cols -lt 60) { $cols = 60 }
  $flags = @{}; for($i=0; $i -lt $Items.Count; $i++){ $flags[$i] = $false }
  $cursor = 0
  $rowY = @{}

  function Write-At([int]$y, [string]$text) {
    [Console]::SetCursorPosition(0, $y)
    Write-Host $text.PadRight($cols) -NoNewline
  }
  function Render-Row([int]$i) {
    $mark = if($flags[$i]){ 'x' } else { ' ' }
    $prefix = if($i -eq $cursor){ '> ' } else { '  ' }
    $name = $Items[$i]
    if ($name -eq 'devin') { $name = 'Devin (formerly Windsurf)' }
    Write-At $rowY[$i] ("{0}[{1}] {2} {3}" -f $prefix,$mark,($i + 1),$name)
  }
  function Render-Footer {
    $selectedCount = (@($flags.Values | Where-Object { $_ })).Count
    Write-At $footerY ("Selected: {0}/{1}" -f $selectedCount, $Items.Count)
  }

  try { [Console]::Clear() } catch {}
  Show-Banner "Phase 3 - Agent Integration"
  Write-Host "Select agents (↑↓/jk move, Space/1-9 toggle, a all, n none, Enter confirm, q quit)" -ForegroundColor Cyan
  Write-Host ""
  for($i=0; $i -lt $Items.Count; $i++) {
    $rowY[$i] = [Console]::CursorTop
    Render-Row $i
  }
  $footerY = [Console]::CursorTop
  Write-Host ""
  Render-Footer

  $changedRows = New-Object System.Collections.ArrayList
  while ($true) {
    $done = $false
    $changedRows.Clear() | Out-Null
    $oldCursor = $cursor
    $key = [Console]::ReadKey($true)
    $char = [string]$key.KeyChar
    switch ($key.Key) {
      'UpArrow' { $cursor--; if($cursor -lt 0){ $cursor = $Items.Count - 1 } }
      'DownArrow' { $cursor++; if($cursor -ge $Items.Count){ $cursor = 0 } }
      'Spacebar' { $flags[$cursor] = -not $flags[$cursor] }
      # NB: `break` inside a PS `switch` exits only the switch, not the loop,
      # so Enter must set a flag instead (the old code never confirmed).
      'Enter' { $done = $true }
      'Q' { try { [Console]::CursorVisible = $true } catch {}; return @() }
    }
    if ($char -eq 'j') { $cursor++; if($cursor -ge $Items.Count){ $cursor = 0 } }
    elseif ($char -eq 'k') { $cursor--; if($cursor -lt 0){ $cursor = $Items.Count - 1 } }
    elseif ($char -eq 'a' -or $char -eq 'A') {
      for($i=0; $i -lt $Items.Count; $i++){ $flags[$i] = $true; $null = $changedRows.Add($i) }
    }
    elseif ($char -eq 'n' -or $char -eq 'N') {
      for($i=0; $i -lt $Items.Count; $i++){ $flags[$i] = $false; $null = $changedRows.Add($i) }
    }
    elseif ($char -match '^[1-9]$') {
      $idx = [int]$char - 1
      if ($idx -lt $Items.Count) { $flags[$idx] = -not $flags[$idx]; $cursor = $idx }
    }
    if ($oldCursor -ne $cursor) { $null = $changedRows.Add($oldCursor) }
    $null = $changedRows.Add($cursor)
    foreach ($i in ($changedRows | Select-Object -Unique)) { Render-Row $i }
    Render-Footer
    if ($done) { break }
  }
  $selected = @()
  for($i=0; $i -lt $Items.Count; $i++){ if($flags[$i]){ $selected += $Items[$i] } }
  try { [Console]::CursorVisible = $true } catch {}
  [Console]::SetCursorPosition(0, $footerY + 1)
  return $selected
}
function Select-ModeInteractive() {
  try { [Console]::CursorVisible = $false } catch {}
  try { $cols = [Console]::WindowWidth } catch { $cols = 80 }
  if ($cols -lt 60) { $cols = 60 }
  $modes = @('stdio','daemon','docker')
  $labels = @('Stdio - agent starts a local process','Daemon - background SSE service on port 37999','Docker - containerized SSE service')
  $cursor = 0
  $rowY = @{}

  function Write-At([int]$y, [string]$text) {
    [Console]::SetCursorPosition(0, $y)
    Write-Host $text.PadRight($cols) -NoNewline
  }
  function Render-Mode-Row([int]$i) {
    $radio = if($i -eq $cursor){ '•' } else { ' ' }
    $prefix = if($i -eq $cursor){ '> ' } else { '  ' }
    Write-At $rowY[$i] ("{0}({1}) {2} {3}" -f $prefix,$radio,($i + 1),$labels[$i])
  }

  try { [Console]::Clear() } catch {}
  Show-Banner "Phase 3 - Install Mode"
  Write-Host "Select mode (↑↓/jk move, 1-3 select, Enter confirm, q quit)" -ForegroundColor Cyan
  Write-Host ""
  for($i=0; $i -lt $modes.Count; $i++) {
    $rowY[$i] = [Console]::CursorTop
    Render-Mode-Row $i
  }
  while ($true) {
    $done = $false
    $oldCursor = $cursor
    $key = [Console]::ReadKey($true)
    $char = [string]$key.KeyChar
    switch ($key.Key) {
      'UpArrow' { $cursor--; if($cursor -lt 0){ $cursor = $modes.Count - 1 } }
      'DownArrow' { $cursor++; if($cursor -ge $modes.Count){ $cursor = 0 } }
      'Enter' { $done = $true }
      'Q' { try { [Console]::CursorVisible = $true } catch {}; return $null }
    }
    if ($char -eq 'j') { $cursor++; if($cursor -ge $modes.Count){ $cursor = 0 } }
    elseif ($char -eq 'k') { $cursor--; if($cursor -lt 0){ $cursor = $modes.Count - 1 } }
    elseif ($char -match '^[1-3]$') { $cursor = [int]$char - 1; $done = $true }
    if ($oldCursor -ne $cursor) { Render-Mode-Row $oldCursor }
    Render-Mode-Row $cursor
    if ($done) {
      try { [Console]::CursorVisible = $true } catch {}
      [Console]::SetCursorPosition(0, $rowY[$modes.Count - 1] + 1)
      return $modes[$cursor]
    }
  }
}

function Test-Command($cmd) {
  try { Get-Command $cmd -ErrorAction Stop; return $true }
  catch { return $false }
}

# Output gating: colors and box-drawing render only on an interactive console
# without NO_COLOR - redirected/CI output stays plain and machine-parseable
# (mirrors the TTY gate in scripts/install.sh).
$script:NoColor = [Console]::IsOutputRedirected -or [bool]$env:NO_COLOR

# The global binary must not just exist - it must launch. A stale pnpm/npm
# shim can stay on PATH while crashing at startup (e.g. after a repo move),
# which used to fail every agent install silently. Mirrors shim_works() in
# scripts/install.sh.
function Test-PixCli {
  if (-not (Test-Command rule-mcp)) { return $false }
  try {
    & rule-mcp --version *> $null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

# ── Banner ──
if ($script:NoColor) {
  Write-Host ""
  Write-Host "── rule-mcp - Universal Installer ──"
  Write-Host "── MCP Server for the rule-* Skill Ecosystem ──"
  Write-Host ""
} else {
  Write-Host ""
  Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
  Write-Host "║         rule-mcp - Universal Installer        ║" -ForegroundColor Cyan
  Write-Host "║   MCP Server for the rule-* Skill Ecosystem      ║" -ForegroundColor Cyan
  Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
  Write-Host ""
}

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

# Runtime home: uninstall -Purge removes ~/.rule-mcp/ entirely (state,
# data, projects, config - the layout src/cli/paths.js expects), so a
# reinstall must recreate it explicitly.
$pixHomeDir = Join-Path $HomeDir ".rule-mcp"
if ($DryRun) {
  Write-Step "[dry-run] Would create runtime home: $pixHomeDir"
} else {
  New-Item -ItemType Directory -Force -Path $pixHomeDir\state, $pixHomeDir\data, $pixHomeDir\projects, $pixHomeDir\config | Out-Null
  Write-Ok "Runtime home ready: $pixHomeDir"
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2: Install/Update npm Package
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 2: Install rule-mcp"

if ($DryRun) {
  Write-Step "[dry-run] Would install: $PM add -g ${NpmPackage}@${PackageVersion}"
} else {
  Write-Info "Installing ${NpmPackage}@${PackageVersion} via $PM..."

  if ($PM -eq "pnpm") {
    $result = pnpm add -g "${NpmPackage}@${PackageVersion}" 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "${NpmPackage} installed globally via pnpm"
    } else {
      Write-Warn "pnpm install failed - trying npm..."
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

# Determine the command. Keep executable and arguments separate from display
# text. Prefer the global binary only when it actually launches (Test-PixCli):
# a stale shim still resolves with Test-Command but crashes at startup and
# used to fail every agent install silently.
$BinCmd = ""
$BinExecutable = ""
$BinArguments = @()
if (Test-PixCli) {
  $BinCmd = "rule-mcp"
  $BinExecutable = "rule-mcp"
  Write-Ok "Global binary verified: $((Get-Command rule-mcp).Source)"
} elseif (Test-Command rule-mcp) {
  # It exists but does not launch - try to repair it before falling back to
  # pnpx/npx (mirrors ensure_global_shim() in scripts/install.sh).
  Write-Warn "Global rule-mcp exists but fails to launch - reinstalling"
  if ($DryRun) {
    Write-Step "[dry-run] Would reinstall the global ${NpmPackage} package"
  } else {
    if ($PM -eq "pnpm") { pnpm add -g "${NpmPackage}@${PackageVersion}" *> $null }
    if (-not (Test-PixCli)) { npm install -g "${NpmPackage}@${PackageVersion}" *> $null }
  }
  if (Test-PixCli) {
    $BinCmd = "rule-mcp"
    $BinExecutable = "rule-mcp"
    Write-Ok "Global binary repaired: $((Get-Command rule-mcp).Source)"
  }
}
if (-not $BinExecutable) {
  if ($PM -eq "pnpm") {
    $BinCmd = "pnpx rule-mcp"
    $BinExecutable = "pnpx"
    $BinArguments = @("rule-mcp")
    Write-Warn "Using: $BinCmd"
  } else {
    $BinCmd = "npx rule-mcp"
    $BinExecutable = "npx"
    $BinArguments = @("rule-mcp")
    Write-Warn "Using: $BinCmd"
  }
}

function Invoke-PixCli {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  & $BinExecutable @BinArguments @Arguments
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3: Agent Detection & Installation
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 3: Agent Integration"

if ($TargetAgent) {
  if (-not $InstallMode) { $InstallMode = 'stdio' }
  Write-Info "Targeting: $TargetAgent (mode: $InstallMode)"
  if ($DryRun) {
    Write-Step "[dry-run] Would run: $BinCmd install --agent $TargetAgent --mode $InstallMode"
  } else {
    $result = Invoke-PixCli install --agent $TargetAgent --mode $InstallMode --json 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "Installed for $TargetAgent"
    } else {
      # Surface the CLI error instead of swallowing it: a missing/broken
      # binary used to look like a successful-but-skipped install.
      Write-Warn "Failed to install for $TargetAgent"
      $result | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
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
    "kilo"        = "$HomeDir\.config\kilo\mcp.json"
    "kimi"        = "$HomeDir\.config\kimi\mcp.json"
    "vibe"        = "$HomeDir\.config\vibe\mcp.json"
    "grok"        = "$HomeDir\.config\grok\mcp.json"
    "droid"       = "$HomeDir\.config\factory\mcp.json"
    "kiro"        = "$HomeDir\.config\kiro\mcp.json"
    "qwen"        = "$HomeDir\.config\qwen\mcp.json"
    "devin"       = "$HomeDir\.config\devin\mcp_config.json"
    "vscode"      = (Join-Path $env:APPDATA "Code\User\mcp.json")
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

    $SelectedAgents = @()
    if (-not $InstallMode) { $InstallMode = 'stdio' }
    if (-not $NoInteractive -and [Environment]::UserInteractive) {
      $SelectedAgents = Select-AgentsInteractive $DetectedAgents
      if ($SelectedAgents.Count -eq 0) {
        Write-Warn "No agents selected. Skipping installation."
        exit 0
      }
      if (-not $Mode) {
        $selectedMode = Select-ModeInteractive
        if ($null -eq $selectedMode) { exit 0 }
        $InstallMode = $selectedMode
      }
      Write-Info "Selected $($SelectedAgents.Count) agent(s): $($SelectedAgents -join ', ')"
      Write-Info "Install mode: $InstallMode"
    } else {
      $SelectedAgents = $DetectedAgents
      Write-Step "Non-interactive run: configuring $($DetectedAgents.Count) detected agent(s) (use -Agent <name> to target one)"
    }

    if ($DryRun) {
      foreach ($agent in $SelectedAgents) {
        Write-Step "[dry-run] Would configure: $agent (mode: $InstallMode)"
      }
    } else {
      foreach ($agent in $SelectedAgents) {
        Write-Step "Configuring $agent (mode: $InstallMode)..."
        $result = Invoke-PixCli install --agent $agent --mode $InstallMode --json 2>&1
        if ($LASTEXITCODE -eq 0) {
          Write-Ok "$agent configured"
          $InstalledAgents += $agent
          $ConfiguredCount++
        } else {
          Write-Warn "$agent skipped (may already be configured)"
          $result | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
          $SkippedCount++
        }
      }
      if ($InstallMode -eq 'daemon') {
        Write-Info "Daemon mode selected: the platform service is installed in the daemon phase."
      } elseif ($InstallMode -eq 'docker') {
        Write-Info "Docker mode selected: start the compose service before connecting clients."
      }
    }
  }
}

# Agent and IDE configurations are written only for selections made in Phase 3.

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 5: Model Provider Configuration
# ─────────────────────────────────────────────────────────────────────────────
if ($Models) {
  Write-Header "Phase 5: Model Provider Configuration"
  Write-Info "rule-mcp is model-agnostic. Setting API keys for your providers."

  $openaiKey = Read-Host "OpenAI API Key (sk-..., blank to skip)"
  if ($openaiKey) {
    if ($DryRun) {
      Write-Step "[dry-run] Would set: OPENAI_API_KEY"
    } else {
      [Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $openaiKey, "User")
      $configDir = "$HomeDir\.config\rule-mcp"
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
      $configDir = "$HomeDir\.config\rule-mcp"
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
      $configDir = "$HomeDir\.config\rule-mcp"
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
      $configDir = "$HomeDir\.config\rule-mcp"
      New-Item -ItemType Directory -Force -Path $configDir | Out-Null
      Set-Content "$configDir\xai-key" $xaiKey
      Write-Ok "xAI API key saved"
    }
  }

  Write-Info "Model keys stored in ~\.config\rule-mcp\ and User environment variables."
  Write-Info "Restart your terminal for changes to take effect."
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 6: Windows Service Installation
# ─────────────────────────────────────────────────────────────────────────────
if ($InstallMode -eq 'daemon') {
Write-Header "Phase 6: Windows Service"

if ($DryRun) {
  Write-Step "[dry-run] Would install Windows Service: rule-mcp"
  Write-Step "  Would run: sc create rule-mcp ..."
  Write-Step "  Result: appears in services.msc and can be set to auto-start"
} else {
  Write-Info "Installing Windows Service..."
  $serviceName = "rule-mcp"

  # Check if service already exists
  $existing = sc.exe query $serviceName 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Warn "Service '$serviceName' already exists - updating..."
  }

  if (Test-Command rule-mcp) {
    $result = Invoke-PixCli daemon install 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Ok "Windows Service installed and started"
      Write-Step "  The service appears in services.msc as 'rule-mcp MCP Server'"
      Write-Step "  It is configured to start automatically"
      Write-Step "  Manage with: sc start/stop/query rule-mcp"
    } else {
      Write-Warn "Windows Service installation had issues"
      $result | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
      Write-Step "  Run: rule-mcp daemon install"
    }
  } else {
    Write-Warn "rule-mcp not on PATH - cannot install service automatically"
    Write-Step "  After installing globally, run: rule-mcp daemon install"
  }
}
} elseif ($InstallMode -eq 'docker') {
  Write-Header "Phase 6: Docker Service"
  $SseTokenFile = Join-Path $HomeDir ".rule-mcp\state\sse-token"
  if ($DryRun) {
    Write-Step "[dry-run] Would run: docker compose up -d with the local SSE token"
  } elseif (-not (Test-Command docker)) {
    Write-Warn "Docker Compose v2 is required for Docker mode"
  } elseif (-not (Test-Path "docker-compose.yml")) {
    Write-Warn "docker-compose.yml not found; run the installer from the project directory"
  } elseif (-not (Test-Path $SseTokenFile)) {
    Write-Warn "Missing daemon token: $SseTokenFile"
  } else {
    $previousToken = $env:RULE_MCP_SSE_TOKEN
    try {
      $env:RULE_MCP_SSE_TOKEN = (Get-Content -Raw $SseTokenFile).Trim()
      & docker compose up -d
      if ($LASTEXITCODE -eq 0) {
        Write-Ok "Docker SSE service started"
      } else {
        Write-Warn "Docker SSE service failed to start"
      }
    } finally {
      if ($null -eq $previousToken) {
        Remove-Item Env:RULE_MCP_SSE_TOKEN -ErrorAction SilentlyContinue
      } else {
        $env:RULE_MCP_SSE_TOKEN = $previousToken
      }
    }
  }
} else {
  Write-Header "Phase 6: Background Service"
  Write-Step "Skipping native Windows service (mode: $InstallMode)"
}

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 7: Health Check
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Phase 7: Health Check"

if ($DryRun) {
  Write-Step "[dry-run] Would run: $BinCmd doctor"
} elseif (Test-Command rule-mcp) {
  $result = Invoke-PixCli doctor 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Ok "Health check passed"
  } else {
    Write-Warn "Health check had issues"
    $result | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
  }
} else {
  Write-Warn "Cannot run doctor: rule-mcp not on PATH"
  Write-Step "Run: $BinCmd doctor"
}

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
Write-Header "Installation Summary"

if ($DryRun) {
  Write-Host "⚠ Dry-run mode - no changes were made" -ForegroundColor Yellow
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
Write-Host "  The service appears in services.msc as 'rule-mcp MCP Server'" -ForegroundColor Gray
Write-Host "  It starts automatically with Windows" -ForegroundColor Gray
Write-Host "  sc start rule-mcp  # Start now" -ForegroundColor Gray
Write-Host ""


Write-Host "Add to any agent's mcp.json:" -ForegroundColor Cyan
Write-Host "{" -ForegroundColor Green
Write-Host '  "mcpServers": {' -ForegroundColor Green
Write-Host '    "rule-mcp": {' -ForegroundColor Green
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
  Write-Host "  Restart your coding agent to start using rule-mcp tools." -ForegroundColor Cyan
}
Write-Host ""
