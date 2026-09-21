---
branch: main
commit_range: b95bd543..a5fbcce8
date: 2026-09-21
---

# ARCH-7.1 shipped god-file splits

## Completed

- ARCH-7.1 is complete. Six pre-existing `skills/` size-ratchet offenders were split using the ADR 061 folder/barrel pattern.
- Template-engine assets now use `filters/`, `expression-parser/`, and `renderer/` responsibility folders.
- Vanilla-reactive template instance code is split into markup, descriptors, template lookup, node paths, and instance lifecycle modules.
- Custom-element scaffolding is split under `scripts/scaffold/`.
- Worker-pool code is split into public, internal, and size helpers.
- `FILE_SIZE_RATCHET` is empty; all shipped source files are at or below 150 lines.
- `skills` CI coverage is wired and green: 111 tests passed.
- The file-size budget gate is green: 3 tests passed.
- The ARCH-7.1 plan annotation is committed.

## Commits

- `d25914eb refactor(skills): split shipped god files`
- `a5fbcce8 docs(architect): mark ARCH-7.1 complete`

## Verification

- `skills` suite: 111 passed.
- File-size budget: 3 passed.
- Full suite previously measured 1986 tests: 1982 passed, 1 known unrelated installer failure, 3 skipped.
- Lint previously measured 0 errors and 36 baseline warnings.
- `rule_tool_process_handoff` was not available in this session; the repository handoff builder was invoked with all default inclusions and reported 112 ADRs, 0 archived documents, 189 lines, and approximately 6606 tokens.

## Known failure

`src/cli/install/__tests__/_installer-stdio-path.test.mjs` expects the checkout path `~/Projects/rule-mcp` and fails when a global binary is present. It predates ARCH-7.1 and was not changed.

## Next work

Continue ARCH-7.2: extract `callTool` stages into `src/tools/router/call/_stages.js`, split doctor formatting and roles output by responsibility, and add missing self-update and roles branch tests. Then measure ARCH-7.3 gates: complexity gini below 0.60, shipped weight-lines cap, `callTool` fan-out below 15, and coverage floor 90.

### Resume Prompt

```prompt
Resume work on rule-mcp at commit a5fbcce8 on branch main. First run `rule_tool_process_handon` against `docs/handoff/16-arch-7.1-shipped-god-file-splits.md` and verify its claims before trusting them. Then inspect ARCH-7.2 in `docs/plans/architect.md`, write failing tests first, and extract the `callTool` stages without changing behavior. Keep every commit in `type(scope): subject` form and do not push.
```
