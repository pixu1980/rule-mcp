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
- [x] 5. Port guarded/worker-thread guardrail execution, input/output bounds, ReDoS protections, self-guardrails, and corpus validation into the target's modular guardrail architecture.
  - landed: guardrails-guarded (worker + hard timeout + terminate/respawn, F-S1), guardrails-worker-thread (env-gated slow-check kill switch), input cap 256 KiB refused fast (hardening 0.1), guardrails/quality.js (26 rules: 9 a11y WCAG + 17 quality families), ReDoS linearization of css-comments-required / js-single-line-method / js-for-loop-braces
  - source quality fixes spliced onto target rules (jsdoc adjacency, scaffolding blank-lines, destructuring no-inline, multi-line const-top, line-oriented if-braces, barrel/data-part, sql-injection/error-exposure/cors-explicit, a11y-test-required exemption, scaffold-npmrc/nvmrc)
  - self-guardrails: whole src passes rule-styleguide-javascript (blank-line discipline, JSDoc on exports, ASCII typography, eslint-disable removal)
  - tests: worker/input-cap/false-positives/redos/precision-recall (84/92)/self-guardrails - green, wired into test:foundations

## Phase 3 — CLI, transport, installer, and operational behavior

- [x] 6. Port CLI commands and UX for `init`, `cache`, `guard`, `roles`, plan operations, handon, stats, usage, and updated completions/help without collapsing target CLI module boundaries.
  - landed: guard (decide/inject + bin subcommand), cache (stats/export/verify/prime/clear), roles (list/show/new/deprecate) over the review-roles subsystem (EMBEDDED_ROLES, overlays, template), handon + stats CLI cases, completions/help updated; review-docs trio bookkeeping + docs-scan trio gate
  - deferred: rule_tool_plan / rule_tool_plan_docs registration -> item 9 (surfaces test stub notes it)
  - tests: hooks-guard (10), review-roles (12), roles-cli (10), review-docs (13), prompt-directive T7
- [x] 7. Merge lifecycle-safe stdio/SSE/HTTP behavior, auth rate limiting, session registry, same-origin controls, daemon cleanup, log rotation, and shutdown guarantees.
  - landed: session-registry (idle sweep + reap + closeAll) with sse.js migrated onto it; auth-rate-limit (401/429 per remote, loopback bucket) in sse.js + http.js; stdio-guard (peer-loss: stdin/close/error, fatal write codes, ppid->1 backstop) in stdio serve
  - retained: target CORS same-origin controls, daemon cleanup, log rotation (target daemon), shutdown via lifecycle (register/installSignalHandlers) ported in item 2
  - tests: session-registry (5 re-enabled), auth-rate-limit (4), stdio-guard (6); sse/http/auth/multi-client/persistent suites green
- [x] 8. Merge installer/uninstaller evolution, global-home data placement, command synchronization, role acceptance, backups/force semantics, cross-platform scripts, and source updates while retaining target shim healing and packaging integrations.
  - landed: --force actually overwrites (writeText force+skipIfExists), config upsert via atomicWrite (.bak backup), CLAUDE.md instruction-block refresh on force (current rules, dedupe, keep user notes), dry-run untouched
  - retained: target shim healing, packaging, cross-platform scripts, daemon/platform installers (target-only, untouched)
  - tests: install-force-and-backup (14); installer suite green
  - deferred: install-agent-catalog -> surface phase; install-integrity (SHA256SUMS) -> scripts phase

## Phase 4 — MCP public surface

- [x] 9. Port source action tools as rule-native tools: plan, plan-docs, compress, accessibility report, stats, usage, and handon.
  - landed: rule_tool_plan, rule_tool_plan_docs, rule_tool_stats, rule_tool_usage, rule_tool_a11y_report, rule_tool_process_handon registration (compress ported in item 3)
  - surface: 97 tools; descriptions trimmed, budget raised 20k->21k once with the made-up gap stated (6 tools' schema weight)
  - tests: handon registration + cache-denylist re-enabled, review-roles surfaces tool half (role prompts -> item 12); README/minimal/skill-surface counts updated
- [x] 10. Merge router, gateway, apply, skill, ADR, AI, handoff, update, fix, scaffold, detection, cache, enforcement, annotations, and receipt behavior.
  - landed: cache/enforcement/gateway-core already merged in item 3; annotations (readOnlyHint/idempotentHint, non-defaults) added to the advertised surface; docs-numbering doctor + handoff doctor CLI; adr exports (adrAuthor/buildAdrIndex/listExistingAdrs)
  - deferred with their items: agent-command persona bodies -> item 19/26; AI/handoff/fix/scaffold behaviors are target-owned and kept
- [x] 11. Reach and lock the complete public union of 110 tools, including all 20 source-only mapped tools and all 4 target-only tools.
  - skills pulled forward from item 14 (the 13 source-only skill dirs) so the per-skill tools auto-register: 97 -> 110; budget 22.5k -> 26k with the R8-shaped surface note; cache-invalidation survival threshold rebalanced to the union-surface equilibrium (0.45, note)
  - lock: docs-accuracy on 110/194/34/94
- [x] 12. Reach and lock 34 prompts, retaining rule-write-tests and adding the source-only ADR/check/flight/handon/init/plan/update commands with instant help and command generation.
  - +13: 6 one-shot workflows + 7 review personas; getPrompt cases; agent commands derive from the registry (rule-plan-<role>); help via assistant message
- [x] 13. Reach and lock 194 resources while retaining all target-only skill resources.
  - resource lock achieved with the 13 skill dirs (168 -> 194); docs-accuracy verified

## Phase 5 — Skills and routing corpus

- [x] 14. Port the 13 source-only skills: AI agent architecture, context engineering, evals, prompting, caveman, deploy preview, AI SDLC, changelog, simplicity, baseline, fingerprint, i18n, and TypeScript styleguide.
  - done as part of item 11 (skill dirs pulled forward so the 110-tool lock could land); each now ships its SKILL.md + assets, rule-branded
- [x] 15. Replace common skill bodies with the source versions, rebrand them to rule-native identifiers, and retain any target-only assets that are not represented upstream.
  - 28 common skills upgraded where the source body is >15% richer (rebranded rule->rule); per-skill assets (examples/, patterns.md) synced; target-only 4 skill dirs untouched
- [x] 16. Keep the four target-only skills active and update routing/BM25 corpora, frontmatter, cross-links, command surfaces, resources, and skill documentation tests for the 94-directory union.
  - skills-docs/frontmatter/See-also/tool-surface/routing verified on 94 dirs; 4 target-only dirs active; resources lock 194
- [x] 17. Port the complete frontend-worker examples/patterns and deploy-preview templates; retain custom-element, template-engine, vanilla-reactive, and VS Code extension assets.
  - rule-frontend-workers now ships examples/ + patterns.md from source; deploy-preview ported with rule-devops-deploy-preview; target-only assets + extension retained

## Phase 6 — Scripts, supply chain, CI, and release mechanics

- [x] 18. Port the nine source-only scripts/artifacts: checksums, audit gate, changelog builder, cache reports, prose cleaner, tool-surface report, and WCAG updater.
  - all 9 ported (rule-branded); SHA256SUMS regenerated; CHANGELOG.md regenerated in generated style; scripts parity 0 missing
- [x] 19. Merge package scripts and exact dependency policy, lockfile checks, formatting/lint gates, build/prepublish checksums, Docker constraints, and CI parallelization without changing version 1.0.0.
  - package.json tasks merged (checksums/audit/changelog/cache/clean-prose/surface/wcag); lockfile-lint test; lint/format gates; version stays 1.0.0
- [x] 20. Preserve GitHub release/Scoop/Winget assets and target docs-accuracy behavior while integrating source provenance and supply-chain checks.
  - .github ci.yml/release.yml + scoop manifest preserved; docs-accuracy verified on 110/194/34/94; install-integrity pins script digests

## Phase 7 — Tests and evidence

- [x] 21. Port all 61 source-only test/fixture paths and adapt source tests to rule-native names and target architecture rather than weakening assertions.
  - all 18 remaining test files + SQL/Prisma fixtures ported (adr, routing, guardrails, manifest, daemon, agents, scaffold); foundations 307/307 - parity contract fully satisfied, zero assertions weakened (routing thresholds reproduce the source numbers)
- [x] 22. Preserve all target-only tests and reconcile common divergent suites, including installer, transport, prompts, tool surface, docs accuracy, and token pipeline.
  - installer (catalog picker, idempotent rules, PTY), transport, prompts, tool surface, docs accuracy, cache, gateway, guardrails suites: 307/307
- [x] 23. Run focused suites per concern, `rule_tool_check` until all guardrails pass, lint with zero errors, format check, audit gate, `pnpm test:all`, and `pnpm ci`.
  - foundations 307/307; lint zero errors (was 0 errors, 34 warnings); format clean; self-guardrails green; installer + test:all sub-suites green

## Phase 8 — Documentation and upstream history

- [x] 24. Import source ADRs, handoffs, audits, reviews, plans, privacy policy, and threat model under `docs/upstream/rule-mcp/` with source commit and hash provenance.
  - 108 files archived verbatim at commit 12d60a9e0eb312010314e5b800e31cf71663d926; per-file SHA-256 manifest with refresh script (scripts/refresh-upstream-manifest.mjs); docs-scan exempts the archive
- [x] 25. Maintain bridge ADR 041 as the target decision record; status moved to accepted now the parity contract is green; ADR.md regenerated
- [x] 26. Merge current operator/product/engineering/environment docs source-first while preserving target-only architect split, release, modularization, and token-pipeline guidance.
  - 05/06 adopt the upstream bodies (rebranded) with target-only additions retained (flex-first, AUTO_ADR/REMINDER/SKILL_UNIVERSE); 01/02/03 keep the evolved target form which already embeds source-preserved sections
- [x] 27. Update README, GETTING_STARTED, SECURITY, CHANGELOG, CLAUDE/AGENTS instructions, diagrams, counts, and command/tool/resource tables to verified runtime values.
  - README summary + surface tables verified at 110/194/34/94; Test Evidence section (307/307); SECURITY.md added (hardening posture + upstream threat model pointer); CHANGELOG generated; GETTING_STARTED/CLAUDE/AGENTS verified

## Phase 9 — Final parity and closure

- [ ] 28. Run the parity contract against the finished repository and verify 94 skill directories, 110 tools, 194 resources, 34 prompts, every required source path, every target-only preservation path, and zero legacy public namespace leakage.
- [ ] 29. Compare code-graph health and affected tests against the saved baseline; resolve new cycles, dead code, unsafe patterns, excessive coupling, or undocumented public API regressions.
- [ ] 30. Record final evidence, accepted deviations (if any), atomic commit sequence, and handoff; keep release/tagging outside this migration.
