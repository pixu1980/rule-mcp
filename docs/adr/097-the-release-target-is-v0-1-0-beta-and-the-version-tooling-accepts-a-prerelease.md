# 097: The release target is v0.1.0-beta, and the version tooling accepts a prerelease

- **Date**: 2026-09-15
- **Status**: superseded
- **Tags**: release, versioning, changelog, workflow
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

> Superseded by [ADR 133](133-first-release-is-v0-1-0-then-semver-from-commits.md) on the
> release target: the first published tag is `v0.1.0`, not `v0.1.0-beta`. The
> tooling still accepts a prerelease suffix when one is forced.

## Context

ADR 085 reset the version to 0.1.0 and named v0.1.0 as the first release. The develop branch retargeted the same release to v0.1.0-beta and taught the release workflow to publish a hyphenated tag as a prerelease. Both are now in one tree, and the manifests, the changelog heading and the release workflow have to agree on one answer. Two pieces of tooling assumed the plain form: scripts/build/version/index.mjs validated --apply against /^\d+\.\d+\.\d+$/ and refused 0.1.0-beta, and the changelog generator groups commits by git tag, so with no tag it writes only an [Unreleased] section and the version gate finds no release heading to compare.

## Decision

The version is 0.1.0-beta in package.json, server.json, both packaging manifests and the newest CHANGELOG heading. The release workflow marks a tag containing a hyphen as a prerelease and a plain tag as a stable release. scripts/build/version/index.mjs accepts an optional prerelease suffix in --apply. The changelog section carries the release name rather than [Unreleased], because the version gate reads the newest release heading and the generator only writes one once the tag exists.

## Consequences

ADR 085 is superseded on the version it names; its reasoning about resetting away from v1.0.0 stands. Running `pnpm changelog` before a tag exists rewrites the heading back to [Unreleased], so the release procedure is changelog first, then version --apply, then tag - the order the workflow already uses. A future stable release needs no tooling change: a plain tag validates and publishes as latest.

## What would end this

Publishing to a registry that rejects prerelease identifiers, or a decision to cut v0.1.0 directly without a beta.

## Alternatives Considered

1. Keep 0.1.0 and drop the prerelease workflow (rejected: the beta is the release the project is actually cutting, and the workflow change is three lines)
1. Leave the changelog on [Unreleased] and relax the version gate (rejected: the gate is what catches a manifest that drifted, and weakening it to fit one release costs more than naming the section)
