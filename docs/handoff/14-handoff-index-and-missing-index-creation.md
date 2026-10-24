# Handoff: the handoff index, and a doctor that creates the indexes it finds missing

**Branch:** main
**Commits covered:** `056679fa..1ac5cac5` (5 commits)
**Date:** 2026-09-20

## Session Summary

Made `handoff doctor` own the whole document-repair half of the session
process. It already renumbered ADRs and handoffs and rebuilt
`docs/adr/ADR.md`; it did not build an index for the handoff family, and a
project whose index was absent read as clean because only a present file was
compared. The doctor now derives both indexes from the files on disk, creates
the one that is missing, and names the file it regenerated.

The root `HANDOFF.md` summary the old refresher rewrote is retired: it shared
its name with the new `docs/handoff/HANDOFF.md` index while holding something
else, and two artifacts under one name cannot be told apart.

A dependency refresh was already sitting in the working tree, uncommitted and
breaking `pnpm lint` with the new unicorn rules. It landed here with the lint
and format fixes it required, so the branch does not ship a red gate.

## Work Completed

### 1. The generated handoff index

- `src/tools/handoff/_handoff-index.js` (new): `listExistingHandoffs` reads
  every `NN-slug.md`, `buildHandoffIndex` renders the table newest first, and
  `updateHandoffIndex` writes it. Handoff headings drifted through three shapes
  (`NN - topic`, `Session handoff NN - topic`, `Handoff: topic`) before the
  format settled, and the reader parses all three rather than rewriting history.
- `src/core/docs-numbering/_index-state.js`: `isHandoffIndexStale`,
  `isHandoffIndexUnordered`, and the ADR twins, now share one implementation.
  A family with documents and no index is stale by definition; a family whose
  directory is absent is left alone.
- `src/core/docs-numbering/_apply.js`: `regenerateAdrIndex` and
  `regenerateHandoffIndex` create the file when it is missing, and
  `applyRenumber` returns `handoffIndexRegenerated` alongside
  `indexRegenerated`.
- `src/core/docs-numbering/_plan.js` and `_render.js`: the plan carries both
  families' flags, and the report names the file that is behind.
- `src/core/text/_markdown-table.js` (new): the prettier-exact table renderer
  moved out of the ADR index so both indexes format identically.

### 2. The root summary retires

- `src/tools/handoff/_refresh.js` and its test are deleted, the barrel no
  longer exports them, and `src/cli/_register-handoff.js` no longer refreshes a
  root `HANDOFF.md`. The doctor's index regeneration replaces it.

### 3. Tests

- `tests/docs/docs-numbering-doctor/handoff-index.test.mjs` (new) and a
  `seedHandoffs` fixture: the reader parses all three header shapes, a missing
  index is planned, applying creates it newest first, an out-of-order index is
  rebuilt, and a project without `docs/handoff/` gets nothing.
- `apply.test.mjs`: a missing `docs/adr/ADR.md` is now created, not skipped.
- `src/tools/handoff/__tests__/_renumber.test.mjs`: the "clean project" fixture
  now carries a matching index, because a family with documents and no index is
  no longer clean.

### 4. The pending dependency refresh

- `chore(deps)`: eslint 10.10 to 10.11, eslint-plugin-unicorn 75 to 76, jsdom
  30.0 to 30.1, prettier 3.9.6 to 3.9.8, the MCP inspector 2.6 to 2.7. The
  unused `@modelcontextprotocol/server` devDependency is dropped.
- `style(eslint)`: the 35 errors unicorn 76 turns on across 32 files, rewritten
  mechanically.
- `style(format)`: the nine files prettier 3.9.8 reformats.

## Verification

| Gate                                      | Result                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `scripts/ci/run-tests/index.mjs all`      | 1804 tests, 1800 pass, 3 skipped, 1 fail (pre-existing environment issue, see below) |
| `pnpm exec eslint bin/ src/ tests/`       | 0 errors, 36 warnings (cap 50)                                                       |
| `pnpm exec prettier --check '**/*'`       | all files match                                                                      |
| `node -e "node --check"` over `bin` `src` | clean                                                                                |
| version script `--check`                  | 0.1.0-beta in sync (4 places)                                                        |
| `handoff doctor` at the tip               | clean: 108 ADRs, 14 handoffs, both indexes current                                   |
| ADR 108 author gate                       | `rule_tool_process_adr` wrote the file and regenerated `docs/adr/ADR.md`             |

The one failing test is `src/cli/install/__tests__/_installer-stdio-path.test.mjs`.
It fails on this machine and not because of this branch: it hardcodes the
checkout at `~/Projects/rule-mcp` and looks for the global shim at
`~/Library/pnpm/bin/rule-mcp`, while the actual shim lives one directory
deeper and the checkout is elsewhere. `src/cli/install/` was not touched here.

## ADR Reference

- ADR 108: the handoff family gets a generated index, and the root `HANDOFF.md`
  summary retires.
- ADR 103: every handoff mode sweeps completed working papers, and
  `closeout: false` is the read-only run.

## Next Session

The process described for this session is now complete end to end: renumber,
rebuild both indexes, atomic scoped commits, ADRs from the commits, the handoff
document, and the index refresh. The next session can start from a clean tree.

Carried over: the install stdio-path test is environment-bound and still red on
this machine; it is unrelated to the document pipeline.

### Resume Prompt

next session opens with this block. Add path of this document and first step of next session before saving it.

```prompt
Resume work on rule-mcp. Run `rule_tool_process_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The handoff document is `docs/handoff/14-handoff-index-and-missing-index-creation.md`.
First step: decide whether to fix the environment-bound `_installer-stdio-path.test.mjs` (make it derive the checkout and the global shim path instead of hardcoding them), or pick the next open workstream from `docs/plans/`.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message.
```
