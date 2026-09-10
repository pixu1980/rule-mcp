# 064: Coverage floor raised to 89 toward the 95 endpoint

- **Date**: 2026-09-07
- **Status**: accepted
- **Tags**: testing, coverage, ci, ratchet
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Phase 7's ratchet continued past ADR 063: a second wave of ~30 co-located suites landed - SSE transport handler, tokensave decoration pipeline, the handoff builder/sections/sources/format, export retention, tool-cache persistence edge cases, session lifecycle and resume announce, CLI registrar arms (doctor/skills/agent-commands/handoff doctor via subprocesses), roles CLI edges, the guard hook, skills install flows, installer path helpers and agent dispatch, bm25 scoring on a hand-built index, review findings merge, the vanilla template-load guardrail, daemon process lifecycle and report. Local branch coverage measured 89.27% (multiple measures 88.9-89.3 across a moving census). CI runs ubuntu/Node22 so the floor is set to 89, below the local measure, for headroom.

## Decision

Raise BRANCH_FLOOR in scripts/reports/coverage/_threshold.data.mjs from 87 to 89. The ratchet mechanics are unchanged: pnpm test:coverage fails below the floor, the floor may only rise, and 95 stays where the phase closes. All suites landed co-located (src/**/**tests**) or as repo-level folder tests, picked up by the glob runner without package.json edits.

## Consequences

Positive: floor 83 -> 87 -> 89, ~790 tests green locally, and the coverage work surfaced further real defects (the ADR index byte-equal gate and the gateway evidence tool-name bug are fixed; the handoff/transcripts fields verified). Negative: the remaining ~370 branches are concentrated in platform-locked daemon/service arms, subprocess CLI paths and defensive code; each point costs roughly an hour and the ubuntu CI census differs +/-1-2pt from local, so the last leg to 95 needs dedicated follow-up sessions.

## What would end this

The assumption this leans on, and the observation that would make it wrong.
