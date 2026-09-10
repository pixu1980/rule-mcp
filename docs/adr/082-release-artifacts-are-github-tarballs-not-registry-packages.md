# 082: Release artifacts are GitHub tarballs, not registry packages

- **Date**: 2026-09-10
- **Status**: accepted
- **Tags**: registry, release
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

OSS-11: the release workflow publishes nothing but a GitHub Release with a changelog excerpt - no build job, no artifact, no checksum, no provenance. The artifact the project actually ships is the GitHub tarball, which is unverified and unsigned. Interview decision D4 keeps distribution on git-clone plus installer.

## Decision

Release artifacts are signed GitHub Release tarballs, not registry packages: the pipeline packs the tarball, checksums it with SHA256SUMS, installs it from scratch to prove it, and attaches both files to the GitHub Release.

## Consequences

release.yml grows build/verify/release jobs; the tarball plus SHA256SUMS are the shippable unit and the documented verify path; npm distribution stays out of scope so OSS-4 remains a documentation fix.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Publish to npm and ship the registry tarball (rejected: distribution stays git-clone plus installer per D4; the package name is unclaimed and publication is out of scope)
1. Keep the changelog-only release (rejected: the v1.0.0 release is an excerpt with no verifiable artifact - OSS-11)
