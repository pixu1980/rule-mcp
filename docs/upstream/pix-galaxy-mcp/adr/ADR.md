# Architecture Decision Records

Every decision this project has taken, newest first. The numbered files in
this directory are the source of truth; this index is generated from them by
`pix_process_adr`, so editing it by hand is work the next call throws away.

## Index

| # | Title | Date | Status | Tags |
|---|-------|------|--------|------|
| [089](089-the-frontend-surface-is-framework-skills-only-and-there-is-no-no-framework-path.md) | The frontend surface is framework skills only, and there is no no-framework path | 2026-09-04 | accepted | skills, frontend, routing, guardrails, installer |
| [088](088-the-numbering-doctor-also-names-authors-and-fix-commits-runs-on-its-own.md) | The numbering doctor also names authors, and --fix-commits runs on its own | 2026-09-04 | accepted | docs, adr, cli, tooling, git |
| [087](087-an-adr-names-the-person-who-decided-and-the-tool-is-the-fallback.md) | An ADR names the person who decided, and the tool is the fallback | 2026-09-04 | accepted | docs, adr, attribution, tooling |
| [086](086-a-sandbox-is-a-copy-of-one-template-and-the-fixture-refuses-to-build-in-the-real.md) | A sandbox is a copy of one template, and the fixture refuses to build in the real home | 2026-09-04 | accepted | testing, performance, paths, fixtures |
| [085](085-every-guardrail-rule-ships-with-a-labeled-pair.md) | Every guardrail rule ships with a labeled pair | 2026-09-04 | accepted | guardrails, testing, evals, css |
| [084](084-a-test-suite-pins-its-own-home-and-the-cheap-half-of-the-guard-runs-for-real.md) | A test suite pins its own home, and the cheap half of the guard runs for real | 2026-09-04 | superseded | testing, paths, telemetry, hygiene |
| [083](083-everything-a-project-is-recorded-in-lives-under-the-home-directory-and-the-proje.md) | Everything a project is recorded in lives under the home directory, and the project layer is gone | 2026-09-04 | accepted | telemetry, paths, privacy, personas |
| [082](082-the-test-suites-run-in-one-parallel-invocation-and-the-search-index-is-cached-on.md) | The test suites run in one parallel invocation and the search index is cached on disk | 2026-09-04 | accepted | performance, testing, cache, startup |
| [081](081-the-numbering-doctor-regenerates-the-index-and-reports-the-commits-it-cannot-fix.md) | The numbering doctor regenerates the index and reports the commits it cannot fix | 2026-09-04 | accepted | docs, adr, git, tooling |
| [080](080-a-cache-hit-replays-output-it-does-not-save-tokens.md) | A cache hit replays output; it does not save tokens | 2026-09-04 | accepted | telemetry, cache, tokens, measurement |
| [079](079-compression-and-the-reminder-are-each-measured-at-the-step-that-causes-them.md) | Compression and the reminder are each measured at the step that causes them | 2026-09-04 | accepted | telemetry, tokens, cache, measurement |
| [078](078-the-router-command-is-rule-and-one-command-writes-tests.md) | The router command is /rule and one command writes tests | 2026-09-04 | accepted | commands, prompts, naming, installer |
| [077](077-a-project-role-is-refused-until-the-project-accepts-that-version-of-it.md) | A project role is refused until the project accepts that version of it | 2026-09-04 | superseded | personas, security, trust, overlays |
| [076](076-the-persona-trio-is-kept-by-a-deterministic-helper-not-by-model-discipline.md) | The persona trio is kept by a deterministic helper, not by model discipline | 2026-09-04 | accepted | personas, docs, tools, determinism |
| [075](075-caveman-compression-is-measured-at-its-own-step-and-it-is-a-small-real-saving.md) | Caveman compression is measured at its own step, and it is a small real saving | 2026-09-04 | accepted | tokens, telemetry, caveman, evals |
| [074](074-the-workflow-reminder-is-stated-once-a-session-and-re-anchored-on-a-cadence.md) | The workflow reminder is stated once a session and re-anchored on a cadence | 2026-09-04 | accepted | tokens, enforcement, telemetry, defaults |
| [073](073-review-personas-are-registry-data-and-every-surface-is-generated-from-it.md) | Review personas are registry data, and every surface is generated from it | 2026-09-03 | accepted | personas, prompts, tools, registry, commands |
| [072](072-auto-update-is-notify-only-by-default-the-merge-happens-when-the-user-asks.md) | Auto-update is notify-only by default; the merge happens when the user asks | 2026-09-03 | accepted | security, self-update, supply-chain, defaults |
| [071](071-dependencies-are-exact-pins-at-the-latest-release-by-default-on-every-surface.md) | Dependencies are exact pins at the latest release, by default, on every surface | 2026-09-03 | accepted | dependencies, supply-chain, policy, enforcement |
| [070](070-the-flight-recorder-measures-what-the-server-costs-and-lives-with-the-project.md) | The flight recorder measures what the server costs, and lives with the project | 2026-09-03 | accepted | telemetry, flight-recorder, kpi, privacy, paths, git-hooks |
| [069](069-flex-is-the-default-layout-tool-and-grid-is-the-exception-enforced-by-a-guardrai.md) | Flex is the default layout tool and grid is the exception, enforced by a guardrail with a stated-reason escape | 2026-09-03 | accepted | css, guardrails, skills, styleguide, layout |
| [068](068-nothing-the-server-starts-outlives-it-one-shutdown-path-an-orphan-guard-and-idle.md) | Nothing the server starts outlives it: one shutdown path, an orphan guard, and idle memory release | 2026-09-02 | accepted | architecture, lifecycle, process, memory, transport |
| [067](067-the-roadmap-is-finished-except-r8-which-is-paused-and-says-what-it-would-need.md) | The roadmap is finished except R8, which is paused and says what it would need | 2026-09-01 | accepted | roadmap, planning, skills, tools, documentation |
| [066](066-lint-and-format-become-gates-and-the-two-tools-stop-undoing-each-other.md) | Lint and format become gates, and the two tools stop undoing each other | 2026-09-01 | accepted | lint, prettier, eslint, ci, guardrails |
| [065](065-fifty-three-topics-distilled-into-twenty-existing-skills-and-the-one-not-written.md) | Fifty-three topics distilled into twenty existing skills, and the one not written | 2026-09-01 | accepted | skills, content, routing, corpus, documentation |
| [064](064-the-installer-backs-up-before-it-writes-and-force-means-something.md) | The installer backs up before it writes, and --force means something | 2026-09-01 | accepted | installer, cli, safety, lint, defects |
| [063](063-the-catalog-is-the-half-of-the-cache-a-team-inherits-and-verify-is-what-makes-it.md) | The catalog is the half of the cache a team inherits, and verify is what makes it trustworthy | 2026-09-01 | accepted | cache, catalog, cli, determinism, tokens |
| [062](062-the-gateway-caches-its-route-evidence-and-verdict-and-mints-its-receipt-on-every.md) | The gateway caches its route, evidence and verdict, and mints its receipt on every call | 2026-09-01 | accepted | cache, gateway, security, measurement, tokens |
| [061](061-one-page-per-session-across-two-processes-and-the-scaffold-section-that-was-neve.md) | One page per session across two processes, and the scaffold section that was never written | 2026-08-31 | accepted | handoff, session, scaffold, guardrails, correctness |
| [060](060-the-prompt-is-the-second-resume-signal-because-most-harnesses-have-no-first-one.md) | The prompt is the second resume signal, because most harnesses have no first one | 2026-08-31 | accepted | handoff, session, cache, router, hooks |
| [059](059-exact-dependency-versions-and-no-corepack-fields-checked-on-every-manifest.md) | Exact dependency versions and no corepack fields, checked on every manifest | 2026-08-31 | accepted | guardrails, pnpm, dependencies, reproducibility, toolchain |
| [058](058-a-resumed-session-picks-up-its-own-handoff-verified-before-the-first-prompt.md) | A resumed session picks up its own handoff, verified, before the first prompt | 2026-08-31 | accepted | hooks, handoff, session, harness, tokens |
| [057](057-no-similarity-tier-above-the-normalized-key-because-no-threshold-both-replays-an.md) | No similarity tier above the normalized key, because no threshold both replays and replays correctly | 2026-08-31 | accepted | cache, measurement, routing, tokens, correctness |
| [056](056-advertise-narrows-the-tool-surface-and-the-skill-tool-path-is-barely-used.md) | Advertise narrows the tool surface, and the skill-tool path is barely used | 2026-08-31 | accepted | tools, tokens, measurement, mcp, schema, skills |
| [055](055-cache-freshness-is-per-entry-not-per-namespace.md) | Cache freshness is per entry, not per namespace | 2026-08-31 | accepted | cache, invalidation, skills, determinism, measurement |
| [054](054-the-cache-tier-is-decided-by-the-output-not-by-the-tool.md) | The cache tier is decided by the output, not by the tool | 2026-08-31 | accepted | cache, measurement, telemetry, determinism, routing |
| [053](053-handon-verifies-a-handoff-rather-than-summarizing-it.md) | Handon verifies a handoff rather than summarizing it | 2026-08-31 | accepted | handon, handoff, tooling, determinism, tokens |
| [052](052-one-generated-adr-index-because-the-hand-kept-one-went-stale.md) | One generated ADR index, because the hand-kept one went stale | 2026-08-31 | accepted | adr, documentation, tooling, generation, cleanup |
| [051](051-a-drawn-box-is-a-rectangle-and-the-house-spelling-reaches-every-file.md) | A drawn box is a rectangle, and the house spelling reaches every file | 2026-08-31 | accepted | fingerprint, output, guardrails, ascii, house-style |
| [050](050-retire-the-rules-directory-and-move-what-was-unique-into-the-skills.md) | Retire the rules directory and move what was unique into the skills | 2026-08-31 | accepted | skills, documentation, guardrails, i18n, cleanup |
| [049](049-route-with-the-bm25-index-the-server-already-had.md) | Route with the BM25 index the server already had | 2026-08-30 | accepted | routing, bm25, search, quality, measurement |
| [048](048-measure-the-tool-surface-before-optimizing-it-then-guard-the-number.md) | Measure the tool surface before optimizing it, then guard the number | 2026-08-30 | accepted | performance, tokens, tools, mcp, ci |
| [047](047-local-telemetry-that-keeps-the-estimate-out-of-the-total.md) | Local telemetry that keeps the estimate out of the total | 2026-08-30 | accepted | telemetry, privacy, tokens, observability, flight-recorder |
| [046](046-vendor-wcag-and-make-the-conformance-report-refuse-to-overstate-itself.md) | Vendor WCAG and make the conformance report refuse to overstate itself | 2026-08-29 | accepted | a11y, wcag, guardrails, determinism, tools |
| [045](045-three-skills-for-working-with-ai-and-one-attribution-table.md) | Three skills for working with AI, and one attribution table | 2026-08-29 | accepted | skills, evals, sdlc, prompting, attribution |
| [044](044-split-typescript-by-concern-and-fill-the-skills-with-the-failure-modes-they-skip.md) | Split TypeScript by concern and fill the skills with the failure modes they skipped | 2026-08-29 | accepted | typescript, skills, guardrails, routing, backend |
| [043](043-ai-fingerprint-removal-is-a-deterministic-output-layer-not-a-prompt-rule.md) | AI-fingerprint removal is a deterministic output layer, not a prompt rule | 2026-08-29 | accepted | fingerprint, tokens, guardrails, output, skills |
| [042](042-per-prompt-rules-live-in-harness-hooks-not-in-prose.md) | Per-prompt rules live in harness hooks, not in prose | 2026-08-29 | accepted | hooks, tokens, enforcement, directive |
| [041](041-preview-environments-torn-down-via-gitlab-on-stop-not-a-post-merge-pipeline.md) | Preview environments torn down via GitLab on_stop, not a post-merge pipeline | 2026-08-29 | accepted | devops, gitlab-ci, digitalocean, preview-environments |
| [040](040-the-irreversible-step-is-a-harness-gate-and-a-scope-challenge-is-a-route.md) | The irreversible step is a harness gate, and a scope challenge is a route | 2026-08-11 | accepted | over-engineering, guardrails, hooks, routing, migrations, harness |
| [039](039-a-stale-code-graph-is-a-refresh-instruction-and-unrequested-scope-is-a-blocked-o.md) | A stale code graph is a refresh instruction, and unrequested scope is a blocked outcome | 2026-08-11 | accepted | tokensave, guardrails, routing, over-engineering, installer |
| [038](038-the-installer-offers-the-whole-agent-catalog-not-the-detection-result.md) | The installer offers the whole agent catalog, not the detection result | 2026-08-06 | accepted | installer, agents, ux, devin, windsurf, deprecation |
| [037](037-port-five-skills-from-a-sibling-corpus-merging-rather-than-replacing-on-collision.md) | Port five skills from a sibling corpus, merging rather than replacing on collision | 2026-08-06 | accepted | skills, taxonomy, porting, backend, platform, process, styleguide |
| [036](036-off-main-thread-work-is-its-own-skill-not-a-section-per-framework.md) | Off-main-thread work is its own skill, not a section per framework | 2026-08-06 | accepted | skills, taxonomy, frontend, performance, workers, routing |
| [035](035-install-and-uninstall-never-touch-the-project-directory.md) | Install and uninstall never touch the project directory | 2026-08-04 | accepted | architecture, installer, uninstaller, safety, scripts |
| [034](034-registry-driven-clean-slash-commands-for-every-agent-and-ide.md) | Registry-driven clean slash commands for every agent and IDE | 2026-08-04 | accepted | architecture, cli, agents, slash-commands, vscode |
| [033](033-the-tool-surface-is-skills-and-nothing-else.md) | The tool surface is ./skills and nothing else | 2026-08-04 | accepted | architecture |
| [032](032-pin-the-self-update-remote-and-drop-root-in-the-container.md) | Pin the self-update remote and drop root in the container | 2026-08-04 | accepted | architecture |
| [030](030-bind-write-authorization-to-destinations-not-just-content.md) | Bind write authorization to destinations, not just content | 2026-08-04 | accepted | architecture |
| [029](029-clean-rule-commands-via-user-commands-prompt-suppression-not-a-plugin.md) | Clean /rule-* commands via user commands + prompt suppression, not a plugin | 2026-08-03 | accepted | commands, claude, mcp, installer |
| [028](028-migrare-il-tooling-del-repo-a-eslint-10-flat-config-con-eslint-plugin-unicorn.md) | Migrare il tooling del repo a ESLint 10 flat config con eslint-plugin-unicorn | 2026-08-03 | accepted | eslint, toolchain, unicorn, flat-config, migration, security, brace-expansion |
| [027](027-adottare-eslint-plugin-unicorn-per-la-qualita-js-ts.md) | Adottare eslint-plugin-unicorn per la qualità JS/TS | 2026-08-03 | accepted | eslint, toolchain, unicorn, javascript, typescript, styleguide, guardrails, quality |
| [026](026-rafforzare-la-disciplina-typescript-per-grandi-codebase.md) | Rafforzare la disciplina TypeScript per grandi codebase | 2026-08-02 | accepted | typescript, toolchain, strict, monorepo, quality |
| [025](025-rafforzare-le-skill-sui-vincoli-relazionali-del-database.md) | Rafforzare le skill sui vincoli relazionali del database | 2026-08-02 | accepted | database, sql, postgresql, mysql, schema |
| [024](024-installer-lossless-preservare-toolprefix-e-normalizzare-le-righe-vuote-delle-reg.md) | Installer lossless: preservare toolPrefix e normalizzare le righe vuote delle regole | 2026-08-01 | accepted | installer, idempotenza, toolPrefix, mcp-config |
| [023](023-self-update-per-invocazione-con-throttle-temporale-e-fire-and-forget.md) | Self-update per-invocazione con throttle temporale e fire-and-forget | 2026-08-01 | accepted | self-update, mcp-server, operational, background |
| [022](022-add-rule-toolchain-commits-skill-for-atomic-conventional-commits-with-mandatory-s.md) | Add rule-toolchain-commits skill for atomic conventional commits with mandatory scope | 2026-08-01 | accepted | taxonomy, skills, routing, git, toolchain |
| [021](021-rename-rule-mcp-agents-to-rule-mcp-agents-and-add-rule-mcp-collector-skill.md) | Rename rule-mcp-agents to rule-mcp-agents and add rule-mcp collector skill | 2026-08-01 | accepted | taxonomy, skills, routing, ai |
| [018](018-fix-install-uninstall-estensione-vs-code-e-derivati.md) | Fix install/uninstall estensione VS Code e derivati | 2026-07-19 | superseded | vscode, extension, installer, cursor, windsurf |
| [017](017-integrazione-nativa-claude-skills.md) | integrazione nativa claude skills | - | proposed | - |
| [016](016-documentazione-e-see-also-nelle-skill.md) | documentazione e see also nelle skill | - | proposed | - |
| [014](014-installer-lossless-e-idempotente.md) | installer lossless e idempotente | - | proposed | - |
| [013](013-timeout-sandbox-con-abortcontroller.md) | timeout sandbox con abortcontroller | - | proposed | - |
| [012](012-server-sse-con-autenticazione-bearer.md) | server sse con autenticazione bearer | - | proposed | - |
| [011](011-use-a-persistent-local-bearer-token-for-daemon-transport.md) | use a persistent local bearer token for daemon transport | 2026-07-16 | accepted | architecture, security, mcp, daemon |
| [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) | fail closed mcp enforcement and reusable agent commands | 2026-07-11 | accepted | architecture, security, mcp, guardrails, agents |
| [009](009-file-based-skill-loading.md) | File-Based Skill Loading over Database | 2026-06-20 | Accepted | - |
| [008](008-sdk-over-handrolled-protocol.md) | Official MCP SDK over Hand-Rolled Protocol | 2026-06-23 | Accepted | - |
| [007](007-vanilla-js-over-typescript.md) | Vanilla JS over TypeScript | 2026-06-20 | Accepted | - |
| [006](006-forms-per-framework.md) | Forms per Framework - Merger & Distribution | 2026-07-11 | accepted | architecture, forms, frontend, refactoring, solid |
| [005](005-toolchain-vite.md) | Toolchain Skill Isolation (Vite) | 2026-07-10 | accepted | skills, toolchain, vite, build |
| [004](004-database-skills.md) | Database Skills | 2026-07-10 | accepted | skills, database, sql, nosql, new |
| [003](003-backend-framework-skills.md) | Backend Framework Skills | 2026-07-10 | accepted | skills, backend, frameworks, new |
| [002](002-scaffold-consolidation.md) | Scaffold Skill Consolidation | 2026-07-10 | accepted | infrastructure, skills, scaffolding, merge |
| [001](001-thematic-skill-rename.md) | Thematic Skill Taxonomy Rename | 2026-07-10 | accepted | infrastructure, naming, taxonomy, breaking-change |

## What each decision says

The opening sentence of each decision and of what it cost, lifted from the
file. Where a line stops short the rest is in the ADR.

| ADR | Decision | Consequence |
|-----|----------|-------------|
| [089](089-the-frontend-surface-is-framework-skills-only-and-there-is-no-no-framework-path.md) | The frontend area is the framework skills, the meta-framework skills, workers, and the area index. | The surface is 105 tools, 184 resources, 88 skills and 84 guardrail rules, from 108, 190, 91 and 93; the corpus is 168 snippets over 84 of 84 rules and the floor moved with it. ci stays green at 48.0s and the repository... |
| [088](088-the-numbering-doctor-also-names-authors-and-fix-commits-runs-on-its-own.md) | The plan carries plan.authors: ADRs whose author names a tool or nobody, with the person taken from the commit that added the file and the current git identity as the fallback. --fix repairs them, replacing the tool name... | The doctor now exits 1 on a repository whose ADRs name a tool, which is a new way for a dry run to be non-zero and the reason this repository was backfilled first. --fix-commits acting without a plan means it can rewrite... |
| [087](087-an-adr-names-the-person-who-decided-and-the-tool-is-the-fallback.md) | adrAuthor() reads user.name and user.email from git config and returns Name <address>; a name with no address stands alone, and a machine with no identity configured falls back to rule-mcp rather than inventing a... | An ADR now says who to ask, and the address is one that is already in every commit of this repository. |
| [086](086-a-sandbox-is-a-copy-of-one-template-and-the-fixture-refuses-to-build-in-the-real.md) | The sandbox is built once per process and every later one is a copy: test/fixtures/git-sandbox.mjs, 746ms to build and 39ms to copy, with origin re-pointed at the copy's own upstream so sandboxes cannot fetch from each... | ci went from 67.7s to 46.3s: 19s from the timers and 9s from the fixtures. |
| [085](085-every-guardrail-rule-ships-with-a-labeled-pair.md) | 34 entries close the gap: coverage is 93 of 93 rules over 186 snippets, precision and recall perfect on every one, and COVERED_RULES_FLOOR equals the rule count, so a rule shipped without a bad/good pair fails the suite... | The corpus has now found five defects, this being the fifth. |
| [084](084-a-test-suite-pins-its-own-home-and-the-cheap-half-of-the-guard-runs-for-real.md) | Every suite that creates fixture projects sets process.env.HOME to a temp directory, the idiom project-dir-central already used: homedir() reads HOME, so nothing new has to be configured, and a suite that asserts the... | No suite writes outside a temp home: a full ci run added zero directories to the real projects root, where it added twenty before. |
| [083](083-everything-a-project-is-recorded-in-lives-under-the-home-directory-and-the-proje.md) | Nothing is written into a project. | This supersedes ADR 076 entirely and the part of ADR 069 that put a recording in the project; both now carry the backlink the index gate enforces. |
| [082](082-the-test-suites-run-in-one-parallel-invocation-and-the-search-index-is-cached-on.md) | The node:test suites run as one invocation with a 180 second per-test timeout. node:test already runs each file in its own child process, so the isolation every suite relies on is unchanged and only the waiting is gone:... | A failing suite still fails the run, but the output is now interleaved across 45 files rather than printed one file at a time, so reading a failure means finding its file in the report. |
| [081](081-the-numbering-doctor-regenerates-the-index-and-reports-the-commits-it-cannot-fix.md) | applyRenumber regenerates docs/adr/ADR.md when an ADR moved and, on its own, when the index is out of order - a repository with no duplicate numbers can still have an index whose rows climb where the generator descends,... | --fix now touches docs/adr/ADR.md on every ADR renumber, so a repair that used to change one file plus references changes the index as well, and a reviewer sees a regenerated index in the diff. --fix-commits uses git... |
| [080](080-a-cache-hit-replays-output-it-does-not-save-tokens.md) | The cache leaves the token accounting. | The headline saving falls by roughly the hit rate times the payload: from 27868 to 1004 on the session measured above, and from 1130 to 130 on the committed fixture. |
| [079](079-compression-and-the-reminder-are-each-measured-at-the-step-that-causes-them.md) | finalize returns reminderTokens beside cavemanSaved, both measured across the step that causes them: the reminder is the difference between the reminded result and the core, the compression is the difference between the... | reminderOverhead and savedBySource.caveman both rise for the same traffic, so figures from before this change are not comparable with figures after it; the ratio between them is the number worth quoting, and on the... |
| [078](078-the-router-command-is-rule-and-one-command-writes-tests.md) | The router command is /rule, and it is the only name: the old file is pruned on the next install or agent-commands run rather than kept as an alias, so there is one name to learn and none to keep in sync. | Anyone with muscle memory for /rule-mcp or /rule-write-tests loses it, and existing installs keep the stale files until they re-run the installer or `rule-mcp agent-commands`, at which point prune removes... |
| [077](077-a-project-role-is-refused-until-the-project-accepts-that-version-of-it.md) | A project-layer role is refused on first use. | A project that ships roles now needs one accept per role per version before either plan tool will use them, which is friction on purpose and lands on whoever first runs a persona in a fresh clone. |
| [076](076-the-persona-trio-is-kept-by-a-deterministic-helper-not-by-model-discipline.md) | src/core/review-docs.js does the bookkeeping and pix_plan_docs exposes it: give it a role and the findings this run reported, and it writes the three skeletons with their headers, merges the findings against what the... | A persona run that ignores pix_plan_docs still works and writes whatever it writes, so the helper is the easy path rather than a gate; C.3's docs-scan extension is what turns the contract into something enforced, and... |
| [075](075-caveman-compression-is-measured-at-its-own-step-and-it-is-a-small-real-saving.md) | The saving is measured across the compression step alone. finalizeResult became finalize(name, core), which returns the final result and cavemanSaved, the difference between the reminded result and the compressed one,... | savedBySource.caveman and cavemanRatio become non-zero on every session with prose in it, so any dashboard or note that quoted the old zero is now wrong and the flight exports from before this change are not comparable... |
| [074](074-the-workflow-reminder-is-stated-once-a-session-and-re-anchored-on-a-cadence.md) | The reminder is emitted once per session and re-anchored periodically instead of riding every result. | A model that ignores the opening contract now has four quiet calls before the next re-anchor rather than an immediate repeat, which is the trade being made deliberately: the routing corpus and the full ci suite are... |
| [073](073-review-personas-are-registry-data-and-every-surface-is-generated-from-it.md) | A role is data in src/core/review-roles.js: id, role title, years, skills, the rule skills it loads as evidence, the lenses it looks through, and a status of active, proposed or deprecated. | Positive: activating, refining or deprecating a role changes every entry point at once; a deprecated role leaves the surfaces but keeps its id so old audits stay attributable; a user or a team can add a role without... |
| [072](072-auto-update-is-notify-only-by-default-the-merge-happens-when-the-user-asks.md) | The update check keeps running on the same throttle, but the default becomes notify-only: when upstream is ahead, the banner announces "update available (from->to, N commits behind), run pix_update or rule-mcp... | Positive: the rug-pull window closes - code changes only on explicit user action; the banner keeps update pressure visible; signature verification still composes on top of explicit merges. |
| [071](071-dependencies-are-exact-pins-at-the-latest-release-by-default-on-every-surface.md) | Adopt exact-latest as the default dependencies policy on every surface. | Positive: security patches flow by default; manifests read as facts (the version named is the version installed); one sentence of policy is carried mechanically instead of remembered. |
| [070](070-the-flight-recorder-measures-what-the-server-costs-and-lives-with-the-project.md) | Record what was missing and keep it with the project. | The honest numbers cost something. |
| [069](069-flex-is-the-default-layout-tool-and-grid-is-the-exception-enforced-by-a-guardrai.md) | Flex first, and grid has to earn itself. | A grid now costs a sentence explaining itself, which is the point: the four cases are cheap to declare and everything else converts to flex in one line. |
| [068](068-nothing-the-server-starts-outlives-it-one-shutdown-path-an-orphan-guard-and-idle.md) | Add one shutdown path and make every other lifecycle concern register with it. | A killed client no longer leaves a spinning orphan; the daemon starts without a second process babysitting its pipes and stops for certain; an idle daemon gives back the ~100 MB of rebuildable heap it was holding. |
| [067](067-the-roadmap-is-finished-except-r8-which-is-paused-and-says-what-it-would-need.md) | **R8 is paused after M1, not abandoned and not finished.** `rule-styleguide-baseline` shipped: three support states rather than a percentage, what a fallback actually costs, progressive enhancement, and the project... | `docs/plans/` and `docs/handoff/` are removed. |
| [066](066-lint-and-format-become-gates-and-the-two-tools-stop-undoing-each-other.md) | **ESLint errors go to zero and the warning threshold goes to zero with them**, in the script and in the workflow. | **Reading warnings found two defects that no test reported**, both in the installer and both fixed under ADR 063: a documented `--force` flag that nothing read, and configuration written without a backup while the writer... |
| [065](065-fifty-three-topics-distilled-into-twenty-existing-skills-and-the-one-not-written.md) | Nineteen top-level sections, forty-five headings in total, across twenty existing skills. **No new skill, and therefore no new tool.** A section costs tokens only when someone loads it; a tool costs them on every turn. | Routing went from 56/64 exact to 76/91, and stayed at 100% top-or-alternative. |
| [064](064-the-installer-backs-up-before-it-writes-and-force-means-something.md) | One writer. | `test/install-force-and-backup.test.mjs` pins both, and it was checked against the previous implementation: three of its eight assertions fail there and all eight pass now. |
| [063](063-the-catalog-is-the-half-of-the-cache-a-team-inherits-and-verify-is-what-makes-it.md) | Two files with two purposes, because conflating them is what turns a catalog into a dump. | **The first thing `verify` found was in this repository.** `postprocessToolResult` minted a fresh request id into every result, and its own docstring claimed the output contained nothing state-dependent and was safe to... |
| [062](062-the-gateway-caches-its-route-evidence-and-verdict-and-mints-its-receipt-on-every.md) | `pix_gateway` stays on `NON_CACHEABLE` and always runs. | The split's saving is real but small, and its shape is now on record: the routing and the evidence were never the cost, because they were already cached one level down. |
| [061](061-one-page-per-session-across-two-processes-and-the-scaffold-section-that-was-neve.md) | A record in the state directory, keyed by project. | The double injection is gone in the case that produced it. |
| [060](060-the-prompt-is-the-second-resume-signal-because-most-harnesses-have-no-first-one.md) | A second signal, the prompt itself. | Every MCP client is now covered, not only Claude Code: pi, codex, cursor and gemini get the handoff on the first tool call of a resumed session, provided the model routes the prompt, which the session directive already... |
| [059](059-exact-dependency-versions-and-no-corepack-fields-checked-on-every-manifest.md) | Two shared guardrails, `pkg-exact-versions` and `pkg-no-corepack`, in `MANIFEST_GUARDRAILS` and spread into `SHARED_GUARDRAILS` so they run for every skill. | `test/manifest-guardrails.test.mjs` covers the range vocabulary, the specifiers that are not ranges, the peer exemption, both corepack spellings, and the file gate. |
| [058](058-a-resumed-session-picks-up-its-own-handoff-verified-before-the-first-prompt.md) | The `session-start` guard now reads its payload, and on `source: "resume"` it injects the output of `handon()` behind the session directive. | A resumed Claude Code session starts with the handoff already verified, at the cost of one page of context on resumed sessions only and nothing on any other session. |
| [057](057-no-similarity-tier-above-the-normalized-key-because-no-threshold-both-replays-an.md) | L2 is not built. | The script is kept even though it produced a decision not to build. |
| [056](056-advertise-narrows-the-tool-surface-and-the-skill-tool-path-is-barely-used.md) | Two things, and the ordering matters: trim first, and the trim turned out to be larger than any raise would have been. | Two new skills, `rule-mcp-context-engineering` and `rule-mcp-agent-architecture`, at 195 and 207 lines. |
| [055](055-cache-freshness-is-per-entry-not-per-namespace.md) | Each entry records the content digests of the skills that produced it, and freshness is checked on the read that finds it. | Measured by `scripts/cache-report.mjs` after the routing corpus: 108 entries, and the worst single skill edit is `rule-platform-web` with 36 dependents, so **67% of the cache survives it against 0% before**. The... |
| [054](054-the-cache-tier-is-decided-by-the-output-not-by-the-tool.md) | Two mechanisms, because one is not enough. | On the 53-prompt routing corpus, a rephrased pass replays 0% with the exact key alone and 98% with the normalized key, and the floor is held at 80% in `test/cache-tiers.test.mjs` alongside the assertion that L0 alone... |
| [053](053-handon-verifies-a-handoff-rather-than-summarizing-it.md) | `pix_process_handon` parses what a handoff claims and checks each claim against the repository as it is now: branch existence and whether it merged, how many commits landed after the range the handoff covers, whether... | On this repository's own handoff the report is 786 characters against 3,257, so a resume costs a quarter of a paste. |
| [052](052-one-generated-adr-index-because-the-hand-kept-one-went-stale.md) | One file, `docs/adr/ADR.md`, and everything in it derived from the ADR files. | The index gained the ten decisions the summary was missing and can never miss another. |
| [051](051-a-drawn-box-is-a-rectangle-and-the-house-spelling-reaches-every-file.md) | Both become deterministic passes rather than things to remember. | `node scripts/clean-prose.mjs` reports zero across 548 files rather than 451, and the number now includes ragged box lines. |
| [050](050-retire-the-rules-directory-and-move-what-was-unique-into-the-skills.md) | Retire the directory, and move what was genuinely unique before deleting it rather than after. | One guardrail and one document no longer disagree, and `test/skills-docs.test.mjs` pins that: `const enum` may be named only on a line that also names the guardrail rejecting it, and `rules/` must not come back. |
| [049](049-route-with-the-bm25-index-the-server-already-had.md) | Measure first, as P7 taught. test/routing-corpus.mjs collects 47 real prompts from the spot checks run while adding skills, plus the framework-bias cases already pinned elsewhere; the hand-rolled scorer scored 74% exact... | 87% exact and 100% top-or-alternative, with no prompt left unable to reach its skill. test/routing-corpus.test.mjs holds a floor at 80% and 95%, deliberately below where the scorer sits so an ordinary skill edit does not... |
| [048](048-measure-the-tool-surface-before-optimizing-it-then-guard-the-number.md) | Measure first. scripts/tool-surface-report.mjs reports the weight and its distribution, and test/tool-surface-budget.test.mjs enforces a ceiling in CI alongside three properties that protect the prompt cache and the data... | The surface fell from ~27,400 to ~16,300 tokens, a 41% cut paid back on every turn of every session. |
| [047](047-local-telemetry-that-keeps-the-estimate-out-of-the-total.md) | Implement the agreed spec. | Two rules are enforced by tests rather than by intention. |
| [046](046-vendor-wcag-and-make-the-conformance-report-refuse-to-overstate-itself.md) | Vendor the criteria rather than fetch them. src/core/wcag-data.js is generated from the W3C's published WCAG 2.2 JSON by scripts/update-wcag-data.mjs, exposed as `rule-mcp a11y-update`, which is the only place this... | The skill states plainly that nine guardrails out of 55 criteria is a floor and not an audit: contrast needs rendering, and whether alt text is meaningful or focus order matches reading order needs a person. |
| [045](045-three-skills-for-working-with-ai-and-one-attribution-table.md) | Add rule-mcp-evals, rule-process-ai-sdlc and rule-mcp-prompting. | Routing was spot-checked on seven prompts: six land exactly, the seventh on the area dispatcher with the intended skill as first alternative. |
| [044](044-split-typescript-by-concern-and-fill-the-skills-with-the-failure-modes-they-skip.md) | Create rule-styleguide-typescript for code style, move the type-design section out of the toolchain skill rather than duplicating it, and leave a pointer behind. | Two router defects surfaced and were fixed rather than worked around. |
| [043](043-ai-fingerprint-removal-is-a-deterministic-output-layer-not-a-prompt-rule.md) | Add src/core/fingerprint.js, a deterministic transformer that runs in router.finalizeResult after caveman compression, on both cache hits and fresh computes. | The transformer is idempotent, which the result cache requires: it replays decorated output, so a pass that drifted on a second run would replay a different string every time. |
| [042](042-per-prompt-rules-live-in-harness-hooks-not-in-prose.md) | Add two harness hooks beside the existing PreToolUse guard. | Full-once-then-terse keeps the cost honest: the long form is paid once per session, the per-prompt line costs about 18 tokens - far less than one avoided subagent spawn, which pays for a whole fresh context window. |
| [041](041-preview-environments-torn-down-via-gitlab-on-stop-not-a-post-merge-pipeline.md) | Teardown runs through the GitLab environment lifecycle. | **Positive.** No GitLab API token or bot account anywhere in the pipeline. |
| [040](040-the-irreversible-step-is-a-harness-gate-and-a-scope-challenge-is-a-route.md) | Three changes, each aimed at one measured failure. | Positive: all four corrective prompts from the real sessions now route to the simplicity skill with no ADR followup; the episode's migration and Prisma schema both fail pix_check; the point of no return asks before... |
| [039](039-a-stale-code-graph-is-a-refresh-instruction-and-unrequested-scope-is-a-blocked-o.md) | Treat both as conditions the server names and remediates rather than leaves to the model's judgment. | Positive: the stale-index condition now produces a fix instead of a fallback to grep, and it self-heals for future branches once auto_track is on; the scope constraint is visible on every tool result rather than only... |
| [038](038-the-installer-offers-the-whole-agent-catalog-not-the-detection-result.md) | **Detection marks an entry; it never filters the catalog.**. | **Positive**. |
| [037](037-port-five-skills-from-a-sibling-corpus-merging-rather-than-replacing-on-collision.md) | **Port by merging into the local skill, never by overwriting it.** The two. | **Positive**. |
| [036](036-off-main-thread-work-is-its-own-skill-not-a-section-per-framework.md) | **Add `rule-frontend-workers` as a single framework-neutral skill under the. | **Positive**. |
| [035](035-install-and-uninstall-never-touch-the-project-directory.md) | **Deleting the user's source tree is not in this repository's scope, and neither is editing it.** Both scripts are system-integration only. | **Positive**. |
| [034](034-registry-driven-clean-slash-commands-for-every-agent-and-ide.md) | Add `src/core/agent-command-targets.js` as the **single registry** of clean-command targets. | **Positive**. |
| [033](033-the-tool-surface-is-skills-and-nothing-else.md) | The bundled `skills/` directory is the single source of truth for the tool surface. | - Custom and third-party skills in `~/.agents/skills` are no longer served by this server, and neither are plugin guardrails from `plugin.js`. This **supersedes the "User control" and "plugin system" points of ADR 003... |
| [032](032-pin-the-self-update-remote-and-drop-root-in-the-container.md) | Verify the update source before any network or merge operation. normalizeRemoteUrl() reduces a remote to host+path (scheme, credentials, port, .git suffix and trailing slash removed) so the scp-style SSH remote this repo... | Forks and any clone whose remote is not the declared repository stop auto-updating until RULE_MCP_UPDATE_REMOTE is set - a deliberate fail-closed change, surfaced through a banner and pix_update rather than... |
| [030](030-bind-write-authorization-to-destinations-not-just-content.md) | Split write authorization into a validated root, a validated destination, and a path-bound receipt. resolveProjectRoot() refuses the filesystem root, the home directory, and system directories (temp dirs stay allowed for... | Multi-file writes now require passing `files` to pix_gateway; a bare `code` string cannot describe more than one destination and is limited to the legacy single-file flow. |
| [029](029-clean-rule-commands-via-user-commands-prompt-suppression-not-a-plugin.md) | 1. Do NOT ship a Claude plugin. 2) Generate the clean command set from the MCP prompt registry as the single source of truth (src/core/agent-commands.js + `rule-mcp agent-commands` CLI): the rule-mcp router... | Claude users get bare /rule-* commands with no (MCP) duplicates after re-install + session restart. |
| [028](028-migrare-il-tooling-del-repo-a-eslint-10-flat-config-con-eslint-plugin-unicorn.md) | Migrare il repo a ESLint 10.8 flat config (eslint.config.mjs: @eslint/js + eslint-plugin-unicorn recommended + preferenze repo preservate). | pnpm lint passa con 0 errori e 48 warning (budget CI 50); il codice segue idiomi moderni (node:, replaceAll, flatMap, new per builtin, ternari, assert.ok) e 2 veri bug sono stati corretti (interpolazione ${words} nel... |
| [027](027-adottare-eslint-plugin-unicorn-per-la-qualita-js-ts.md) | Aggiornare rule-toolchain-eslint a ESLint 10 flat config + eslint-plugin-unicorn (preset e regole ad alto valore, tabella keep/warn/disable per le regole opinionate, strategia di adozione incrementale, pairing con... | Il tooling ESLint è allineato a ESLint 10 e flat config; il codice validato da pix_check segue idiomi moderni e performanti (Set.has O(1) invece di includes O(n²) nei loop, for...of con narrowing TS, import node: non... |
| [026](026-rafforzare-la-disciplina-typescript-per-grandi-codebase.md) | Aggiornare rule-toolchain-typescript con exactOptionalPropertyTypes, verbatimModuleSyntax, controlli strict espliciti, migrazione incrementale, discriminated unions, branded types, unknown, boundary validation,... | La skill fornisce una baseline più sicura per grandi codebase e rende esplicita la differenza tra garanzie compile-time e runtime; l'abilitazione di exactOptionalPropertyTypes può richiedere migrazione dei call site. |
| [025](025-rafforzare-le-skill-sui-vincoli-relazionali-del-database.md) | Integrare queste regole nelle skill rule-data-sql, rule-data-postgresql e rule-data-mysql, mantenendo separati i dettagli version-specifici di PostgreSQL 18 e MySQL/MariaDB. | Le skill guideranno verso vincoli verificabili nel database, test di schema e migration, documentazione delle colonne e scelte di indicizzazione più consapevoli; gli esempi PostgreSQL 18 resteranno opt-in e non verranno... |
| [024](024-installer-lossless-preservare-toolprefix-e-normalizzare-le-righe-vuote-delle-reg.md) | upsertJsonServer/upsertVscode fondono (merge) l'entry esistente con la nuova config preservando le chiavi utente (toolPrefix, timeout, env custom); cmdConfig scrive toolPrefix:"none" di default per pi (tool... | Il ciclo uninstall+install è idempotente (nessuna riga vuota accumulata, nessuna chiave utente persa). |
| [023](023-self-update-per-invocazione-con-throttle-temporale-e-fire-and-forget.md) | Il check parte a ogni invocazione di tool ma il git fetch effettivo è throttled: al massimo ogni RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS (default 60, 0 = ogni call, min 1s). | Positivi: aggiornamenti ricevuti entro ~1 minuto da qualunque attività, zero latenza aggiuntiva per call (check throttled in background), installazioni git-clone sempre fresche senza intervento manuale. |
| [022](022-add-rule-toolchain-commits-skill-for-atomic-conventional-commits-with-mandatory-s.md) | Add a dedicated skill `rule-toolchain-commits` (tool `pix_toolchain_commits`) in the rule-toolchain group that enforces atomic Conventional Commits with a MANDATORY scope on every commit/push, and add a git... | Positive: commit/push prompts now deterministically route to rule-toolchain-commits; the rule (scope mandatory, atomicity) becomes a first-class skill in the same group as the hook tooling it depends on... |
| [021](021-rename-rule-mcp-agents-to-rule-mcp-agents-and-add-rule-mcp-collector-skill.md) | Rename `rule-mcp-agents` to `rule-mcp-agents` (tool becomes `pix_galaxy_agents`) and add a new `rule-mcp` collector skill that indexes AI/agent skills - `rule-mcp-agents` (@rule/rule-mcp-core based) and... | Positive: AI/agent prompts now route to the `rule-mcp` collector with `rule-mcp-agents` as the concrete skill; naming is dependency-agnostic and consistent with other domain collectors; project auto-detection... |
| [018](018-fix-install-uninstall-estensione-vs-code-e-derivati.md) | Aggiungere funzioni `installVscodeExtension` e `uninstallVscodeExtension` in install.js che installano/disinstallano il .vsix per tutti gli editor derivati usando i rispettivi CLI. Fixare install.sh Phase 4 per: non... | Permette di installare e disinstallare l'estensione VS Code da `rule-mcp install --agent vscode`, da `install.sh` e da `install.ps1`. Supporta tutti gli editor basati su VS Code (Cursor, Windsurf, VS Code Insiders,... |
| [017](017-integrazione-nativa-claude-skills.md) | installNativeSkills() ora copia le skill anche in ~/.claude/skills/<name>/ con frontmatter YARD compatibile Claude. | Claude può scoprire le skill automaticamente. |
| [016](016-documentazione-e-see-also-nelle-skill.md) | Aggiunta sezione ## See also con link alle skill correlate in tutte le skill mancanti. | Test docs passano. |
| [014](014-installer-lossless-e-idempotente.md) | parseJson() ora restituisce null su errore, non {}. Le scritture su file JSON usano atomicWrite con backup preventivo. | Configurazione utente non viene più persa su JSON malformato. |
| [013](013-timeout-sandbox-con-abortcontroller.md) | withTimeout() ora usa AbortController per cancellare effettivamente l'operazione in corso quando scatta il timeout. | Nessuna operazione pendente dopo il timeout. |
| [012](012-server-sse-con-autenticazione-bearer.md) | Il server SSE genera un bearer token all'avvio, richiede Authorization: Bearer su /sse e /message, CORS deny-by-default, body limit 1MB. | Server sicuro per default. |
| [011](011-use-a-persistent-local-bearer-token-for-daemon-transport.md) | Store one 256-bit token at ~/.local/state/rule-mcp/sse-token with owner-only permissions. | Daemon clients remain connected across LaunchAgent/systemd restarts; secrets are no longer emitted in logs. |
| [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) | Wrap every MCP handler with mandatory preprocessing and postprocessing. | Positive: deterministic fail-closed behavior, visible audit contract, fewer hallucinated dependencies and completion claims, consistent cross-agent workflow. |
| [009](009-file-based-skill-loading.md) | Use **file-based skill loading** with an in-memory LRU cache. | - Cross-skill queries require scanning all SKILL.md files at startup (∼20ms for 17 skills, negligible). |
| [008](008-sdk-over-handrolled-protocol.md) | Replace the hand-rolled protocol with `@modelcontextprotocol/sdk` v1.29.0. | - SDK is a runtime dependency (`@modelcontextprotocol/sdk` 1.29.0). |
| [007](007-vanilla-js-over-typescript.md) | Use **Vanilla JavaScript (ESM)** throughout. | - No compile-time type checking. |
| [006](006-forms-per-framework.md) | ### 1. Merge React forms into `rule-frontend-react`. | **Positive:**. |
| [005](005-toolchain-vite.md) | Extract all Vite-related content from `rule-scaffold-frontend-react-vite` into a new `rule-toolchain-vite` skill covering:. | **Positive:**. |
| [004](004-database-skills.md) | Create four database skills spanning relational and document databases:. | **Positive:**. |
| [003](003-backend-framework-skills.md) | Add four backend framework skills covering the major Node.js HTTP framework ecosystems:. | **Positive:**. |
| [002](002-scaffold-consolidation.md) | ### 1. Rename and absorb `scaffold-backend-node` -> `backend-node`. | **Positive:**. |
| [001](001-thematic-skill-rename.md) | Adopt a prefix-based thematic taxonomy with the following categories:. | **Positive:**. |

## By theme

Tags carried by 3 or more decisions. A decision appears under every
theme it carries, and the early ADRs that predate the tag field are listed last.

### skills

- [089](089-the-frontend-surface-is-framework-skills-only-and-there-is-no-no-framework-path.md) The frontend surface is framework skills only, and there is no no-framework path
- [069](069-flex-is-the-default-layout-tool-and-grid-is-the-exception-enforced-by-a-guardrai.md) Flex is the default layout tool and grid is the exception, enforced by a guardrail with a stated-reason escape
- [067](067-the-roadmap-is-finished-except-r8-which-is-paused-and-says-what-it-would-need.md) The roadmap is finished except R8, which is paused and says what it would need
- [065](065-fifty-three-topics-distilled-into-twenty-existing-skills-and-the-one-not-written.md) Fifty-three topics distilled into twenty existing skills, and the one not written
- [056](056-advertise-narrows-the-tool-surface-and-the-skill-tool-path-is-barely-used.md) Advertise narrows the tool surface, and the skill-tool path is barely used
- [055](055-cache-freshness-is-per-entry-not-per-namespace.md) Cache freshness is per entry, not per namespace
- [050](050-retire-the-rules-directory-and-move-what-was-unique-into-the-skills.md) Retire the rules directory and move what was unique into the skills
- [045](045-three-skills-for-working-with-ai-and-one-attribution-table.md) Three skills for working with AI, and one attribution table
- [044](044-split-typescript-by-concern-and-fill-the-skills-with-the-failure-modes-they-skip.md) Split TypeScript by concern and fill the skills with the failure modes they skipped
- [043](043-ai-fingerprint-removal-is-a-deterministic-output-layer-not-a-prompt-rule.md) AI-fingerprint removal is a deterministic output layer, not a prompt rule
- [037](037-port-five-skills-from-a-sibling-corpus-merging-rather-than-replacing-on-collision.md) Port five skills from a sibling corpus, merging rather than replacing on collision
- [036](036-off-main-thread-work-is-its-own-skill-not-a-section-per-framework.md) Off-main-thread work is its own skill, not a section per framework
- [022](022-add-rule-toolchain-commits-skill-for-atomic-conventional-commits-with-mandatory-s.md) Add rule-toolchain-commits skill for atomic conventional commits with mandatory scope
- [021](021-rename-rule-mcp-agents-to-rule-mcp-agents-and-add-rule-mcp-collector-skill.md) Rename rule-mcp-agents to rule-mcp-agents and add rule-mcp collector skill
- [005](005-toolchain-vite.md) Toolchain Skill Isolation (Vite)
- [004](004-database-skills.md) Database Skills
- [003](003-backend-framework-skills.md) Backend Framework Skills
- [002](002-scaffold-consolidation.md) Scaffold Skill Consolidation

### guardrails

- [089](089-the-frontend-surface-is-framework-skills-only-and-there-is-no-no-framework-path.md) The frontend surface is framework skills only, and there is no no-framework path
- [085](085-every-guardrail-rule-ships-with-a-labeled-pair.md) Every guardrail rule ships with a labeled pair
- [069](069-flex-is-the-default-layout-tool-and-grid-is-the-exception-enforced-by-a-guardrai.md) Flex is the default layout tool and grid is the exception, enforced by a guardrail with a stated-reason escape
- [066](066-lint-and-format-become-gates-and-the-two-tools-stop-undoing-each-other.md) Lint and format become gates, and the two tools stop undoing each other
- [061](061-one-page-per-session-across-two-processes-and-the-scaffold-section-that-was-neve.md) One page per session across two processes, and the scaffold section that was never written
- [059](059-exact-dependency-versions-and-no-corepack-fields-checked-on-every-manifest.md) Exact dependency versions and no corepack fields, checked on every manifest
- [051](051-a-drawn-box-is-a-rectangle-and-the-house-spelling-reaches-every-file.md) A drawn box is a rectangle, and the house spelling reaches every file
- [050](050-retire-the-rules-directory-and-move-what-was-unique-into-the-skills.md) Retire the rules directory and move what was unique into the skills
- [046](046-vendor-wcag-and-make-the-conformance-report-refuse-to-overstate-itself.md) Vendor WCAG and make the conformance report refuse to overstate itself
- [044](044-split-typescript-by-concern-and-fill-the-skills-with-the-failure-modes-they-skip.md) Split TypeScript by concern and fill the skills with the failure modes they skipped
- [043](043-ai-fingerprint-removal-is-a-deterministic-output-layer-not-a-prompt-rule.md) AI-fingerprint removal is a deterministic output layer, not a prompt rule
- [040](040-the-irreversible-step-is-a-harness-gate-and-a-scope-challenge-is-a-route.md) The irreversible step is a harness gate, and a scope challenge is a route
- [039](039-a-stale-code-graph-is-a-refresh-instruction-and-unrequested-scope-is-a-blocked-o.md) A stale code graph is a refresh instruction, and unrequested scope is a blocked outcome
- [027](027-adottare-eslint-plugin-unicorn-per-la-qualita-js-ts.md) Adottare eslint-plugin-unicorn per la qualità JS/TS
- [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) fail closed mcp enforcement and reusable agent commands

### tokens

- [080](080-a-cache-hit-replays-output-it-does-not-save-tokens.md) A cache hit replays output; it does not save tokens
- [079](079-compression-and-the-reminder-are-each-measured-at-the-step-that-causes-them.md) Compression and the reminder are each measured at the step that causes them
- [075](075-caveman-compression-is-measured-at-its-own-step-and-it-is-a-small-real-saving.md) Caveman compression is measured at its own step, and it is a small real saving
- [074](074-the-workflow-reminder-is-stated-once-a-session-and-re-anchored-on-a-cadence.md) The workflow reminder is stated once a session and re-anchored on a cadence
- [063](063-the-catalog-is-the-half-of-the-cache-a-team-inherits-and-verify-is-what-makes-it.md) The catalog is the half of the cache a team inherits, and verify is what makes it trustworthy
- [062](062-the-gateway-caches-its-route-evidence-and-verdict-and-mints-its-receipt-on-every.md) The gateway caches its route, evidence and verdict, and mints its receipt on every call
- [058](058-a-resumed-session-picks-up-its-own-handoff-verified-before-the-first-prompt.md) A resumed session picks up its own handoff, verified, before the first prompt
- [057](057-no-similarity-tier-above-the-normalized-key-because-no-threshold-both-replays-an.md) No similarity tier above the normalized key, because no threshold both replays and replays correctly
- [056](056-advertise-narrows-the-tool-surface-and-the-skill-tool-path-is-barely-used.md) Advertise narrows the tool surface, and the skill-tool path is barely used
- [053](053-handon-verifies-a-handoff-rather-than-summarizing-it.md) Handon verifies a handoff rather than summarizing it
- [048](048-measure-the-tool-surface-before-optimizing-it-then-guard-the-number.md) Measure the tool surface before optimizing it, then guard the number
- [047](047-local-telemetry-that-keeps-the-estimate-out-of-the-total.md) Local telemetry that keeps the estimate out of the total
- [043](043-ai-fingerprint-removal-is-a-deterministic-output-layer-not-a-prompt-rule.md) AI-fingerprint removal is a deterministic output layer, not a prompt rule
- [042](042-per-prompt-rules-live-in-harness-hooks-not-in-prose.md) Per-prompt rules live in harness hooks, not in prose

### routing

- [089](089-the-frontend-surface-is-framework-skills-only-and-there-is-no-no-framework-path.md) The frontend surface is framework skills only, and there is no no-framework path
- [065](065-fifty-three-topics-distilled-into-twenty-existing-skills-and-the-one-not-written.md) Fifty-three topics distilled into twenty existing skills, and the one not written
- [057](057-no-similarity-tier-above-the-normalized-key-because-no-threshold-both-replays-an.md) No similarity tier above the normalized key, because no threshold both replays and replays correctly
- [054](054-the-cache-tier-is-decided-by-the-output-not-by-the-tool.md) The cache tier is decided by the output, not by the tool
- [049](049-route-with-the-bm25-index-the-server-already-had.md) Route with the BM25 index the server already had
- [044](044-split-typescript-by-concern-and-fill-the-skills-with-the-failure-modes-they-skip.md) Split TypeScript by concern and fill the skills with the failure modes they skipped
- [040](040-the-irreversible-step-is-a-harness-gate-and-a-scope-challenge-is-a-route.md) The irreversible step is a harness gate, and a scope challenge is a route
- [039](039-a-stale-code-graph-is-a-refresh-instruction-and-unrequested-scope-is-a-blocked-o.md) A stale code graph is a refresh instruction, and unrequested scope is a blocked outcome
- [036](036-off-main-thread-work-is-its-own-skill-not-a-section-per-framework.md) Off-main-thread work is its own skill, not a section per framework
- [022](022-add-rule-toolchain-commits-skill-for-atomic-conventional-commits-with-mandatory-s.md) Add rule-toolchain-commits skill for atomic conventional commits with mandatory scope
- [021](021-rename-rule-mcp-agents-to-rule-mcp-agents-and-add-rule-mcp-collector-skill.md) Rename rule-mcp-agents to rule-mcp-agents and add rule-mcp collector skill

### architecture

- [068](068-nothing-the-server-starts-outlives-it-one-shutdown-path-an-orphan-guard-and-idle.md) Nothing the server starts outlives it: one shutdown path, an orphan guard, and idle memory release
- [035](035-install-and-uninstall-never-touch-the-project-directory.md) Install and uninstall never touch the project directory
- [034](034-registry-driven-clean-slash-commands-for-every-agent-and-ide.md) Registry-driven clean slash commands for every agent and IDE
- [033](033-the-tool-surface-is-skills-and-nothing-else.md) The tool surface is ./skills and nothing else
- [032](032-pin-the-self-update-remote-and-drop-root-in-the-container.md) Pin the self-update remote and drop root in the container
- [030](030-bind-write-authorization-to-destinations-not-just-content.md) Bind write authorization to destinations, not just content
- [011](011-use-a-persistent-local-bearer-token-for-daemon-transport.md) use a persistent local bearer token for daemon transport
- [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) fail closed mcp enforcement and reusable agent commands
- [006](006-forms-per-framework.md) Forms per Framework - Merger & Distribution

### cache

- [082](082-the-test-suites-run-in-one-parallel-invocation-and-the-search-index-is-cached-on.md) The test suites run in one parallel invocation and the search index is cached on disk
- [080](080-a-cache-hit-replays-output-it-does-not-save-tokens.md) A cache hit replays output; it does not save tokens
- [079](079-compression-and-the-reminder-are-each-measured-at-the-step-that-causes-them.md) Compression and the reminder are each measured at the step that causes them
- [063](063-the-catalog-is-the-half-of-the-cache-a-team-inherits-and-verify-is-what-makes-it.md) The catalog is the half of the cache a team inherits, and verify is what makes it trustworthy
- [062](062-the-gateway-caches-its-route-evidence-and-verdict-and-mints-its-receipt-on-every.md) The gateway caches its route, evidence and verdict, and mints its receipt on every call
- [060](060-the-prompt-is-the-second-resume-signal-because-most-harnesses-have-no-first-one.md) The prompt is the second resume signal, because most harnesses have no first one
- [057](057-no-similarity-tier-above-the-normalized-key-because-no-threshold-both-replays-an.md) No similarity tier above the normalized key, because no threshold both replays and replays correctly
- [055](055-cache-freshness-is-per-entry-not-per-namespace.md) Cache freshness is per entry, not per namespace
- [054](054-the-cache-tier-is-decided-by-the-output-not-by-the-tool.md) The cache tier is decided by the output, not by the tool

### installer

- [089](089-the-frontend-surface-is-framework-skills-only-and-there-is-no-no-framework-path.md) The frontend surface is framework skills only, and there is no no-framework path
- [078](078-the-router-command-is-rule-and-one-command-writes-tests.md) The router command is /rule and one command writes tests
- [064](064-the-installer-backs-up-before-it-writes-and-force-means-something.md) The installer backs up before it writes, and --force means something
- [039](039-a-stale-code-graph-is-a-refresh-instruction-and-unrequested-scope-is-a-blocked-o.md) A stale code graph is a refresh instruction, and unrequested scope is a blocked outcome
- [038](038-the-installer-offers-the-whole-agent-catalog-not-the-detection-result.md) The installer offers the whole agent catalog, not the detection result
- [035](035-install-and-uninstall-never-touch-the-project-directory.md) Install and uninstall never touch the project directory
- [029](029-clean-rule-commands-via-user-commands-prompt-suppression-not-a-plugin.md) Clean /rule-* commands via user commands + prompt suppression, not a plugin
- [024](024-installer-lossless-preservare-toolprefix-e-normalizzare-le-righe-vuote-delle-reg.md) Installer lossless: preservare toolPrefix e normalizzare le righe vuote delle regole
- [018](018-fix-install-uninstall-estensione-vs-code-e-derivati.md) Fix install/uninstall estensione VS Code e derivati

### telemetry

- [084](084-a-test-suite-pins-its-own-home-and-the-cheap-half-of-the-guard-runs-for-real.md) A test suite pins its own home, and the cheap half of the guard runs for real
- [083](083-everything-a-project-is-recorded-in-lives-under-the-home-directory-and-the-proje.md) Everything a project is recorded in lives under the home directory, and the project layer is gone
- [080](080-a-cache-hit-replays-output-it-does-not-save-tokens.md) A cache hit replays output; it does not save tokens
- [079](079-compression-and-the-reminder-are-each-measured-at-the-step-that-causes-them.md) Compression and the reminder are each measured at the step that causes them
- [075](075-caveman-compression-is-measured-at-its-own-step-and-it-is-a-small-real-saving.md) Caveman compression is measured at its own step, and it is a small real saving
- [074](074-the-workflow-reminder-is-stated-once-a-session-and-re-anchored-on-a-cadence.md) The workflow reminder is stated once a session and re-anchored on a cadence
- [070](070-the-flight-recorder-measures-what-the-server-costs-and-lives-with-the-project.md) The flight recorder measures what the server costs, and lives with the project
- [054](054-the-cache-tier-is-decided-by-the-output-not-by-the-tool.md) The cache tier is decided by the output, not by the tool
- [047](047-local-telemetry-that-keeps-the-estimate-out-of-the-total.md) Local telemetry that keeps the estimate out of the total

### measurement

- [080](080-a-cache-hit-replays-output-it-does-not-save-tokens.md) A cache hit replays output; it does not save tokens
- [079](079-compression-and-the-reminder-are-each-measured-at-the-step-that-causes-them.md) Compression and the reminder are each measured at the step that causes them
- [062](062-the-gateway-caches-its-route-evidence-and-verdict-and-mints-its-receipt-on-every.md) The gateway caches its route, evidence and verdict, and mints its receipt on every call
- [057](057-no-similarity-tier-above-the-normalized-key-because-no-threshold-both-replays-an.md) No similarity tier above the normalized key, because no threshold both replays and replays correctly
- [056](056-advertise-narrows-the-tool-surface-and-the-skill-tool-path-is-barely-used.md) Advertise narrows the tool surface, and the skill-tool path is barely used
- [055](055-cache-freshness-is-per-entry-not-per-namespace.md) Cache freshness is per entry, not per namespace
- [054](054-the-cache-tier-is-decided-by-the-output-not-by-the-tool.md) The cache tier is decided by the output, not by the tool
- [049](049-route-with-the-bm25-index-the-server-already-had.md) Route with the BM25 index the server already had

### determinism

- [076](076-the-persona-trio-is-kept-by-a-deterministic-helper-not-by-model-discipline.md) The persona trio is kept by a deterministic helper, not by model discipline
- [063](063-the-catalog-is-the-half-of-the-cache-a-team-inherits-and-verify-is-what-makes-it.md) The catalog is the half of the cache a team inherits, and verify is what makes it trustworthy
- [055](055-cache-freshness-is-per-entry-not-per-namespace.md) Cache freshness is per entry, not per namespace
- [054](054-the-cache-tier-is-decided-by-the-output-not-by-the-tool.md) The cache tier is decided by the output, not by the tool
- [053](053-handon-verifies-a-handoff-rather-than-summarizing-it.md) Handon verifies a handoff rather than summarizing it
- [046](046-vendor-wcag-and-make-the-conformance-report-refuse-to-overstate-itself.md) Vendor WCAG and make the conformance report refuse to overstate itself

### security

- [077](077-a-project-role-is-refused-until-the-project-accepts-that-version-of-it.md) A project role is refused until the project accepts that version of it
- [072](072-auto-update-is-notify-only-by-default-the-merge-happens-when-the-user-asks.md) Auto-update is notify-only by default; the merge happens when the user asks
- [062](062-the-gateway-caches-its-route-evidence-and-verdict-and-mints-its-receipt-on-every.md) The gateway caches its route, evidence and verdict, and mints its receipt on every call
- [028](028-migrare-il-tooling-del-repo-a-eslint-10-flat-config-con-eslint-plugin-unicorn.md) Migrare il tooling del repo a ESLint 10 flat config con eslint-plugin-unicorn
- [011](011-use-a-persistent-local-bearer-token-for-daemon-transport.md) use a persistent local bearer token for daemon transport
- [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) fail closed mcp enforcement and reusable agent commands

### toolchain

- [059](059-exact-dependency-versions-and-no-corepack-fields-checked-on-every-manifest.md) Exact dependency versions and no corepack fields, checked on every manifest
- [028](028-migrare-il-tooling-del-repo-a-eslint-10-flat-config-con-eslint-plugin-unicorn.md) Migrare il tooling del repo a ESLint 10 flat config con eslint-plugin-unicorn
- [027](027-adottare-eslint-plugin-unicorn-per-la-qualita-js-ts.md) Adottare eslint-plugin-unicorn per la qualità JS/TS
- [026](026-rafforzare-la-disciplina-typescript-per-grandi-codebase.md) Rafforzare la disciplina TypeScript per grandi codebase
- [022](022-add-rule-toolchain-commits-skill-for-atomic-conventional-commits-with-mandatory-s.md) Add rule-toolchain-commits skill for atomic conventional commits with mandatory scope
- [005](005-toolchain-vite.md) Toolchain Skill Isolation (Vite)

### tools

- [076](076-the-persona-trio-is-kept-by-a-deterministic-helper-not-by-model-discipline.md) The persona trio is kept by a deterministic helper, not by model discipline
- [073](073-review-personas-are-registry-data-and-every-surface-is-generated-from-it.md) Review personas are registry data, and every surface is generated from it
- [067](067-the-roadmap-is-finished-except-r8-which-is-paused-and-says-what-it-would-need.md) The roadmap is finished except R8, which is paused and says what it would need
- [056](056-advertise-narrows-the-tool-surface-and-the-skill-tool-path-is-barely-used.md) Advertise narrows the tool surface, and the skill-tool path is barely used
- [048](048-measure-the-tool-surface-before-optimizing-it-then-guard-the-number.md) Measure the tool surface before optimizing it, then guard the number
- [046](046-vendor-wcag-and-make-the-conformance-report-refuse-to-overstate-itself.md) Vendor WCAG and make the conformance report refuse to overstate itself

### mcp

- [056](056-advertise-narrows-the-tool-surface-and-the-skill-tool-path-is-barely-used.md) Advertise narrows the tool surface, and the skill-tool path is barely used
- [048](048-measure-the-tool-surface-before-optimizing-it-then-guard-the-number.md) Measure the tool surface before optimizing it, then guard the number
- [029](029-clean-rule-commands-via-user-commands-prompt-suppression-not-a-plugin.md) Clean /rule-* commands via user commands + prompt suppression, not a plugin
- [011](011-use-a-persistent-local-bearer-token-for-daemon-transport.md) use a persistent local bearer token for daemon transport
- [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) fail closed mcp enforcement and reusable agent commands

### taxonomy

- [037](037-port-five-skills-from-a-sibling-corpus-merging-rather-than-replacing-on-collision.md) Port five skills from a sibling corpus, merging rather than replacing on collision
- [036](036-off-main-thread-work-is-its-own-skill-not-a-section-per-framework.md) Off-main-thread work is its own skill, not a section per framework
- [022](022-add-rule-toolchain-commits-skill-for-atomic-conventional-commits-with-mandatory-s.md) Add rule-toolchain-commits skill for atomic conventional commits with mandatory scope
- [021](021-rename-rule-mcp-agents-to-rule-mcp-agents-and-add-rule-mcp-collector-skill.md) Rename rule-mcp-agents to rule-mcp-agents and add rule-mcp collector skill
- [001](001-thematic-skill-rename.md) Thematic Skill Taxonomy Rename

### tooling

- [088](088-the-numbering-doctor-also-names-authors-and-fix-commits-runs-on-its-own.md) The numbering doctor also names authors, and --fix-commits runs on its own
- [087](087-an-adr-names-the-person-who-decided-and-the-tool-is-the-fallback.md) An ADR names the person who decided, and the tool is the fallback
- [081](081-the-numbering-doctor-regenerates-the-index-and-reports-the-commits-it-cannot-fix.md) The numbering doctor regenerates the index and reports the commits it cannot fix
- [053](053-handon-verifies-a-handoff-rather-than-summarizing-it.md) Handon verifies a handoff rather than summarizing it
- [052](052-one-generated-adr-index-because-the-hand-kept-one-went-stale.md) One generated ADR index, because the hand-kept one went stale

### adr

- [088](088-the-numbering-doctor-also-names-authors-and-fix-commits-runs-on-its-own.md) The numbering doctor also names authors, and --fix-commits runs on its own
- [087](087-an-adr-names-the-person-who-decided-and-the-tool-is-the-fallback.md) An ADR names the person who decided, and the tool is the fallback
- [081](081-the-numbering-doctor-regenerates-the-index-and-reports-the-commits-it-cannot-fix.md) The numbering doctor regenerates the index and reports the commits it cannot fix
- [052](052-one-generated-adr-index-because-the-hand-kept-one-went-stale.md) One generated ADR index, because the hand-kept one went stale

### cli

- [088](088-the-numbering-doctor-also-names-authors-and-fix-commits-runs-on-its-own.md) The numbering doctor also names authors, and --fix-commits runs on its own
- [064](064-the-installer-backs-up-before-it-writes-and-force-means-something.md) The installer backs up before it writes, and --force means something
- [063](063-the-catalog-is-the-half-of-the-cache-a-team-inherits-and-verify-is-what-makes-it.md) The catalog is the half of the cache a team inherits, and verify is what makes it trustworthy
- [034](034-registry-driven-clean-slash-commands-for-every-agent-and-ide.md) Registry-driven clean slash commands for every agent and IDE

### docs

- [088](088-the-numbering-doctor-also-names-authors-and-fix-commits-runs-on-its-own.md) The numbering doctor also names authors, and --fix-commits runs on its own
- [087](087-an-adr-names-the-person-who-decided-and-the-tool-is-the-fallback.md) An ADR names the person who decided, and the tool is the fallback
- [081](081-the-numbering-doctor-regenerates-the-index-and-reports-the-commits-it-cannot-fix.md) The numbering doctor regenerates the index and reports the commits it cannot fix
- [076](076-the-persona-trio-is-kept-by-a-deterministic-helper-not-by-model-discipline.md) The persona trio is kept by a deterministic helper, not by model discipline

### documentation

- [067](067-the-roadmap-is-finished-except-r8-which-is-paused-and-says-what-it-would-need.md) The roadmap is finished except R8, which is paused and says what it would need
- [065](065-fifty-three-topics-distilled-into-twenty-existing-skills-and-the-one-not-written.md) Fifty-three topics distilled into twenty existing skills, and the one not written
- [052](052-one-generated-adr-index-because-the-hand-kept-one-went-stale.md) One generated ADR index, because the hand-kept one went stale
- [050](050-retire-the-rules-directory-and-move-what-was-unique-into-the-skills.md) Retire the rules directory and move what was unique into the skills

### handoff

- [061](061-one-page-per-session-across-two-processes-and-the-scaffold-section-that-was-neve.md) One page per session across two processes, and the scaffold section that was never written
- [060](060-the-prompt-is-the-second-resume-signal-because-most-harnesses-have-no-first-one.md) The prompt is the second resume signal, because most harnesses have no first one
- [058](058-a-resumed-session-picks-up-its-own-handoff-verified-before-the-first-prompt.md) A resumed session picks up its own handoff, verified, before the first prompt
- [053](053-handon-verifies-a-handoff-rather-than-summarizing-it.md) Handon verifies a handoff rather than summarizing it

### hooks

- [060](060-the-prompt-is-the-second-resume-signal-because-most-harnesses-have-no-first-one.md) The prompt is the second resume signal, because most harnesses have no first one
- [058](058-a-resumed-session-picks-up-its-own-handoff-verified-before-the-first-prompt.md) A resumed session picks up its own handoff, verified, before the first prompt
- [042](042-per-prompt-rules-live-in-harness-hooks-not-in-prose.md) Per-prompt rules live in harness hooks, not in prose
- [040](040-the-irreversible-step-is-a-harness-gate-and-a-scope-challenge-is-a-route.md) The irreversible step is a harness gate, and a scope challenge is a route

### paths

- [086](086-a-sandbox-is-a-copy-of-one-template-and-the-fixture-refuses-to-build-in-the-real.md) A sandbox is a copy of one template, and the fixture refuses to build in the real home
- [084](084-a-test-suite-pins-its-own-home-and-the-cheap-half-of-the-guard-runs-for-real.md) A test suite pins its own home, and the cheap half of the guard runs for real
- [083](083-everything-a-project-is-recorded-in-lives-under-the-home-directory-and-the-proje.md) Everything a project is recorded in lives under the home directory, and the project layer is gone
- [070](070-the-flight-recorder-measures-what-the-server-costs-and-lives-with-the-project.md) The flight recorder measures what the server costs, and lives with the project

### performance

- [086](086-a-sandbox-is-a-copy-of-one-template-and-the-fixture-refuses-to-build-in-the-real.md) A sandbox is a copy of one template, and the fixture refuses to build in the real home
- [082](082-the-test-suites-run-in-one-parallel-invocation-and-the-search-index-is-cached-on.md) The test suites run in one parallel invocation and the search index is cached on disk
- [048](048-measure-the-tool-surface-before-optimizing-it-then-guard-the-number.md) Measure the tool surface before optimizing it, then guard the number
- [036](036-off-main-thread-work-is-its-own-skill-not-a-section-per-framework.md) Off-main-thread work is its own skill, not a section per framework

### personas

- [083](083-everything-a-project-is-recorded-in-lives-under-the-home-directory-and-the-proje.md) Everything a project is recorded in lives under the home directory, and the project layer is gone
- [077](077-a-project-role-is-refused-until-the-project-accepts-that-version-of-it.md) A project role is refused until the project accepts that version of it
- [076](076-the-persona-trio-is-kept-by-a-deterministic-helper-not-by-model-discipline.md) The persona trio is kept by a deterministic helper, not by model discipline
- [073](073-review-personas-are-registry-data-and-every-surface-is-generated-from-it.md) Review personas are registry data, and every surface is generated from it

### testing

- [086](086-a-sandbox-is-a-copy-of-one-template-and-the-fixture-refuses-to-build-in-the-real.md) A sandbox is a copy of one template, and the fixture refuses to build in the real home
- [085](085-every-guardrail-rule-ships-with-a-labeled-pair.md) Every guardrail rule ships with a labeled pair
- [084](084-a-test-suite-pins-its-own-home-and-the-cheap-half-of-the-guard-runs-for-real.md) A test suite pins its own home, and the cheap half of the guard runs for real
- [082](082-the-test-suites-run-in-one-parallel-invocation-and-the-search-index-is-cached-on.md) The test suites run in one parallel invocation and the search index is cached on disk

### agents

- [038](038-the-installer-offers-the-whole-agent-catalog-not-the-detection-result.md) The installer offers the whole agent catalog, not the detection result
- [034](034-registry-driven-clean-slash-commands-for-every-agent-and-ide.md) Registry-driven clean slash commands for every agent and IDE
- [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) fail closed mcp enforcement and reusable agent commands

### backend

- [044](044-split-typescript-by-concern-and-fill-the-skills-with-the-failure-modes-they-skip.md) Split TypeScript by concern and fill the skills with the failure modes they skipped
- [037](037-port-five-skills-from-a-sibling-corpus-merging-rather-than-replacing-on-collision.md) Port five skills from a sibling corpus, merging rather than replacing on collision
- [003](003-backend-framework-skills.md) Backend Framework Skills

### commands

- [078](078-the-router-command-is-rule-and-one-command-writes-tests.md) The router command is /rule and one command writes tests
- [073](073-review-personas-are-registry-data-and-every-surface-is-generated-from-it.md) Review personas are registry data, and every surface is generated from it
- [029](029-clean-rule-commands-via-user-commands-prompt-suppression-not-a-plugin.md) Clean /rule-* commands via user commands + prompt suppression, not a plugin

### enforcement

- [074](074-the-workflow-reminder-is-stated-once-a-session-and-re-anchored-on-a-cadence.md) The workflow reminder is stated once a session and re-anchored on a cadence
- [071](071-dependencies-are-exact-pins-at-the-latest-release-by-default-on-every-surface.md) Dependencies are exact pins at the latest release, by default, on every surface
- [042](042-per-prompt-rules-live-in-harness-hooks-not-in-prose.md) Per-prompt rules live in harness hooks, not in prose

### eslint

- [066](066-lint-and-format-become-gates-and-the-two-tools-stop-undoing-each-other.md) Lint and format become gates, and the two tools stop undoing each other
- [028](028-migrare-il-tooling-del-repo-a-eslint-10-flat-config-con-eslint-plugin-unicorn.md) Migrare il tooling del repo a ESLint 10 flat config con eslint-plugin-unicorn
- [027](027-adottare-eslint-plugin-unicorn-per-la-qualita-js-ts.md) Adottare eslint-plugin-unicorn per la qualità JS/TS

### evals

- [085](085-every-guardrail-rule-ships-with-a-labeled-pair.md) Every guardrail rule ships with a labeled pair
- [075](075-caveman-compression-is-measured-at-its-own-step-and-it-is-a-small-real-saving.md) Caveman compression is measured at its own step, and it is a small real saving
- [045](045-three-skills-for-working-with-ai-and-one-attribution-table.md) Three skills for working with AI, and one attribution table

### frontend

- [089](089-the-frontend-surface-is-framework-skills-only-and-there-is-no-no-framework-path.md) The frontend surface is framework skills only, and there is no no-framework path
- [036](036-off-main-thread-work-is-its-own-skill-not-a-section-per-framework.md) Off-main-thread work is its own skill, not a section per framework
- [006](006-forms-per-framework.md) Forms per Framework - Merger & Distribution

### git

- [088](088-the-numbering-doctor-also-names-authors-and-fix-commits-runs-on-its-own.md) The numbering doctor also names authors, and --fix-commits runs on its own
- [081](081-the-numbering-doctor-regenerates-the-index-and-reports-the-commits-it-cannot-fix.md) The numbering doctor regenerates the index and reports the commits it cannot fix
- [022](022-add-rule-toolchain-commits-skill-for-atomic-conventional-commits-with-mandatory-s.md) Add rule-toolchain-commits skill for atomic conventional commits with mandatory scope

### privacy

- [083](083-everything-a-project-is-recorded-in-lives-under-the-home-directory-and-the-proje.md) Everything a project is recorded in lives under the home directory, and the project layer is gone
- [070](070-the-flight-recorder-measures-what-the-server-costs-and-lives-with-the-project.md) The flight recorder measures what the server costs, and lives with the project
- [047](047-local-telemetry-that-keeps-the-estimate-out-of-the-total.md) Local telemetry that keeps the estimate out of the total

### quality

- [049](049-route-with-the-bm25-index-the-server-already-had.md) Route with the BM25 index the server already had
- [027](027-adottare-eslint-plugin-unicorn-per-la-qualita-js-ts.md) Adottare eslint-plugin-unicorn per la qualità JS/TS
- [026](026-rafforzare-la-disciplina-typescript-per-grandi-codebase.md) Rafforzare la disciplina TypeScript per grandi codebase

### session

- [061](061-one-page-per-session-across-two-processes-and-the-scaffold-section-that-was-neve.md) One page per session across two processes, and the scaffold section that was never written
- [060](060-the-prompt-is-the-second-resume-signal-because-most-harnesses-have-no-first-one.md) The prompt is the second resume signal, because most harnesses have no first one
- [058](058-a-resumed-session-picks-up-its-own-handoff-verified-before-the-first-prompt.md) A resumed session picks up its own handoff, verified, before the first prompt

### styleguide

- [069](069-flex-is-the-default-layout-tool-and-grid-is-the-exception-enforced-by-a-guardrai.md) Flex is the default layout tool and grid is the exception, enforced by a guardrail with a stated-reason escape
- [037](037-port-five-skills-from-a-sibling-corpus-merging-rather-than-replacing-on-collision.md) Port five skills from a sibling corpus, merging rather than replacing on collision
- [027](027-adottare-eslint-plugin-unicorn-per-la-qualita-js-ts.md) Adottare eslint-plugin-unicorn per la qualità JS/TS

### typescript

- [044](044-split-typescript-by-concern-and-fill-the-skills-with-the-failure-modes-they-skip.md) Split TypeScript by concern and fill the skills with the failure modes they skipped
- [027](027-adottare-eslint-plugin-unicorn-per-la-qualita-js-ts.md) Adottare eslint-plugin-unicorn per la qualità JS/TS
- [026](026-rafforzare-la-disciplina-typescript-per-grandi-codebase.md) Rafforzare la disciplina TypeScript per grandi codebase

### no tags

- [017](017-integrazione-nativa-claude-skills.md) integrazione nativa claude skills
- [016](016-documentazione-e-see-also-nelle-skill.md) documentazione e see also nelle skill
- [014](014-installer-lossless-e-idempotente.md) installer lossless e idempotente
- [013](013-timeout-sandbox-con-abortcontroller.md) timeout sandbox con abortcontroller
- [012](012-server-sse-con-autenticazione-bearer.md) server sse con autenticazione bearer
- [009](009-file-based-skill-loading.md) File-Based Skill Loading over Database
- [008](008-sdk-over-handrolled-protocol.md) Official MCP SDK over Hand-Rolled Protocol
- [007](007-vanilla-js-over-typescript.md) Vanilla JS over TypeScript

## Operating rules

- Record a structural decision with `pix_process_adr`, when it is taken.
- Never rewrite an accepted decision. Supersede it with a new one that says why.
- Never edit this file. Edit the ADR and let the next call regenerate it.
