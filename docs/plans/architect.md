# architect plan

- **Role**: architect v2
- **Date**: 2026-09-11

Steps re-derived from the open findings in [the review](../reviews/architect.md) on every run, worst
first. Mark an executed step or sub-step with `[x]` - the next sync keeps the mark while its
finding stays open. This file is deleted by the run that finds nothing open.

## Decisions locked this run

- **Full scope confirmed by user (ask, 2026-09-11)**: the focus cue `studiando` matched no file, module, or branch, so the user selected all four areas. This plan covers general study plus tool surface plus `src` modules plus loader cycle. No area was deferred.
- **Tool surface stays at 105 tools**: consolidation such as the PERF-9 meta rename ships only with a one-release alias, never as a silent rename. The contract in step 3 is what makes future renames safe.
- **No behavior change in this plan**: every split, move, and seam keeps byte-identical outputs where the module is deterministic. Behavior changes belong to separate runs with their own ADRs.
- **Shared helpers live once in `src/shared/`**: per ADR 061 there are no dual paths. A new shared member deletes its private copies in the same step.

## Shape of the work

Break the eight-module invocation cycle first, then shrink the god initializer that feeds it, then freeze the 105-tool public API so later moves cannot break clients. In parallel, cut the 19-deep layering chain, put the session and cache behind ports, fold stray flat files behind barrels, split the shipped god files, deduplicate onto `src/shared/`, harden the three Node traffic patterns, and leave explicit seams for transport, storage, and policy. End state: zero cycles across tools, skills, and self-update, a 12-or-less dependency depth, an explicit versioned tool contract, tested process and platform seams, and ADRs that record each new boundary.

## Steps

- [x] **Step 1 - ARCH-1 (high)**: Eight-module circular dependency ties tool invocation to skill loading to self-update to gateway: call/_pipeline.js <-> skills/_load.js <-> self-update/_run.js <-> tools/_update.js <-> gateway/_core.js; any change to invocation, loading, or update must fight the cycle
  - [x] **1.1**: Extract a skill-reload port (interface) in src/core/skills/_reload-port.js that self-update calls instead of importing _reload.js; _reload.js implements the port and registers itself at startup
  - [x] **1.2**: Invert gateway registration: move registerGatewayTool and registerApplyTool out of loadAllSkills into src/tools/index.js explicit bootstrap called once by src/server/index.js and src/cli/_program.js; loadAllSkills only registers per-skill tools
  - [x] **1.3**: Break pipeline -> self-update edge by moving maybeSelfUpdate and consumeUpdateBanner behind a ToolCallContext hook injected from src/server/index.js; _pipeline.js no longer imports core/self-update; gate: tokensave_circular reports zero cycles on src/tools, src/core/skills, src/core/self-update and node scripts/ci/run-tests/index.mjs foundations green
- [x] **Step 2 - ARCH-2 (high)**: loadAllSkills is a god initializer that knows every tool family and hides 8 edges behind dynamic import: fan_out 28 with fan_in 22, so the static coupling graph understates the true blast radius
  - [x] **2.1**: Convert the 8 lazy await import() calls in _load.js to top-level static imports from src/tools/index.js, src/tools/a11y/index.js, src/tools/handon/index.js, core/bm25/index.js, core/scaffold/templates/index.js, and core/cache/tool-cache/index.js; keep force-reload invalidation as an explicit function call
  - [x] **2.2**: Split loadAllSkills into three named phases in the same module: resetForReload, registerCoreTools, registerSkillTools, each with its own JSDoc and unit test in src/core/skills/**tests**/_load-phases.test.mjs
  - [x] **2.3**: Gate: tokensave_coupling fan_out on _load.js drops below 12, eslint import/first passes with no dynamic import in src/core/skills, and foundations suite green
- [ ] **Step 3 - ARCH-3 (high)**: The 105-tool surface is a public API with no versioning or rename contract: renames break clients, MUTATING_TOOLS and annotations drift as parallel lists, entry is derived by string surgery, and minimal mode builds the full surface only to delete it
  - [ ] **3.1**: Freeze the tool contract: add src/tools/router/_contract.js exporting TOOL_CONTRACT_VERSION and a deprecation map; entryPathOf and annotationsFor read the map so a rename keeps the old name as an alias for one release with a stderr warning
  - [ ] **3.2**: Replace string-munged entryPathOf with an explicit per-tool entry field set at registerTool time; update _entry.js dependenciesOf and routedSkillOf to read the field; add src/tools/router/**tests**/_entry-contract.test.mjs pinning every one of the 105 names
  - [ ] **3.3**: Move MINIMAL_ALLOWLIST enforcement from post-registration retainTools to registration time (skip registration when minimal) so minimal processes never pay the full 105-tool build; gate: listTools in minimal mode returns exactly the allowlist, docs-accuracy green, and census tool count quoted before and after
- [ ] **Step 4 - ARCH-4 (high)**: A 19-deep dependency chain runs from tests through census, CLI, tools, file-tree, review docs, and session registry to docs: layering is nominal, so a leaf edit can ripple across 88 files in the largest cluster
  - [ ] **4.1**: Cut the test-to-source edge: move census-generated assertions off live CLI imports onto the checked-in census JSON snapshot plus schema test; tests/docs/census-generated.test.mjs no longer imports scripts/reports/census/index.mjs
  - [ ] **4.2**: Introduce a cli -> tools facade in src/tools/index.js so src/cli/* imports only the facade, never router internals, file-tree internals, or review docs; update src/cli/cache, src/cli/commands, and src/cli/doctor imports accordingly
  - [ ] **4.3**: Gate: tokensave_dependency_depth max_chain drops to 12 or less, DSM largest_cluster shrinks with no new cycles, and node scripts/ci/run-tests/index.mjs all green
- [ ] **Step 5 - ARCH-5 (medium)**: Session, cache, and process seams are concrete and untested where it hurts most: in-memory Maps vanish on restart, the persistent cache does sync gzip and file IO on the request path, and tryExec serves 46 callers with no contract test
  - [ ] **5.1**: Define StoragePort and SessionStorePort interfaces in src/shared/_ports.js (get, set, delete, sweep) with in-memory and filesystem implementations; SessionRegistry and tool-cache depend on the port, not on Map or fs directly
  - [ ] **5.2**: Move ensureLoaded off the hot path: preload the gzip cache once at server startup in src/server/index.js and make callTool await the ready promise instead of sync-reading; replace gzipSync with async gzip in flush with the existing 2s debounce kept
  - [ ] **5.3**: Add contract tests for the two riskiest seams first: src/shared/**tests**/_process-contract.test.mjs for tryExec timeout and failure shape, and src/cli/daemon/**tests**/_service-platform.test.mjs for detectPlatform across darwin, linux, and win32; gate: test_risk no longer lists tryExec or detectPlatform in the top 15 and callTool p95 unchanged
- [ ] **Step 6 - ARCH-6 (medium)**: Flat files and single-caller registrars do not earn their module boundaries: six src/core and six src/tools siblings bypass their barrels while a dozen _register.js files exist only to be called once by loadAllSkills
  - [ ] **6.1**: Fold the six src/core flat files into their owning folders (enforcement, cache, git-hooks, post-process, directive) with index.js barrels as the only public entry per rule-styleguide-patterns; leave a re-export shim for one release only if an external import exists
  - [ ] **6.2**: Fold the six src/tools flat action tools behind src/tools/actions/index.js so the router sees one registration function per family instead of six siblings; update src/core/skills/_load.js to call the family registrar
  - [ ] **6.3**: Gate: rule_tool_fix lint on src passes, every src directory with .js has an index.js barrel, no non-barrel file without _ prefix remains outside **tests**, and foundations green
- [ ] **Step 7 - ARCH-7 (medium)**: Complexity is concentrated in a few god files that ship to every install: four skills assets carry 98 to 146 complexity points each while callTool, doctor formatting, roles, and self-update combine high fan-out with high CRAP and no tests
  - [ ] **7.1**: Split the four shipped god files by responsibility: _filters.js by filter family, _renderer.js by render phase, _expression-parser.js by tokenizer plus parser plus safe-context, _template-instance.js by template resolution plus instance lifecycle; keep each new module under 150 lines per the size ratchet
  - [ ] **7.2**: Reduce src hotspots without behavior change: extract callTool stage helpers (validate, cacheLookupOrCompute, finalizeAndRecord) into src/tools/router/call/_stages.js, and split formatDoctorTerminal and rolesCommand by output section; add missing branch tests for the self-update and roles paths
  - [ ] **7.3**: Gate: gini complexity drops below 0.60, no shipped file outside tests exceeds 300 complexity-weighted lines, callTool fan_out drops below 15, and coverage floor 90 holds
- [ ] **Step 8 - ARCH-8 (medium)**: Functionally duplicated bodies persist because src/shared is incomplete: shell, session, and telemetry helpers are copied across installers and fixtures instead of living once behind the shared barrel
  - [ ] **8.1**: Create src/shared/_shell.js exporting detectOs and extractBashFunction and refactor scripts/install.sh, scripts/uninstall.sh, and both cli fixtures onto it; keep shell behavior byte-identical with the existing installer tests as the gate
  - [ ] **8.2**: Create src/shared/_testkit.js exporting alive, until, and withHome fixtures and refactor src/core/session/**tests** and src/core/telemetry/store/**tests** onto it; delete the private copies with no dual path per ADR 061
  - [ ] **8.3**: Add the remaining structure-hygiene shared members _envelope.js, _fs.js, _env.js, and _syntax.js to src/shared with the no-duplicate-blocks gate covering them; gate: redundancy reports zero definite pairs under src and scripts and the new gate test green
- [ ] **Step 9 - ARCH-9 (medium)**: Three Node traffic patterns from the evidence skill are unhardened: a 95ms synchronous BM25 build blocks the loop, cache persistence does sync file and gzip IO, and self-update fetch has no timeout while its trigger is fire-and-forget
  - [ ] **9.1**: Yield the BM25 build off the event loop: keep restoreIndex fast path, chunk the full tokenize into 50ms slices with setImmediate yields, and document the 95ms budget in the startup report; gate: startup report shows no single block over 50ms
  - [ ] **9.2**: Give every outbound wait a deadline: add AbortSignal timeouts to self-update git fetch and gateway fetch paths, propagate the signal from callTool, and record timeout versus failure separately in telemetry
  - [ ] **9.3**: Make fire-and-forget durable where it matters: keep maybeSelfUpdate non-blocking but persist its checked versus updated outcome to the tool-cache namespace so a restart never replays a banner; gate: foundations plus startup report green with cache enabled
- [ ] **Step 10 - ARCH-10 (low)**: Future requirements have no seam to land in: transports are concrete branches, cache identity is a hidden namespace coupling, minimal versus full is a scattered boolean, and the MCP version is pinned with no negotiation path
  - [ ] **10.1**: Introduce a Transport interface in src/transport/_transport.js (start, stop, sessions) and implement stdio, SSE, and HTTP against it; move installStdioGuard and session-registry wiring behind the interface so server/index.js no longer branches on transport kind
  - [ ] **10.2**: Replace the IS_MINIMAL_TOOLS boolean with a ToolPolicy object (mode, allowlist version, reason) constructed once in src/cli/paths or env and passed to loadAllSkills and retainTools; log the active policy at startup
  - [ ] **10.3**: Record the seams in ADRs via rule_tool_process_adr: transport interface, storage port, and tool contract versioning; gate: new ADRs numbered and indexed, no direct imports of transport internals from server or CLI remain

## Why this order

Severity first, as the review sorts: the invocation cycle and the god initializer lead because every other change crosses them. The tool contract lands next because it freezes the public surface that steps 4 through 10 move under. Dependency depth and storage seams follow because they determine how far any later edit ripples. Barrel hygiene, god-file splits, and deduplication are the cohesion pass that the new boundaries make safe. Traffic hardening and future seams close the run because they depend on the ports and policies the earlier steps introduce.

## Step-by-step roadmaps

### Step 1 - ARCH-1: the invocation cycle (needs nothing, unlocks 2 and 3)

- Files: new `src/core/skills/_reload-port.js`; edits to `src/core/self-update/_run.js`, `_reload.js`, `_schedule.js`, `src/core/skills/_load.js`, `src/tools/_update.js`, `src/tools/gateway/_core.js`, `_register.js`, `src/tools/router/call/_pipeline.js`, `src/server/index.js`, `src/cli/_program.js`.
- Port shape: `{ reloadSkills(): Promise<void>, isReloading(): boolean }`; self-update depends only on the port type, never on the loader module.
- Bootstrap: `src/tools/index.js` exports `bootstrapCoreTools()` for gateway plus apply; `loadAllSkills` keeps only per-skill registration.
- Commands: `node scripts/ci/run-tests/index.mjs foundations`, `node ./bin/rule-mcp.js tools list`, tokensave circular query on the three directories.
- Gate (1.3): zero cycles reported, foundations green, tools list still shows 105 entries.

### Step 2 - ARCH-2: the god initializer (needs 1, feeds 3 and 6)

- Files: `src/core/skills/_load.js` plus new `src/core/skills/__tests__/_load-phases.test.mjs`.
- Static imports replace all 8 dynamic imports; the only remaining dynamic import in the file is the documented test hook, if any.
- Three phases: `resetForReload` clears caches and registry, `registerCoreTools` calls the bootstrap from step 1, `registerSkillTools` loops over `getSkillNames`.
- Commands: `pnpm lint`, `node scripts/ci/run-tests/index.mjs foundations`, tokensave coupling query.
- Gate (2.3): fan_out below 12, no `await import` in `src/core/skills` outside tests, suite green.

### Step 3 - ARCH-3: the tool contract (needs 1 and 2, protects 4 through 10)

- Files: new `src/tools/router/_contract.js` and `src/tools/router/__tests__/_entry-contract.test.mjs`; edits to `_hooks.js` (`registerTool` accepts `entry`), `_entry.js`, `_surface.js`, `src/core/skills/_load.js`, `src/core/skills/_minimal.js`.
- Contract: `TOOL_CONTRACT_VERSION` plus `{ from, to, removeAfter }` deprecation entries; old names alias for one release with one `stderr` warning each.
- Minimal mode skips registration instead of registering then retaining; `retainTools` stays only for tests and force-reload.
- Commands: `RULE_MCP_MINIMAL_TOOLS=1 node ./bin/rule-mcp.js tools list`, `pnpm census`, `pnpm census:check`.
- Gate (3.3): minimal list equals the allowlist exactly, docs-accuracy green, census counts quoted.

### Step 4 - ARCH-4: the 19-deep chain (needs 3, independent of 5)

- Files: `tests/docs/census-generated.test.mjs`, `scripts/reports/census/*`, `src/tools/index.js` facade, `src/cli/cache/*`, `src/cli/commands/*`, `src/cli/doctor/*`.
- Facade exports only what the CLI needs: `listTools`, `callTool`, `declaredTools`. No router, file-tree, or review-doc internals leak through.
- Census test reads the checked-in JSON snapshot; a separate schema test guards the shape.
- Commands: tokensave dependency depth query, tokensave DSM stats, `node scripts/ci/run-tests/index.mjs all`.
- Gate (4.3): max chain 12 or less, largest cluster smaller, no new cycles.

### Step 5 - ARCH-5: storage and process seams (needs 1, feeds 9)

- Files: new `src/shared/_ports.js` plus implementations; edits to `src/transport/session-registry/_registry.js`, `src/core/cache/tool-cache/*`, `src/server/index.js`, `src/shared/_process.js`, new contract tests.
- Cache preload returns a promise the server awaits once; `callTool` awaits readiness instead of calling `ensureLoaded` inline.
- `tryExec` contract pins timeout, encoding, and the empty-string-on-failure shape; `detectPlatform` pins all three platforms.
- Commands: `node --test src/shared/__tests__/`, `node --test src/cli/daemon/__tests__/`, tokensave test risk query.
- Gate (5.3): neither helper in the top 15 risks, callTool latency unchanged.

### Step 6 - ARCH-6: barrels that earn their keep (needs 2 and 3)

- Files: moves under `src/core/*` and new `src/tools/actions/index.js`; updates to every importer plus `src/core/skills/_load.js`.
- Rule from rule-styleguide-patterns: every directory with code has `index.js` as its only public entry; every non-barrel file is `_`-prefixed.
- Single-caller `_register.js` files merge into their family registrar; no shim survives past one release.
- Commands: `rule_tool_fix lint on src`, `pnpm lint`, `node scripts/ci/run-tests/index.mjs foundations`.
- Gate (6.3): fix lint clean, barrel rule holds, suite green.

### Step 7 - ARCH-7: god files (needs 6, feeds coverage)

- Files: splits under `skills/rule-frontend-template-engine/assets/template-engine/` and `skills/rule-frontend-vanilla-reactive/examples/src/core/template-engine/` plus `src/tools/router/call/_stages.js`, `src/cli/doctor/*`, `src/cli/roles/*`.
- Each new module stays under 150 lines; behavior stays byte-identical with existing tests as the guard.
- `callTool` becomes three stages with the same telemetry fields; no caller changes signature.
- Commands: `pnpm test:coverage`, tokensave gini query, `pnpm lint`.
- Gate (7.3): gini below 0.60, `callTool` fan_out below 15, floor 90 held.

### Step 8 - ARCH-8: deduplication (needs 6 and 7)

- Files: new `src/shared/_shell.js`, `src/shared/_testkit.js`, `_envelope.js`, `_fs.js`, `_env.js`, `_syntax.js`; edits to installers, fixtures, and session plus telemetry tests.
- Shell behavior stays byte-identical; installer tests are the gate for the shell move.
- Test fixtures merge with no dual path; the no-duplicate-blocks gate covers the new members.
- Commands: `node scripts/ci/run-tests/index.mjs installer`, `node scripts/ci/run-tests/index.mjs foundations`, tokensave redundancy query.
- Gate (8.3): zero definite pairs under `src` and `scripts`, gate test green.

### Step 9 - ARCH-9: traffic hardening (needs 5)

- Files: `src/core/bm25/_build.js`, `src/core/cache/tool-cache/_persistence.js`, `src/core/self-update/*`, `src/tools/router/call/_pipeline.js`, `src/core/telemetry/*`, `scripts/reports/startup/index.mjs`.
- BM25 keeps the 3ms restore fast path; the full 95ms tokenize yields every 50ms.
- Every network wait carries an `AbortSignal` with a per-operation deadline; telemetry distinguishes timeout from failure.
- Commands: `pnpm report:startup`, `node scripts/ci/run-tests/index.mjs foundations`.
- Gate (9.3): no block over 50ms in the startup report, suites green with cache enabled.

### Step 10 - ARCH-10: future seams (needs 1, 3, and 5)

- Files: new `src/transport/_transport.js`; edits to stdio, SSE, HTTP transports, `src/server/index.js`, `src/cli/*`, `src/core/cache/tool-cache/*`, `src/core/skills/_minimal.js`.
- `ToolPolicy` carries mode, allowlist version, and reason; startup logs the active policy once.
- Three ADRs record transport, storage, and contract decisions via `rule_tool_process_adr`.
- Commands: `node scripts/ci/run-tests/index.mjs all`, `pnpm census:check`.
- Gate (10.3): ADRs numbered and indexed, no transport-internal imports from server or CLI.

## Measured baseline (2026-09-11, this run)

| What              | How                                | Result                                                                              |
| ----------------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| Quality signal    | tokensave_health                   | 7441; depth 0.5789 is the binding constraint                                        |
| Worst cycle       | tokensave_circular                 | 8 nodes across pipeline, skills load, self-update, update tool, gateway             |
| Deepest chain     | tokensave_dependency_depth         | 19 vs ideal 11 through census, CLI, tools, file-tree, review docs, session registry |
| Inequality        | tokensave_gini                     | 0.7209 extreme; top outlier 146 points                                              |
| Hottest function  | tokensave_complexity plus hotspots | callTool 100 lines, fan_in 88, fan_out 25                                           |
| Riskiest untested | tokensave_test_risk                | registerBuiltinFilters 546, tryExec fan_in 46 at 282                                |
| Duplication       | tokensave_redundancy               | 20 definite pairs                                                                   |
| Tool surface      | tools list                         | 105 tools, 10 in minimal allowlist                                                  |
| Loader fan-out    | tokensave_coupling                 | _load.js 28 out, 20 in                                                              |
| Clusters          | tokensave_dsm                      | 343 clusters, largest 88 files, density 0.0009                                      |

## Dependencies

- 1 (cycle) before 2 (initializer) and 3 (contract): the port plus bootstrap are the joints the later moves pivot on.
- 2 before 6 (barrels): the phase split defines what each family registrar owns.
- 3 before 4 through 10: the contract freezes names so later moves cannot break clients.
- 5 (ports) before 9 (traffic): timeouts and async persistence land on the new storage seam.
- 6 before 7 and 8: barrels plus family registrars give god-file splits and shared helpers a home.
- 4 and 5 run in parallel after 3; 7 and 8 run in parallel after 6; 9 follows 5; 10 closes after 1, 3, and 5.
- Parallelism: after step 1 lands, steps 2 and 4 fork; after step 3 lands, steps 5 and 6 fork; the review sync on the next run picks up whichever landed.

## Deliberately not proposed

- Merging the 105 tools into a handful of dispatchers: ADR 056 already chose the gateway as the single entry point while keeping direct tools. Collapsing the surface would break the MCP contract this plan freezes in step 3.
- Rewriting in TypeScript or adding an ORM: ADR 002 chose vanilla JS over TypeScript and the server has no relational store. A language or storage migration is a separate program, not a boundary fix.
- Excluding `skills` assets from the published package to hide the gini: the assets are the product. Splitting them in step 7 keeps the value while cutting the inequality.
- Worker-thread offload for BM25 or compression: the measured blocks are 95ms at startup and sub-millisecond per call. Yielding plus caching in step 9 solves the observed problem without a pool.
- Editing ADR history to rename the old `rule-meta` taxonomy: the archive stays as the record. Only live names move, with aliases.

## Sources consulted

- Evidence skills loaded this run and treated as source of truth: rule-styleguide-patterns (barrels, `_` prefix, flex-first scope discipline), rule-backend-node (event loop, bounded concurrency, timeouts, durable background work, vetted `zod` plus `pino` baseline), rule-process-adr (Nygard template, immutable once accepted).
- Model Context Protocol specification 2025-06-18, transports: stdio spawns a subprocess per client, so startup and listTools cost are paid per connect. https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
- Node.js CLI documentation, NODE_COMPILE_CACHE: https://nodejs.org/api/cli.html#node_compile_cachecache_dir
- Node.js Best Practices 2026 edition: structure by components, layer components, wrap common utilities as packages, env-aware config, handle errors centrally, fail fast with a validation library, require modules first, set an explicit entry point. https://github.com/goldbergyoni/nodebestpractices
