# 085: Reset the project version to 0.1.0, first release will be v0.1.0

- **Date**: 2026-09-10
- **Status**: superseded
- **Tags**: release, versioning
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

> Superseded by [ADR 097](097-the-release-target-is-v0-1-0-beta-and-the-version-tooling-accepts-a-prerelease.md) on the version it names: the first release is v0.1.0-beta.

## Context

The tree says 1.0.0 everywhere and carries tag v1.0.0, but no shippable artifact ever shipped under it (OSS-11) and the project is pre-1.0 in maturity. The owner decided the published version will be v0.1.0: reset the repo now and wait for the first real 0.1.0 release out of the Step 6 pipeline.

## Decision

Reset the project version to 0.1.0 in package.json, server.json (both version fields), the CHANGELOG release heading and the scoop/winget manifests with recomputed hashes. Delete tag v1.0.0 locally and on the remote. The first publish - npm or registry - will be v0.1.0.

## Consequences

package.json, server.json, CHANGELOG and the distribution manifests go back to 0.1.0 with recomputed hashes; tag v1.0.0 is deleted locally and remotely; the Step 26 placeholder question is settled (publish v0.1.0, no placeholder); the dangling GitHub Release v1.0.0 page needs owner deletion in the UI.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep 1.0.0 and publish v1.0.1 and later (rejected: 1.0.0 implies a stability the project has not earned, and no artifact ever shipped under it)
1. Publish a 0.0.0 placeholder now (rejected: owner decision is v0.1.0 for the first publish)
