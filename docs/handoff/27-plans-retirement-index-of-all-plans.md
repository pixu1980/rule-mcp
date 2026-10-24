# 27 - Plans retirement - index of all plans

- **Branch**: `feat/evolution`
- **Date**: 2026-10-24

## HANDOFF: plans

### Retired

- `docs/plans/plan-of-plans.md` - the level-0 orchestrator, stages 0-8 complete, `Status: done`, zero real open checkboxes. Retired into ADR 170; file deleted.
- `docs/plans/plan-of-plans-reference.md` - the plan-graph audit, `Status: done` with eight follow-ups. Retired into ADR 171; file deleted.

### Open plans (96 files, 1,490 open items)

| Group                | Files | Open boxes |
| -------------------- | ----: | ---------: |
| Non-skill plans      |    10 |        146 |
| Skill plans          |    86 |      1,336 |
| Reference follow-ups |     - |          8 |
| **Total**            |    96 |  **1,490** |

Non-skill plans: `export.md` (39), `devops-guardrails.md` (24), `backend-guardrails.md` (23), `data-guardrails.md` (14), `frontend-guardrails.md` (13), `ai-guardrails.md` (10), `meta-guardrails.md` (10), `2026-10-01-scripts-mcp-layout.md` (10), `decision-models.md` (2), `installer-scope-adr-policy-features.md` (1).

The 86 skill plans live under `docs/plans/skills/`; `skills/skills-plan.md` is their index and carries the 1,336 open boxes. `skills/README.md` and `skills/DEPENDENCIES.md` are catalog documents, not plans.

### Reference follow-ups (8)

F1 apply the contract stage by stage; F2 decide the Stage 3 order; F3 decide the toolchain additions; F4 one id per node; F5 the five-line format; F8 normalize the status line as each stage starts; F9 exempt the three non-skill plans from the checkbox assertion by path; the per-stage node list.

### ADRs

- ADR 170 - retire the plan-of-plans into an ADR and a handoff.
- ADR 171 - retire the plan-graph audit reference into an ADR and a handoff.
- ADR 172 - retire closed plans into ADRs and one handoff.

### Next

The open plans are the roadmap; they stay in `docs/plans` and are indexed here. The next session opens the area it needs from this table, not from the retired level-0 file. The release PR #9 is a separate line: coverage gate and Code scanning remain its blockers.
