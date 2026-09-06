# Execution plan - reorganize `scripts/`, `src/`, `tests/` + coverage >= 95%

> Status: in progress. Interview-locked design (2026-09-06, session 2) recorded in ADR 061.
> Coverage baseline measured with `node --experimental-test-coverage` (Node 24, line+branch).

## Locked design decisions (interview, 2026-09-06)

1. **One file per rule/function** at the deepest level - maximum granularity, no semantic clusters.
2. **Barrel + underscore convention everywhere** (rule-styleguide-patterns): each folder has
   `index.js` as its only public entry (no `_`); every implementation file is `_`-prefixed,
   kebab-case (`_if-braces.js` exports `jsIfBraces`).
3. **One size rule for src, scripts and tests**: 100 lines + 50 tolerance = 150-line cap.
4. **Pure data is exempt via filename convention**: `*.data.js|mjs`, `*.corpus.mjs`,
   `*.fixture.mjs`, plus everything under `tests/fixtures/`.
5. **Legacy 2-line shims are dead**: import the folder `index.js` path; no dual paths.
6. **Scripts become one folder per script** (`scripts/reports/census/index.mjs` + `_part.mjs`
   helpers), grouped thematically; shell installers stay flat and exempt.
7. **Tests co-locate as `__tests__/` next to their subject** (later phase); repo-level suites
   (docs contracts, e2e, fixtures) keep a top-level `tests/` home. Requires a glob-based
   runner to replace the hardcoded lists in package.json and ci.yml.
8. **The code-splitting rule lives in `rule-process-simplicity`** ("Code splitting and file size").
9. **Enforcement is layered**: `tests/docs/file-size-budget.test.mjs` (150-line cap with a
   shrink-only ratchet in `file-size-ratchet.data.mjs` + numbered junk-name ban) and the
   `en-english-only-filenames` guardrail in `rule_tool_check`.
10. **English everywhere, enforced**: ADR titles/bodies gate through `adrEnglishOffenses`
    in `rule_tool_process_adr`; file and folder names gate through the new guardrail.

## Analysis (facts)

### Test coverage - answer: NO, not >= 95% today (not even branches)

- **Graph (tokensave)**: 918 functions, only 237 (26%) reached by tests visible in the call
  graph. A lower bound: many tests drive subprocesses (CLI, installer, daemon) the graph
  cannot see.
- **Native Node (line+branch) on the `test:foundations` unit batch**: 71.57% lines /
  80.91% branches / 72.66% functions (measured on loaded files: src + scripts + bin).
- **Main gaps (line% / branch%)**: `tools/gateway.js` 87.9/43.3, `tools/adr.js` 43.1/76.7,
  `tools/fix.js` 21.6, `tools/handoff.js` 15.3, `core/file-tree.js` 26.2,
  `core/block-spacing.js` 15.3, `cli/completions.js` 8.7, `cli/doctor.js` 19.9,
  `cli/tui.js` 33.2, `cli/daemon.js` 38.5.
- CLI/installer/transport are covered black-box via subprocess; real coverage is higher than
  71.57% but **still under 95% on branches**. Needs c8 instrumentation + targeted tests.

## Phases

### Phase 0 - measurable coverage baseline (done)
- [x] Line+branch coverage with native Node (71.57/80.91/72.66 on foundations).
- [x] `test:coverage` npm script (`scripts/test-coverage.mjs`).
- [x] Baseline recorded here and in ADR 060.

### Phase 1 - `test/` -> `tests/` + thematic subfolders (done)
- [x] `git mv test tests`; domain subfolders (cli, core, tools, transport, roles, prompts, docs, e2e, skills, fixtures).
- [x] package.json / ci.yml / docs path updates; relative-path fixes; porting-parity removed.

### Phase 2 - first splits (done, produced the junk names this plan now bans)
- [x] `cli/agent-installers.js` -> `installers/`, `guardrails/framework.js` -> `framework/`,
  `wcag-data.js` -> `wcag-data/`, `guardrails/quality.js` -> `quality/`, `bm25.js` -> `bm25/`,
  `tools/router.js` -> `router/`, `cli/commands.js` -> `commands/`.

### Phase 3 - convention rework (this session)
- [x] Codemod: framework `js-1..4` + `vanilla-1..2` -> one rule per file under
  `framework/js/` (16) and `framework/vanilla/` (9), underscore names, order preserved.
- [x] Codemod: quality `parts-1..4` -> family folders `typescript/` (4), `prose/` (5+1),
  `manifest/` (2), `simplicity/` (1), `comments/` (3); **two duplicated rules dropped**
  (`no-future-use-code`, `no-commented-out-code` appeared in both parts-3 and parts-4).
- [x] bm25: `stopwords-a/b/union` merged into `_stopwords.data.js` (union side effect moved
  into `_canonicalize.js`, import cycle removed); all bm25 modules renamed to `_` prefix.
- [x] Underscore renames: `_react/_vue/_angular/_svelte.js`, `_a11y.js`, `_guards-meta.js`,
  `_a11y-helpers.js`; dead `helpers-css.js` deleted (duplicate of `guardrails/util.js`).
- [x] Shims killed: `core/bm25.js`, `core/wcag-data.js`, `tools/router.js`, `cli/commands.js`;
  every importer now uses the folder `index.js` path.
- [x] New guardrail `en-english-only-filenames` (+ `scanPathForForeign`, foreign-name
  dictionary and suffix heuristic in `core/en-english.js`), test-first.
- [x] English gate in `rule_tool_process_adr` (`adrEnglishOffenses`), test-first; ADR 060
  translated to English (filename + content); index regenerated.
- [x] `tests/docs/file-size-budget.test.mjs`: junk-name ban + 150-line cap + shrink-only
  ratchet (117 grandfathered files in `file-size-ratchet.data.mjs`); wired into
  `test:foundations`.
- [x] Code-splitting section in `skills/rule-process-simplicity/SKILL.md`; ADR 061.

### Phase 4 - shrink the ratchet (in progress, one family per commit)
- [x] `tools/ai.js` (792) -> 15 files under `tools/ai/` (schema, sections, stopwords/aliases
  data, scoring, affinities, domain, framework bias, contracts, ranking, register); dead
  `scoreSkill` dropped.
- [x] `core/docs-numbering.js` (740) -> 9 files under `core/docs-numbering/` (git plumbing,
  families, authors, orphans, stale commits, plan, apply, rewrite, render).
- [x] `core/wcag-data/`: generator/split desync fixed - the vendored catalog is one
  `_criteria.data.js` (generator target), lookup helpers in `_lookup.js`; the 13
  `criteria-N-N.js` slices and `meta.js` are gone.
- [x] Underscore-barrel convention in every existing subfolder: `cli/commands`,
  `cli/installers` (agent-installers.js became the folder index), `tools/router`,
  `prompts`, `transport` (+barrel), `utils` (+barrel).
- [x] `src/core` thematic folders: `agents/`, `telemetry/`, `cache/`, `text/`, `review/`,
  `skills/`, `scaffold/`, `session/`, guardrails engine folded into `guardrails/`
  (`_engine`, `_guarded`, `_worker-thread`, catalogs underscored); `cli/daemon/` pair.
  Five more 1-2 line shims removed (guardrail-defs.js, guardrails/framework.js,
  guardrails/quality.js and the flat daemon/commands aliases).
- [ ] Remaining oversized (ratchet, worst first): `tools/handon.js` 737,
  `core/cache/_tool-cache.js` 720, `core/file-tree.js` 686, `tools/handoff.js` 660,
  `guardrails/_shared.js` 655, `prompts/index.js` 629, `core/agents/_transcripts.js` 583,
  `cli/daemon/_platform.js` 548, `tools/gateway.js` 530, `reports/census/index.mjs` 530, ...
- [ ] Each split: underscore-barrel folder, one concern per file, ratchet entries deleted,
  surface tests (`cli-commander-surface`, `tool-surface-budget`) green.
- [ ] Move `core/text/_en-english.js` dictionaries to `*.data.js` when next touched.

### Phase 5 - `scripts/` folders per script (done)
- [x] `reports/` (census, cache, cache-similarity, tool-surface, coverage), `fix/`
  (blank-lines, self-guardrails, prose, post-process), `build/` (changelog, embed-skills,
  checksums), `ci/` (audit-gate), `data/` (wcag), `install/` (skills); each script is its
  folder's `index.mjs`, shell installers stay flat.
- [x] package.json, ci.yml, package.sh, pre-commit hook, docs and census header updated;
  SHA256SUMS refreshed; stale `../test/routing-corpus.mjs` import in the cache reports fixed.
- [ ] Split the oversized scripts into `_helper.mjs` parts (census 530, cache 277, ...).

### Phase 6 - co-located `__tests__/`
- [ ] Glob-based runner (`node --test` patterns) replacing the hardcoded lists in
  `test:foundations` / `test:installer` / `test:all` / `ci` and `.github/workflows/ci.yml`.
- [ ] Move unit tests next to their subject as `__tests__/_name.test.mjs`; repo-level suites
  stay in `tests/`; `files` in package.json excludes `**/__tests__/`.

### Phase 7 - coverage >= 95% branches
- [ ] c8 (or `NODE_V8_COVERAGE`) so subprocess CLI/installer runs count.
- [ ] Targeted tests on the under-threshold areas listed in the analysis.
- [ ] CI gate: `pnpm test:coverage` fails under 95% branch coverage.
- [ ] Resolve or document the 2 pre-existing flaky failures (untrusted-fence,
  home-recording-leak race).
