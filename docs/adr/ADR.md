# Architecture Decision Records

Every decision this project has taken, newest first. The numbered files in
this directory are the source of truth; this index is generated from them by
`rule_tool_process_adr`, so editing it by hand is work the next call throws away.

## Index

| # | Title | Date | Status | Tags |
|---|-------|------|--------|------|
| [047](047-drop-the-vs-code-extension-and-its-installers.md) | Drop the VS Code extension and its installers | 2026-09-05 | accepted | vscode, extension, installer, lean-web |
| [046](046-restructure-the-command-surface-rule-router-rule-area-caveman-implicit-rule-process.md) | Restructure the command surface: /rule router, rule-area-*, caveman implicit, rule-process-tdd skill | 2026-09-05 | accepted | commands, prompts, surface, skills, installer |
| [045](045-split-review-personas-into-per-operation-commands-plan-audit-review.md) | Split review personas into per-operation commands (plan/audit/review) | 2026-09-05 | accepted | personas, commands, prompts, surface |
| [044](044-gateway-as-the-single-entrypoint-with-server-side-receipts-backend-data-devops-g.md) | Gateway as the single entrypoint with server-side receipts; backend/data/devops guardrail families | 2026-09-04 | accepted | gateway, guardrails, determinism, receipt, backend |
| [043](043-pre-packaged-mcp-prompt-registry-26-prompts-strict-schemas-commit-scope-closer.md) | Pre-packaged MCP prompt registry (26 prompts, strict schemas, commit-scope closer) | 2026-09-04 | accepted | prompts, registry, tdd, a11y |
| [042](042-port-fidelity-rules-over-rule-check-brace-style-guardrails-on-backend-modules.md) | Port fidelity rules over pix_check brace-style guardrails on backend modules | 2026-09-04 | accepted | port, guardrails, linters, decision |
| [041](041-port-the-complete-rule-evolution-as-a-rule-native-additive-union.md) | Port the complete rule evolution as a rule-native additive union | 2026-09-04 | accepted | architecture, porting, parity, tdd |
| [040](040-token-efficiency-pipeline.md) | Token-efficiency pipeline (caveman aggressive + tokensave-aware decoration) | 2026-08-25 | accepted | token-efficiency, caveman, tokensave, mcp-boundary, diagnostics |
| [039](039-round-two-hardening-cycles-daemon-cleanup-diagnostics.md) | Round-2 hardening - cycles, daemon/commands split, diagnostics, HTTP verification | 2026-08-25 | accepted | refactor, cycles, daemon, doctor, transport, logs, quality |
| [038](038-split-hotspot-modules.md) | Split the hotspot modules (guardrails + installer) | 2026-08-25 | accepted | refactor, maintainability, guardrails, installer |
| [037](037-v100-release-and-docs-accuracy-guard.md) | v1.0.0 release and the docs-accuracy guard | 2026-08-25 | accepted | release, docs, accuracy, testing |
| [036](036-architect-splits-into-standalone-web-app-repo.md) | rule-mcp-architect splits into a standalone web app repo (rule-mcp-architect) | 2026-08-25 | accepted | architect, split, repo, web-app, sdk, vanilla, cross-repo |
| [035](035-installer-self-heals-global-shim-surfaces-failures-gates-tui-rendering.md) | Installer self-heals its global shim, surfaces failures, and gates TUI rendering | 2026-08-25 | accepted | installer, cli, cross-platform, shim, tui, terminal, idempotency |
| [034](034-registry-driven-clean-slash-commands-for-every-agent-and-ide.md) | Registry-driven clean slash commands for every agent and IDE | 2026-08-04 | accepted | architecture, cli, agents, slash-commands, vscode |
| [033](033-the-tool-surface-is-skills-and-nothing-else.md) | The tool surface is ./skills and nothing else | 2026-08-04 | accepted | architecture |
| [032](032-pin-the-self-update-remote-and-drop-root-in-the-container.md) | Pin the self-update remote and drop root in the container | 2026-08-04 | accepted | architecture |
| [031](031-interview-servers-enforce-same-origin-and-own-their-process-lifecycle.md) | Interview servers enforce same-origin and own their process lifecycle | 2026-08-04 | accepted | architecture |
| [030](030-bind-write-authorization-to-destinations-not-just-content.md) | Bind write authorization to destinations, not just content | 2026-08-04 | accepted | architecture |
| [029](029-clean-rule-commands-via-user-commands-prompt-suppression-not-a-plugin.md) | Clean /rule-* commands via user commands + prompt suppression, not a plugin | 2026-08-03 | accepted | commands, claude, mcp, installer |
| [028](028-migrate-repo-tooling-to-eslint-10-flat-config-with-eslint-plugin-unicorn.md) | Migrate repo tooling to ESLint 10 flat config with eslint-plugin-unicorn | 2026-08-03 | accepted | eslint, toolchain, unicorn, flat-config, migration, security, brace-expansion |
| [027](027-adopt-eslint-plugin-unicorn-for-js-ts-quality.md) | Adopt eslint-plugin-unicorn for JS/TS quality | 2026-08-03 | accepted | eslint, toolchain, unicorn, javascript, typescript, styleguide, guardrails, quality |
| [026](026-strengthen-typescript-discipline-for-large-codebases.md) | Strengthen TypeScript discipline for large codebases | 2026-08-02 | accepted | typescript, toolchain, strict, monorepo, quality |
| [025](025-strengthen-database-relational-constraint-skills.md) | Strengthen database relational constraint skills | 2026-08-02 | accepted | database, sql, postgresql, mysql, schema |
| [024](024-lossless-installer-preserve-toolprefix-normalize-rule-blank-lines.md) | Lossless installer: preserve toolPrefix and normalize rule blank lines | 2026-08-01 | accepted | installer, idempotency, toolPrefix, mcp-config |
| [023](023-per-invocation-self-update-with-temporal-throttle-fire-and-forget.md) | Per-invocation self-update with temporal throttle and fire-and-forget | 2026-08-01 | accepted | self-update, mcp-server, operational, background |
| [022](022-add-rule-toolchain-commits-skill-for-atomic-conventional-commits-with-mandatory-s.md) | Add rule-toolchain-commits skill for atomic conventional commits with mandatory scope | 2026-08-01 | accepted | taxonomy, skills, routing, git, toolchain |
| [021](021-rename-rule-mcp-agents-to-rule-ai-agents-and-add-rule-ai-collector-skill.md) | Rename rule-mcp-agents to rule-ai-agents and add rule-ai collector skill | 2026-08-01 | accepted | taxonomy, skills, routing, ai |
| [018](018-fix-vscode-extension-and-derivatives-install-uninstall.md) | Fix VS Code extension and derivatives install/uninstall | 2026-07-19 | accepted | vscode, extension, installer, cursor, windsurf |
| [017](017-native-claude-skills-integration.md) | native claude skills integration | - | proposed | - |
| [016](016-documentation-and-see-also-in-skills.md) | documentation and see also in skills | - | proposed | - |
| [014](014-lossless-idempotent-installer.md) | lossless idempotent installer | - | proposed | - |
| [013](013-sandbox-timeout-with-abortcontroller.md) | sandbox timeout with abortcontroller | - | proposed | - |
| [012](012-skill-routing-pnpm-package-manager-workspace-monorepo-setup.md) | Skill routing: pnpm package manager workspace monorepo setup | 2026-07-11 | accepted | tool, auto-log, routing |
| [012](012-sse-server-with-bearer-auth.md) | sse server with bearer auth | - | proposed | - |
| [011](011-skill-routing-parcel-bundler-zero-config-build-tool.md) | Skill routing: Parcel bundler zero config build tool | 2026-07-11 | accepted | tool, auto-log, routing |
| [011](011-use-a-persistent-local-bearer-token-for-daemon-transport.md) | use a persistent local bearer token for daemon transport | 2026-07-16 | accepted | architecture, security, mcp, daemon |
| [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) | fail closed mcp enforcement and reusable agent commands | 2026-07-11 | accepted | architecture, security, mcp, guardrails, agents |
| [010](010-skill-routing-husky-git-hooks-pre-commit-lint-staged-commit.md) | Skill routing: Husky git hooks pre-commit lint-staged commitlint | 2026-07-11 | accepted | tool, auto-log, routing |
| [009](009-file-based-skill-loading.md) | File-Based Skill Loading over Database | 2026-06-20 | Accepted | - |
| [009](009-forms-per-framework-merger-and-distribution.md) | forms per framework merger and distribution | 2026-07-11 | accepted | architecture, forms, frontend, refactoring, solid |
| [009](009-skill-routing-turborepo-monorepo-pipeline-caching-parallel.md) | Skill routing: Turborepo monorepo pipeline caching parallel builds | 2026-07-11 | accepted | tool, auto-log, routing |
| [008](008-sdk-over-handrolled-protocol.md) | Official MCP SDK over Hand-Rolled Protocol | 2026-06-23 | Accepted | - |
| [008](008-skill-routing-eslint-flat-config-for-typescript-react-proje.md) | Skill routing: ESLint flat config for TypeScript React project | 2026-07-11 | accepted | tool, auto-log, routing |
| [008](008-toolchain-skill-isolation-vite.md) | toolchain skill isolation vite | 2026-07-10 | accepted | skills, toolchain, vite, build |
| [007](007-database-skills.md) | database skills | 2026-07-10 | accepted | skills, database, sql, nosql, new |
| [007](007-skill-routing-typescript-tsconfig-strict-mode-configuration.md) | Skill routing: TypeScript tsconfig strict mode configuration | 2026-07-11 | accepted | tool, auto-log, routing |
| [007](007-vanilla-js-over-typescript.md) | Vanilla JS over TypeScript | 2026-06-20 | Accepted | - |
| [006](006-backend-framework-skills.md) | backend framework skills | 2026-07-10 | accepted | skills, backend, frameworks, new |
| [006](006-forms-per-framework.md) | Forms per Framework - Merger & Distribution | 2026-07-11 | accepted | architecture, forms, frontend, refactoring, solid |
| [005](005-scaffold-skill-consolidation.md) | scaffold skill consolidation | 2026-07-10 | accepted | infrastructure, skills, scaffolding, merge |
| [005](005-toolchain-vite.md) | Toolchain Skill Isolation (Vite) | 2026-07-10 | accepted | skills, toolchain, vite, build |
| [004](004-database-skills.md) | Database Skills | 2026-07-10 | accepted | skills, database, sql, nosql, new |
| [004](004-thematic-skill-taxonomy-rename.md) | thematic skill taxonomy rename | 2026-07-10 | accepted | infrastructure, naming, taxonomy, breaking-change |
| [003](003-backend-framework-skills.md) | Backend Framework Skills | 2026-07-10 | accepted | skills, backend, frameworks, new |
| [003](003-file-based-skill-loading-over-database.md) | file based skill loading over database | 2026-06-20 | Accepted | - |
| [002](002-official-mcp-sdk-over-hand-rolled-protocol.md) | official mcp sdk over hand rolled protocol | 2026-06-23 | Accepted | - |
| [002](002-scaffold-consolidation.md) | Scaffold Skill Consolidation | 2026-07-10 | accepted | infrastructure, skills, scaffolding, merge |
| [001](001-thematic-skill-rename.md) | Thematic Skill Taxonomy Rename | 2026-07-10 | accepted | infrastructure, naming, taxonomy, breaking-change |
| [001](001-vanilla-js-over-typescript.md) | vanilla js over typescript | 2026-06-20 | Accepted | - |

## What each decision says

The opening sentence of each decision and of what it cost, lifted from the
file. Where a line stops short the rest is in the ADR.

| ADR | Decision | Consequence |
|-----|----------|-------------|
| [047](047-drop-the-vs-code-extension-and-its-installers.md) | Delete extensions/ (vscode-rule source + rule-vanilla-reactive.vsix). | Positive: installers shrink (no vsce build, no six-editor probing), no committed binary .vsix, surface and supply chain simpler, aligns with upstream ADR 088 and the lean-web direction. |
| [046](046-restructure-the-command-surface-rule-router-rule-area-caveman-implicit-rule-process.md) | Restructure the command surface: router rule-mcp -> rule; the 12 area prompts become rule-area-*; delete rule-a11y-audit, rule-code-review, rule-caveman, rule-new-feature, rule-pull-request, rule-setup-project,... | Positive: the command surface shrinks 49 -> 41; one namespace per concern (rule-area-* for areas, rule-process-* for the process family incl. the new rule-process-tdd skill/tool and rule-process-check); caveman is implicit... |
| [045](045-split-review-personas-into-per-operation-commands-plan-audit-review.md) | Give each active role three slash commands - rule-plan-<role>, rule-audit-<role>, rule-review-<role> (21 persona commands total), all generated from the same registry and all routing through the tools under the hood: the... | Positive: the user can run just the step they need; every command body names the exact tools to call, so agent behavior no longer depends on which surface the host exposes; proposed roles still stay out of the surfaces... |
| [044](044-gateway-as-the-single-entrypoint-with-server-side-receipts-backend-data-devops-g.md) | Gateway is the single server-side orchestrating entrypoint for every implementation flow; it issues a bound receipt the write path must present; backend/database/devops/security guardrails are first-class families mapped... | Positive: unvalidated code cannot be delivered (fail-closed at a single server-side entrypoint), server-side receipts bind writes to what was checked, and backend/database/devops/security guardrail families run on every... |
| [043](043-pre-packaged-mcp-prompt-registry-26-prompts-strict-schemas-commit-scope-closer.md) | Adopt the 26-prompt pre-packaged registry in src/prompts/index.js with strict argument schemas, tool-invoked styleguides, TDD/a11y baseline, and a mandatory commit-scope closer; keep prompt names distinct from the... | Positive: one prompt per area with strict zod-validated arguments, styleguides invoked via tools, TDD/a11y baseline or explicit opt-out, every one-shot ends by proposing a commit message with mandatory scope. |
| [042](042-port-fidelity-rules-over-rule-check-brace-style-guardrails-on-backend-modules.md) | Keep upstream port fidelity and the repository's own gates (eslint, prettier, test suites, audit, docs-accuracy) as the binding contract for backend modules; treat pix_check as binding for frontend/component code only. | Positive: port diffs stay minimal and reviewable; the repo's CI contract (lint/format/tests) remains the single enforceable gate. |
| [041](041-port-the-complete-rule-evolution-as-a-rule-native-additive-union.md) | Port source behavior into rule-mcp without modifying the source repository. | Expected final public surface is 94 skills, 110 tools, 194 resources and 34 prompts before any registry-derived adjustments. |
| [040](040-token-efficiency-pipeline.md) | 1. **Decoration lives at the MCP boundary** (`src/server.js`. | **Positive**: in `.tokensave` projects every call steers the model to the code. |
| [039](039-round-two-hardening-cycles-daemon-cleanup-diagnostics.md) | 1. **Break the init cycles**: `getSkillMetadata` moved into the skill store. | **Positive**: runtime init cycles eliminated (no TDZ surprises); each hotspot. |
| [038](038-split-hotspot-modules.md) | 1. **Guardrails**: each family moves to `src/core/guardrails/` —. | **Positive**: each guardrail domain is a standalone reviewable file; the. |
| [037](037-v100-release-and-docs-accuracy-guard.md) | 1. Add `test/docs-accuracy.test.mjs`: it computes the runtime surface (`listTools`/`listResources`/`listPrompts` + the `skills/` dirs) and fails when README.md disagrees. | **Positive**: stale-claim regressions are structurally impossible; the repo has a reproducible release flow (tag → changelog-based GitHub Release); the status section in README doubles as a health snapshot. |
| [036](036-architect-splits-into-standalone-web-app-repo.md) | Split the architect product out of rule-mcp:. | **Positive**. |
| [035](035-installer-self-heals-global-shim-surfaces-failures-gates-tui-rendering.md) | 1. **Verify before trust.** `shim_works()` (bash) / `Test-PixCli` (PS) run. | **Positive**. |
| [034](034-registry-driven-clean-slash-commands-for-every-agent-and-ide.md) | Add `src/core/agent-command-targets.js` as the **single registry** of clean-command targets. | **Positive**. |
| [033](033-the-tool-surface-is-skills-and-nothing-else.md) | The bundled `skills/` directory is the single source of truth for the tool surface. | - Custom and third-party skills in `~/.agents/skills` are no longer served by this server, and neither are plugin guardrails from `plugin.js`. This **supersedes the "User control" and "plugin system" points of ADR 003... |
| [032](032-pin-the-self-update-remote-and-drop-root-in-the-container.md) | Verify the update source before any network or merge operation. normalizeRemoteUrl() reduces a remote to host+path (scheme, credentials, port, .git suffix and trailing slash removed) so the scp-style SSH remote this repo... | Forks and any clone whose remote is not the declared repository stop auto-updating until RULE_MCP_UPDATE_REMOTE is set - a deliberate fail-closed change, surfaced through a banner and rule_tool_update rather than... |
| [031](031-interview-servers-enforce-same-origin-and-own-their-process-lifecycle.md) | Add skills/rule-mcp-architect/http-guard.mjs - a shared, pure checkLocalRequest()/denyForeignRequest() pair - and apply it to every /api/* request on both servers: Sec-Fetch-Site must be same-origin or none, Origin... | Non-browser clients (curl, tests) still reach the API because they send neither Origin nor Sec-Fetch-Site - anything already executing code on the loopback interface is outside this threat model. |
| [030](030-bind-write-authorization-to-destinations-not-just-content.md) | Split write authorization into a validated root, a validated destination, and a path-bound receipt. resolveProjectRoot() refuses the filesystem root, the home directory, and system directories (temp dirs stay allowed for... | Multi-file writes now require passing `files` to rule_tool_gateway; a bare `code` string cannot describe more than one destination and is limited to the legacy single-file flow. |
| [029](029-clean-rule-commands-via-user-commands-prompt-suppression-not-a-plugin.md) | 1. Do NOT ship a Claude plugin. 2) Generate the clean command set from the MCP prompt registry as the single source of truth (src/core/agent-commands.js + `rule-mcp agent-commands` CLI): the rule-mcp router... | Claude users get bare /rule-* commands with no (MCP) duplicates after re-install + session restart. |
| [028](028-migrate-repo-tooling-to-eslint-10-flat-config-with-eslint-plugin-unicorn.md) | Migrate the repo to ESLint 10.8 flat config (eslint.config.mjs: @eslint/js + eslint-plugin-unicorn recommended + preserved repo preferences). | pnpm lint passes with 0 errors and 48 warnings (CI budget 50); the code follows modern idioms (node:, replaceAll, flatMap, new for builtins, ternaries, assert.ok) and 2 real bugs were fixed (${words} interpolation in... |
| [027](027-adopt-eslint-plugin-unicorn-for-js-ts-quality.md) | Update rule-toolchain-eslint to ESLint 10 flat config + eslint-plugin-unicorn (preset and high-value rules, keep/warn/disable table for opinionated rules, incremental adoption strategy, pairing with... | ESLint tooling is aligned with ESLint 10 and flat config; code validated by pix_check follows modern, performant idioms (Set.has O(1) instead of includes O(n²) in loops, for...of with TS narrowing, non-shadowable node:... |
| [026](026-strengthen-typescript-discipline-for-large-codebases.md) | Update rule-toolchain-typescript with exactOptionalPropertyTypes, verbatimModuleSyntax, explicit strict checks, incremental migration, discriminated unions, branded types, unknown, boundary validation, generated types,... | The skill provides a safer baseline for large codebases and makes explicit the difference between compile-time and runtime guarantees; enabling exactOptionalPropertyTypes may require call site migration. |
| [025](025-strengthen-database-relational-constraint-skills.md) | Integrate these rules into the rule-data-sql, rule-data-postgresql, and rule-data-mysql skills, keeping version-specific details of PostgreSQL 18 and MySQL/MariaDB separate. | Skills will guide toward database-verifiable constraints, schema and migration testing, column documentation, and more informed indexing choices; PostgreSQL 18 examples remain opt-in and won't be treated as PostgreSQL... |
| [024](024-lossless-installer-preserve-toolprefix-normalize-rule-blank-lines.md) | upsertJsonServer/upsertVscode merge the existing entry with the new config, preserving user keys (toolPrefix, timeout, custom env); cmdConfig writes toolPrefix:"none" by default for pi (tool rule-tool-_, prompt /rule-_);... | The uninstall+install cycle is idempotent (no accumulated blank lines, no lost user keys). |
| [023](023-per-invocation-self-update-with-temporal-throttle-fire-and-forget.md) | The check fires on every tool invocation but the actual git fetch is throttled: at most every RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS (default 60, 0 = every call, min 1s). | Positives: updates received within ~1 minute of any activity, zero added latency per call (throttled background check), git-clone installs always fresh without manual intervention. |
| [022](022-add-rule-toolchain-commits-skill-for-atomic-conventional-commits-with-mandatory-s.md) | Add a dedicated skill `rule-toolchain-commits` (tool `rule_tool_toolchain_commits`) in the rule-toolchain group that enforces atomic Conventional Commits with a MANDATORY scope on every commit/push, and add a git domain... | Positive: commit/push prompts now deterministically route to rule-toolchain-commits; the rule (scope mandatory, atomicity) becomes a first-class skill in the same group as the hook tooling it depends on... |
| [021](021-rename-rule-mcp-agents-to-rule-ai-agents-and-add-rule-ai-collector-skill.md) | Rename `rule-mcp-agents` to `rule-ai-agents` (tool becomes `rule_tool_ai_agents`) and add a new `rule-ai` collector skill that indexes AI/agent skills - `rule-ai-agents` (@rule/rule-mcp-core based) and... | Positive: AI/agent prompts now route to the `rule-ai` collector with `rule-ai-agents` as the concrete skill; naming is dependency-agnostic and consistent with other domain collectors; project auto-detection suggests the... |
| [018](018-fix-vscode-extension-and-derivatives-install-uninstall.md) | Add `installVscodeExtension` and `uninstallVscodeExtension` functions in install.js that install/uninstall the .vsix for all derivative editors using their respective CLIs. | Allows installing and uninstalling the VS Code extension from `rule-mcp install --agent vscode`, from `install.sh`, and from `install.ps1`. Supports all VS Code-based editors (Cursor, Windsurf, VS Code Insiders,... |
| [017](017-native-claude-skills-integration.md) | installNativeSkills() now copies skills to ~/.claude/skills/<name>/ with Claude-compatible YARD frontmatter. | Claude can auto-discover skills. |
| [016](016-documentation-and-see-also-in-skills.md) | Added ## See also section with links to related skills in all missing skills. | Docs tests pass. |
| [014](014-lossless-idempotent-installer.md) | parseJson() now returns null on error, not {}. JSON file writes use atomicWrite with preventive backup. | User configuration is no longer lost on malformed JSON. Install/uninstall operations are reproducible. |
| [013](013-sandbox-timeout-with-abortcontroller.md) | withTimeout() now uses AbortController to actually cancel the ongoing operation when the timeout fires. | No pending operations after timeout. |
| [012](012-skill-routing-pnpm-package-manager-workspace-monorepo-setup.md) | Use `rule-toolchain-pnpm` for this task. | None - informational entry. |
| [012](012-sse-server-with-bearer-auth.md) | The SSE server generates a bearer token at startup, requires Authorization: Bearer on /sse and /message, CORS deny-by-default, body limit 1MB. | Server secure by default. |
| [011](011-skill-routing-parcel-bundler-zero-config-build-tool.md) | Use `rule-toolchain-parcel` for this task. | None - informational entry. |
| [011](011-use-a-persistent-local-bearer-token-for-daemon-transport.md) | Store one 256-bit token at ~/.local/state/rule-mcp/sse-token with owner-only permissions. | Daemon clients remain connected across LaunchAgent/systemd restarts; secrets are no longer emitted in logs. |
| [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) | Wrap every MCP handler with mandatory preprocessing and postprocessing. | Positive: deterministic fail-closed behavior, visible audit contract, fewer hallucinated dependencies and completion claims, consistent cross-agent workflow. |
| [010](010-skill-routing-husky-git-hooks-pre-commit-lint-staged-commit.md) | Use `rule-toolchain-husky` for this task. | None - informational entry. |
| [009](009-file-based-skill-loading.md) | Use **file-based skill loading** with an in-memory LRU cache. | - Cross-skill queries require scanning all SKILL.md files at startup (∼20ms for 17 skills, negligible). |
| [009](009-forms-per-framework-merger-and-distribution.md) | ### 1. Merge React forms into `rule-frontend-react`. | **Positive:**. |
| [009](009-skill-routing-turborepo-monorepo-pipeline-caching-parallel.md) | Use `rule-toolchain-turborepo` for this task. | None - informational entry. |
| [008](008-sdk-over-handrolled-protocol.md) | Replace the hand-rolled protocol with `@modelcontextprotocol/sdk` v1.29.0. | - SDK is a runtime dependency (`@modelcontextprotocol/sdk` 1.29.0). |
| [008](008-skill-routing-eslint-flat-config-for-typescript-react-proje.md) | Use `rule-toolchain-eslint` for this task. | None - informational entry. |
| [008](008-toolchain-skill-isolation-vite.md) | Extract all Vite-related content from `rule-scaffold-frontend-react-vite` into a new `rule-toolchain-vite` skill covering:. | **Positive:**. |
| [007](007-database-skills.md) | Create four database skills spanning relational and document databases:. | **Positive:**. |
| [007](007-skill-routing-typescript-tsconfig-strict-mode-configuration.md) | Use `rule-toolchain-typescript` for this task. | None - informational entry. |
| [007](007-vanilla-js-over-typescript.md) | Use **Vanilla JavaScript (ESM)** throughout. | - No compile-time type checking. |
| [006](006-backend-framework-skills.md) | Add four backend framework skills covering the major Node.js HTTP framework ecosystems:. | **Positive:**. |
| [006](006-forms-per-framework.md) | ### 1. Merge React forms into `rule-frontend-react`. | **Positive:**. |
| [005](005-scaffold-skill-consolidation.md) | ### 1. Rename and absorb `scaffold-backend-node` → `backend-node`. | **Positive:**. |
| [005](005-toolchain-vite.md) | Extract all Vite-related content from `rule-scaffold-frontend-react-vite` into a new `rule-toolchain-vite` skill covering:. | **Positive:**. |
| [004](004-database-skills.md) | Create four database skills spanning relational and document databases:. | **Positive:**. |
| [004](004-thematic-skill-taxonomy-rename.md) | Adopt a prefix-based thematic taxonomy with the following categories:. | **Positive:**. |
| [003](003-backend-framework-skills.md) | Add four backend framework skills covering the major Node.js HTTP framework ecosystems:. | **Positive:**. |
| [003](003-file-based-skill-loading-over-database.md) | Use **file-based skill loading** with an in-memory LRU cache. | - Cross-skill queries require scanning all SKILL.md files at startup (∼20ms for 17 skills, negligible). |
| [002](002-official-mcp-sdk-over-hand-rolled-protocol.md) | Replace the hand-rolled protocol with `@modelcontextprotocol/sdk` v1.29.0. | - SDK is a runtime dependency (`@modelcontextprotocol/sdk` 1.29.0). |
| [002](002-scaffold-consolidation.md) | ### 1. Rename and absorb `scaffold-backend-node` → `backend-node`. | **Positive:**. |
| [001](001-thematic-skill-rename.md) | Adopt a prefix-based thematic taxonomy with the following categories:. | **Positive:**. |
| [001](001-vanilla-js-over-typescript.md) | Use **Vanilla JavaScript (ESM)** throughout. | - No compile-time type checking. |

## By theme

Tags carried by 3 or more decisions. A decision appears under every
theme it carries, and the early ADRs that predate the tag field are listed last.

### skills

- [046](046-restructure-the-command-surface-rule-router-rule-area-caveman-implicit-rule-process.md) Restructure the command surface: /rule router, rule-area-*, caveman implicit, rule-process-tdd skill
- [022](022-add-rule-toolchain-commits-skill-for-atomic-conventional-commits-with-mandatory-s.md) Add rule-toolchain-commits skill for atomic conventional commits with mandatory scope
- [021](021-rename-rule-mcp-agents-to-rule-ai-agents-and-add-rule-ai-collector-skill.md) Rename rule-mcp-agents to rule-ai-agents and add rule-ai collector skill
- [008](008-toolchain-skill-isolation-vite.md) toolchain skill isolation vite
- [007](007-database-skills.md) database skills
- [006](006-backend-framework-skills.md) backend framework skills
- [005](005-scaffold-skill-consolidation.md) scaffold skill consolidation
- [005](005-toolchain-vite.md) Toolchain Skill Isolation (Vite)
- [004](004-database-skills.md) Database Skills
- [003](003-backend-framework-skills.md) Backend Framework Skills
- [002](002-scaffold-consolidation.md) Scaffold Skill Consolidation

### architecture

- [041](041-port-the-complete-rule-evolution-as-a-rule-native-additive-union.md) Port the complete rule evolution as a rule-native additive union
- [034](034-registry-driven-clean-slash-commands-for-every-agent-and-ide.md) Registry-driven clean slash commands for every agent and IDE
- [033](033-the-tool-surface-is-skills-and-nothing-else.md) The tool surface is ./skills and nothing else
- [032](032-pin-the-self-update-remote-and-drop-root-in-the-container.md) Pin the self-update remote and drop root in the container
- [031](031-interview-servers-enforce-same-origin-and-own-their-process-lifecycle.md) Interview servers enforce same-origin and own their process lifecycle
- [030](030-bind-write-authorization-to-destinations-not-just-content.md) Bind write authorization to destinations, not just content
- [011](011-use-a-persistent-local-bearer-token-for-daemon-transport.md) use a persistent local bearer token for daemon transport
- [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) fail closed mcp enforcement and reusable agent commands
- [009](009-forms-per-framework-merger-and-distribution.md) forms per framework merger and distribution
- [006](006-forms-per-framework.md) Forms per Framework - Merger & Distribution

### routing

- [022](022-add-rule-toolchain-commits-skill-for-atomic-conventional-commits-with-mandatory-s.md) Add rule-toolchain-commits skill for atomic conventional commits with mandatory scope
- [021](021-rename-rule-mcp-agents-to-rule-ai-agents-and-add-rule-ai-collector-skill.md) Rename rule-mcp-agents to rule-ai-agents and add rule-ai collector skill
- [012](012-skill-routing-pnpm-package-manager-workspace-monorepo-setup.md) Skill routing: pnpm package manager workspace monorepo setup
- [011](011-skill-routing-parcel-bundler-zero-config-build-tool.md) Skill routing: Parcel bundler zero config build tool
- [010](010-skill-routing-husky-git-hooks-pre-commit-lint-staged-commit.md) Skill routing: Husky git hooks pre-commit lint-staged commitlint
- [009](009-skill-routing-turborepo-monorepo-pipeline-caching-parallel.md) Skill routing: Turborepo monorepo pipeline caching parallel builds
- [008](008-skill-routing-eslint-flat-config-for-typescript-react-proje.md) Skill routing: ESLint flat config for TypeScript React project
- [007](007-skill-routing-typescript-tsconfig-strict-mode-configuration.md) Skill routing: TypeScript tsconfig strict mode configuration

### installer

- [047](047-drop-the-vs-code-extension-and-its-installers.md) Drop the VS Code extension and its installers
- [046](046-restructure-the-command-surface-rule-router-rule-area-caveman-implicit-rule-process.md) Restructure the command surface: /rule router, rule-area-*, caveman implicit, rule-process-tdd skill
- [038](038-split-hotspot-modules.md) Split the hotspot modules (guardrails + installer)
- [035](035-installer-self-heals-global-shim-surfaces-failures-gates-tui-rendering.md) Installer self-heals its global shim, surfaces failures, and gates TUI rendering
- [029](029-clean-rule-commands-via-user-commands-prompt-suppression-not-a-plugin.md) Clean /rule-* commands via user commands + prompt suppression, not a plugin
- [024](024-lossless-installer-preserve-toolprefix-normalize-rule-blank-lines.md) Lossless installer: preserve toolPrefix and normalize rule blank lines
- [018](018-fix-vscode-extension-and-derivatives-install-uninstall.md) Fix VS Code extension and derivatives install/uninstall

### auto-log

- [012](012-skill-routing-pnpm-package-manager-workspace-monorepo-setup.md) Skill routing: pnpm package manager workspace monorepo setup
- [011](011-skill-routing-parcel-bundler-zero-config-build-tool.md) Skill routing: Parcel bundler zero config build tool
- [010](010-skill-routing-husky-git-hooks-pre-commit-lint-staged-commit.md) Skill routing: Husky git hooks pre-commit lint-staged commitlint
- [009](009-skill-routing-turborepo-monorepo-pipeline-caching-parallel.md) Skill routing: Turborepo monorepo pipeline caching parallel builds
- [008](008-skill-routing-eslint-flat-config-for-typescript-react-proje.md) Skill routing: ESLint flat config for TypeScript React project
- [007](007-skill-routing-typescript-tsconfig-strict-mode-configuration.md) Skill routing: TypeScript tsconfig strict mode configuration

### tool

- [012](012-skill-routing-pnpm-package-manager-workspace-monorepo-setup.md) Skill routing: pnpm package manager workspace monorepo setup
- [011](011-skill-routing-parcel-bundler-zero-config-build-tool.md) Skill routing: Parcel bundler zero config build tool
- [010](010-skill-routing-husky-git-hooks-pre-commit-lint-staged-commit.md) Skill routing: Husky git hooks pre-commit lint-staged commitlint
- [009](009-skill-routing-turborepo-monorepo-pipeline-caching-parallel.md) Skill routing: Turborepo monorepo pipeline caching parallel builds
- [008](008-skill-routing-eslint-flat-config-for-typescript-react-proje.md) Skill routing: ESLint flat config for TypeScript React project
- [007](007-skill-routing-typescript-tsconfig-strict-mode-configuration.md) Skill routing: TypeScript tsconfig strict mode configuration

### toolchain

- [028](028-migrate-repo-tooling-to-eslint-10-flat-config-with-eslint-plugin-unicorn.md) Migrate repo tooling to ESLint 10 flat config with eslint-plugin-unicorn
- [027](027-adopt-eslint-plugin-unicorn-for-js-ts-quality.md) Adopt eslint-plugin-unicorn for JS/TS quality
- [026](026-strengthen-typescript-discipline-for-large-codebases.md) Strengthen TypeScript discipline for large codebases
- [022](022-add-rule-toolchain-commits-skill-for-atomic-conventional-commits-with-mandatory-s.md) Add rule-toolchain-commits skill for atomic conventional commits with mandatory scope
- [008](008-toolchain-skill-isolation-vite.md) toolchain skill isolation vite
- [005](005-toolchain-vite.md) Toolchain Skill Isolation (Vite)

### guardrails

- [044](044-gateway-as-the-single-entrypoint-with-server-side-receipts-backend-data-devops-g.md) Gateway as the single entrypoint with server-side receipts; backend/data/devops guardrail families
- [042](042-port-fidelity-rules-over-rule-check-brace-style-guardrails-on-backend-modules.md) Port fidelity rules over pix_check brace-style guardrails on backend modules
- [038](038-split-hotspot-modules.md) Split the hotspot modules (guardrails + installer)
- [027](027-adopt-eslint-plugin-unicorn-for-js-ts-quality.md) Adopt eslint-plugin-unicorn for JS/TS quality
- [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) fail closed mcp enforcement and reusable agent commands

### infrastructure

- [005](005-scaffold-skill-consolidation.md) scaffold skill consolidation
- [004](004-thematic-skill-taxonomy-rename.md) thematic skill taxonomy rename
- [002](002-scaffold-consolidation.md) Scaffold Skill Consolidation
- [001](001-thematic-skill-rename.md) Thematic Skill Taxonomy Rename

### new

- [007](007-database-skills.md) database skills
- [006](006-backend-framework-skills.md) backend framework skills
- [004](004-database-skills.md) Database Skills
- [003](003-backend-framework-skills.md) Backend Framework Skills

### taxonomy

- [022](022-add-rule-toolchain-commits-skill-for-atomic-conventional-commits-with-mandatory-s.md) Add rule-toolchain-commits skill for atomic conventional commits with mandatory scope
- [021](021-rename-rule-mcp-agents-to-rule-ai-agents-and-add-rule-ai-collector-skill.md) Rename rule-mcp-agents to rule-ai-agents and add rule-ai collector skill
- [004](004-thematic-skill-taxonomy-rename.md) thematic skill taxonomy rename
- [001](001-thematic-skill-rename.md) Thematic Skill Taxonomy Rename

### backend

- [044](044-gateway-as-the-single-entrypoint-with-server-side-receipts-backend-data-devops-g.md) Gateway as the single entrypoint with server-side receipts; backend/data/devops guardrail families
- [006](006-backend-framework-skills.md) backend framework skills
- [003](003-backend-framework-skills.md) Backend Framework Skills

### commands

- [046](046-restructure-the-command-surface-rule-router-rule-area-caveman-implicit-rule-process.md) Restructure the command surface: /rule router, rule-area-*, caveman implicit, rule-process-tdd skill
- [045](045-split-review-personas-into-per-operation-commands-plan-audit-review.md) Split review personas into per-operation commands (plan/audit/review)
- [029](029-clean-rule-commands-via-user-commands-prompt-suppression-not-a-plugin.md) Clean /rule-* commands via user commands + prompt suppression, not a plugin

### database

- [025](025-strengthen-database-relational-constraint-skills.md) Strengthen database relational constraint skills
- [007](007-database-skills.md) database skills
- [004](004-database-skills.md) Database Skills

### mcp

- [029](029-clean-rule-commands-via-user-commands-prompt-suppression-not-a-plugin.md) Clean /rule-* commands via user commands + prompt suppression, not a plugin
- [011](011-use-a-persistent-local-bearer-token-for-daemon-transport.md) use a persistent local bearer token for daemon transport
- [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) fail closed mcp enforcement and reusable agent commands

### prompts

- [046](046-restructure-the-command-surface-rule-router-rule-area-caveman-implicit-rule-process.md) Restructure the command surface: /rule router, rule-area-*, caveman implicit, rule-process-tdd skill
- [045](045-split-review-personas-into-per-operation-commands-plan-audit-review.md) Split review personas into per-operation commands (plan/audit/review)
- [043](043-pre-packaged-mcp-prompt-registry-26-prompts-strict-schemas-commit-scope-closer.md) Pre-packaged MCP prompt registry (26 prompts, strict schemas, commit-scope closer)

### quality

- [039](039-round-two-hardening-cycles-daemon-cleanup-diagnostics.md) Round-2 hardening - cycles, daemon/commands split, diagnostics, HTTP verification
- [027](027-adopt-eslint-plugin-unicorn-for-js-ts-quality.md) Adopt eslint-plugin-unicorn for JS/TS quality
- [026](026-strengthen-typescript-discipline-for-large-codebases.md) Strengthen TypeScript discipline for large codebases

### security

- [028](028-migrate-repo-tooling-to-eslint-10-flat-config-with-eslint-plugin-unicorn.md) Migrate repo tooling to ESLint 10 flat config with eslint-plugin-unicorn
- [011](011-use-a-persistent-local-bearer-token-for-daemon-transport.md) use a persistent local bearer token for daemon transport
- [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) fail closed mcp enforcement and reusable agent commands

### sql

- [025](025-strengthen-database-relational-constraint-skills.md) Strengthen database relational constraint skills
- [007](007-database-skills.md) database skills
- [004](004-database-skills.md) Database Skills

### vscode

- [047](047-drop-the-vs-code-extension-and-its-installers.md) Drop the VS Code extension and its installers
- [034](034-registry-driven-clean-slash-commands-for-every-agent-and-ide.md) Registry-driven clean slash commands for every agent and IDE
- [018](018-fix-vscode-extension-and-derivatives-install-uninstall.md) Fix VS Code extension and derivatives install/uninstall

### no tags

- [017](017-native-claude-skills-integration.md) native claude skills integration
- [016](016-documentation-and-see-also-in-skills.md) documentation and see also in skills
- [014](014-lossless-idempotent-installer.md) lossless idempotent installer
- [013](013-sandbox-timeout-with-abortcontroller.md) sandbox timeout with abortcontroller
- [012](012-sse-server-with-bearer-auth.md) sse server with bearer auth
- [009](009-file-based-skill-loading.md) File-Based Skill Loading over Database
- [008](008-sdk-over-handrolled-protocol.md) Official MCP SDK over Hand-Rolled Protocol
- [007](007-vanilla-js-over-typescript.md) Vanilla JS over TypeScript
- [003](003-file-based-skill-loading-over-database.md) file based skill loading over database
- [002](002-official-mcp-sdk-over-hand-rolled-protocol.md) official mcp sdk over hand rolled protocol
- [001](001-vanilla-js-over-typescript.md) vanilla js over typescript

## Operating rules

- Record a structural decision with `rule_tool_process_adr`, when it is taken.
- Never rewrite an accepted decision. Supersede it with a new one that says why.
- Never edit this file. Edit the ADR and let the next call regenerate it.
