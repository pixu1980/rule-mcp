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
- [x] Second pass (2026-09-06, session 3): `guardrails/_shared.js` (654) -> 15 per-rule
      files under `guardrails/shared/` - the three simplicity rules it duplicated from the
      quality family are now shared objects and **getGuardrails dedupes by id** (they ran
      twice per check before); maskLiterals single-sourced in `guardrails/_util.js`.
- [x] `tools/handon.js` (737) -> 12 files, `tools/handoff.js` (660) -> 10 files,
      `core/cache/_tool-cache.js` (720) -> 10 files (shared cacheState object),
      `core/file-tree.js` (686) -> 9 files (dead isComponentDir dropped),
      `prompts/index.js` (629) -> 8 files (definitions as `_defs.data.js`),
      `tools/adr.js` (580) -> 10 files, `tools/gateway.js` (530) -> 6 files.
- [x] `core/text/_fingerprint.js` and `_en-english.js` dictionaries extracted to
      `*.data.js` (494->290 and 490->247 logic lines).
- [x] Third pass (2026-09-06, session 4): `core/agents/_transcripts.js` (583) -> 8
      per-agent readers; `cli/daemon/_platform.js` (548) -> per-service-manager adapters;
      `cli/daemon/_daemon.js` (501) -> process/service/status modules; `cli/program.js`
      (501) -> one registrar per command in five theme files (original order preserved);
      `core/self-update.js` (483) -> 7 files; `cli/doctor.js` (478) -> 6 files;
      `reports/census/index.mjs` 530 -> 369 (markdown/env/CLI-reference extracted,
      byte-identical output); `flight-recorder.test.mjs` (540) -> 9 focused files with a
      shared sandbox fixture.
- [x] New guard: `tests/docs/import-paths.test.mjs` resolves every relative specifier
      (static, dynamic, new URL) - it caught four dormant broken dynamic imports on landing.
- [x] Fourth pass (2026-09-07, session 5) - the src ratchet is down from 93 to 40 entries:
  - `core/telemetry`: `_flight` 449, `_telemetry` 409, `_stats` 386, `_store` 363,
    `_kpi` 283 -> `flight/`, `recorder/`, `stats/`, `store/`, `kpi/` (24 files, all <=133).
  - `core/review`: `_docs` 449, `_roles` 272, `_template` 182, `_persona-file` 167 ->
    `docs/`, `roles/`, `template/`, `persona-file/` (21 files).
  - `transport`: `_sse` 414, `_http` 376 -> `sse/`, `http/` (state, guards, routes,
    handler, start, stop per transport).
  - `tools`: `skill.js` 415 -> `skill/` (per-skill tool + mode handlers + search/check/
    scaffold); `apply.js` 340 -> `apply/` (roots/target containment, tool, render);
    `a11y.js` 268 -> `a11y/` (evaluate, markdown, earl); `fix.js` 232 -> `fix/` (one
    module per mode).
  - `core`: `scaffold/_templates` 359 -> `templates/`; `agents/_command-targets` 339 ->
    `command-targets/` (registry as `_registry.data.js`); `agents/_commands` 314 ->
    `commands/`; `guardrails/_engine` 338 -> `engine/`; `guardrails/_backend` and
    `_file-tree` -> per-rule `backend/` and `file-tree/` families (verified
    behavior-identical); `text/_ascii-box` 323 -> `ascii-box/`; `text/_fingerprint` 289
    -> `fingerprint/`; `text/_block-spacing` 275 -> `block-spacing/`; `text/_en-english`
    245 -> `en-english/`; `cache/_catalog` 294 -> `catalog/`; `session/_resume` 292 ->
    `resume/`; `session/_snapshot` 252 -> `snapshot/`; `enforcement.js` 288 ->
    `enforcement/`; `skills/_skills` 271 -> four siblings; `detector.js` -> `detector/`
    with `_rules.data.js`; `scaffold/_template-data.js` renamed `.data.js`.
  - `cli`: `skills-install` 293, `guard` 273, `roles` 257, `install` 257,
    `completions` 252, `cache` 239, `paths` 222 (40+ importers moved), `tui` 196 all
    became folders or shed a sibling; `installers/_uninstall`, `commands/_tools`,
    `commands/_targets` split one concern out.
  - `server.js` 200 -> `server/` (completions + prompt handlers as modules);
    `resources/index` split `_read.js`; `utils/_sandbox` split `_request-wrapper.js`
    and `_storm-guard.js`; `agents/_integrations` split `_token-pipeline.js`;
    `core/text/_caveman` split `_caveman-line.js`; `bm25/_cache` split
    `_cache-signature.js`; `prompts/_handoff-options` moved its tables to `.data.js`.
  - The paths folder move initially pointed `getSkillsDirs` one level short (19 tools
    instead of 112); caught by minimal-tools and fixed - depth bugs in `new URL` do not
    show up in import-paths, only in behavior tests.
- [x] Test suites split per feature: `handon.test.mjs` (517) -> fixture + five files,
      `docs-numbering-doctor.test.mjs` (507) -> fixture + six files (flight-recorder pattern);
      package.json globs updated.
- [x] `scripts/` fully cleared: census 369 -> surface/labels/generated-files/
      instructions-file/marker-targets (byte-identical docs, verified); cache report 277 ->
      context/workload/measure/render (verified end-to-end); self-guardrails 233 -> five
      per-rule passes (identical 277-file dry-run); changelog 229 -> sections/history/render;
      wcag 186 -> flatten/render; blank-lines, cache-similarity, post-process, prose each
      shed one module.
- [x] Deliberate keeps, grandfathered with a rationale: `session/_lifecycle.js` 228 and
      `transport/_session-registry.js` 221 (single state machines whose reset reassigns
      module state), `guardrails/_guarded.js` 179 (worker lifecycle), `cli/commands/_daemon.js`
      219 and `tools/router/_call.js` 188 (one dispatcher function each).
- [x] `core/tokensave.js` 273 was runtime-orphaned: module deleted, its test retired; the
      live integration stays `core/agents/integrations` (2026-09-07, session 6).
- [x] Every remaining test suite split (2026-09-07, sessions 5-6): process-hygiene,
      lifecycle, css-flex-first, cache-tiers, telemetry, cache-invalidation, cache-catalog,
      prompts, simplicity, self-update-remote-pin, a11y-wcag, uninstall-purge-home,
      install-script-shim-heal, skills-docs, session-resume, self-update-throttle,
      en-english-language, agent-command-targets, install-rules-idempotent,
      manifest-guardrails, gateway-cache-receipt, self-update, caveman-efficacy,
      review-roles, skill-surface-embedded-only, roles-cli, reminder-diet,
      review-roles-surfaces, guardrails-precision-recall, apply-containment, sse - each a
      folder with a `_*.fixture.mjs` and focused `*.test.mjs` files. The ratchet holds only
      the five deliberate src keeps.

### Phase 5 - `scripts/` folders per script (done)

- [x] `reports/` (census, cache, cache-similarity, tool-surface, coverage), `fix/`
      (blank-lines, self-guardrails, prose, post-process), `build/` (changelog, embed-skills,
      checksums), `ci/` (audit-gate), `data/` (wcag), `install/` (skills); each script is its
      folder's `index.mjs`, shell installers stay flat.
- [x] package.json, ci.yml, package.sh, pre-commit hook, docs and census header updated;
      SHA256SUMS refreshed; stale `../test/routing-corpus.mjs` import in the cache reports fixed.
- [x] Split the oversized scripts into underscore parts (fourth pass, session 5): every
      script ratchet entry is gone.

### Phase 6 - co-located `__tests__/` (done, 2026-09-07, session 6; ADR 065)

- [x] Glob-based runner: `scripts/ci/run-tests/index.mjs` + `_suites.data.mjs` (quick /
      foundations / installer / all) replaced every hardcoded list in `test:foundations` /
      `test:installer` / `test:all` / `ci` and `.github/workflows/ci.yml`. 204 test files run
      where 151 were listed; the orphans it surfaced were real defects, all fixed: daemon
      entrypoint one directory short, storm-guard importing a deleted shim, repository-contract
      root depth, the untrusted fence missing the rebranded header, install-skills pointing at
      the pre-phase-5 script path, and the unimplemented reminder diet (now landed:
      session-cadence full/terse/none in `core/enforcement/_reminder.js`).
- [x] 22 single-module unit suites co-located as `src/<module>/__tests__/_name.test.mjs`
      (transcripts, caveman, code-signature, fingerprint, flight retention/kpi/stats,
      git-hooks, 3 guardrails suites, sandbox, wcag-data, prompt suppression, adr pair,
      gateway pair, post-process, transport pair, tui-formats, block-spacing, validate);
      repo-level suites stay in `tests/`; npm `files` excludes `src/**/__tests__/`.

### Phase 7 - coverage >= 95% branches (gate landed, ratcheting; ADR 065)

- [x] c8 wired: `pnpm test:coverage` runs the whole `all` suite under c8, so subprocess
      CLI/installer/daemon runs count. Honest cross-process baseline: 84% branches /
      84.8% lines (was 80.9% branches measured in-process on the foundations batch only).
- [x] First targeted tests on the darkest modules: block-spacing fixer (25% -> covered),
      enforcement validators, tui-formats renderers - co-located `__tests__` suites.
- [x] CI gate: a dedicated coverage job fails when branches drop below the floor in
      `scripts/reports/coverage/_threshold.data.mjs` (a rising ratchet, currently 90,
      target 95 - the plan-mandated 95 gate is the ratchet's endpoint, not a permanently
      red check).
- [ ] Keep raising the floor to 95 (now 90, ADRs 066-068 and 072): the branch floor moved
      83 -> 87 -> 89 -> 90. Wave three swept the long tail (English-only scanners,
      tool surface annotations, cache replay tiers, agent-commands targets, review
      overlays/validate/persona, check/search verdicts, handon verification, handoff
      git reads, plan renderer, detector edges, flight renderer, a11y evaluate, ...).
      Wave four (2026-09-08, ADR 072) landed ~20 suites over the named tail - the
      daemon command arms, skills-install catalog, IDE installer path/writer arms,
      handoff sources, skill/search/component tool modes, claude transcript reader,
      orphaned-path references, doctor run/detect-env, findings merge, persona
      catalog edges, guardrails CSS util, snapshot sizes, router compute - and
      fixed a real defect it surfaced (checkDaemonService's macos arm omitted
      `platform`, so `daemon status` printed `Platform: undefined` and the plist
      detail line never rendered). Measured 90.74% branches locally (6057/6675,
      981 tests): the wave covered ~155 branches while newly-loaded modules added
      ~140 uncovered ones to the denominator, so the floor stays 90 with a much
      healthier margin (was 90.08). ~620 branches remain: platform-locked daemon
      arms (~40 across _service/_service-status/_status-format/_launchd - linux
      and windows arms on a darwin dev box, the reverse on ubuntu CI), dead
      domain ternaries (ai/_framework), CLI serve transports, and a long tail of
      2-4 branch chips per file.
- [x] The 2 pre-existing flaky failures are resolved, not documented around: the
      untrusted-fence miss was a rebrand drift in the directive pattern (`PIX GALAXY
WORKFLOW REMINDER` never matched) and the home-recording-leak race now checks a
      private fake HOME per suite instead of watching the real one.
- [x] Two real defects surfaced by the coverage work (ADR 066): the ADR index
      generator emitted tables prettier immediately reformats (the byte-equal gate
      was red on main - fixed by emitting prettier-padded tables); the gateway
      loaded evidence via a tool name that never registers (evidence blocks carried
      "Unknown tool" text) - fixed to rule_tool_*.
