# simplicity plan

- **Role**: simplicity v2
- **Date**: 2026-09-07

Steps re-derived from the open findings in [the review](../reviews/simplicity.md) on every run, worst
first. This file is deleted by the run that finds nothing open.

## Steps

| Step | Finding | Severity | What it takes |
| --- | --- | --- | --- |
| 1 | SIMP-1 | high | Delete `scripts/fix/blank-lines/` outright (181 lines, 3 modules). Nothing references it; `scripts/fix/self-guardrails/` implements the same four rules with wider coverage (one-liner splitting on top) and is the copy that was dry-run-verified against 277 files. Deletion is the whole step: `git rm -r scripts/fix/blank-lines` plus dropping its three lines from the fourth-pass note in docs/plans/execution-plan.md. |
| 2 | SIMP-2 | medium | Replace `copyRecursive` + `shouldExclude` in `scripts/build/embed-skills/index.mjs` with one `cpSync(src, dest, { recursive: true, filter })` call (~30 lines -> ~6); keep the exclusion list as the filter body. Verify with `pnpm prebuild` producing an identical embedded tree (`diff -r` before/after). |
| 3 | SIMP-3 | low | Extract the tracked-files driver shared by `fix/self-guardrails/index.mjs` and `fix/prose/index.mjs` into `scripts/fix/_tracked.mjs`: `trackedFiles(patterns)` (git ls-files --cached --others --exclude-standard) and `fixFiles(files, fix, { dryRun })` (read, fix, conditional write, per-file log, count). Two callers exist today and the loops are behavior-identical, so the abstraction is paid for; do not force the 9 one-line argv parsers into it - that duplication is cheaper than the helper. |
| 4 | SIMP-4 | low | Point the two inline `execFileSync("git", ...)` wrappers at the one `build/changelog/_history.mjs` already exports - or, simpler, fold the ls-files call into step 3's `trackedFiles()` so the fix scripts no longer need a git wrapper at all. Rides along with step 3. |
| 5 | SIMP-5 | info | Outside scripts/ (recorded for the next src pass): converge the two `looksLikeJson` copies - `src/core/text/_caveman-line.js` and `src/core/text/fingerprint/_rewrite-line.js` - on one export under `src/core/text/`, imported by both. Same body, same contract; two copies only because each legacy monolith carried its own. |

## Dependencies

- Step 1 is independent and first: delete before deduplicating, so nothing is unified into a corpse.
- Steps 3 and 4 are one commit (the `_tracked.mjs` extraction removes both duplications).
- Step 2 is independent; gate it on a byte-identical `pnpm prebuild` output.
- Step 5 belongs to a src-side pass, not this scripts pass - kept here so it is not lost.

## Deliberately not proposed

- A shared argv-parsing helper for the 9 scripts: each parser is 1-3 lines, the flags differ
  per script, and the abstraction would cost more than the duplication it removes.
- Unifying the three markdown `table()` renderers (census, review docs, tui): different
  escaping contracts and different owners; the duplication is cheaper than the wrong
  abstraction.
