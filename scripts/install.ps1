#Requires -Version 5.1
<#
.SYNOPSIS
  rule-mcp installer bootstrap for Windows.

.DESCRIPTION
  Checks that Node is new enough, resolves the server binary, and hands the
  arguments to `rule-mcp setup`.

  Everything else - agent detection, the picker, install modes, instruction
  files, skills, the daemon service, the health check - lives in Node, under
  src/cli/setup/, shared with the POSIX bootstrap. The 700 lines of
  PowerShell that used to live here were a third implementation of that
  logic and drifted from both others (ADR 080).

.EXAMPLE
  ./scripts/install.ps1
  ./scripts/install.ps1 --mode stdio --dry-run
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

$localBin = Join-Path (Split-Path -Parent $PSScriptRoot) 'bin/rule-mcp.js'

# Prefer the checkout this script came from, then a global shim that actually
# launches, then a one-off fetch.
$shimWorks = $false
if (Get-Command rule-mcp -ErrorAction SilentlyContinue) {
  & rule-mcp --version *> $null
  $shimWorks = $LASTEXITCODE -eq 0
}

if (Test-Path $localBin) {
  & node $localBin setup @Arguments
} elseif ($shimWorks) {
  & rule-mcp setup @Arguments
} elseif (Get-Command pnpm -ErrorAction SilentlyContinue) {
  & pnpm dlx rule-mcp setup @Arguments
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
  & npx --yes rule-mcp setup @Arguments
} else {
  Stop-WithMessage 'no rule-mcp binary and no pnpm/npx to fetch one'
}

exit $LASTEXITCODE
