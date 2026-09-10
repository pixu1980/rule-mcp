#Requires -Version 5.1
<#
.SYNOPSIS
  rule-mcp uninstaller bootstrap for Windows.

.DESCRIPTION
  The mirror of scripts/install.ps1: check Node, resolve the binary, hand
  over to `rule-mcp setup --uninstall`. The removal logic - the scan,
  the per-group choices, the purge - lives in src/cli/setup/ (ADR 080).

  One translation is kept for compatibility: `--force` used to mean "do not
  ask for confirmation", which is now `--no-interactive` - run the plan with
  defaults and no wizard.

.EXAMPLE
  ./scripts/uninstall.ps1
  ./scripts/uninstall.ps1 --purge --dry-run
#>

[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Arguments = @()
)

$ErrorActionPreference = 'Stop'
$nodeMin = 20

function Stop-WithMessage([string]$message) {
  Write-Error "rule-mcp: $message"
  exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Stop-WithMessage "Node.js >= $nodeMin is required - https://nodejs.org"
}

$nodeMajor = [int](& node -p 'process.versions.node.split(".")[0]')
if ($nodeMajor -lt $nodeMin) {
  Stop-WithMessage "Node.js >= $nodeMin is required (found $(& node --version))"
}

$forwarded = @('--uninstall') + ($Arguments | ForEach-Object { if ($_ -eq '--force') { '--no-interactive' } else { $_ } })

$localBin = Join-Path (Split-Path -Parent $PSScriptRoot) 'bin/rule-mcp.js'

$shimWorks = $false
if (Get-Command rule-mcp -ErrorAction SilentlyContinue) {
  & rule-mcp --version *> $null
  $shimWorks = $LASTEXITCODE -eq 0
}

if (Test-Path $localBin) {
  & node $localBin setup @forwarded
} elseif ($shimWorks) {
  & rule-mcp setup @forwarded
} elseif (Get-Command pnpm -ErrorAction SilentlyContinue) {
  & pnpm dlx rule-mcp setup @forwarded
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
  & npx --yes rule-mcp setup @forwarded
} else {
  Stop-WithMessage 'no rule-mcp binary and no pnpm/npx to fetch one'
}

exit $LASTEXITCODE
