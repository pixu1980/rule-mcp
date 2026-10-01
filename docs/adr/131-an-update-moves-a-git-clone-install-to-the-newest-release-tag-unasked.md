# 131: An update moves a git-clone install to the newest release tag, unasked

- **Date**: 2026-10-01
- **Status**: accepted
- **Tags**: update, release, install
- **Author**: Emiliano Pisu <emiliano.pisu@pixu1980.com>

## Context

With `pnpm release` cutting tags (ADR 130) there is a better unit than a
commit for what an update moves to. A development machine left on an old
release is the failure this removes.

## Decision

After the fetch (now `-p -P`, so a withdrawn tag is never read as newest),
`releaseState` compares the highest `v*` tag merged into `origin/main` with
the highest merged into HEAD, the manifest standing in before the first tag.
A newer one is applied by `applyUpgrade`: checkout main, pull `--rebase`, then
`scripts/reinstall.sh --keep-lock`. The default mode is upgrade;
`RULE_MCP_AUTO_UPDATE=notify` announces only. The automatic check applies
only on main and reports `not-on-main` otherwise; `rule_tool_update` and the
`update` CLI pass `explicit` and may switch the branch. Before a remote has
any tag, the upstream branch is still fast-forwarded.

## Consequences

A git-clone install follows release tags. The lock is kept so a release
installs what it pinned. A pull that stops on a conflict is left for a person.
npm and docker installs are unchanged.

## What would end this

If an automatic reinstall breaks a machine that a person then has to repair,
the default returns to notify and the upgrade stays one command away.
