# 068: Coverage floor raised to 90

- **Date**: 2026-09-07
- **Status**: accepted
- **Tags**: testing, coverage, ci, ratchet
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The coverage ratchet (ADRs 065-067) kept rising through the long-tail sweep: English-only scanners, tool surface annotations, cache replay tiers, agent-commands target flows, review overlays/validate/persona parsing, check/search tool verdicts, handon verification buckets, handoff git reads, plan reporter variants, project detection edges, flight renderer, a11y evaluate, and more. Local branch coverage passed 90% (measured 90.08; census 6523). CI runs ubuntu/Node22, so the floor is kept a hair below the local measure.

## Decision

Raise BRANCH_FLOOR from 89 to 90 in scripts/reports/coverage/_threshold.data.mjs. Ratchet mechanics unchanged; 95 remains the endpoint. All suites remain glob-runner picked up (src/**/**tests** or repo-level folders), no package.json edits.

## Consequences

Positive: floor 83 -> 87 -> 89 -> 90 with ~850 tests green locally. Negative: the remaining ~320 branches are the hardest tail (CLI subprocess arms, platform-locked daemon paths, defensive code); each point now costs more than an hour and the ubuntu census differs +/-1-2pt from local.

## What would end this

The assumption this leans on, and the observation that would make it wrong.
