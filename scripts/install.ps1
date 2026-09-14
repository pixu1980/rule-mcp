#Requires -Version 5.1
<#
.SYNOPSIS
  rule-mcp installer bootstrap for Windows.

.DESCRIPTION
  Checks that Node is new enough, resolves the server binary, and hands the
  arguments to `rule-mcp setup`.

  Everything else - agent detection, the picker, install modes, instruction
  files, the guard hooks, skills, the daemon service, the health check - lives
  in node, under src/cli/setup/, shared with the POSIX bootstrap. The
  PowerShell that used to answer the same questions on its own was a second
  implementation, and the two drifted (ADR 105).

  Every path written to lives under the user profile. Nothing is created,
  edited or deleted inside the current directory.

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

# Options `rule-mcp setup` accepts - same contract as install.sh (see
# the install-script-flags test); unknown options fail before any download.
$KnownSetupFlags = @('agent', 'mode', 'uninstall', 'rules', 'no-rules', 'commands', 'no-commands', 'hooks', 'no-hooks', 'skills', 'no-skills', 'minimal', 'no-minimal', 'surface', 'service', 'no-service', 'doctor', 'no-doctor', 'commands-preset', 'commands-families', 'commands-areas', 'commands-skills', 'purge', 'keep-config', 'force', 'dry-run', 'no-wizard', 'no-interactive', 'json', 'help', 'version')
$ValueSetupFlags = @('agent', 'mode', 'commands-preset', 'commands-families', 'commands-areas', 'commands-skills', 'surface')

function Assert-SetupArguments([string[]]$rest) {
  $i = 0
  while ($i -lt $rest.Count) {
    $arg = $rest[$i]
    $i++
    if ($arg -eq '--') {
      # Everything past `--` is positional, and `setup` takes none.
      if ($i -lt $rest.Count) { Stop-WithMessage "unexpected argument '$($rest[$i])' - run 'rule-mcp setup --help' for the list" }
      return
    }
    if ($arg -notlike '-*') { Stop-WithMessage "unexpected argument '$arg' - run 'rule-mcp setup --help' for the list" }
    if ($arg -notlike '--*') { continue }
    $name = $arg.Substring(2)
    $inline = $false
    if ($name -like '*=*') { $name = ($name -split '=', 2)[0]; $inline = $true }
    if ($KnownSetupFlags -notcontains $name) { Stop-WithMessage "unknown option '--$name' - run 'rule-mcp setup --help' for the list" }
    # A separate value rides with its flag; an attached one already did.
    if (($ValueSetupFlags -contains $name) -and (-not $inline) -and ($i -lt $rest.Count)) { $i++ }
  }
}

Assert-SetupArguments $Arguments

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
