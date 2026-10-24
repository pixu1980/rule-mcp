# 02 - OSS audit, review and remediation plan

- **Date**: 2026-09-10
- **Branch**: `perf/meta-surface`
- **Commit range**: `58652b7e..860cbbb6` (2 commits, none pushed)
- **Documents**: `docs/audits/oss.md`, `docs/reviews/oss.md`, `docs/plans/oss.md`

## What was produced

Ran the `oss` persona (ADR 079, added one commit earlier in `58652b7e`) end to
end: audit, review, plan. There was no prior `docs/reviews/oss.md` to derive
from - it was deleted in `7a73f6a0` - so the audit was conducted fresh against
the tree rather than against an older finding list.

| Document              | Shape                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `docs/audits/oss.md`  | Evidence only: 29 rows of command and result, plus files read and sources consulted              |
| `docs/reviews/oss.md` | 31 findings, worst first: 4 critical, 12 high, 12 medium, 2 low, 1 info                          |
| `docs/plans/oss.md`   | 6 phases, 31 steps, 158 numbered sub-steps, plus decisions, owner actions and preserved controls |

The bookkeeping - headers, tables, statuses, checklist marks - came from
`rule_tool_plan_docs`. Evidence, finding wording and step detail were written by
hand on top of it.

## The four critical findings

1. **OSS-1** - three packaging manifests name three different GitHub owners.
   scoop says `github.com/rule`, winget says owner `rule-mcp` with `github.com/rule`,
   Homebrew says `github.com/rule`. All three pin `0.1.0`, two carry a
   literal `PLACEHOLDER` hash, and all three point at a `v0.1.0` tag that does
   not exist. The owner is `pixu1980`.
2. **OSS-2** - `SECURITY.md` routes vulnerability reports to a public issue. No
   private channel, no contact, no SLA, no embargo window, no CVE step.
3. **OSS-3** - `server.json` claims the `io.github.rule-mcp` namespace while the
   GitHub owner is `pixu1980`. The registry validates namespace ownership
   against the publishing account, so the file is unpublishable as written.
4. **OSS-4** - README, its npm badge and `docs/01-getting-started.md` sell
   `pnpm add -g rule-mcp` as the recommended install. `npm view` returns
   E404.

Two of these were reproduced rather than inferred: `npm view rule-mcp`
returns E404, and installing the packed tarball fails with
`EUNSUPPORTEDPROTOCOL` because `"rule-mcp": "link:"` sits in
`dependencies` (OSS-5). That protocol error is also why the documented install
cannot work even against a registry.

## Interview decisions the plan is built on

| #   | Decision                                                                  | Consequence                                                                                                |
| --- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| D1  | License stays `MIT`                                                       | Step 17 adds SPDX headers; no relicensing, no contributor re-consent                                       |
| D2  | Copyright holder is `pixu1980`                                            | Step 18 rewrites one `LICENSE` line and adds `AUTHORS`                                                     |
| D3  | DCO inbound, no CLA                                                       | Step 5 adds a `Signed-off-by` check to hook and CI                                                         |
| D4  | Distribution stays git-clone plus installer; npm publication out of scope | Step 4 removes every npm claim, but keeps the global `rule-mcp` command documented from the local checkout |
| D5  | Documentation site built from scratch, deployed with GitHub Actions       | Step 27 adds the site; its URL replaces the placeholder host in step 11                                    |
| D6  | Explicit BDFL with a documented path to co-maintainers                    | Step 16 writes the model down and adds `CODEOWNERS`                                                        |
| D7  | Contributor Covenant 3.0                                                  | Step 14 adopts the text verbatim                                                                           |
| D8  | Funding is GitHub Sponsors                                                | Step 25 adds `FUNDING.yml` and the policy text                                                             |
| D9  | MCP registry identity is the GitHub owner, not a claimed brand            | Step 3 rewrites `server.json` to `io.github.pixu1980/rule`                                                 |

## Bugs the work surfaced

**OSS-31**, found while validating this session's own output.
`rule_tool_plan_docs` writes Markdown that the repository's own Prettier gate
rejects. Immediately after the generator wrote the trio:

```
pnpm exec prettier --check docs/audits/oss.md docs/reviews/oss.md docs/plans/oss.md
[warn] Code style issues found in 3 files. Run Prettier with --write to fix.
```

The same command reports `All matched files use Prettier code style!` for the
repository's other generated Markdown (`docs/adr/ADR.md`, `docs/README.md`,
`README.md`), so the gate is sound and the generator output is what fails it.
`src/core/review/docs/_table.js` writes rows as `| a | b |` with no column
padding, while `package.json` `format` runs
`prettier --check '**/*.{js,mjs,json,md}'`. `tests/docs/review-docs/` holds
`gate`, `plan-checklist` and `sync` tests but none asserts the rendered output
is Prettier-clean. Every persona run therefore leaves the `lint` job red until
someone runs `pnpm format:fix`, and the next generator run undoes it. This
session ended by running `format:fix`, which is the workaround, not the fix.

## Verification

All four held at the end of the session:

- `rule-mcp-styleguide-english` on the three documents: `allPass: true` (59/59 each)
- `rule-mcp-styleguide-markdown` on the three documents: `allPass: true` (59/59 each)
- `pnpm exec prettier --check` on the three documents: clean
- `node --test tests/docs/*.test.mjs`: 20/20 pass

Both guardrail runs went through `checkCodeGuarded` directly, the same engine
`rule_tool_check` uses, rather than through the tool surface.

## Open items for the next session

- Nothing is fixed yet. The plan is written; no step has been executed. Step 1
  is the only one with no blocker.
- Phase 0 is entirely owner actions in the GitHub UI and cannot be closed by a
  code change. Nine of them are listed together in the plan's "Owner actions in
  one list" section; five of those block later steps.
- OSS-1, OSS-3 and OSS-4 all trace back to the same root cause - documentation
  and manifests written before the distribution model was settled. Fixing them
  in step order matters: step 3 rewrites `server.json`, and step 4 is what
  makes the install instructions true.
- The `link:` self-dependency (OSS-5) is a one-line fix in `package.json` but
  is sequenced at step 12 because the tarball it breaks is what step 6
  introduces.
- `docs/plans/execution-plan.md` was removed in this session's second commit.
  It was a fully executed plan ("All five phases executed. Plan complete.")
  and the repo convention in `docs/07-engineering-guides.md` is that executed
  plans are deleted. Note that the deletion appeared in the working tree
  between turns and was not made by this session's code: `syncRoleDocs` only
  ever deletes `docs/plans/<role>.md`.

## Contract reminders

- Conventional Commits with a mandatory scope, always: `type(scope): subject`.
  The `commit-msg` hook rejects a scope-less subject. This session used
  `docs(oss)` and `docs(plans)`.
- Two commits are sitting local and unpushed. Nothing was pushed.
- `docs/plans/oss.md` is the plan of record; re-deriving it by hand is what
  `rule_tool_plan_docs` exists to avoid. If the trio is regenerated, the
  hand-written evidence, roadmap and decision tables are lost and must be
  re-applied.

## Commands that verify the state

```bash
git log --oneline 58652b7e..860cbbb6          # the two commits this handoff covers
pnpm exec prettier --check docs/audits/oss.md docs/reviews/oss.md docs/plans/oss.md
node --test tests/docs/*.test.mjs             # 20/20
grep -cE '^\| OSS-' docs/reviews/oss.md       # 31 findings
grep -cE '^- \[ \] \*\*Step ' docs/plans/oss.md   # 31 steps
```
