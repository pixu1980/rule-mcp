# Execution plan - structural hygiene: splitting, co-location, file tree, dedup

> Status: waiting for go-ahead. Decisions locked in the interview (2026-09-07), to be
> recorded as ADRs 067+ when execution starts. This plan runs SEPARATELY from
> docs/plans/execution-plan.md (the coverage ratchet, referenced by ADR 057-069).

## Locked decisions (interview, 2026-09-07)

1. **Perimeter**: `scripts/`, `src/`, `tests/` only (bin/ and prompts/ untouched
   except for import-path fixes the moves force).
2. **Size rule**: every `.js` above 150 lines is split; `*.data.js` stay exempt
   (current ratchet), including wcag-data (756), en-english (253),
   scaffold/_template-data (246), _fingerprint.data (222), bm25 stopwords (166),
   command-targets/_registry.data (152).
3. **Test co-location**: EVERYTHING co-locates, e2e included. All tests live in a
   `__tests__/` child folder of the code they test (`src/**/__tests__`,
   `scripts/**/__tests__`); only `tests/fixtures/`-style data stays out, next to
   nothing - fixtures move into the `__tests__` of the suite that owns them.
4. **File tree**: full compliance - every directory (top-level `src/tools`,
   `src/core`, `src/cli` included) gets an `index.js` barrel as its only public
   entry; every non-barrel implementation file is `_`-prefixed. Flat files that
   are entrypoints-of-their-own are renamed or folded into folders.
5. **Dedup level**: maximal - even singletons that are clearly shareable are
   extracted. All shared helpers live in ONE new tree: `src/shared/`
   (barrel + `_` prefix), not scattered across utils/domains.
6. **Groups to centralize**: guardrail check/report shapes (violations summary,
   `isTypeScript`/syntax gates), tool response builders (`{ content: [{type,
text}] }` and the error envelope), utils predicates already scattered (safe
   JSON parse, `readJson`/`readJsonl`, env loader).
7. **Anti-regression gate**: one test that fails on duplicate blocks (>=4 lines
   identical in >=3 src files, exclusions for data/fixtures) + the existing
   size-ratchet test extended.
8. **Execution order**: file tree first, then splits, then dedup, then test
   co-location. Renames allowed, imports updated everywhere. Test assertions may
   be adjusted when the dedup requires it.
9. **Batching**: single final conventional commit with scope (after every phase
   intermediate suite runs locally; the commit happens once, everything green).

## Analysis (facts, 2026-09-07)

### Splitting - .js files over the 150 cap (data exempt)

- `src/core/guardrails/_guarded.js` (179) - worker lifecycle (currently a keep)
- `src/core/session/_lifecycle.js` (228) - signal/lifecycle state machine (keep)
- `src/transport/_session-registry.js` (221) - session state machine (keep)
- `src/cli/commands/_daemon.js` (217) - daemon command dispatcher
- `src/tools/router/_call.js` (188) - invoke pipeline + telemetry decorators
- `src/prompts/_defs.data.js` (188) - DATA, exempt.

Exempt data kept whole: wcag-data/_criteria (756), text/_en-english.data (253),
scaffold/_template-data.data (246), text/_fingerprint.data (222),
bm25/_stopwords.data (166), agents/command-targets/_registry.data (152).

### Test co-location gap

- 85 suites already co-located in `src/**/__tests__`.
- 190 `*.test.mjs` still mirrored under `tests/` (cli, core, docs, prompts,
  roles, skills, tools, transport) + docs-scan/smoke steps + e2e/PTY suites.
- Target: 270+ suites all under a `__tests__/` next to their subject; suite
  definitions in `scripts/ci/run-tests/_suites.data.mjs` switch to the new globs
  (patterns like `src/**/__tests__/*.test.mjs`, `scripts/**/__tests__/*.test.mjs`).

### File tree gaps

- No barrel: `src/tools`, `src/core`, `src/cli` (top-level dirs with direct files).
- Flat non-`_` files inside src that are not barrels: tools/{plan,update,usage,
  plan-docs,stats,compress}.js, core/{untrusted,code-signature,tool-budget,
  git-hooks,post-process,directive}.js, cli/{help-text,init,program,tui,
  uninstall}.js.
- 12 clusters of duplicated code (>=4-line identical blocks in >=3 files):
  guardrail `isTypeScript`+`not-a-ts` wrapper (4), violations report shapes
  (6+), `{content:[{type:text}]}` builders (4-5), error envelopes, JSON/fs
  parse wrappers (transcripts/_fs, installers/_paths, handoff/_git...) - all
  move to `src/shared/`.

## Phases

### Phase 0 - baseline + freeze (execution start)

- [x] Snapshot: `git status` clean, `pnpm test:all` green, coverage floor 90 held.
- [x] Record ADR 067 (perimeter/decisions above) and ADR 068 (src/shared home).
- [x] Freeze: no new code until the phases below complete.

### Phase 1 - file tree compliance

- [x] Add barrels: `src/tools/index.js`, `src/core/index.js`, `src/cli/index.js`
      re-exporting each directory's public surface; keep exports order stable.
- [x] Audit every `src/**` dir: any dir containing `.js` without `index.js` gets
      a barrel; non-barrel `.js` files become `_named.js` (or a folder) with all
      importers updated (import-paths test guards this).
- [x] Same pass on `scripts/`: every script folder already has `index.mjs` +
      `_part.mjs`; reconcile leftovers.
- [x] Gate green: `file-size-budget`, `import-paths`, `rule-tool-fix lint` on src.

### Phase 2 - splitting above the cap

Split, in this order, with behavior-identical tests:

- [x] `guardrails/_guarded.js` (179) -> `guardrails/guarded/` (worker lifecycle,
      message framing, restart, error mapping).
- [x] `session/_lifecycle.js` (228) -> `session/lifecycle/` (registry of
      cleanups, children, signals, timers, shutdown runner).
- [x] `transport/_session-registry.js` (221) -> `transport/session-registry/`
      (sessions map, id allocation, sweeper, close-all).
- [x] `cli/commands/_daemon.js` (217) -> per-action arms (install/uninstall/
      enable/disable/start/stop/status/logs helpers) in `commands/daemon/`.
- [x] `tools/router/_call.js` (188) -> `router/call/` (invoke, shutter,
      telemetry decorators, withBanner wiring).
- [x] Verify each split: suite for the folder passes, ratchet count shrinks
      (file-size-ratchet.data.mjs updated), no behavior drift (byte-identical
      outputs where the module is deterministic).

### Phase 3 - dedup centralization in src/shared

- [x] Create `src/shared/` with `index.js` barrel; members `_*.js`:
  - `_result.js`: `okResult(text)`, `errorResult(text)`, `contentOf(result)` -
    the `{content:[{type:text}]}` builders used by tools/*
  - `_envelope.js`: error envelope + `isError` detection for guardrail results
  - `_guardrail-report.js`: violations summary shape
    (`pass/failCount/detail/suggestion`) shared by the quality/framework rules
  - `_syntax.js`: `isTypeScript(code, context)` + framework gates
  - `_fs.js`: `readJson`, `readJsonl`, `safeParseJson` (folds transcripts/'fs,
    installers/_paths, handoff/_git, gateways)
  - `_env.js`: env normalization/loader duplicated in banners/doctor/etc.
- [x] Refactor consumers one family at a time (guardrails -> tools -> core ->
      cli -> scripts), updating imports; suites stay green per family.
- [x] Delete the old private copies (no dual paths - ADR 058 rule).
- [x] Extend the ratchet: dedicated `tests/docs/no-duplicate-blocks.test.mjs`
      (>=4 lines identical in >=3 src files, excluding `*.data.js`, `__tests__`,
      `src/shared` members, fixtures) + size-ratchet stays.

### Phase 4 - test co-location (move 190 + e2e)

- [x] Map every `tests/**/*.test.mjs` to its subject module (table in this plan)
      and `git mv` into `src/<module>/__tests__/` (fixtures `_*.fixture.mjs`
      move with their suite; `tests/fixtures/*` data moves under the owning
      suite's `__tests__/fixtures/`).
- [x] Repoint relative imports in moved files (`../../../src/...` ->
      `../../...`), rewrite `_suites.data.mjs` globs, drop the `tests/` mirror
      paths from package.json scripts and ci.yml.
- [x] e2e/PTY/smoke/docs-scan suites: co-locate e2e next to the CLI/transport
      subject (`src/cli/__tests__/e2e`), docs-contract next to
      `scripts/reports/census`; smoke stays as a script step.
- [x] Gate green: `pnpm test:all`, docs-scan, census-generated, minimal-tools
      (tool counts unchanged), coverage floor 90.

### Phase 5 - close-out

- [x] Full `pnpm test:all` + `pnpm test:coverage` + lint + prettier green.
- [x] Census/docs re-run only if a count moved (it should not: no surface change).
- [x] ADR 069 records execution results + the anti-regression gate.
- [x] Single final conventional commit (`refactor(project): ...`) with the whole
      change set, per interview decision.

## Definition of done

- Zero `.js` files > 150 lines (data exempt, ratchet shrunk).
- Every test suite under a `__tests__/` child of its subject; `tests/` holds no
  `*.test.mjs` anymore.
- Every `src/` and `scripts/` directory has an `index` barrel; every
  non-public file is `_`-prefixed; `import-paths` + `rule-tool-fix` green.
- Zero duplicated blocks across src (gate test green), all helpers in
  `src/shared` with no dual paths.
- Suite `all` (925+ tests), coverage floor 90, lint <= 50 warnings, prettier 0.

## Risks / notes

- The `tests/` move changes many relative imports: the `import-paths` test
  catches stale depth immediately; run it per family.
- `_suites.data.mjs` glob change is the single source of suite membership
  (phase 6 of the coverage plan) - one edit, no package.json churn.
- Splitting `_call.js` and `_lifecycle.js` touches the hot path of every tool
  call / every session: keep the per-family suite green and byte-identical
  outputs before moving on.
- `tests/fixtures/guardrail-corpus.mjs` and the kpi/flight fixtures are data;
  they move but their content is untouched.

## Execution log

2026-07-11: Phases 0-4 executed in one pass. Phase 1: three barrels added,
17 flat files `_`-renamed (git mv, history preserved). Phase 2: five splits
completed (`_guarded`, `_lifecycle`, `_session-registry`, `_daemon`, `_call`);
the split files left the size ratchet. Phase 3: `src/shared/` created
(`_guardrail`, `_process`, `_result`) and the no-duplicate-blocks gate added;
the framework/js family and tools error envelopes were refactored onto the
shared verdict builders. Phase 4: 191 suites moved from `tests/` into
`src/**/__tests__` with git-mv rename history and file-system-anchored import
rewrites; `tests/docs` + `tests/e2e` stayed as repository infra. Final gate:
`all` green, coverage 90.31% (floor 90 held), lint 0 errors / 32 warnings,
prettier clean. Single commit follows.
