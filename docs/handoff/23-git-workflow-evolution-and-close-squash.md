# 23 - Git workflow evolution, WS0-WS9, and the close-squash consolidation

- **Branch**: `main`
- **Date**: 2026-09-29
- **Commit range**: `1704a0b4..5de53654` (13 commits)
- **Plan**: `docs/plans/mcp-git-workflow-evolution-plan.md`

## What this session did

Implemented the plan end to end (WS0 through WS9 plus section 20), then closed
the gap the developer raised in an interview: the close squash was leaving the
feature's ADRs and handoffs as their own commits.

### Commits

- `1c6dca49` docs(plan): the plan and the WS0 architecture map
- `b47261c1` refactor(case-studies): split the launcher under the file-size cap
- `4935cc40` fix(docs-site): tolerate a directory that vanishes while collecting markdown
- `58a17859` feat(git): the shared git foundation (WS1)
- `9b1a7cca` feat(commit): the one Conventional Commit rule and init git governance (WS3)
- `a369c236` feat(sync): the base-branch guard and the confirmed rebase (WS2)
- `eaa98508` feat(git): `/rule-git` audit, reword and linearize (WS4)
- `2a344c7e` feat(handoff): feature close and the range in the handoff (WS5 + WS6)
- `4b448c08` feat(release): derive the next version and gate the changelog (WS7 + WS8 + WS9)
- `42be49f7` feat(init): exact dependency pins (plan section 20)
- `be87ab1b` style(version): lint fixes in the version entry and its test
- `71fbaf32` feat(handoff): consolidate the feature ADRs and handoffs at the close squash
- `5de53654` chore(case-studies): app bookmark and architect artifacts (data, not code)

### Decisions (ADR 124-128)

- **124** - the tool-call host is a list, so self-update and the sync guard coexist.
- **125** - normalize the feature history on the merge base, and hold every rewrite to the tree invariant.
- **126** - close a feature with `reset --soft` onto the merge base and one validated commit.
- **127** - derive the next version and the changelog from the commit rule.
- **128** - the close squash consolidates the feature ADRs and handoffs into one document each.

### Surfaces added

- `src/core/git/` - runner, repository state, base-branch detection, feature range, freshness, working-tree safety.
- `src/core/commit/` - the one rule, the linter, the hook writer and the idempotent governance installer; CLI `commit-lint`.
- `src/core/sync/` - the branch-sync guard and `rule_tool_sync` (confirmed rebase only).
- `src/core/history/` - audit, reword, linearize, squash, and the document consolidation.
- `src/core/release/` - release-tooling detection and the exact-pin check.
- `rule_tool_git`, `/rule-git`, `/rule-handoff --close-feature --squash`.
- `scripts/build/version/index.mjs --next` / `--apply-next`; `scripts/build/changelog/index.mjs --check`; a CI `release-preview` job.

## Verification

- `pnpm test:all` -> exit 0, 2141 pass, 0 fail, 3 skip (the CI-equivalent suite).
- `pnpm census:check` current; `pnpm hooks:check` 3 installed and current; `version --check` in sync; `pnpm audit:gate` clean.
- End-to-end smoke of the close squash: 5 commits become 1, the merged ADR and
  handoff reproduce every original verbatim, both indexes are rebuilt, and only
  the planned document paths differ from the pre-squash tree.

## Known state, not fixed in this session

- `pnpm lint` is red with 22 errors and `pnpm format` with about 30 files. All
  are pre-existing and untouched here: the counts match `1704a0b4`.
- `changelog --check` reports stale in a clone with no tags; CI runs that gate
  only when tags define the boundary.
- The base-branch guard reads local refs. Remote updates need `rule_tool_sync fetch=true`.
- The handoff index `docs/handoff/HANDOFF.md` does not list this file yet; the
  next `handoff doctor` or `rule_tool_handoff` run rebuilds it.

## Continuation context

Nothing is blocked, and the plan has no open workstream. The natural next moves,
in order: fix the two pre-existing red gates (lint and format) or leave them by
decision; then decide whether WS9 should tag automatically, which was left
manual on purpose.

### Resume Prompt

```prompt
Resume work on rule-mcp from `docs/handoff/23-git-workflow-evolution-and-close-squash.md`.
Run `rule_tool_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The ADR log (124-128) and the plan record what was decided; do not re-ask answered questions.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message, and `pnpm hooks:check` says whether the hooks are installed.
First step: run `pnpm test:all` to confirm the close-squash consolidation still holds, then decide with the developer whether to fix the two pre-existing red gates (`pnpm lint` 22 errors, `pnpm format` about 30 files).
```
