# 072: Coverage wave four holds the floor at 90 and fixes the daemon status platform defect

- **Date**: 2026-09-08
- **Status**: accepted
- **Tags**: testing, coverage, ci, ratchet
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Phase 7's ratchet (ADRs 065-068) continued with a fourth wave of ~20 co-located suites over the named tail: daemon command arms (status, logs, dry-run install/uninstall, enable/disable, unknown action), skills-install catalog, IDE installer path and writer arms (vscode/devin paths per platform, emacs append-once, generic installer, devin slash commands), handoff sources (ADR edge shapes, project identity), skill tool mode arms, search tool empty arm, component tool arms, the claude transcript reader (window, tool results, sparse usage), orphaned-path references over a seeded git repo, doctor run (telemetry arm, live and stale pid), detect-env, findings merge (prune, defaults, steps, severity ranking), persona catalog edges (missing dir, unreadable dir, id mismatch), persona file parsing (nullable fields, frameless bodies), guardrails CSS util, snapshot sizes, and router compute. The wave surfaced one real defect: checkDaemonService's macos arm omitted the platform key while the linux, windows and default arms carried it, so `daemon status` printed `Platform: undefined` on macOS and the plist detail line (gated on platform === "macos") never rendered. Fixed test-first. Local measure after the wave: 90.74% branches (6057/6675) across 981 tests, up from 90.33% - the wave covered ~155 branches while the newly-loaded modules added ~140 uncovered ones (mostly platform-locked daemon arms) to the denominator.

## Decision

Hold BRANCH_FLOOR at 90: the local measure (90.74) is below 91, so a raise would gate above what the suite delivers. The wave's value is the margin - the floor's headroom grew from 0.08 to 0.74 points, which is what the ubuntu/Node22 CI variance actually needs. Ratchet mechanics unchanged; 95 remains the endpoint. The remaining ~620 misses cluster in platform-locked daemon arms (~40: linux/windows arms on a darwin dev box, the mirror image on CI), dead domain ternaries in ai/_framework, CLI serve transports, and 2-4 branch chips per file across the long tail.

## Consequences

Positive: 981 tests green, one user-visible CLI defect fixed (daemon status platform line), the darkest CLI and tool modules now have co-located suites, and the next floor raise starts from real headroom instead of a hair's width. Negative: each further point now costs a full wave because covering an unloaded module also loads its locked branches into the denominator; reaching 95 without dependency injection for the platform arms or explicit coverage exclusions looks increasingly unlikely, and that trade will need its own decision.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Raise the floor to 91 anyway - rejected: the local measure is 90.74, the gate would be red on landing
1. Add /* c8 ignore */ to the platform-locked daemon arms - rejected for now: excluding code from the census is a structural decision this wave was not asked to make
1. Refactor detectPlatform for dependency injection so linux/windows arms run on darwin - proposed in prose, out of scope for a coverage wave
