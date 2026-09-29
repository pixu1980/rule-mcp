# 127: Derive the next version and the changelog from the commit rule

- **Date**: 2026-09-29
- **Status**: accepted
- **Tags**: release, git, workflow
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

WS8 asks that the version not be chosen by hand when the commits determine it. The repository already generated its CHANGELOG from Conventional Commits and enforced the same rule in the hooks, the pre-push gate and CI, but the next number was still typed by a person at tag time - the one step where the history already holds the answer.

## Decision

`scripts/build/version/index.mjs --next` derives the bump from the commits since the newest tag using the shared rule in `src/core/commit`: `fix` is PATCH, `feat` is MINOR, a `!` or a `BREAKING CHANGE:` footer is MAJOR, anything else does not bump, and the strongest wins. `--apply-next` writes it through the existing `--apply` path. A clone with no tags derives over all history, which is why CI runs `--next` as a preview and the changelog `--check` gate only when tags exist.

## Consequences

The version is a function of the history, computed by the same rule that gated the commits, so a version that disagrees with its commits cannot be produced by accident. The changelog renderer also stops carrying its own subject regex and reads the shared rule, which removes the last duplicate of the pattern outside the hooks. CI gains a release-preview job that prints the derived version and gates the changelog only when the boundary is defined; tag creation and the release stay on the tag-triggered path.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep choosing the version by hand and only check that the three copies agree - the drift the check catches is between files, not between the version and the commits
1. Adopt a release tool (semantic-release, changesets) - a new dependency and a second commit rule beside the one the hooks already enforce
1. Derive from the PR title instead of the commits - only works when every merge is a squash, and this repository keeps a linear history of real commits, not merge titles
1. Bump the major on any breaking footer anywhere in the log - a footer on an old, released commit would re-bump forever; the boundary has to be the newest tag
