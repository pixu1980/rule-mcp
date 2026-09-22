# 055: Restructure the command surface: /pix router, pix-area-*, compression implicit, pix-process-tdd skill

- **Date**: 2026-09-05
- **Status**: accepted
- **Tags**: commands, prompts, surface, skills, installer
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

While completing the persona split (ADR 045), the user asked for a second, larger surface restructure: the /pix-galaxy-mcp router becomes /pix; area prompts move under /pix-area-* ; the standalone `/pix-compression` command is removed and compression becomes implicit in every other command; /pix-code-review is superseded by the persona review commands (then `pix-review-*`, later `pix-persona-*-review` per ADR 113); the legacy one-shots /pix-a11y-audit, /pix-new-feature, /pix-pull-request, /pix-setup-project, /pix-write-tests and /pix-tdd are removed (write-tests and setup-project content merged into pix-process-tdd / pix-init); and at the time `/pix-check` was renamed toward a process-check one-shot (superseded by ADR 106 + ADR 113: `/pix-check` auto-detects, `/pix-area-*-check` per area). Deleted or renamed commands must be purged from every surface, including installers and uninstallers, and stale files removed from the local pi agent.

## Decision

Restructure the command surface: router pix-galaxy-mcp -> pix; area prompts become pix-area-*; delete pix-a11y-audit, pix-code-review, the standalone pix-compression command, pix-new-feature, pix-pull-request, pix-setup-project, pix-write-tests and pix-tdd; create a pix-process-tdd skill that absorbs tdd + write-tests; make compression implicit in every command body (the compression *skill* later moves under process as `pix-process-compression` in ADR 113). The command set is registry-driven end to end: scripts/install-agent-commands.sh renders from the registry, agent-commands --remove and scripts/uninstall.sh sweep the pix-* namespace, so renamed/deleted commands cannot survive in any agent.

## Consequences

Positive: one namespace per concern (pix-area-* for areas, pix-process-* for the process family incl. pix-process-tdd); compression is implicit in every command body instead of a standalone slash command; the router is a short /pix; scratch commands are gone. Negative: surface counts change and every consumer of the old names must migrate. ADR 106 and ADR 113 later remove leftover adr/process-check one-shots and fold the compression skill under process.

## What would end this

The assumption this leans on is that the pix-* namespace is the whole command story and that
one-shot, hand-curated workflows (setup/project, pull request) belong outside it. If a new
feature ships a hand-written one-shot command next to the registry again, this restructure
is reversed per-name rather than preserved.

## Alternatives Considered

1. Keep the old names and just add the new area/review commands (leaves standalone compression and one-shot legacy commands active)
1. Rename only the router and area prefixes, keep legacy one-shots (larger surface, more drift)
1. Fold tdd under the existing pix-process skill instead of a dedicated pix-process-tdd skill dir
