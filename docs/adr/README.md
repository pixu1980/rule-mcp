# Architecture Decision Records

Questo indice elenca tutti gli ADR in ordine cronologico.

| # | Title | Date | Status | Tags |
|---|-------|------|--------|------|
| [042](042-port-fidelity-rules-over-rule-check-brace-style-guardrails-on-backend-modules.md) | Port fidelity rules over pix_check brace-style guardrails on backend modules | 2026-09-04 | accepted | port, guardrails, linters, decision |
| [041](041-port-the-complete-rule-evolution-as-a-rule-native-additive-union.md) | Port the complete rule evolution as a rule-native additive union | 2026-09-04 | proposed | architecture, porting, parity, tdd |
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
| [017](017-native-claude-skills-integration.md) | native claude skills integration |  | proposed |  |
| [016](016-documentation-and-see-also-in-skills.md) | documentation and see also in skills |  | proposed |  |
| [014](014-lossless-idempotent-installer.md) | lossless idempotent installer |  | proposed |  |
| [013](013-sandbox-timeout-with-abortcontroller.md) | sandbox timeout with abortcontroller |  | proposed |  |
| [012](012-skill-routing-pnpm-package-manager-workspace-monorepo-setup.md) | Skill routing: pnpm package manager workspace monorepo setup | 2026-07-11 | accepted | tool, auto-log, routing |
| [012](012-sse-server-with-bearer-auth.md) | sse server with bearer auth |  | proposed |  |
| [011](011-skill-routing-parcel-bundler-zero-config-build-tool.md) | Skill routing: Parcel bundler zero config build tool | 2026-07-11 | accepted | tool, auto-log, routing |
| [011](011-use-a-persistent-local-bearer-token-for-daemon-transport.md) | use a persistent local bearer token for daemon transport | 2026-07-16 | accepted | architecture, security, mcp, daemon |
| [010](010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md) | fail closed mcp enforcement and reusable agent commands | 2026-07-11 | accepted | architecture, security, mcp, guardrails, agents |
| [010](010-skill-routing-husky-git-hooks-pre-commit-lint-staged-commit.md) | Skill routing: Husky git hooks pre-commit lint-staged commitlint | 2026-07-11 | accepted | tool, auto-log, routing |
| [009](009-file-based-skill-loading.md) | File-Based Skill Loading over Database | 2026-06-20 | Accepted |  |
| [009](009-forms-per-framework-merger-and-distribution.md) | forms per framework merger and distribution | 2026-07-11 | accepted | architecture, forms, frontend, refactoring, solid |
| [009](009-skill-routing-turborepo-monorepo-pipeline-caching-parallel.md) | Skill routing: Turborepo monorepo pipeline caching parallel builds | 2026-07-11 | accepted | tool, auto-log, routing |
| [008](008-sdk-over-handrolled-protocol.md) | Official MCP SDK over Hand-Rolled Protocol | 2026-06-23 | Accepted |  |
| [008](008-skill-routing-eslint-flat-config-for-typescript-react-proje.md) | Skill routing: ESLint flat config for TypeScript React project | 2026-07-11 | accepted | tool, auto-log, routing |
| [008](008-toolchain-skill-isolation-vite.md) | toolchain skill isolation vite | 2026-07-10 | accepted | skills, toolchain, vite, build |
| [007](007-database-skills.md) | database skills | 2026-07-10 | accepted | skills, database, sql, nosql, new |
| [007](007-skill-routing-typescript-tsconfig-strict-mode-configuration.md) | Skill routing: TypeScript tsconfig strict mode configuration | 2026-07-11 | accepted | tool, auto-log, routing |
| [007](007-vanilla-js-over-typescript.md) | Vanilla JS over TypeScript | 2026-06-20 | Accepted |  |
| [006](006-backend-framework-skills.md) | backend framework skills | 2026-07-10 | accepted | skills, backend, frameworks, new |
| [006](006-forms-per-framework.md) | Forms per Framework - Merger & Distribution | 2026-07-11 | accepted | architecture, forms, frontend, refactoring, solid |
| [005](005-scaffold-skill-consolidation.md) | scaffold skill consolidation | 2026-07-10 | accepted | infrastructure, skills, scaffolding, merge |
| [005](005-toolchain-vite.md) | Toolchain Skill Isolation (Vite) | 2026-07-10 | accepted | skills, toolchain, vite, build |
| [004](004-database-skills.md) | Database Skills | 2026-07-10 | accepted | skills, database, sql, nosql, new |
| [004](004-thematic-skill-taxonomy-rename.md) | thematic skill taxonomy rename | 2026-07-10 | accepted | infrastructure, naming, taxonomy, breaking-change |
| [003](003-backend-framework-skills.md) | Backend Framework Skills | 2026-07-10 | accepted | skills, backend, frameworks, new |
| [003](003-file-based-skill-loading-over-database.md) | file based skill loading over database | 2026-06-20 | Accepted |  |
| [002](002-official-mcp-sdk-over-hand-rolled-protocol.md) | official mcp sdk over hand rolled protocol | 2026-06-23 | Accepted |  |
| [002](002-scaffold-consolidation.md) | Scaffold Skill Consolidation | 2026-07-10 | accepted | infrastructure, skills, scaffolding, merge |
| [001](001-thematic-skill-rename.md) | Thematic Skill Taxonomy Rename | 2026-07-10 | accepted | infrastructure, naming, taxonomy, breaking-change |
| [001](001-vanilla-js-over-typescript.md) | vanilla js over typescript | 2026-06-20 | Accepted |  |
