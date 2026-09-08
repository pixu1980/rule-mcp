# 075: The installer asks before copying bundled skills to the central agents directory

- **Date**: 2026-09-08
- **Status**: accepted
- **Tags**: installer, skills, devx, bash, powershell
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The rule-mcp installers (scripts/install.sh and scripts/install.ps1) configured agents, rules, commands and services, but never touched the bundled rule-* skills: the MCP server serves them directly from its embedded catalog. Users who wanted their agent to see the skills natively (agents such as Pi read ~/.agents/skills) had to run scripts/install-skills.sh or the CLI skills installer separately — both of which copy the whole 89-skill catalog to the central ~/.agents/skills location without asking. A user installing with install.sh reported ending up with the full skill catalog centralized with no step that offered a choice.

## Decision

Add a skills step to both installers that asks before copying. install.sh gains Phase 6c "Bundled Skills" and install.ps1 gains Phase 4: in interactive TTY runs it prompts "Install bundled rule-* skills to ~/.agents/skills? [y/N]" defaulting to No, so a plain Enter or EOF never centralizes the catalog; the copy itself runs through the argv-safe CLI (rule-mcp skills install --all) which works for both local-repo and curl-piped installs and uses the embedded catalog. New flags --skills/-Skills force the copy and --no-skills/-NoSkills skip the step for non-interactive and CI runs, where the installer otherwise prints a skip hint instead of prompting. The PTY acceptance test now feeds a No answer and asserts the prompt/skip; a static selection test asserts non-interactive runs never prompt; the PowerShell contract test asserts the skills helper and prompt.

## Consequences

Positive: installing now asks before centralizing any skill; non-interactive runs stay silent by default and are deterministic via the new flags; bash and PowerShell behave identically; the copy path is the same argv-safe CLI used everywhere else. Negative: interactive users get one more Enter; agents that only read ~/.agents/skills natively need an explicit yes or --skills to see the rule-* skills locally (the MCP server still serves them regardless); the wizard stays two-step so per-skill selection still lives in the standalone CLI.

## What would end this

The assumption this leans on is that copying skills to ~/.agents/skills is an optional extra that deserves an explicit yes. It would be wrong if native ~/.agents/skills loading became the only way agents receive rule-* skills (MCP delivery removed), or if a curated subset rather than the full catalog became the normal install target - each would change the default, and the per-skill picker would then have to move into the wizard step itself.

## Alternatives Considered

1. Default the skills step to Yes so agents get native skills by default - rejected: it re-centers 89 skills on a plain Enter, the exact surprise being reported
1. Reuse scripts/install-skills.sh from the installer - rejected: it resolves ../skills relative to the script, which breaks curl-piped installs, while the CLI uses the embedded catalog and single-binary form
1. Add a third full-screen TUI step with per-skill checkboxes - rejected: ADR 073 keeps the wizard a two-step alt-screen TUI; the CLI already ships the checkbox picker (rule-mcp skills install) for granular selection
