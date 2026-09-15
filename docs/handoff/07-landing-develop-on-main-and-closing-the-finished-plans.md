# Session handoff 07 - Landing develop on main, and closing the finished plans

- Branch: `main`
- Covers: `964a32b0..c33c9e46` (84 commits landed by fast-forward)
- Date: 2026-09-15
- Decisions: ADR 097, ADR 098, ADR 099, ADR 100

## What happened

Phase 7 of `docs/plans/develop-consolidation.md`, then the closeout of the plans
that had finished.

**The landing.** `merge/develop-into-main` was verified against `main` before
being merged: the 19 OSS-layer files (LICENSES, REUSE.toml, GOVERNANCE,
CODEOWNERS, the four hardened workflows, the generator scripts) and the
`develop` work (personas/, the guardrails now living inside the skills, the
TokenSave adapter, `scripts/alias-hook.mjs`, the pinned tool surface) were all
present in the tree. `git merge --ff-only` took `main` to `c33c9e46` and the
push was a fast-forward: `964a32b0..c33c9e46`. No force, no rebase, no history
rewrite.

**One gate the fork had broken.** `pnpm lint` was red on 1493 sites across 760
files, all of them `unicorn/single-line-block-comment-style`. The cause is the
dependency the merge carries: `eslint-plugin-unicorn` 74 adds that rule to its
recommended set with the `multiline` default, while 72 had no such rule. Of the
1493 sites, 1414 are one-line JSDoc comments - the house style - and none is an
`eslint-disable*` directive or a coverage-ignore comment, so the fix pins the
rule to `single-line` in `eslint.config.mjs` instead of reformatting the tree.
That is commit `c33c9e46`, the only commit this session adds on top of the
merge.

**The realignment.** `develop` was reset onto `main` (`git branch -f develop
main`) and pushed as a fast-forward, because the `develop` tip the fork carried
was an ancestor of the merge: `3dae3a31..c33c9e46`. `develop` therefore stays
alive as the integration branch ADR 098 describes. `merge/develop-into-main`
is deleted and `.merge-notes/` is gone.

## Gates

Run fresh on the landed tree before the push, not read from `.merge-notes/`:

| Gate                           | Result                                                   |
| ------------------------------ | -------------------------------------------------------- |
| `pnpm lint`                    | 0 errors, 36 warnings (budget 50)                        |
| `pnpm test:all`                | 1734 pass, 0 fail, 3 skipped                             |
| `pnpm test:coverage`           | branches 91.03% against a floor of 91                    |
| `pnpm format`                  | clean                                                    |
| `pnpm census:check`            | census is current                                        |
| `tests/docs/*`                 | 58 pass (docs-accuracy, repository-contract, workflow-*) |
| `src/core/guardrails/__test__` | 35 pass                                                  |
| `pnpm audit:gate`              | no known vulnerabilities in production dependencies      |

`rule_tool_check` on the `eslint.config.mjs` change: 59 of 59 guardrails pass.

## Closing the finished plans

ADR 087 says a completed working paper folds into one ADR and leaves the tree
on session close. Two plans were finished:

- `docs/plans/develop-consolidation.md` - 53 resolved checks, all phases 0 to 7
  executed. Archived by `rule_tool_process_handoff` in close-session mode, which
  deleted the source and regenerated the ADR index.
- `docs/plans/tokensave-integration.md` - milestones M0 to M8 each stamped
  `Status: **done**` with its commit, from `d4521b5` to `f38b003`. Its tracking
  is prose (`Status: **done**`), not checkboxes, so `planDone()` in
  `src/tools/handoff/_closeout.js` cannot see it; it was archived as ADR 100
  through `rule_tool_process_adr` instead, and its five open design questions
  were carried into that ADR's alternatives rather than left only in git
  history.

Four plans stay, deliberately, because they are not finished:

- `docs/plans/oss.md` - steps 7, 8, 9, 10, 16, 22, 23, 27, 29 and 30 carry the
  code but are still unmarked, and step 2 waits on the owner enabling Private
  Vulnerability Reporting. Marking a step done before the owner action and the
  CI observation that closes it would be a lie in the record.
- `docs/plans/architect.md` - a fresh audit, nothing executed.
- `docs/plans/github.md` - the owner's GitHub admin checklist, all open. It is
  written in Italian, so the ADR English gate would skip it and keep the file
  anyway.
- `docs/plans/backlog.md` - the queue is empty; it is a standing queue with its
  Done record, not a finished plan.

The ADR index was regenerated with `updateAdrIndex` after ADR 100 was renamed
to a slug that is not truncated, and every link in `docs/adr/ADR.md` was checked
to resolve to a file that exists.

## Closeout

- Archived `docs/plans/develop-consolidation.md` -> ADR 099
  (`099-close-out-plan-develop-consolidation.md`); source file deleted.
- Archived `docs/plans/tokensave-integration.md` -> ADR 100
  (`100-the-tokensave-integration-closes-out-and-the-adapter-is-the-code-graph-layer.md`);
  source file deleted.

## Open items

- The `nul` artifact: `src/cli/daemon/_windows-service.js` shells out to
  `sc query "<name>" 2>nul`, so a POSIX run writes a 31-byte file named `nul`
  into the working directory. `_service-templates.test.mjs` avoids the Windows
  arm for that reason. It was removed for the landing and returns on every full
  test run; the shell-out itself needs a look.
- `docs/plans/oss.md` marks are stale against the landed code (see above).
- ADRs 099 and 100 land as `accepted` with no owner review of their text.

## Commits

| Commit     | Subject                                                 |
| ---------- | ------------------------------------------------------- |
| `c33c9e46` | fix(lint): keep the house one-liner block comment style |

The landing itself is a fast-forward, not a commit. The closeout ADR writes and
the plan deletions are committed with this handoff.

## Convention reminder

Every commit is `type(scope): subject` plus a DCO `Signed-off-by` trailer. The
`commit-msg` hook rejects a scope-less message.
