# 063: Coverage floor raised to 87; 95 remains the ratchet endpoint

- **Date**: 2026-09-07
- **Status**: accepted
- **Tags**: testing, coverage, ci, ratchet
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Phase 7 of the plan (ADR 057/061/065) gates CI on a rising branch-coverage floor. Landed targeted suites across the darkest modules - doctor rendering, self-update gates, telemetry store I/O, HTTP transport, gateway core/render, transcripts, cache catalog verify, handon verification, project snapshot, role templates, terminal helpers, and more - taking the measured floor from 83 to 87.88 on the local full-suite run (multiple measures: 87.1-87.9; CI runs ubuntu/Node22 so the floor is set below the local measure for headroom). The 95 target stays the ratchet's endpoint; the floor keeps rising as suites land.

## Decision

Raise BRANCH_FLOOR in scripts/reports/coverage/_threshold.data.mjs from 83 to 87. The gate and the ratchet mechanics are unchanged: pnpm test:coverage fails below the floor, the floor may only rise, and 95 is when the phase closes. Every suite landed in this pass is co-located src/**/**tests** or folder-split repo-level tests, so the glob runner picked them up with no package.json edits.

## Consequences

Positive: the branch floor moved 83 to 87, and the coverage work surfaced and fixed two real defects - the ADR index generator emitted tables prettier immediately reformatted (byte-equal gate was red on main), and the gateway loaded evidence from a tool name that never registered (evidence blocks carried 'Unknown tool' text). Negative: each remaining percentage point sits in CLI/daemon/transport arms that are platform- or subprocess-bound, so the last leg to 95 is slower per point than the first.

## What would end this

The assumption this leans on, and the observation that would make it wrong.
