# 130: This server releases itself with pnpm release, and the push is the release

- **Date**: 2026-10-01
- **Status**: accepted
- **Tags**: release, versioning, git
- **Author**: Emiliano Pisu <emiliano.pisu@pixu1980.com>

## Context

The repository already derives the next version and the changelog from the
commit rule (ADR 127) but had no single command that cut the tag. A manual
`pnpm release` that plans, regenerates, checks, commits and pushes is the
missing half.

## Decision

`scripts/release` plans then applies. The plan fetches origin with tags and
refuses, all at once, a branch other than main, uncommitted tracked changes, a
main behind origin/main, a range with nothing to release, and a tag that
already exists. The apply stamps the version (package.json, server.json,
CHANGELOG heading), regenerates the census, writes the changelog with the new
version as the heading of the untagged commits, runs `pnpm run ci`, commits
`chore(release): vX.Y.Z`, tags it annotated, and pushes main and the tag with
`git push --atomic`. `--dry-run` stops at the plan, `--no-checks` skips ci,
`--no-push` stays local.

## Consequences

Tags become the release record `rule_tool_update` reads. The run fails closed:
any failing step stops before the commit.

## What would end this

If releases move to a protected main that only merge requests reach, the push
becomes a merge request and the tag is cut by the pipeline.
