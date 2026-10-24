# 133: First release is v0.1.0, then SemVer from commits

- **Date**: 2026-10-01
- **Status**: accepted
- **Tags**: release, versioning, semver
- **Author**: Emiliano Pisu <emiliano.pisu@pixu1980.com>

## Context

Manifests said `0.2.0-rc` and ADR 097 named `v0.1.0-beta`, but no release
tag ever shipped. Deriving the next version from the whole untagged history
jumps to `1.0.0` because of accumulated `feat` and breaking commits. The owner
wants the first published tag to be `v0.1.0`, then ordinary Semantic Versioning
from that tag onward. Manifests are parked on `0.1.0-beta` until that cut.

## Decision

1. The first cut is forced: `pnpm release --version 0.1.0` (and the matching
   tag `v0.1.0`). The empty `0.2.0-rc` changelog heading is removed; historical
   `0.1.0-beta` entries stay as history only.
2. `scripts/release` accepts `--version <x.y.z[-prerelease]>` so a plan can
   override the derived bump once. Without the flag, the version stays a
   function of the commits since the newest tag (ADR 127 / ADR 130).
3. After `v0.1.0` exists, every later release is derived: `fix` -> patch,
   `feat` -> minor, `!` / `BREAKING CHANGE` -> major.
4. ADR 097 is superseded on the release target it named.

## Consequences

`rule_tool_update` follows release tags; the first tag clients can land on is
`v0.1.0`. Forcing a version is an explicit escape hatch for the first cut, not
the default path.

## What would end this

Shipping a different first tag, or moving releases to a pipeline that never
accepts an override.
