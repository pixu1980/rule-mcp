# simplicity plan

- **Role**: simplicity v2
- **Date**: 2026-09-07

Steps re-derived from the open findings in [the review](../reviews/simplicity.md) on every run, worst
first. Mark an executed step or sub-step with `[x]` - the next sync keeps the mark while its
finding stays open. This file is deleted by the run that finds nothing open.

## Scope

Every script under `scripts/` at any depth (43 modules, 2572 lines measured in
[the audit](../audits/simplicity.md)): deduplicate helper functions and redundancies,
delete what nothing references, and keep the duplication that is cheaper than the
abstraction that would replace it.

## Steps

- [x] **Step 1 - SIMP-1 (high)**: Delete `scripts/fix/blank-lines/` outright (181 lines, 3 modules) - a second, unwired implementation of the four blank-line rules `scripts/fix/self-guardrails/` already fixes with wider coverage and a 277-file dry-run verification behind it. Deletion is the feature.
  - [x] **1.1**: Re-verify it is still unreferenced right before deleting: `grep -rn "blank-lines" package.json .githooks .github docs src tests --include="*.{json,yml,mjs,js,md}"` must return only the unrelated guardrail rule id `js-blank-lines-blocks` in test fixtures.
  - [x] **1.2**: `git rm -r scripts/fix/blank-lines`.
  - [x] **1.3**: Drop its mention from the fourth-pass note in `docs/plans/execution-plan.md` (the "blank-lines, cache-similarity, post-process, prose each shed one module" line no longer names it).
  - [x] **1.4**: Gate: `node scripts/fix/self-guardrails/index.mjs --dry-run` still reports its 277-file count, `pnpm test:foundations` green, `bash -n scripts/install.sh` untouched.
- [x] **Step 2 - SIMP-2 (medium)**: Replace the hand-rolled recursive copy in `scripts/build/embed-skills/index.mjs` (`copyRecursive` + `shouldExclude`, ~30 lines) with node 20's `fs.cpSync`.
  - [x] **2.1**: Snapshot the current output for the parity gate: `pnpm prebuild` then `cp -R <embed target> /tmp/embed-before` (the audit names the target the script writes).
  - [x] **2.2**: Rewrite the copy as one call: `cpSync(src, dest, { recursive: true, filter: (source) => !shouldExclude(basename(source), statSync(source).isDirectory()) })`, keeping `shouldExclude` as the single exclusion table; delete `copyRecursive`.
  - [x] **2.3**: Gate: `pnpm prebuild` again and `diff -r /tmp/embed-before <embed target>` empty - byte-identical tree; `node --check` on the script.
- [x] **Step 3 - SIMP-3 (low)**: Extract the tracked-files fixer driver duplicated between `scripts/fix/self-guardrails/index.mjs:30` and `scripts/fix/prose/index.mjs:39` (git ls-files + read + fix + conditional write + count report, ~25 lines each). Two behavior-identical callers pay for the abstraction; the 9 one-line argv parsers stay out of it on purpose.
  - [x] **3.1**: Create `scripts/fix/_tracked.mjs` exporting `trackedFiles(patterns)` (`git ls-files --cached --others --exclude-standard <patterns>`, split, filter empty) and `fixFiles(files, fix, { dryRun, skip })` (read with `errors` tolerance, apply, write when changed and not dryRun, per-file log line, return the touched count).
  - [x] **3.2**: Rewrite `self-guardrails/index.mjs` on top of it: keep its `fix()` pipeline and `--dry-run` flag, drop the inline driver.
  - [x] **3.3**: Rewrite `prose/index.mjs` on top of it: keep `TRACKED`/`SKIP` from `_targets.data.mjs` (SKIP becomes the `skip` predicate), keep `--apply` semantics (default dry).
  - [x] **3.4**: Gate: `node scripts/fix/self-guardrails/index.mjs --dry-run` and `node scripts/fix/prose/index.mjs` report the same file counts as before the extraction; `pnpm clean:prose` still wired.
- [x] **Step 4 - SIMP-4 (low)**: Fold the triplicated bare `execFileSync("git", ...)` wrapper (`build/changelog/_history.mjs` exports one; self-guardrails and prose inline theirs) into step 3's `trackedFiles()` so the two fix scripts no longer need a git wrapper at all; changelog keeps its exported `git()` as the one general-purpose copy.
  - [x] **4.1**: After 3.2/3.3, `grep -rn 'execFileSync("git"' scripts` must list exactly two files: `_tracked.mjs` and `build/changelog/_history.mjs`.
  - [x] **4.2**: Rides along with step 3's commit.
- [x] **Step 5 - SIMP-5 (info)**: Outside scripts/ (recorded for the next src pass, not this one): converge the two `looksLikeJson` copies - `src/core/text/_caveman-line.js` and `src/core/text/fingerprint/_rewrite-line.js` - on one export.
  - [x] **5.1**: Move the function to a shared `src/core/text/_json.js` (or fold into an existing text utility), import it from both call sites; identical body, identical contract.
  - [x] **5.2**: Gate: `node --test tests/core/caveman.test.mjs tests/core/caveman-efficacy.test.mjs tests/core/fingerprint.test.mjs` and `tests/docs/import-paths.test.mjs` green.

## Dependencies

- Step 1 is independent and first: delete before deduplicating, so nothing is unified into a corpse.
- Steps 3 and 4 are one commit (the `_tracked.mjs` extraction removes both duplications).
- Step 2 is independent; gated on a byte-identical `pnpm prebuild` output.
- Step 5 belongs to a src-side pass, kept here so it is not lost.

## Deliberately not proposed

- A shared argv-parsing helper for the 9 scripts: each parser is 1-3 lines, the flags differ
  per script, and the abstraction would cost more than the duplication it removes.
- Unifying the three markdown `table()` renderers (census, review docs, tui): different
  escaping contracts and different owners; the duplication is cheaper than the wrong
  abstraction.
