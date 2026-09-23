# Backlog

The queue of work not owned by a persona trio. Each item names the symptom, not
the fix, so the run that picks it up can choose the fix.

Distilled 2026-09-23 from `docs/plans/architect.md`, `docs/plans/oss.md`,
`docs/plans/github.md`, and their reviews/audits (all four now deleted). Every
open item below was re-verified against the live code graph and the working
tree on 2026-09-23, not assumed from the old plans' checkboxes, since the
architect review had gone stale (still marked all ten findings "open" from
2026-09-11 while the plan's own inline notes showed most already fixed through
2026-09-21). What follows is only what is genuinely still open.

## Steps

- [x] **Step 1 - ARCH-7 cont'd (medium)**: God-file complexity was cut once (the four shipped skills assets split 2026-09-21), but the two hottest `src` functions the finding named are still unsplit: `callTool` (`src/tools/router/call/_pipeline.js:26-126`, cyclomatic complexity 11, 100 lines) and `formatDoctorTerminal` (`src/cli/doctor/_format.js:53`) both remain single monolithic functions.
  - [x] **1.1**: Extract `callTool`'s stages into `src/tools/router/call/_stages.js` (validate, cacheLookupOrCompute, finalizeAndRecord); no caller changes signature.
  - [x] **1.2**: Split `formatDoctorTerminal` and `rolesCommand` by output section; add the missing branch tests for the self-update and roles paths the original finding named as untested. `runSelfUpdate` turned out already fully covered (real-git-sandbox fixtures via `execFileSync`, invisible to tokensave's call graph); only `rolesCommand` (zero tests) got new coverage, in `src/cli/roles/__tests__/_command.test.mjs`.
  - [x] **1.3**: Gate: `callTool` cyclomatic complexity 11→10, 100→70 lines, fan_out cut to 2 delegate calls; `rolesCommand` cyclomatic complexity dropped from a high, untested switch to 5 (cognitive 4), now tested; 118/119 in the affected suites pass (the one failure, `_entry-contract.test.mjs`'s tool-count assertion, is pre-existing and unrelated - confirmed by reproducing it against the code before this step's changes too).

- [x] **Step 2 - ARCH-8 (medium, narrowed)**: `src/shared/` still holds only `_guardrail.js`, `_process.js`, `_result.js`, and `ports/` (added by the now-closed ARCH-5). `tokensave_redundancy` reports the same 20 definite AST-isomorphic pairs measured in the original audit, unchanged: `alive`/`isAlive` duplicated across `src/core/session/__tests__/_lifecycle.fixture.mjs`, `_hygiene.fixture.mjs`, and `src/cli/daemon/_process-status.js`; `until` duplicated across the two session fixtures; `withHome` duplicated four ways across `src/core/telemetry/store/__tests__/` (`_rollup`, `_events`, `_purge`, `_sidecar`); `withEnv` duplicated across `src/cli/setup/__tests__/_theme.test.mjs` and `_shim-paths.test.mjs`; `setupTestDir` duplicated across the template-engine skill's test files; plus `seeded`/`seedHome` and three `project` fixture variants under `src/core/file-tree/__tests__/`.
  - [x] **2.1**: Checked first: `scripts/install.sh` and `scripts/uninstall.sh` carry no `detect_os` function anymore (`grep` for it and for `uname` across `scripts/*.sh` returns nothing) - the installer consolidation since 2026-09-11 (ADR 090, ADR 102) already removed this duplication. No `_shell.js` needed; nothing to do here.
  - [x] **2.2**: Added `src/shared/_testkit.js` exporting `until` and `withEnv` (genuinely test-only, no production twin) plus `withHome` (kept synchronous - every call site calls it bare inside a sync `test()` body and relies on that). `alive` turned out to be a byte-identical copy of production `isAlive` in `src/cli/daemon/_process-status.js`, so both fixtures now re-export that instead of adding a third copy. Refactored: `_lifecycle.fixture.mjs`, `_hygiene.fixture.mjs`, `_rollup/_events/_purge/_sidecar.test.mjs`, `_theme.test.mjs`, `_shim-paths.test.mjs`. All 11 of those pairwise duplicates are gone from the current `tokensave_redundancy` output; 215/215 tests pass across the touched suites.
  - [x] **2.3**: Not pursued - `_envelope.js`/`_fs.js`/`_env.js`/`_syntax.js` had no concrete duplicate instance behind them in this or the original audit, only a name. Inventing shared modules with no duplication to justify them would be unrequested scope. `setupTestDir` (skill-shipped example tests, not `src/`), the `project`/`seeded`/`seedHome` file-tree fixtures, and a handful of merely-similar test descriptions remain in the redundancy scan; none reached the bar of a confirmed, in-scope, byte-identical duplicate. `tokensave_redundancy pair_count` reads 20 before and after this step either way - it turned out to already be capped at 20 results, not a true total, so this was never a usable gate; verified instead by confirming the 11 targeted pairs are absent from the current output by name.

- [ ] **Step 3 - ARCH-9 cont'd (medium)**: Narrower than the original finding - `self-update`'s `git()` (`src/core/self-update/_git.js:15`) already carries an 8s `execFile` timeout, and the gateway does no network fetch at all (ADR 053: it is in-process), so the "give every outbound wait a deadline" half is already satisfied. Two real gaps remain.
  - [ ] **3.1**: Yield the BM25 build off the event loop. `buildIndex` (`src/core/bm25/_build.js:13`) is still fully synchronous; its own comment documents the ~95ms cold-build cost against the ~3ms `restoreIndex()` fast path, unchanged since the original audit. Keep the fast path; chunk the tokenize loop with `setImmediate` yields.
  - [ ] **3.2**: Persist `maybeSelfUpdate`'s checked/updated outcome (`src/core/self-update/_schedule.js:72`, currently three module-level `let` variables that reset on restart) through the `StoragePort` ARCH-5 already built (`src/shared/ports/`), so a restart does not replay a stale pending-banner check.
  - [ ] **3.3**: Gate: `pnpm report:startup` shows no single block over 50ms; `node scripts/ci/run-tests/index.mjs foundations` green with cache enabled.

- [ ] **Step 4 - ARCH-10 (low)**: Confirmed still fully open - no `src/transport/_transport.js` exists; `http/`, `sse/`, and the stdio guard remain concrete siblings with no shared interface; `src/shared/` has no `ToolPolicy` type.
  - [ ] **4.1**: Introduce a `Transport` interface (`start`, `stop`, `sessions`) and implement stdio, SSE, and HTTP against it.
  - [ ] **4.2**: Replace the `IS_MINIMAL_TOOLS` boolean with a `ToolPolicy` object (mode, allowlist version, reason).
  - [ ] **4.3**: Record the seams via `rule_tool_process_adr`; gate: new ADRs numbered and indexed, no direct transport-internal imports from server or CLI remain.

## Owner actions (not code)

Clicks only the repository owner can make. Carried over from `docs/plans/github.md`
and the remaining owner/gate items in `docs/plans/oss.md`; nothing here is a code
change, so no run of this backlog can close it unassisted.

- Enable GitHub Private Vulnerability Reporting (`Settings > Code security > security_analysis`); confirm the Security tab then shows "Report a vulnerability".
- Enable branch protection on `main` (`Settings > Branches`): require the `ci`, CodeQL, and audit checks, one review for outside contributors; record the exact setting in `GOVERNANCE.md`.
- Enable GitHub Pages (`Settings > Pages`, Source = GitHub Actions - `pages.yml` is already in place and verified). Once the URL is live: replace the interim `raw.githubusercontent.com/.../v0.1.0-beta/...` install URL (`scripts/install.sh:24` and elsewhere) with the canonical Pages URL - this part is a real code edit, just blocked until the URL exists.
- Create the label set (`bug`, `enhancement`, `good first issue`, `needs-triage`, `help wanted`); mark two small tasks `good first issue`.
- Create the GitHub Sponsors profile; mirror the funding policy text already in README and `GOVERNANCE.md`.
- Enable Vigilant Mode (`Settings > SSH and GPG keys`) so unsigned commits show as unverified.
- Delete the stale `v1.0.0` tag and Release page from the remote (local deletion is refused by the project's own rules); publish `v0.1.0` per the recorded decision (no placeholder).
- CI-observation gates that only resolve once `main` is pushed or a release tag runs: the `zizmor` job green on `main`; the CI matrix green; the first Dependabot PR opens within a week; CodeQL green with zero alerts and added to the required-check list; a scratch tag produces a release with tarball + checksums, every job but `release` declaring `contents: read`; the Scorecard workflow runs once and its score is recorded; a signed tag verifies with `git tag --verify` and shows Verified on GitHub.

## Closed this pass (verified against code, 2026-09-23)

- **ARCH-1 through ARCH-6** (the invocation cycle, the god initializer, the tool contract, the 19-deep chain, storage/process ports, barrel hygiene): all confirmed done. `tokensave_circular` no longer reports the original 8-node cycle (5 unrelated small cycles remain, none matching the finding); `tokensave_dependency_depth` max_chain is 8 against an ideal of 11 (was 19); `tokensave_health` quality_signal is 8582 (was 7441).
- **The `oss` plan**: every code-level step confirmed done; spot-checked 15 deliverables on disk (`CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `GOVERNANCE.md`, `MAINTAINERS.md`, `SECURITY.md`, `TRADEMARK.md`, `ROADMAP.md`, `AUTHORS`, `.github/FUNDING.yml`, `.github/CODEOWNERS`, `.github/dependabot.yml`, `.github/workflows/{codeql,scorecard,pages}.yml`, `SECURITY-INSIGHTS.yml`) - all present. Step 13 (installer parity) is confirmed dead: `scripts/install.ps1` carries no `add -g` or `npm install -g` call. Nothing left to implement in code; the remainder is the owner-action list above.
- **`docs/plans/backlog.md`'s own prior queue** (B-1 through B-5): already closed before this pass; folded below.

## Done

- **B-1** `handoff doctor` regenerates a stale `ADR.md` (a missing, extra or changed row, not only an
  unordered one) and refreshes a `HANDOFF.md` that a project keeps (commit `db33d01`).
- **B-2** Every install plan ends with a `cli` task that runs `rule-mcp --version`,
  `tools list` and `doctor` through the shim on PATH; a missing or broken shim fails the install
  (commit `9b053c3`).
- **B-3** A close-session handoff plans and applies the ADR/handoff renumbering before it reads the
  ADR log; a plain handoff stays read-only and the doctor remains the explicit dry run. Commit
  messages are reported, never rewritten automatically (commit `4863126`).
- **B-4** The wizard forces Ink `interactive: true` (overriding the CI detection that disables
  synchronized output) and turns on `incrementalRendering`, so the VS Code terminal stops
  flickering (commit `1d4eba8`).
- **B-5** `rule_tool_audit` and `rule_tool_review` are tools for IDEs that list tools, and a full
  skills install generates one `rule-<operation>-<role>` skill per active role with
  `exposeTool: false` (commit `f2f4c25`).
