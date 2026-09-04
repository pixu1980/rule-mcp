# Execution Plan — Complete rule-to-rule Port

## Goal and frozen baseline

Port the complete tracked behavior of `~/Projects/work/rule/ai/rule-mcp/` into this repository without modifying the source repository.

- Source: `develop@12d60a9e0eb312010314e5b800e31cf71663d926`
- Target baseline: `main@bd413da527685ca0bb6c1250ad4a0d9eb8140f6c`
- Source snapshot: 587 tracked files, 90 bundled skill directories, 106 tools, 186 resources, 33 prompts
- Expected additive union: 94 bundled skill directories (93 modular plus the `rule` router), 110 tools, 194 resources, 34 prompts
- Public namespace: `rule_tool_*`, `rule-*`, and `rule://` only
- Conflict policy: source wins for common skills; target-only capabilities remain active
- Version policy: keep `1.0.0` throughout the port
- Delivery policy: execute one phase at a time and request approval before the next phase

## Non-negotiable preservation rules

- Do not write to, switch, rebase, install into, or otherwise mutate the source repository.
- Preserve the target-only skills `rule-frontend-custom-element`, `rule-frontend-template-engine`, `rule-frontend-vanilla-reactive`, and `rule-platform-auth` with their assets and tests.
- Preserve target-only modular architecture, especially installer, daemon, help-text, guardrail, scaffold-parser, skill-frontmatter, and token-pipeline modules.
- Preserve `rules/`, editor/agent integrations, the VS Code extension, release workflow, docs-accuracy guard, pre-push hook, and target-only regression tests.
- Import upstream historical documents under a provenance namespace; do not rewrite them into the target ADR chronology.
- Every implementation phase follows RED → GREEN → REFACTOR, `rule_tool_check`, focused tests, then the affected/full suite.
- Every commit is atomic and uses `type(scope): subject`.

## Phase 1 — Deterministic parity contract

- [x] 1. Add a self-contained baseline fixture and failing contract test that pin the source commit, the complete expected public union, all source-only runtime/scripts/tests, and all target-only preservation requirements; RED verified with 8 tests: 3 preservation/baseline checks pass and 5 parity checks fail for the expected missing port.

## Phase 2 — Runtime foundations and architecture-aware merge

- [x] 2. Port source-only core foundations: project/home paths, lifecycle and reclaim, directives/hooks/resume, untrusted-content fencing, code signatures/fingerprints, ASCII output, Tokensave integration, WCAG data, KPI and project snapshots.
  - landed: ascii-box, untrusted, fingerprint, tool-budget, lifecycle, sandbox storm guard, tool-cache memory tier, reclaim, wcag-data, code-signature, paths (findProjectRoot/projectSlug/getProjectPaths/migrateProjectData), git-hooks, directive, agent-hooks, tokensave, telemetry-stats, kpi, project-snapshot, agent-transcripts, handon (core; registration lands Phase 4), resume, cli/init
  - surface trim: 27k -> 19.6k tokens (deleted zodSchema-shadow inputSchema + duplicated per-skill property descriptions); ragged-box pass fixed 13 files
  - deferred with their modules: SessionRegistry (+tests) -> item 7; cli/guard decide/skillForPath (+CLI tests) -> item 6; handon tool registration + cache denylist -> Phase 4; toFlight export test -> item 4; sandbox/transport storm + session tests -> items 4/7
  - ADR 042: pix_check brace-style guardrails conflict with the prettier gate on backend modules — repo gates are binding
- [x] 3. Port cache evolution: catalog, tiering, freshness, dependency-aware invalidation, routing evidence cache, reports, and telemetry accounting while preserving the target token pipeline.
  - landed: bm25 canonicalizeQuery + persisted index; tool-cache L0/L1 tiers, per-entry skill digests, freshness eviction, hits, cacheStore/cacheLookup/cachePrime/cacheEntries/promotableEntries; cache-catalog (rule-catalog.json, MIN_HITS=3); router _meta.pixCache + dependenciesOf/entryPathOf + recomputeCore; gateway routing-evidence core cache (rule_tool_gateway_core) with per-call receipts; rule_tool_compress; requestId moved after cache (ADR 062)
  - tests: cache-tiers (24), cache-invalidation (23), cache-catalog (15), gateway-cache-receipt (7), routing-corpus
- [x] 4. Port telemetry and flight recorder modules, privacy redaction, retention, share-safe exports, transport accounting, and process hygiene.
  - landed: telemetry-store (JSONL + rollups + purge/drain), telemetry (recordToolCall, prompt opt-out), telemetry-transport (local-only + redactForRemote), telemetry-flight (toFlight/redactFlight/exportFlight/pruneExports); router accounting (measured vs estimated split, reminder/caveman measured at the step)
  - tests: telemetry, flight-recorder (110 checks), flight-redact, flight-exports-retention, token-accounting
  - deferred: process-hygiene integration test -> item 7 (needs serve wiring); SessionRegistry tests -> item 7
- [ ] 5. Port guarded/worker-thread guardrail execution, input/output bounds, ReDoS protections, self-guardrails, and corpus validation into the target’s modular guardrail architecture.

## Phase 3 — CLI, transport, installer, and operational behavior

- [ ] 6. Port CLI commands and UX for `init`, `cache`, `guard`, `roles`, plan operations, handon, stats, usage, and updated completions/help without collapsing target CLI module boundaries.
- [ ] 7. Merge lifecycle-safe stdio/SSE/HTTP behavior, auth rate limiting, session registry, same-origin controls, daemon cleanup, log rotation, and shutdown guarantees.
- [ ] 8. Merge installer/uninstaller evolution, global-home data placement, command synchronization, role acceptance, backups/force semantics, cross-platform scripts, and source updates while retaining target shim healing and packaging integrations.

## Phase 4 — MCP public surface

- [ ] 9. Port source action tools as rule-native tools: plan, plan-docs, compress, accessibility report, stats, usage, and handon.
- [ ] 10. Merge router, gateway, apply, skill, ADR, AI, handoff, update, fix, scaffold, detection, cache, enforcement, annotations, and receipt behavior.
- [ ] 11. Reach and lock the complete public union of 110 tools, including all 20 source-only mapped tools and all 4 target-only tools.
- [ ] 12. Reach and lock 34 prompts, retaining `rule-write-tests` and adding the source-only ADR/check/flight/handon/init/plan/update commands with instant help and command generation.
- [ ] 13. Reach and lock 194 resources while retaining all target-only skill resources.

## Phase 5 — Skills and routing corpus

- [ ] 14. Port the 13 source-only skills: AI agent architecture, context engineering, evals, prompting, caveman, deploy preview, AI SDLC, changelog, simplicity, baseline, fingerprint, i18n, and TypeScript styleguide.
- [ ] 15. Replace common skill bodies with the source versions, rebrand them to rule-native identifiers, and retain any target-only assets that are not represented upstream.
- [ ] 16. Keep the four target-only skills active and update routing/BM25 corpora, frontmatter, cross-links, command surfaces, resources, and skill documentation tests for the 94-directory union.
- [ ] 17. Port the complete frontend-worker examples/patterns and deploy-preview templates; retain custom-element, template-engine, vanilla-reactive, and VS Code extension assets.

## Phase 6 — Scripts, supply chain, CI, and release mechanics

- [ ] 18. Port the nine source-only scripts/artifacts: checksums, audit gate, changelog builder, cache reports, prose cleaner, tool-surface report, and WCAG updater.
- [ ] 19. Merge package scripts and exact dependency policy, lockfile checks, formatting/lint gates, build/prepublish checksums, Docker constraints, and CI parallelization without changing version `1.0.0`.
- [ ] 20. Preserve GitHub release/Scoop/Winget assets and target docs-accuracy behavior while integrating source provenance and supply-chain checks.

## Phase 7 — Tests and evidence

- [ ] 21. Port all 61 source-only test/fixture paths and adapt source tests to rule-native names and target architecture rather than weakening assertions.
- [ ] 22. Preserve all target-only tests and reconcile common divergent suites, including installer, transport, prompts, tool surface, docs accuracy, and token pipeline.
- [ ] 23. Run focused suites per concern, `rule_tool_check` until all guardrails pass, lint with zero errors, format check, audit gate, `pnpm test:all`, and `pnpm ci`.

## Phase 8 — Documentation and upstream history

- [ ] 24. Import source ADRs, handoffs, audits, reviews, plans, privacy policy, and threat model under `docs/upstream/rule-mcp/` with source commit and hash provenance.
- [ ] 25. Maintain bridge ADR 041 as the target decision record; update its status only after the parity contract is green.
- [ ] 26. Merge current operator/product/engineering/environment docs source-first while preserving target-only architect split, release, modularization, and token-pipeline guidance.
- [ ] 27. Update README, GETTING_STARTED, SECURITY, CHANGELOG, CLAUDE/AGENTS instructions, diagrams, counts, and command/tool/resource tables to verified runtime values.

## Phase 9 — Final parity and closure

- [ ] 28. Run the parity contract against the finished repository and verify 94 skill directories, 110 tools, 194 resources, 34 prompts, every required source path, every target-only preservation path, and zero legacy public namespace leakage.
- [ ] 29. Compare code-graph health and affected tests against the saved baseline; resolve new cycles, dead code, unsafe patterns, excessive coupling, or undocumented public API regressions.
- [ ] 30. Record final evidence, accepted deviations (if any), atomic commit sequence, and handoff; keep release/tagging outside this migration.
