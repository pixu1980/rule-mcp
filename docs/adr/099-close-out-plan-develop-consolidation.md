# 099: Close out plan develop-consolidation

- **Date**: 2026-09-15
- **Status**: accepted
- **Tags**: docs, closeout, plan
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The plan record docs/plans/develop-consolidation.md, "develop-consolidation plan", finished with 53 resolved items on 2026-09-15. It tracked landing every unique commit of develop onto main while keeping the OSS, legal and CI hardening main had built after the fork, then resetting develop onto main as an integration branch. It ran as one merge commit resolved by area over 213 conflicting paths, followed by phases 2 to 7 as ordinary commits. Measured on the landed result: 83 commits and 828 changed files ahead of the pre-merge main (964a32b0), test:all 1734 pass with 0 fail and 3 skipped, branch coverage 91.03 percent against a floor of 91, lint clean.

## Decision

Fold the record into this ADR and the session handoff, then delete the source file. The full text stays in git history. The decisions the consolidation carried are recorded by ADR 097 (the release target returns to v0.1.0-beta) and ADR 098 (develop merges into main by area, and stays as an integration branch).

## Consequences

docs/plans/develop-consolidation.md is gone from the tree; the handoff of this session names what it carried. main, origin/main, develop and origin/develop all point at c33c9e46, so develop is now an integration branch reset onto main after every merge rather than a parallel line of work. The merge also exposed one gate the fork had broken: eslint-plugin-unicorn 74 adds single-line-block-comment-style to its recommended set with the multiline default, which turned the lint gate red on 1493 sites, all of them one-line block comments; the fix pins the rule to single-line in eslint.config.mjs instead of reformatting the tree.

## What would end this

The assumption this leans on is that develop carries nothing but work that belongs on main. A commit on develop that main must not receive would make the reset wrong, and would need a branch of its own instead.
