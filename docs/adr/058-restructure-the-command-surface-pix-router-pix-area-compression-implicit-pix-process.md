# 058: Restructure the command surface: /pix router, pix-area-*, compression implicit, pix-process-tdd skill

- **Date**: 2026-09-05
- **Status**: accepted
- **Tags**: commands, prompts, surface, skills, installer
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

While completing the persona split (ADR 045), the user asked for a second, larger surface restructure: the /pix-galaxy-mcp router becomes /pix; area prompts move under /pix-area-* ; /pix-compression is removed and compression becomes implicit in every other command; /pix-code-review is superseded by the /pix-review-* persona commands; the legacy one-shots /pix-a11y-audit, /pix-new-feature, /pix-pull-request, /pix-setup-project, /pix-write-tests and /pix-tdd are removed (write-tests and setup-project content merged into pix-process-tdd / pix-init); and /pix-check becomes /pix-process-check. Deleted or renamed commands must be purged from every surface, including installers and uninstallers, and stale files removed from the local pi agent.

## Decision

Restructure the command surface: router pix-galaxy-mcp -> pix; the 12 area prompts become pix-area-_; delete pix-a11y-audit, pix-code-review, pix-compression, pix-new-feature, pix-pull-request, pix-setup-project, pix-write-tests and pix-tdd; rename pix-check -> pix-process-check; create a pix-process-tdd skill that absorbs tdd + write-tests; make compression implicit in every command body. The command set is registry-driven end to end: scripts/install-agent-commands.sh renders from the registry, agent-commands --remove and scripts/uninstall.sh sweep the pix-_ namespace, so renamed/deleted commands cannot survive in any agent. New surface: 40 prompts, 41 commands, 95 skills, 111 tools, 196 resources.

## Consequences

Positive: the command surface shrinks 49 -> 41; one namespace per concern (pix-area-* for areas, pix-process-* for the process family incl. the new pix-process-tdd skill/tool and pix-process-check); compression is implicit in every command body instead of a standalone command; the router is a short /pix; scratch commands (setup-project/new-feature/pull-request) are gone; write-tests content merged into pix-process-tdd; setup-project content absorbed into pix-init. The legacy shell installer and the universal uninstaller are registry-driven/glob-based, so a renamed or deleted command cannot linger. Negative: surface counts change (40 prompts, 41 commands, 95 skills, 111 tools, 196 resources) and every consumer of the old names (README, parity fixture, tests, ~/.pi command files) must migrate; /pix area prompts are less discoverable in help lists than per-area names.

## What would end this

The assumption this leans on is that the pix-* namespace is the whole command story and that
one-shot, hand-curated workflows (setup/project, pull request) belong outside it. If a new
feature ships a hand-written one-shot command next to the registry again, or if the user's
workflow shows /pix-compression-style shortcuts are wanted as explicit commands, this restructure
is reversed per-name rather than preserved.

## Alternatives Considered

1. Keep the old names and just add the new area/review commands (leaves /pix-compression and one-shot legacy commands active)
1. Rename only the router and area prefixes, keep legacy one-shots (larger surface, more drift)
1. Fold tdd under the existing pix-process skill instead of a dedicated pix-process-tdd skill dir
