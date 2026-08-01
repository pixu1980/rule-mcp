# Execution Plan — Docs, roadmap, and rule-architect UI/UX

## Phase 1 — Roadmap verification

- [x] 1. Audit `docs/04-roadmap-plans.md` checkbox items against the current repository state and report which roadmap steps are done, partially done, or obsolete.

## Phase 2 — Documentation ordering

- [x] 2. Find documentation sections that enumerate rule skills.
- [x] 3. Reorder skill list/table sections alphabetically by skill name while preserving links and content.
- [x] 4. Run docs/skills regression tests.

## Phase 3 — Migration-guide removal

- [x] 5. Remove migration-guide content/references because the package is not released yet.
- [x] 6. Re-run documentation preservation checks to ensure no unrelated content is lost.

## Phase 4 — rule-architect definitive UX plan

- [x] 7. Inventory existing CLI and Web interview flows for `rule-architect`.
- [x] 8. Define the final mirrored CLI/Web information architecture, interaction model, command model, validation, preview, generation, and handoff flows.
- [x] 9. Save the implementation plan with phased UI/UX milestones, acceptance criteria, and test strategy in `docs/04-roadmap-plans.md`.

## Phase 5 — Validation and handoff

- [x] 10. Run `pnpm run ci`.
- [x] 11. Summarize changed files and next actions.
