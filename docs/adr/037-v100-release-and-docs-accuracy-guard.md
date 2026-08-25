# 037: v1.0.0 release and the docs-accuracy guard

- **Date**: 2026-08-25
- **Status**: accepted
- **Tags**: release, docs, accuracy, testing

## Context

README and the docs advertised a tool/resource/prompt/skill surface (99/146/24/89) that had silently drifted: after the architect split the real surface is 90/168/21/80. Nothing verified the claims — only `docs-scan` checked that referenced tool _names_ still exist. The repository had also never cut a release: version stayed 1.0.0, everything lived under `[Unreleased]`.

## Decision

1. Add `test/docs-accuracy.test.mjs`: it computes the runtime surface (`listTools`/`listResources`/`listPrompts` + the `skills/` dirs) and fails when README.md disagrees. Counts become a tested contract, not prose.
2. Cut **v1.0.0**: promote the `[Unreleased]` history into a dated `[1.0.0]` section, keep `[Unreleased]` for future work, and add a `.github/workflows/release.yml` that publishes a GitHub Release from the changelog entry whenever a `v*` tag is pushed. No npm publish in this milestone (the package is consumed from the repo; publishing can be a follow-up ADR).

## Consequences

**Positive**: stale-claim regressions are structurally impossible; the repo has a reproducible release flow (tag → changelog-based GitHub Release); the status section in README doubles as a health snapshot.
**Negative**: npm distribution is still pending; the accuracy test adds a small runtime cost to the suite.
