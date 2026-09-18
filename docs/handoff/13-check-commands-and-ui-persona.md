# Handoff: per-area check commands and the UI/UX persona

**Branch:** main
**Commits covered:** `048315a2..6e32a2e6` (3 commits)
**Date:** 2026-09-18

## Session Summary

The command surface spoke with two check names for one job: the MCP prompt
registry carried `/rule-process-check`, the agent command surface carried
`/rule-check`, and `/rule-adr` duplicated the process-adr skill. A single generic
check also gave no way to ask for one area's guardrails. This session removed
`/rule-adr` and `/rule-process-check` from the MCP registry, added a check command
per area prompt (91 of them) and a general `/rule-check` that auto-detects the
area, and renamed the `design-system` persona to the wider `ui` (UI/UX Lead).
Two ADRs record both decisions.

## Work Completed

### 1. Check commands (`src/core/agents/commands/`)

- `_names.js`: added `CHECK_COMMAND = "rule-check"`; `commandNames()` now derives
  one `<area>-check` name per area prompt and sorts them with the rest, after the
  pinned router.
- `_definitions.js`: `commandDefinition` resolves a `-check` suffix back to its
  area prompt and returns a guardrail-validation definition; `rule-check` returns
  the general auto-detecting definition.
- `_bodies.js`: added `checkBody(area, skill)` and `generalCheckBody`.
- `src/prompts/_defs.data.js`: removed the `rule-adr` and `rule-process-check`
  prompt definitions and the `rule-process-check` example.

### 2. Persona rename (`personas/`)

- `personas/design-system.md` deleted; `personas/ui.md` added with id `ui`,
  title "UI/UX Lead", and lenses widened from five to ten.
- Evidence skills grow from four to thirteen: `rule-ui`, `rule-styleguide-a11y`
  and every frontend framework skill join the original four.
- `src/core/review/personas/__tests__/_registry.test.mjs` follows: the active
  catalog ships `ui` in place of `design-system` (still 19 roles).

### 3. Tests and fixtures

- `src/prompts/__tests__/_contract.test.mjs`, `_prompts.fixture.mjs`,
  `_registry.test.mjs`, `_agent-commands-generator.test.mjs` follow the new
  counts: prompts 155 to 153, one-shot prompts 6 to 4, agent commands
  156 to 246.
- `src/cli/install/__tests__/_selection.test.mjs` expects `rule-check` in the
  tasks family; `src/cli/__tests__/_install-agent-commands.test.mjs` expects
  `rule-area-frontend-check.md` present and `rule-process-check.md` stale.

### 4. Docs, census and ADRs

- The census pre-commit hook regenerated `docs/02`, `07`, `10`, `11`, `13`,
  so the committed inventories match the code (command surface 156 to 246,
  MCP prompts 155 to 153).
- ADR 106 records per-area check commands and the auto-detecting general check;
  ADR 107 records the `design-system` to `ui` rename. The ADR index follows.
- `README.md` prompt count updated 155 to 153.

## Verification

- `pnpm test:all`: 1799 tests, 1796 pass, 0 fail, 3 skipped (exit 0).
- Isolated run of `src/cli/commands/__tests__/_daemon.test.mjs`: 9 pass, 0 fail.
  It failed once under parallel load in an earlier full run and passed on both
  the isolated run and the rerun; treat it as load-flaky, not a regression.
- Targeted run of the prompts registry, contract and ADR-reference suites:
  11 pass, 0 fail.

## Open Items

- The new commands were verified through the registry and the installer tests,
  not against a live client. A real install (opencode, Claude Code) and a check
  that `/rule-area-<area>-check` and `/rule-check` appear is still worth doing.
- The census hook staged `docs/13-personas.md` into the `feat(commands)` commit
  rather than the `refactor(personas)` commit: the hook regenerates all census
  files at once from the working tree, so they cannot be split by commit.
- Open plan boxes remain in `docs/plans/architect.md`, `docs/plans/oss.md`,
  `docs/plans/security.md` and `docs/plans/github.md`.

## ADR Reference

- ADR 106: Check runs per area, and the general check auto-detects it.
- ADR 107: The design-system persona becomes the UI/UX lead.

## References

- `src/core/agents/commands/_names.js`, `_definitions.js`, `_bodies.js`
- `src/prompts/_defs.data.js`
- `personas/ui.md`
- `docs/adr/106-check-runs-per-area-and-the-general-check-auto-detects-it.md`
- `docs/adr/107-the-design-system-persona-becomes-the-ui-ux-lead.md`

### Resume Prompt

The next session opens with this block. Add the path of this document and the first step of the next session before saving it.

```prompt
Resume work on rule-mcp. Run `rule_tool_process_handon` first: it checks which claims in this handoff still hold before any of them is trusted.
The ADR log and the context snapshot capture what has been decided; do not re-ask answered questions.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message.
This handoff is `docs/handoff/13-check-commands-and-ui-persona.md`.
First step: install against a live client (opencode or Claude Code) and confirm `/rule-area-<area>-check` and `/rule-check` are written and listed, then pick the next workstream from the open plan boxes in `docs/plans/`.
```
