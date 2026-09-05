# 058: Restructure the command surface: /rule router, rule-area-*, caveman implicit, rule-process-tdd skill

- **Date**: 2026-09-05
- **Status**: accepted
- **Tags**: commands, prompts, surface, skills, installer
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

While completing the persona split (ADR 045), the user asked for a second, larger surface restructure: the /rule-mcp router becomes /rule; area prompts move under /rule-area-* ; /rule-caveman is removed and caveman becomes implicit in every other command; /rule-code-review is superseded by the /rule-review-* persona commands; the legacy one-shots /rule-a11y-audit, /rule-new-feature, /rule-pull-request, /rule-setup-project, /rule-write-tests and /rule-tdd are removed (write-tests and setup-project content merged into rule-process-tdd / rule-init); and /rule-check becomes /rule-process-check. Deleted or renamed commands must be purged from every surface, including installers and uninstallers, and stale files removed from the local pi agent.

## Decision

Restructure the command surface: router rule-mcp -> rule; the 12 area prompts become rule-area-_; delete rule-a11y-audit, rule-code-review, rule-caveman, rule-new-feature, rule-pull-request, rule-setup-project, rule-write-tests and rule-tdd; rename rule-check -> rule-process-check; create a rule-process-tdd skill that absorbs tdd + write-tests; make caveman implicit in every command body. The command set is registry-driven end to end: scripts/install-agent-commands.sh renders from the registry, agent-commands --remove and scripts/uninstall.sh sweep the rule-_ namespace, so renamed/deleted commands cannot survive in any agent. New surface: 40 prompts, 41 commands, 95 skills, 111 tools, 196 resources.

## Consequences

Positive: the command surface shrinks 49 -> 41; one namespace per concern (rule-area-* for areas, rule-process-* for the process family incl. the new rule-process-tdd skill/tool and rule-process-check); caveman is implicit in every command body instead of a standalone command; the router is a short /rule; scratch commands (setup-project/new-feature/pull-request) are gone; write-tests content merged into rule-process-tdd; setup-project content absorbed into rule-init. The legacy shell installer and the universal uninstaller are registry-driven/glob-based, so a renamed or deleted command cannot linger. Negative: surface counts change (40 prompts, 41 commands, 95 skills, 111 tools, 196 resources) and every consumer of the old names (README, parity fixture, tests, ~/.pi command files) must migrate; /rule area prompts are less discoverable in help lists than per-area names.

## What would end this

The assumption this leans on is that the rule-* namespace is the whole command story and that
one-shot, hand-curated workflows (setup/project, pull request) belong outside it. If a new
feature ships a hand-written one-shot command next to the registry again, or if the user's
workflow shows /rule-caveman-style shortcuts are wanted as explicit commands, this restructure
is reversed per-name rather than preserved.

## Alternatives Considered

1. Keep the old names and just add the new area/review commands (leaves /rule-caveman and one-shot legacy commands active)
1. Rename only the router and area prefixes, keep legacy one-shots (larger surface, more drift)
1. Fold tdd under the existing rule-process skill instead of a dedicated rule-process-tdd skill dir
