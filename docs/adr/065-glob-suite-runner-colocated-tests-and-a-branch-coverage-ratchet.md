# 065: Glob suite runner, co-located tests, and a branch-coverage ratchet

- **Date**: 2026-09-07
- **Status**: accepted
- **Tags**: testing, ci, coverage, structure
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Suite membership lived in four hardcoded file lists (`test:foundations`, `test:installer`,
`test:all`, `ci`) plus `.github/workflows/ci.yml` - every split or new test edited them, and
files nobody wired in silently never ran. Running the orphans surfaced real defects the lists
had been hiding: the daemon entrypoint resolved one directory short (the daemon could not
start at all), the storm-guard test imported a deleted shim, the untrusted fence missed the
rebranded reminder header, and the reminder diet spec (hardening 4.2) had tests but no
implementation. Coverage was measured in-process only, blind to every subprocess suite, and
nothing gated it.

## Decision

Four pieces. (1) `scripts/ci/run-tests/index.mjs` resolves a suite from glob patterns in
`_suites.data.mjs` (foundations = tests/* by domain + `src/**/__tests__`, installer =
`tests/cli/**` + script syntax checks, all = smoke + docs-scan + both); a new `*.test.mjs`
under a covered directory runs with no runner edit, and a suite whose globs match nothing
fails loudly. (2) Single-module unit suites move next to their subject as
`src/<module>/__tests__/_name.test.mjs`; repo-level contracts stay in `tests/`; the npm
`files` list excludes `src/**/__tests__/`. (3) `pnpm test:coverage` runs the whole `all`
suite under c8 (NODE_V8_COVERAGE reaches child processes, so CLI/installer/daemon runs
count) and fails below the branch floor in
`scripts/reports/coverage/_threshold.data.mjs` - a shrink-proof ratchet that only rises
toward the 95% target; CI runs it as its own job. (4) The home-recording-leak check spawns
suites against a private fake HOME instead of watching the real one, so the parallel runner
cannot race it.

## Consequences

Positive: adding a test is writing a file; the orphan class is gone (204 files run where
151 were listed); measured branch coverage is an honest cross-process 84% with a gate that
cannot drift down. Negative: foundations now includes the previously-orphaned suites, so a
regression anywhere in tests/ blocks it; the coverage job runs the full suite a second time
in CI.

## What would end this

Node shipping first-class workspace test globbing with per-suite tags, or coverage reaching
the 95% target and the ratchet collapsing into a fixed threshold.

## Alternatives Considered

1. Gate coverage at 95 immediately - a permanently red gate teaches everyone to ignore it;
   the ratchet enforces today's truth and only moves toward the target.
1. Keep per-file lists but generate them - still a second source of truth to regenerate,
   and orphans stay possible between regenerations.
