# 055: Restructure the command surface: /rule-mcp router, rule-mcp-area-*, compression implicit, rule-mcp-process-tdd skill

- **Date**: 2026-09-05
- **Status**: accepted
- **Tags**: commands, prompts, surface, skills, installer
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

While completing the persona split (ADR 045), the user asked for a second, larger surface restructure: the /rule-mcp router becomes /rule-mcp; area prompts move under /rule-mcp-area-* ; the standalone `/rule-mcp-compression` command is removed and compression becomes implicit in every other command; /rule-mcp-code-review is superseded by the persona review commands (then `rule-mcp-review-*`, later `rule-mcp-persona-*-review` per ADR 113); the legacy one-shots /rule-mcp-a11y-audit, /rule-mcp-new-feature, /rule-mcp-pull-request, /rule-mcp-setup-project, /rule-mcp-write-tests and /rule-mcp-tdd are removed (write-tests and setup-project content merged into rule-mcp-process-tdd / rule-mcp-init); and at the time `/rule-mcp-check` was renamed toward a process-check one-shot (superseded by ADR 106 + ADR 113: `/rule-mcp-check` auto-detects, `/rule-mcp-area-*-check` per area). Deleted or renamed commands must be purged from every surface, including installers and uninstallers, and stale files removed from the local pi agent.

## Decision

Restructure the command surface: router rule-mcp -> rule-mcp; area prompts become rule-mcp-area-_; delete rule-mcp-a11y-audit, rule-mcp-code-review, the standalone rule-mcp-compression command, rule-mcp-new-feature, rule-mcp-pull-request, rule-mcp-setup-project, rule-mcp-write-tests and rule-mcp-tdd; create a rule-mcp-process-tdd skill that absorbs tdd + write-tests; make compression implicit in every command body (the compression *skill* later moves under process as `rule-mcp-process-compression` in ADR 113). The command set is registry-driven end to end: scripts/install-agent-commands.sh renders from the registry, agent-commands --remove and scripts/uninstall.sh sweep the rule-mcp-_ namespace, so renamed/deleted commands cannot survive in any agent.

## Consequences

Positive: one namespace per concern (rule-mcp-area-* for areas, rule-mcp-process-* for the process family incl. rule-mcp-process-tdd); compression is implicit in every command body instead of a standalone slash command; the router is a short /rule-mcp; scratch commands are gone. Negative: surface counts change and every consumer of the old names must migrate. ADR 106 and ADR 113 later remove leftover adr/process-check one-shots and fold the compression skill under process.

## What would end this

The assumption this leans on is that the rule-mcp-* namespace is the whole command story and that
one-shot, hand-curated workflows (setup/project, pull request) belong outside it. If a new
feature ships a hand-written one-shot command next to the registry again, this restructure
is reversed per-name rather than preserved.

## Alternatives Considered

1. Keep the old names and just add the new area/review commands (leaves standalone compression and one-shot legacy commands active)
1. Rename only the router and area prefixes, keep legacy one-shots (larger surface, more drift)
1. Fold tdd under the existing rule-mcp-process skill instead of a dedicated rule-mcp-process-tdd skill dir
