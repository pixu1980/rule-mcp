# 147: Never install commit hooks into a machine-wide core.hooksPath

- **Date**: 2026-10-18
- **Status**: accepted
- **Tags**: git, hooks, governance, security
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The commit-governance installer detects a project's hook mechanism. It read `core.hooksPath` with `git config --get`, which also returns a value set in the user's global or system config. On a machine whose `~/.config/git/config` sets `core.hooksPath = ~/.config/git/hooks`, installing governance in any repository without its own `.githooks/` therefore wrote the `commit-msg` and `pre-push` shims into that shared directory and kept `.rule-backup` copies of whatever was there. The effect was observed on 2026-10-18: the shared hooks were rewritten, and every commit in every unrelated repository started going through this project's `commit-lint`, which rejects any subject that is not `type(scope): subject`. A second, quieter symptom was that the docs-numbering-doctor fixtures committed with `git commit -m first` in a temp repository and so passed inside the suite while failing on their own, because they inherited the user's hooks path instead of a private config.

## Decision

The installer reads `core.hooksPath` with `--local`, so only a setting the repository itself carries is treated as that project's mechanism. A global or system value is ignored and the installer falls back to git's own hooks directory, which `git rev-parse --absolute-git-dir` resolves per repository. Hooks a project owns live in `.githooks/` or in the directory it configured itself; the user's shared directory is never a target. Fixtures that create a repository set a private global config (`GIT_CONFIG_GLOBAL` pointing at an empty file, `GIT_CONFIG_NOSYSTEM=1`) so an ambient setting cannot decide whether a test passes.

## Consequences

Positive: an install can no longer reach outside the repository it was asked to govern, and no `.rule-backup` is written over a hook the user owns for every repository on the machine. A test pins the rule with a private global config that sets `core.hooksPath` and asserts the directory stays empty and the gate lands in `.git/hooks`. The docs-numbering-doctor fixture passes alone, not only inside the suite. Negative: a user who deliberately configures `core.hooksPath` globally and expects this installer to honour it now gets git's own hooks directory instead; that is the intended trade, since the global setting is the person's and not the project's.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep `--get` and add a containment check that refuses any target outside the repository's git directory, as `scripts/install/git-hooks/index.mjs` does. Rejected as the primary rule because it still reads the machine's setting and would move a global hooks path into an error the user cannot act on.
1. Keep `--get` and refuse to install anything when the resolved path is outside the repository. Rejected for the same reason, with the added cost of leaving a project with no gate at all.
1. Ask the user at install time whether to adopt the global directory. Rejected: an installer that needs an answer for a case the user never intended is a worse default than ignoring a machine-wide setting.
