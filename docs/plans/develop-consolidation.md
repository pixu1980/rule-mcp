# develop-consolidation plan

- **Role**: integration / release
- **Date**: 2026-09-15
- **Merge base**: `d8788ed08900d63031cfb582c971c70996836e11`
- **Working branch**: `merge/develop-into-main`
- **Goal**: land every unique commit of `develop` onto `main`, keep the OSS, legal and CI
  hardening `main` built after the fork, then reset `develop` onto `main` as an integration
  branch.

Mark an executed step or sub-step with `[x]`. Do not delete steps: a re-run reads the marks to
know where it stopped.

## Execution contract

Read this section before touching the repository. It is written for an executor with no prior
context.

1. **One phase at a time, in order.** A phase ends with its verification block. If verification
   fails, fix inside that phase; do not start the next one.
2. **Every phase after phase 1 ends in a commit.** The merge itself is a single mechanical
   commit produced in phase 1; phases 2 to 7 are normal commits on top of it. This keeps every
   step revertible.
3. **Commit format is enforced by a hook.** `type(scope): subject` plus a DCO trailer. Always
   commit with `git commit -s`. A commit without a scope or without `Signed-off-by:` is
   rejected by `.githooks/commit-msg`. Merge and revert subjects are exempt.
4. **Never invent.** Every file path, command and number in this plan was measured on
   2026-09-15. If reality disagrees with a stated fact, stop and report the difference instead
   of improvising.
5. **No force push, no rebase, no history rewrite** on `main` or on the working branch.
6. **`ours` means `main`, `theirs` means `develop`** for the whole document, because the merge
   is run from `main`.
7. Package manager is `pnpm` only. Never run `npm`.
8. **This file lives on `develop`, and phase 1 starts from `main`.** After `git switch main` it
   disappears from the working tree until the merge lands. Before starting, keep a copy outside
   the repository, or read it from the ref at any time with
   `git show develop:docs/plans/develop-consolidation.md`. Marks made on the copy must be
   written back into the tracked file once the merge is in (phase 4 onwards).

## Decisions this plan is built on

Taken from the owner in the interview that opened this run. A later run that reverses one of
these must re-derive every step that depends on it.

| #   | Decision                                                                               | Consequence in this plan                                                                                                                     |
| --- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Single merge commit `develop -> main`, resolved by area. No rebase, no thematic squash | Phase 1 resolves all 213 conflicting paths once, with scripted area rules. The 71 commits of `develop` stay readable in the graph            |
| D2  | `archive on close-session` keeps the `develop` implementation (`ba4ec03`)              | Phase 3 takes `src/tools/handoff/_closeout.js` from `develop` and ports only the `docs/02-product-architecture.md` line that `main` added    |
| D3  | The `main` ADR numbering is canonical. ADRs unique to `develop` are appended from 088  | No file already on `main` changes number. Phase 4 appends 9 ADRs and remaps 27 in-code ADR references that `develop` carries                 |
| D4  | The repository version is `0.1.0-beta`, from `develop`                                 | Phase 5 sets `package.json` and `server.json`, keeps the prerelease workflow from `d778312`, and writes a superseding ADR for `main` ADR 085 |
| D5  | `src/cli/setup/` comes from `develop`, with the git-hook step ported back from `main`  | Phase 3 takes the directory wholesale from `develop` and re-adds `_git-hook.js`, `_git-hook-apply.js` and their tests                        |
| D6  | Personas live in `personas/`. `personas/oss.md` is the `develop` "Open Source Steward" | Phase 3 accepts the `src/roles/ -> personas/` rename and drops `src/roles/oss.md`. `docs/{audits,reviews,plans}/oss.md` on `main` are kept   |
| D7  | The 8 test files `develop` deletes are ported into the skills that now own the rules   | Phase 2 moves them under `skills/*/guardrails/__tests__/` and rewrites their imports. Coverage is not allowed to drop                        |
| D8  | `develop` is not deleted: it is reset onto `main` and kept as the integration branch   | Phase 7 runs `git branch -f develop main` and force-updates the remote. No `archive/` tag is needed                                          |

## Facts sheet

Measured on 2026-09-15 with `git merge-tree --write-tree main develop`. Use these to confirm
the repository is in the state this plan assumes before starting.

| Fact                                                | Value                                                     |
| --------------------------------------------------- | --------------------------------------------------------- |
| Commits on `main` not on `develop`                  | 95                                                        |
| Commits on `develop` not on `main`                  | 71                                                        |
| Conflicting paths                                   | 213                                                       |
| Conflicts by type                                   | 96 content, 77 add/add, 40 modify/delete, 1 rename/delete |
| Files added on `main`, absent on `develop`          | 135                                                       |
| Files added on `develop`, absent on `main`          | 318                                                       |
| Commits duplicated across branches (different SHAs) | 6                                                         |
| Files with SPDX headers, `main`                     | 950                                                       |
| Files with SPDX headers, `develop`                  | 0                                                         |
| In-code ADR references, `develop`                   | 149                                                       |
| Distinct ADR numbers referenced by `develop` code   | 27 remappable, 2 develop-only                             |
| Tool surface, `main` README                         | 106 tools, 186 resources, 76 prompts                      |
| Tool surface, `develop` README                      | 109 tools, 188 resources, 154 prompts                     |

### The six duplicated commits

Present on both branches with different SHAs. They are the reason most `src/core/text/` and
`scripts/reports/` conflicts are add/add. No action is needed: a merge (unlike a rebase)
resolves them in one pass.

```
docs(perf): quote the measured compression and startup numbers, credit the source
docs(plan): mark steps 1-6, 8 and 9 executed and correct the level table by measurement
feat(installer): ask before copying bundled skills to the central agents dir
feat(resources): compress resource and prompt bodies, booked per surface
feat(text): four compression levels behind a structural guard
perf(cli): warm --help from 216 ms to 48 ms, measured not assumed
```

### The four duplicated features

Implemented twice, once per branch, with different code. Each has a decision above.

| Feature                  | On `main`                           | On `develop`                        | Decision        |
| ------------------------ | ----------------------------------- | ----------------------------------- | --------------- |
| Archive on close-session | `7dc90e3`, `_closeout.js` 133 lines | `ba4ec03`, `_closeout.js` 150 lines | D2              |
| Setup wizard             | `dbb3839`, 65 files, git-hook step  | `d3b8fd7` + 5 more, 60 files, newer | D5              |
| OSS persona              | `39a33d0`, `src/roles/oss.md`       | `b8d3557`, `personas/oss.md`        | D6              |
| Compression levels       | `70a2ab1` and 5 siblings            | `9e82936` and 5 siblings            | none, see above |

## Roadmap

Eight phases. A phase starts only when the previous one verified green.

| Phase | Title                         | Ends with                       |
| ----- | ----------------------------- | ------------------------------- |
| 0     | Preflight                     | no commit, a go/no-go           |
| 1     | Mechanical merge              | the merge commit                |
| 2     | Port what `develop` deletes   | one commit                      |
| 3     | Reconcile duplicated features | up to three commits             |
| 4     | Docs, ADR and handoff         | up to three commits             |
| 5     | Regenerate the derived files  | one commit                      |
| 6     | Gates                         | fix commits until green         |
| 7     | Land and realign `develop`    | `main` updated, `develop` reset |

---

## Phase 0 - Preflight

No repository change. This phase decides whether it is safe to start.

- [ ] **0.1** Confirm a clean tree and up-to-date refs.

  ```sh
  cd /Users/emilianopisu/Projects/pixu1980/ai/rule-mcp
  git status --porcelain          # must print nothing
  git fetch origin --prune
  git rev-parse main origin/main develop origin/develop
  ```

  `main` must equal `origin/main` and `develop` must equal `origin/develop`. If either differs,
  stop and report.

- [ ] **0.2** Confirm the merge base and the divergence still match the facts sheet.

  ```sh
  git merge-base main develop     # expect d8788ed08900d63031cfb582c971c70996836e11
  git rev-list --left-right --count main...develop   # expect "95  71"
  ```

  If the numbers differ, someone has pushed since this plan was written. Re-run the conflict
  survey in 0.3 and treat every file list in this document as indicative rather than exact.

- [ ] **0.3** Re-run the conflict survey and keep it for reference.

  ```sh
  mkdir -p .merge-notes
  git merge-tree --write-tree main develop > .merge-notes/merge-tree.txt 2>&1 || true
  awk 'f{print} /^$/{f=1}' .merge-notes/merge-tree.txt | grep '^CONFLICT' > .merge-notes/conflicts.txt
  wc -l .merge-notes/conflicts.txt        # expect 214 lines (213 paths + 1 file-location notice)
  ```

  `.merge-notes/` is scratch. Add it to `.git/info/exclude` so it never gets committed:

  ```sh
  echo '.merge-notes/' >> .git/info/exclude
  ```

- [ ] **0.4** Install the git hooks, so the commit gates run locally exactly as in CI.

  ```sh
  pnpm install
  pnpm hooks:install
  pnpm hooks:check
  ```

  `pnpm hooks:install` exists only on `main`. If it is missing, you are not on `main`.

- [ ] **0.5** Record the pre-merge baseline. Phase 6 compares against it.

  ```sh
  pnpm test:all      2>&1 | tail -30 > .merge-notes/baseline-tests.txt
  pnpm test:coverage 2>&1 | tail -30 > .merge-notes/baseline-coverage.txt
  ```

  Both must be green on `main` before starting. A red baseline means the merge is not the cause
  of whatever breaks later, and the plan loses its only reference point.

**Go/no-go**: all five sub-steps pass. Otherwise stop and report.

---

## Phase 1 - Mechanical merge

One commit. Everything resolvable by an area rule is resolved here, without judgment. Files
that need judgment are resolved with a deliberate placeholder side and fixed in phases 2 to 4;
each one is listed explicitly in 1.5.

- [ ] **1.1** Create the working branch and start the merge.

  ```sh
  git switch -c merge/develop-into-main main
  git merge --no-commit --no-ff develop
  ```

  The merge stops with conflicts. This is expected. Do not abort.

- [ ] **1.2** Resolve the "take `develop` wholesale" areas.

  These are subsystems `develop` restructured atomically. Resolving them per hunk breaks them.

  ```sh
  take_theirs() {
    for p in "$@"; do
      git checkout --theirs -- "$p" 2>/dev/null || true
      git add -- "$p" 2>/dev/null || true
    done
  }

  take_theirs \
    'src/core/text' \
    'src/core/guardrails' \
    'src/cli/setup' \
    'src/resources' \
    'src/prompts' \
    'src/tools' \
    'src/server' \
    'src/transport' \
    'skills' \
    'personas' \
    'scripts/reports/compression' \
    'scripts/reports/startup' \
    'bin/rule-mcp.js' \
    'scripts/ci/run-tests/index.mjs' \
    'scripts/fix/prose/index.mjs'
  ```

  Why each:
  - `src/core/text`, `scripts/reports/compression`, `scripts/reports/startup`: the compression
    rebrand (`e8081aa`, 123 files) plus the four-level compression work. `main` has the same
    work under the old `caveman` names.
  - `src/core/guardrails`: rules moved into the skills that own them (`2516f0c`, 317 files).
  - `src/cli/setup`: decision D5.
  - `src/resources`, `src/prompts`, `src/tools`, `src/server`, `src/transport`: the surface
    `develop` grew to 109 tools / 188 resources / 154 prompts.
  - `skills`, `personas`: the guardrails-in-skills layout and the `src/roles -> personas`
    rename.
  - `bin/rule-mcp.js`, `scripts/ci/run-tests/index.mjs`, `scripts/fix/prose/index.mjs`:
    `develop` carries the same change `main` has, plus the `@src` alias hook. SPDX headers are
    restored mechanically in phase 5.

- [ ] **1.3** Resolve the "take `main` wholesale" areas.

  These are the OSS, legal and supply-chain layer, plus one security fix `develop` never had.

  ```sh
  take_ours() {
    for p in "$@"; do
      git checkout --ours -- "$p" 2>/dev/null || true
      git add -- "$p" 2>/dev/null || true
    done
  }

  take_ours \
    '.github' \
    'docs/adr' \
    'pnpm-workspace.yaml' \
    'scripts/install.sh' \
    'scripts/install.ps1' \
    'scripts/uninstall.sh' \
    'scripts/uninstall.ps1'
  ```

  Why each:
  - `.github`: `develop` has only `ci.yml` and `release.yml`. `main` has those plus `codeql.yml`,
    `scorecard.yml`, `pages.yml`, `check-workflows.yml`, CODEOWNERS, dependabot, FUNDING, issue
    and PR templates. The release workflow is revisited in 5.4.
  - `docs/adr`: decision D3. Appends happen in phase 4.
  - `pnpm-workspace.yaml`: `main` drops the `rule-mcp: "link:"` self-override (`aa6f646`)
    and pins `fast-uri`, `hono` and `qs` past published advisories (`24720c1`). The `develop`
    version has neither.
  - the four installer bootstraps: `main` pins the install pipe to a verified release tag
    (`c60b3e3`). The `develop` flag-validation work (`3267d11`, `8ed30db`, `e3ec900`) is ported
    back in 3.4.

- [ ] **1.4** Resolve the modify/delete conflicts.

  Deletions that must stand, from `main` (documents archived by ADR 087, scripts removed):

  ```sh
  git rm -f --ignore-unmatch \
    docs/02-tools-operations.md \
    docs/03-engineering-guides.md \
    docs/audits/performance.md \
    docs/audits/simplicity.md \
    docs/plans/performance.md \
    docs/plans/simplicity.md \
    docs/reviews/performance.md \
    docs/reviews/simplicity.md \
    src/cli/__tests__/_install-script-pty.test.mjs \
    src/cli/__tests__/_install-script-selection.test.mjs \
    src/cli/install/__tests__/_cycle.test.mjs
  ```

  The content of the two deleted documents is ported in 4.1. The three deleted test files were
  replaced on `main` by node-based contract tests; `develop` kept editing the shell-based ones.

  Deletions that must stand, from `develop` (the guardrails restructure and the rebrand):

  ```sh
  git rm -f --ignore-unmatch \
    src/core/guardrails/_database.js \
    src/core/guardrails/_devops.js \
    src/core/guardrails/framework/_angular.js \
    src/core/guardrails/framework/_react.js \
    src/core/guardrails/framework/_svelte.js \
    src/core/guardrails/framework/_vue.js \
    src/core/guardrails/framework/index.js \
    src/core/guardrails/quality/_a11y.js \
    src/core/guardrails/quality/index.js \
    src/core/guardrails/quality/manifest/index.js \
    src/core/guardrails/quality/prose/index.js \
    src/core/guardrails/quality/simplicity/index.js \
    src/core/guardrails/shared/index.js \
    src/core/text/_caveman.js \
    src/core/text/_caveman-line.js \
    src/core/text/_caveman-aggressive.js \
    src/roles/oss.md \
    src/roles/__tests__/_template.test.mjs \
    src/cli/__tests__/_install-script-daemon-service.test.mjs \
    src/cli/installers/__tests__/_heal.test.mjs \
    src/cli/installers/__tests__/_static.test.mjs
  ```

  **Do not delete yet** the 8 test files listed below. They are staged as-is now and moved in
  phase 2. If `git status` shows them as deleted, restore them from `main`:

  ```sh
  git checkout main -- \
    src/core/guardrails/framework/vanilla/__tests__/_ce-rules.test.mjs \
    src/core/guardrails/framework/vanilla/__tests__/_flex.fixture.mjs \
    src/core/guardrails/framework/vanilla/__tests__/_justified.test.mjs \
    src/core/guardrails/framework/vanilla/__tests__/_rule.test.mjs \
    src/core/guardrails/framework/vanilla/__tests__/_surfaces.test.mjs \
    src/core/guardrails/framework/vanilla/__tests__/_template-load.test.mjs \
    src/core/guardrails/framework/vanilla/__tests__/_templates.test.mjs \
    src/core/guardrails/shared/__tests__/_external-css.test.mjs
  git add src/core/guardrails/framework/vanilla/__tests__ src/core/guardrails/shared/__tests__
  ```

  The rename/delete on ADR 055 is covered by 1.3 (`docs/adr` takes `main`). The retitle is
  applied in 4.3.

  The "file location" notice about `src/roles/oss.md` is covered by D6: the file is deleted
  above and `personas/oss.md` from `develop` stands.

- [ ] **1.5** Resolve, by hand, the files that need judgment.

  Twelve paths. Each gets an explicit instruction. Resolve every one before committing.

  | Path                                                                                                                                              | What to do                                                                                                                                                                       |
  | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `package.json`                                                                                                                                    | Start from the `develop` side, then re-add the `main`-only entries. See 1.6.                                                                                                     |
  | `server.json`                                                                                                                                     | Take the `main` side (registry identity `io.github.pixu1980/rule-mcp`, ADR 081), then set `version` to `0.1.0-beta`.                                                       |
  | `pnpm-lock.yaml`                                                                                                                                  | Take either side and stage it. It is regenerated in 5.1.                                                                                                                         |
  | `scripts/SHA256SUMS`                                                                                                                              | Take either side and stage it. It is regenerated in 5.2.                                                                                                                         |
  | `CHANGELOG.md`                                                                                                                                    | Take either side and stage it. It is regenerated in 5.3.                                                                                                                         |
  | `README.md`                                                                                                                                       | Take the `main` side. It carries the OSS badges, the rewritten opening and the caveman credit. Counts are corrected in 5.5.                                                      |
  | `.github/workflows/release.yml`                                                                                                                   | Already resolved to `main` by 1.3. The prerelease flag is applied in 5.4.                                                                                                        |
  | `docs/01-getting-started.md`                                                                                                                      | Take the `main` side. Then delete the `develop` leftover: `git rm -f --ignore-unmatch docs/GETTING_STARTED.md`.                                                                  |
  | `docs/02-product-architecture.md`                                                                                                                 | Take the `develop` side, then re-add the one line `main` added in `7dc90e3` about close-session archiving (D2).                                                                  |
  | `docs/05-env-variables.md` and every other `docs/NN-*.md`                                                                                         | Take the `develop` side for the body. The `main` filename and numbering stay. These files are regenerated by the census in 5.6, so only prose outside the fenced blocks matters. |
  | `tests/docs/repository-contract.test.mjs`                                                                                                         | Take the `develop` side (`9c0f965` retargets the shell contracts at the node code that replaced them), then re-add any assertion from `main` naming a file that still exists.    |
  | `src/cli/_program.js`, `src/cli/_register-*.js`, `src/cli/commands/*`, `src/cli/install*`, `src/cli/installers/*`, `src/core/*` not listed in 1.2 | Take the `develop` side. These follow the layers and SDK restructure.                                                                                                            |

  A fast way to apply the bulk of the last row:

  ```sh
  git diff --name-only --diff-filter=U | while read -r f; do
    git checkout --theirs -- "$f" && git add -- "$f"
  done
  ```

  Run it **last**, after the twelve explicit files above are already staged, so it only sweeps
  what is left.

- [ ] **1.6** Reconcile `package.json` by hand.

  `develop` wraps every script that loads server code with the `@src` alias hook. `main` does
  not have the hook but has entries `develop` lacks. The merged file needs both.

  Base: the `develop` version. Then add these `main`-only entries verbatim:

  ```json
  "docs:dev": "node scripts/docs-site/serve.mjs",
  "docs:build": "node scripts/docs-site/build.mjs",
  "prepare": "node scripts/install/git-hooks/index.mjs",
  "hooks:install": "node scripts/install/git-hooks/index.mjs",
  "hooks:check": "node scripts/install/git-hooks/index.mjs --check"
  ```

  These five do not load server code, so they do not need `--import ./scripts/alias-hook.mjs`.
  Verify that claim in 6.2; if one of them throws on an unresolved `@src` specifier, add the
  hook to that entry only.

  Set `"version": "0.1.0-beta"` (D4). Keep every dependency block from `main`, which carries the
  advisory overrides. Stage the file.

- [ ] **1.7** Fix `.githooks/pre-commit`.

  It auto-merged to the `main` version, which runs the census without the alias hook:

  ```sh
  node scripts/reports/census/index.mjs >/dev/null
  ```

  Change that single line to:

  ```sh
  node --import ./scripts/alias-hook.mjs scripts/reports/census/index.mjs >/dev/null
  ```

  Leave the `git add` line alone: it already names the `main` document numbering, which is the
  one that survives.

- [ ] **1.8** Confirm nothing is left unresolved, then commit the merge.

  ```sh
  git diff --name-only --diff-filter=U        # must print nothing
  git status --porcelain | grep -c '^' ; true # sanity: expect several hundred staged paths
  git commit --no-verify -m "Merge branch 'develop' into main"
  ```

  `--no-verify` is deliberate: the tree is knowingly inconsistent until phase 5, and the
  pre-commit census would fail on it. The merge subject starts with `Merge `, which the
  commit-msg hook exempts from the scope and DCO checks.

**Verification**: `git log --oneline -1` shows the merge commit, and
`git diff --stat HEAD^1 HEAD | tail -1` reports a large but finite change. Tests are expected to
fail at this point. Do not try to fix them here.

---

## Phase 2 - Port what `develop` deletes

One commit. Decision D7. This is the longest hands-on phase.

- [ ] **2.1** Find where each deleted test's subject now lives.

  ```sh
  ls skills/rule-frontend-vanilla-reactive/guardrails/
  ls skills/rule-styleguide-css/guardrails/
  ```

  Expected: the vanilla custom-element and flex rules under the first, `_external-css.js`,
  `_css-flex-first.js` and `_no-css-classes.js` under the second.

- [ ] **2.2** Move the seven vanilla test files.

  ```sh
  mkdir -p skills/rule-frontend-vanilla-reactive/guardrails/__tests__
  git mv src/core/guardrails/framework/vanilla/__tests__/_ce-rules.test.mjs      skills/rule-frontend-vanilla-reactive/guardrails/__tests__/
  git mv src/core/guardrails/framework/vanilla/__tests__/_flex.fixture.mjs       skills/rule-frontend-vanilla-reactive/guardrails/__tests__/
  git mv src/core/guardrails/framework/vanilla/__tests__/_justified.test.mjs     skills/rule-frontend-vanilla-reactive/guardrails/__tests__/
  git mv src/core/guardrails/framework/vanilla/__tests__/_rule.test.mjs          skills/rule-frontend-vanilla-reactive/guardrails/__tests__/
  git mv src/core/guardrails/framework/vanilla/__tests__/_surfaces.test.mjs      skills/rule-frontend-vanilla-reactive/guardrails/__tests__/
  git mv src/core/guardrails/framework/vanilla/__tests__/_template-load.test.mjs skills/rule-frontend-vanilla-reactive/guardrails/__tests__/
  git mv src/core/guardrails/framework/vanilla/__tests__/_templates.test.mjs     skills/rule-frontend-vanilla-reactive/guardrails/__tests__/
  ```

- [ ] **2.3** Move the external-css test.

  ```sh
  mkdir -p skills/rule-styleguide-css/guardrails/__tests__
  git mv src/core/guardrails/shared/__tests__/_external-css.test.mjs skills/rule-styleguide-css/guardrails/__tests__/
  ```

- [ ] **2.4** Rewrite the imports in the eight moved files.

  Each one still imports from `src/core/guardrails/framework/vanilla/...` or
  `src/core/guardrails/shared/...`, paths that no longer exist. Point each import at the rule
  module inside the same skill. Read the rule file to get the exported name; do not guess it.

  ```sh
  grep -rn "from \"" skills/rule-frontend-vanilla-reactive/guardrails/__tests__/ \
                     skills/rule-styleguide-css/guardrails/__tests__/
  ```

  Every path in that output that mentions `src/core/guardrails/framework` or
  `src/core/guardrails/shared` must be replaced.

- [ ] **2.5** Confirm the test runner picks the new locations up.

  ```sh
  grep -n "skills" scripts/ci/run-tests/index.mjs
  ```

  If the runner globs only `src/` and `tests/`, add `skills/**/__tests__/*.test.mjs` to its
  discovery list. If it already walks `skills/`, change nothing.

- [ ] **2.6** Run just these tests.

  ```sh
  node --import ./scripts/alias-hook.mjs --test \
    skills/rule-frontend-vanilla-reactive/guardrails/__tests__/*.test.mjs \
    skills/rule-styleguide-css/guardrails/__tests__/*.test.mjs
  ```

  Green is required. A test that fails because the rule genuinely changed behavior under the
  restructure should be updated to the new behavior, and the change noted in the commit body.
  A test that fails because a rule is missing means the restructure dropped a rule: stop and
  report it, do not delete the test.

- [ ] **2.7** Remove the now-empty directories and commit.

  ```sh
  git rm -r --ignore-unmatch src/core/guardrails/framework src/core/guardrails/shared
  git add -A
  git commit -s -m "test(guardrails): move the vanilla and external-css tests into their skills"
  ```

---

## Phase 3 - Reconcile duplicated features

Up to three commits, one per feature.

- [ ] **3.1** Setup wizard: port the git-hook step back (D5).

  `develop` won the directory. `main` had a git-hook install step the wizard offered, which the
  `develop` version does not have.

  ```sh
  git checkout main -- \
    src/cli/setup/_git-hook.js \
    src/cli/setup/_git-hook-apply.js \
    src/cli/setup/__tests__/_git-hook.test.mjs \
    src/cli/setup/__tests__/_git-hook-apply.test.mjs \
    src/cli/setup/__tests__/_git-hook-pure.test.mjs
  ```

  Then wire the step into the `develop` step list. Read `src/cli/setup/_steps.data.js` and
  `src/cli/setup/_step-extras.js` to see how the other optional steps register, and follow the
  same shape. Do not invent a new registration mechanism.

  Check whether the restored files import anything that only existed on `main`:

  ```sh
  grep -n "^import" src/cli/setup/_git-hook.js src/cli/setup/_git-hook-apply.js
  ```

  Resolve every unresolvable import against the `develop` module that replaced it.

- [ ] **3.2** Setup wizard: triage the 18 `main`-only test files.

  These exist on `main` under `src/cli/setup/__tests__/` and are not in the tree now:

  ```
  _fake-terminal.fixture.mjs   _mount.fixture.mjs        _plan.test.mjs
  _preflight-child.fixture.mjs _preflight.test.mjs       _rules-apply.test.mjs
  _rules.test.mjs              _shell-profile.test.mjs   _shim-child.fixture.mjs
  _shim-paths.test.mjs         _step-apply-lines.test.mjs _task-extras.test.mjs
  _theme-ascii.test.mjs        _theme.test.mjs           _wizard-install.test.mjs
  _wizard-review.test.mjs      _wizard-uninstall.test.mjs
  ```

  For each: restore it with `git checkout main -- <path>`, run it, and keep it if it passes or
  can be made to pass against the `develop` modules. Delete it only when it tests a module that
  no longer exists, and list every deletion in the commit body.

  `_rules.test.mjs` and `_rules-apply.test.mjs` need extra care: `main` has
  `src/cli/setup/_rules.js` and `_rules.data.js`, which `develop` does not. Check whether the
  rules logic moved into the layers (`src/core/layers/`). If it did, retarget the test. If it
  disappeared, restore `_rules.js` and `_rules.data.js` too and wire them, because the installer
  writes agent rule blocks and losing that is a regression.

- [ ] **3.3** Commit the wizard reconciliation.

  ```sh
  git add -A
  git commit -s -m "feat(setup): restore the git-hook step and the wizard tests on the develop wizard"
  ```

- [ ] **3.4** Installer bootstraps: port the `develop` flags onto the `main` scripts.

  `scripts/install.sh`, `scripts/install.ps1`, `scripts/uninstall.sh` and
  `scripts/uninstall.ps1` are currently the `main` versions, which pin the download to a
  verified release tag. Add, from the `develop` versions, only:

  - the fail-fast flag validation (`3267d11`),
  - the `--minimal` / tool-surface flag (`e3ec900`),
  - the surface profile and guided-mode flags (`8ed30db`).

  Read the `develop` versions for reference without checking them out:

  ```sh
  git show develop:scripts/install.sh   | head -120
  git show develop:scripts/install.ps1  | head -120
  ```

  Do not copy the download block from `develop`. That is the part `main` hardened.

  ```sh
  git add scripts/install.sh scripts/install.ps1 scripts/uninstall.sh scripts/uninstall.ps1
  git commit -s -m "feat(install): carry the develop flags onto the pinned bootstraps"
  ```

- [ ] **3.5** Close-session archiving: apply the `main` documentation line (D2).

  The implementation is already the `develop` one. `main` also changed
  `docs/02-product-architecture.md` in `7dc90e3`. Recover just that:

  ```sh
  git show 7dc90e3 -- docs/02-product-architecture.md
  ```

  Apply the same sentence to the current file, adapting it if the surrounding prose differs.

  ```sh
  git add docs/02-product-architecture.md
  git commit -s -m "docs(handoff): document close-session archiving in the architecture chapter"
  ```

---

## Phase 4 - Docs, ADR and handoff

Up to three commits.

- [ ] **4.1** Port the two deleted documents into the `main` numbering.

  `main` renumbered the handbook; `develop` kept editing the old filenames. The mapping is:

  | `develop`                         | `main`                            |
  | --------------------------------- | --------------------------------- |
  | `docs/GETTING_STARTED.md`         | `docs/01-getting-started.md`      |
  | `docs/01-product-architecture.md` | `docs/02-product-architecture.md` |
  | `docs/02-tools-operations.md`     | `docs/04-operations.md`           |
  | `docs/03-engineering-guides.md`   | `docs/07-engineering-guides.md`   |
  | `docs/04-agent-instructions.md`   | `docs/03-agent-instructions.md`   |
  | `docs/06-skills.md`               | `docs/08-skills.md`               |
  | `docs/07-tools.md`                | `docs/09-tools.md`                |
  | `docs/08-prompts.md`              | `docs/10-prompts.md`              |
  | `docs/09-instructions.md`         | `docs/11-instructions.md`         |
  | `docs/10-cli.md`                  | `docs/12-cli.md`                  |
  | `docs/11-personas.md`             | `docs/13-personas.md`             |
  | `docs/12-guardrails.md`           | `docs/14-guardrails.md`           |
  | `docs/13-resources.md`            | `docs/15-resources.md`            |

  `main` also has `docs/06-privacy.md`, which `develop` never had. Git matched most of these
  renames automatically. Two it did not, and their `develop` edits are currently lost:

  ```sh
  git diff d8788ed develop -- docs/02-tools-operations.md    # 15 added, 5 removed
  git diff d8788ed develop -- docs/03-engineering-guides.md  # 64 added, 4 removed
  ```

  Apply those two diffs by hand to `docs/04-operations.md` and `docs/07-engineering-guides.md`.
  The content is: the tokensave M8 version gate and staleness notes, the compression rebrand
  wording, the Open Source Steward persona row, the one-area-command-per-skill section, and the
  measured compression and startup numbers.

- [ ] **4.2** Fold the stray audit directory into the plural one.

  `develop` created `docs/audit/` (singular) alongside `docs/audits/`.

  ```sh
  git mv docs/audit/tokensave-integration.md docs/audits/tokensave-integration.md
  rmdir docs/audit 2>/dev/null || true
  grep -rn "docs/audit/" --include='*.md' --include='*.js' --include='*.mjs' . | grep -v node_modules
  ```

  Fix every reference the grep prints, including the one inside the tokensave ADR.

- [ ] **4.3** Retitle ADR 055.

  `main` has `docs/adr/055-restructure-the-command-surface-rule-router-rule-area-caveman-implicit-rule-process.md`.
  `develop` has the same decision with `caveman` replaced by `compression`. The number stays 055
  (D3); only the slug and the title change.

  ```sh
  git mv docs/adr/055-restructure-the-command-surface-rule-router-rule-area-caveman-implicit-rule-process.md \
         docs/adr/055-restructure-the-command-surface-rule-router-rule-area-compression-implicit-rule-process.md
  ```

  Edit the H1 inside the file to match the new slug, then apply the body edits from the
  `develop` copy:

  ```sh
  git show develop:docs/adr/058-restructure-the-command-surface-rule-router-rule-area-compression-implicit-rule-process.md
  ```

  Find and fix every link to the old filename:

  ```sh
  grep -rn "055-restructure-the-command-surface" --include='*.md' . | grep -v node_modules
  ```

- [ ] **4.4** Append the nine `develop`-only ADRs.

  For each row: copy the file content from `develop`, write it at the new number, and edit the
  H1 (ADR files carry their number in the title, for example `# 086: TokenSave is ...`).

  | From `develop`                                                                            | New number |
  | ----------------------------------------------------------------------------------------- | ---------- |
  | `078-a-persona-topic-is-the-binding-scope-of-the-run.md`                                  | 088        |
  | `079-skills-own-their-guardrails-and-three-layers-resolve-both-skills-and-personas.md`    | 089        |
  | `080-the-setup-wizard-is-the-installer-and-it-asks-which-commands-to-write.md`            | 090        |
  | `081-install-uninstall-rework-keeps-current-stack-steps-and-contents-only.md`             | 091        |
  | `082-surface-selection-amends-the-install-stack-freeze-with-an-additive-loader-filter.md` | 092        |
  | `083-add-an-open-source-steward-persona-for-governance-contributors-and-donors.md`        | 093        |
  | `084-rename-the-compression-subsystem-and-apply-it-to-every-model-facing-surface.md`      | 094        |
  | `085-close-out-the-install-and-uninstall-rework-plan.md`                                  | 095        |
  | `086-tokensave-is-the-primary-code-graph-javascript-is-the-fallback.md`                   | 096        |

  Retrieval pattern:

  ```sh
  git show develop:docs/adr/078-a-persona-topic-is-the-binding-scope-of-the-run.md \
    > docs/adr/088-a-persona-topic-is-the-binding-scope-of-the-run.md
  ```

  Then mark the two ADRs on `main` that these supersede. In
  `docs/adr/079-add-the-oss-architect-review-persona.md` and
  `docs/adr/080-one-installer-a-node-wizard-with-shell-bootstraps.md`, set the status line to
  `superseded` and name the superseding ADR (093 and 090 respectively).

- [ ] **4.5** Remap the in-code ADR references that came from `develop`.

  `develop` carries 149 ADR references numbered in its own scheme. Twenty-seven of them point at
  a different decision under the `main` numbering. Apply this table, from the longest number
  first so no substitution cascades:

  | `develop` | `main` | Decision                                                       |
  | --------- | ------ | -------------------------------------------------------------- |
  | 074       | 071    | the census generates eight numbered documents                  |
  | 070       | 067    | co-locate every test with its module                           |
  | 069       | 066    | remove externally derived skills                               |
  | 066       | 063    | coverage floor raised to 87                                    |
  | 064       | 061    | one global shim and hermetic pnpm home                         |
  | 062       | 059    | persona plans are checklists with marks                        |
  | 061       | 058    | one file per rule with underscore barrel folders               |
  | 060       | 057    | reorganize scripts, src, tests with 150-line splitting         |
  | 057       | 054    | split review personas into per-operation commands              |
  | 056       | 053    | gateway as the single entrypoint                               |
  | 055       | 052    | pre-packaged MCP prompt registry                               |
  | 052       | 051    | token efficiency pipeline                                      |
  | 051       | 050    | round two hardening cycles                                     |
  | 049       | 048    | v1.0.0 release and docs accuracy guard                         |
  | 048       | 047    | architect splits into a standalone web app repo                |
  | 046       | 045    | migrate repo tooling to ESLint 10 flat config                  |
  | 041       | 040    | per-invocation self update with temporal throttle              |
  | 040       | 039    | fix VS Code extension install and uninstall                    |
  | 034       | 033    | registry-driven clean slash commands                           |
  | 033       | 032    | the tool surface is skills and nothing else                    |
  | 031       | 030    | interview servers enforce same origin                          |
  | 029       | 028    | clean rule commands via user commands prompt suppression        |
  | 028       | 027    | add rule-toolchain-commits skill                                |
  | 027       | 026    | rename rule-mcp-agents to rule-ai-agents                      |
  | 023       | 022    | skill routing turborepo monorepo pipeline                      |
  | 079       | 089    | skills own their guardrails and three layers (appended in 4.4) |
  | 080       | 090    | the setup wizard is the installer (appended in 4.4)            |

  The one reference this plan already knows about by name is the alias-hook comment in
  `scripts/ci/run-tests/index.mjs`, which says "ADR 079" and must say "ADR 089".

  Find the rest:

  ```sh
  grep -rnE 'ADR[- ]?0?[0-9]{2,3}' src scripts skills personas tests --include='*.js' --include='*.mjs' --include='*.md'
  ```

  Every hit must be checked against the table. A hit whose number is not in the table is already
  correct under the `main` numbering and must be left alone. After the pass, verify no reference
  points past the highest ADR that exists:

  ```sh
  ls docs/adr/ | grep -cE '^[0-9]{3}-'    # expect 96
  ```

- [ ] **4.6** Renumber the two `develop` handoff documents.

  `main` holds `docs/handoff/01`..`04`. `develop` holds its own `01` and `02`.

  ```sh
  git show develop:docs/handoff/01-v0-1-0-beta-release-retarget.md          > docs/handoff/05-v0-1-0-beta-release-retarget.md
  git show develop:docs/handoff/02-setup-wizard-and-commands-selection.md   > docs/handoff/06-setup-wizard-and-commands-selection.md
  ```

  Edit the H1 of each if it carries its number. Then check whether a `docs/handoff/HANDOFF.md`
  index exists and regenerate or edit it so all six are listed.

- [ ] **4.7** Regenerate the ADR index and commit.

  ```sh
  grep -rn "ADR.md" scripts/ --include='*.mjs' | head
  ```

  If a generator owns `docs/adr/ADR.md`, run it. Otherwise edit the index by hand so it lists
  001 to 096 with the corrected 055 slug, the nine appends, and the two superseded markers.

  ```sh
  git add -A
  git commit -s -m "docs(adr): append the develop decisions from 088 and remap the code references"
  ```

---

## Phase 5 - Regenerate the derived files

One commit. Everything here is mechanical. Run the commands in order; do not hand-edit their
output.

- [ ] **5.1** Reconcile the lockfile.

  ```sh
  pnpm install
  ```

  `pnpm-lock.yaml` is rewritten from the merged `package.json` and `pnpm-workspace.yaml`. If
  `pnpm install` reports the `rule-mcp: "link:"` self-override, 1.3 did not take effect on
  `pnpm-workspace.yaml`: fix it and re-run.

- [ ] **5.2** Re-stamp the SPDX headers.

  `develop` contributed 318 new files with no header. The stamper is idempotent.

  ```sh
  node scripts/reports/license-headers/index.mjs --apply
  node scripts/reports/license-headers/index.mjs --check    # must exit 0
  ```

- [ ] **5.3** Regenerate the changelog.

  ```sh
  pnpm changelog
  ```

  Then read the result. The unreleased section must describe v0.1.0-beta and must not claim a
  v1.0.0 release.

- [ ] **5.4** Apply the prerelease flag to the release workflow.

  `.github/workflows/release.yml` is the `main` version: zizmor-clean, signed tags, verified
  tarball. It targets a normal release. Add the prerelease marking from `develop`:

  ```sh
  git show d778312 -- .github/workflows/release.yml
  ```

  Take only the `prerelease` setting and any tag-pattern change that admits `-beta`. Do not take
  the permissions block or the checkout step from `develop`; those are what zizmor flagged and
  `main` fixed in `0581147`.

- [ ] **5.5** Re-measure and rewrite the surface counts.

  ```sh
  pnpm surface:report
  pnpm census
  ```

  The merged surface is neither 106 nor 109 tools. Take the measured numbers and write them into
  `README.md` and into `tests/fixtures/tool-surface.json`. Never write a count you did not
  measure in this step.

- [ ] **5.6** Refresh the checksums and the version manifests.

  ```sh
  pnpm checksums
  ```

  Then confirm the single-version gate: `package.json`, `server.json` and every distribution
  manifest must all read `0.1.0-beta`.

  ```sh
  grep -rn "0\.1\.0" package.json server.json .github/workflows/release.yml | head -20
  ```

- [ ] **5.7** Format and commit.

  ```sh
  pnpm format:fix
  git add -A
  git commit -s -m "chore(release): regenerate headers, lockfile, changelog and surface counts"
  ```

---

## Phase 6 - Gates

Fix commits until every gate is green. Do not proceed to phase 7 with a red gate.

- [ ] **6.1** Lint.

  ```sh
  pnpm lint
  ```

- [ ] **6.2** Full suite.

  ```sh
  pnpm test:all
  ```

  Compare failures against `.merge-notes/baseline-tests.txt`. A test that was already failing
  before the merge is not this plan's problem; say so in the report instead of fixing it here.

  While here, confirm the claim from 1.6: run `pnpm docs:build` and `pnpm hooks:check`. If either
  throws on an unresolved `@src` specifier, add `--import ./scripts/alias-hook.mjs` to that
  script in `package.json`.

- [ ] **6.3** Coverage.

  ```sh
  pnpm test:coverage
  ```

  `BRANCH_FLOOR` is 91 and `BRANCH_TARGET` is 95 in
  `scripts/reports/coverage/_threshold.data.mjs`. The floor may not be lowered. If coverage sits
  below 91, the cause is almost certainly phase 2 or 3.2: a ported test that was dropped instead
  of retargeted. Find it and restore it.

- [ ] **6.4** License headers, census and prose.

  ```sh
  node scripts/reports/license-headers/index.mjs --check
  pnpm census:check
  pnpm format
  ```

- [ ] **6.5** Documentation accuracy and repository contract.

  ```sh
  node --import ./scripts/alias-hook.mjs --test tests/docs/*.test.mjs
  ```

  This includes `docs-accuracy`, `repository-contract`, `workflow-permissions` and
  `workflow-zizmor`. The last two exist only on `main` and gate the workflow hardening; they must
  pass.

- [ ] **6.6** Audit gate.

  ```sh
  pnpm audit:gate
  ```

- [ ] **6.7** Guardrails self-check.

  ```sh
  node --import ./scripts/alias-hook.mjs --test src/core/guardrails/__tests__/*.test.mjs
  ```

- [ ] **6.8** Record the consolidation decisions as ADRs.

  Two new files, numbered after the phase 4 appends:

  - `docs/adr/097-...`: the release target returns to v0.1.0-beta. Status `accepted`, and mark
    `docs/adr/085-reset-the-project-version-to-0-1-0-first-release-will-be-v0-1-0.md` as
    superseded by it.
  - `docs/adr/098-...`: the develop consolidation. Record D1 through D8, the alternatives
    considered (rebase, thematic squash), and the consequence: `develop` becomes an integration
    branch reset onto `main` after every merge.

  ```sh
  git add -A
  git commit -s -m "docs(adr): record the release retarget and the develop consolidation"
  ```

---

## Phase 7 - Land and realign `develop`

- [ ] **7.1** Final review of the whole change.

  ```sh
  git log --oneline main..merge/develop-into-main
  git diff --stat main...merge/develop-into-main | tail -5
  ```

  Confirm every one of these is still present in the tree, as the check that the OSS layer
  survived:

  ```sh
  ls LICENSES/MIT.txt REUSE.toml GOVERNANCE.md MAINTAINERS.md AUTHORS ROADMAP.md \
     CODE_OF_CONDUCT.md CONTRIBUTING.md SECURITY-INSIGHTS.yml \
     .github/workflows/codeql.yml .github/workflows/scorecard.yml \
     .github/workflows/pages.yml .github/workflows/check-workflows.yml \
     .github/CODEOWNERS .github/dependabot.yml .github/FUNDING.yml \
     scripts/docs-site/build.mjs scripts/install/git-hooks/index.mjs \
     scripts/reports/license-headers/index.mjs scripts/build/version/_hashes.mjs
  ```

  And that the `develop` work landed:

  ```sh
  ls personas/oss.md scripts/alias-hook.mjs tests/fixtures/tool-surface.json
  ls skills/rule-styleguide-typescript/guardrails/
  grep -rl "tokensave" src/ | head
  ```

- [ ] **7.2** Fast-forward `main`.

  ```sh
  git switch main
  git merge --ff-only merge/develop-into-main
  ```

  If this is not a fast-forward, someone pushed to `main` during the work. Stop and report.

- [ ] **7.3** Push `main`.

  ```sh
  git push origin main
  ```

  Watch CI. A red CI here means a gate that only runs on the runner. Fix forward on a normal
  branch; do not revert the merge.

- [ ] **7.4** Reset `develop` onto `main` (D8).

  `develop` stays alive as the integration branch. Its own history is already reachable through
  the merge commit on `main`, so nothing is lost by moving the ref.

  ```sh
  git branch -f develop main
  git push origin develop --force-with-lease
  ```

  `--force-with-lease`, never `--force`: it refuses if someone pushed to `origin/develop` since
  the last fetch.

- [ ] **7.5** Clean up.

  ```sh
  git branch -d merge/develop-into-main
  rm -rf .merge-notes
  ```

- [ ] **7.6** Delete this plan.

  A plan whose steps are all marked is finished. Per the archiving behavior recorded in ADR 087,
  the close-session run archives it. If that run is not being used, delete the file:

  ```sh
  git rm docs/plans/develop-consolidation.md
  git commit -s -m "docs(plans): close the develop consolidation plan"
  git push origin main
  ```

---

## Rollback

At any point before 7.3, the whole effort is discardable:

```sh
git switch main
git branch -D merge/develop-into-main
```

`main` and `develop` are untouched until 7.2. After 7.3 the merge is public: fix forward with
normal commits, do not rewrite `main`.

If the merge in phase 1 needs to be restarted from scratch:

```sh
git merge --abort          # only before the phase 1 commit
git switch main
git branch -D merge/develop-into-main
```

## Appendix A - The 135 files added on `main` that `develop` never had

These are what a naive "take develop" would have destroyed. They must all be present at 7.1.
Regenerate the list at any time:

```sh
git diff --diff-filter=A --name-only d8788ed..main | sort > /tmp/a_main.txt
git ls-tree -r --name-only develop | sort > /tmp/f_dev.txt
comm -23 /tmp/a_main.txt /tmp/f_dev.txt
```

Grouped: the OSS and legal layer (`LICENSES/`, `REUSE.toml`, `AUTHORS`, `GOVERNANCE.md`,
`MAINTAINERS.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `ROADMAP.md`,
`SECURITY-INSIGHTS.yml`), the GitHub surface (CODEOWNERS, dependabot, FUNDING, issue and PR
templates, four workflows), the documentation site (`scripts/docs-site/`), the git-hooks
installer (`scripts/install/git-hooks/`), the release tooling
(`scripts/build/version/`, `scripts/build/commit-types/`, `scripts/reports/license-headers/`),
ADRs 070 to 087, handoffs 01 to 04, the OSS audit, review and plan, the renumbered handbook
chapters, and the coverage wave five and six tests.

## Appendix B - Regenerating the conflict survey

Everything in the facts sheet is reproducible without starting a merge:

```sh
git merge-tree --write-tree main develop > /tmp/mt.txt 2>&1 || true
awk 'f{print} /^$/{f=1}' /tmp/mt.txt | grep '^CONFLICT' | grep -oE 'CONFLICT \([a-z/ ]+\)' | sort | uniq -c
awk 'f{print} /^$/{f=1}' /tmp/mt.txt | grep '^CONFLICT' | grep -v 'CONFLICT (content)'
```

The second command prints exactly the conflicts that need judgment: the modify/delete set of
1.4, the add/add set covered by the area rules of 1.2, and the single rename/delete on ADR 055.
