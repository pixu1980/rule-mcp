# 022: Add pix-toolchain-commits skill for atomic conventional commits with mandatory scope

- **Date**: 2026-08-01
- **Status**: accepted
- **Tags**: taxonomy, skills, routing, git, toolchain
- **Author**: pix-architect

## Context

Commit/push prompts had no dedicated skill: the router sent them to pix-devops-version (version automation) or pix-toolchain-husky (hooks tooling), and the mandatory "atomic conventional commits with scope" rule existed only as a mention inside pix-process-feature-workflow and as a repo-local hook in pix-galaxy-mcp. The taxonomy groups mechanical repo conventions under pix-toolchain (husky/commitlint, project config), so the convention itself belongs there.

## Decision

Add a dedicated skill `pix-toolchain-commits` (tool `pix_toolchain_commits`) in the pix-toolchain group that enforces atomic Conventional Commits with a MANDATORY scope on every commit/push, and add a git domain classification to the router so any prompt mentioning commit/push/conventional deterministically routes to it. Enforcement is made mechanical via commit-msg/commitlint hooks documented in the skill.

## Consequences

Positive: commit/push prompts now deterministically route to pix-toolchain-commits; the rule (scope mandatory, atomicity) becomes a first-class skill in the same group as the hook tooling it depends on (pix-toolchain-husky); version automation in pix-devops-version remains downstream consumer. Negative: skills count grows by one; prompts with weak "commit" mentions are guarded against misrouting by requiring the signal to outweigh other domains (e.g. "commit button" stays frontend).

## Alternatives Considered

1. pix-process group (rejected: process skills are lifecycle procedures — ADR/review/docs/handoff — not mechanical repo rules; a blocking convention would only apply if the workflow skill is read)
1. pix-devops group (rejected: devops-version consumes commit messages for bumps; the convention is upstream of that automation)
1. No new skill, only routing tweak to pix-toolchain-husky (rejected: husky covers hook tooling, not the convention/atomicity/push discipline itself)
