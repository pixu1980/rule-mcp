## HANDOFF: rule-mcp

- Branch: `main`
- Commit range: `f805d2da..8fa75c3e`
- Date: 2026-09-22
- File: `docs/handoff/17-flight-directive-and-surface-mapping.md`

### Project Identity

- Description: MCP server for rule-mcp-* skill ecosystem. Serves styleguides, component templates, framework best practices, and design system patterns.
- Version: 0.2.0-rc

### ADR Log

| #   | Status     | Title                                                                | Tags                                       | Decision                                                                                                            |
| --- | ---------- | -------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| 115 | accepted   | Map tools, slash commands, and skills into one surface               | tools, commands, skills                    | ### Keep                                                                                                            |
| 114 | accepted   | Flight is process-area guidance injected on every prompt,...         | commands, prompts, telemetry               | 1. Drop `/rule-mcp-process-flight` (and any `rule-mcp-flight` leftover) from the MCP prompt registry and fr...      |
| 113 | accepted   | Rename the command surface under process and persona name...         | commands, prompts, personas                | Breaking rename of the public command/skill/tool surface:                                                           |
| 112 | accepted   | Extend the file-size cap to the shipped skill trees                  | architecture, quality-gate, file-size      | Add skills/ to the size-cap roots. Exempt the test files the skill trees ship beside their code, ...                |
| 111 | accepted   | Close out audit security                                             | docs, closeout, audit                      | Fold the record into this ADR and the session handoff, then delete the source file. The full text...                |
| 110 | accepted   | Close out review security                                            | docs, closeout, review                     | Fold the record into this ADR and the session handoff, then delete the source file. The full text...                |
| 109 | accepted   | No corepack activation and no engines field in a generate...         | guardrails, pnpm, corepack                 | rule-mcp does not support either kind of field. Two guardrails own it: `pkg-no-corepack` fo...                      |
| 108 | accepted   | The handoff family gets a generated index, and the root H...         | handoff, docs, cli                         | docs/handoff/HANDOFF.md is generated from the numbered handoff files by handoff doctor, exactly a...                |
| 107 | accepted   | The design-system persona becomes the UI/UX lead                     | personas, ui, review                       | Rename the role id `design-system` to `ui` and its title to UI/UX Lead. Widen its lenses from fiv...                |
| 106 | accepted   | Check runs per area, and the general check auto-detects it           | commands, prompts, guardrails              | Remove `/rule-mcp-adr` and `/rule-mcp-process-check` from the MCP prompt registry. Give the agent command s...      |
| 105 | accepted   | opencode gets a dedicated installer writing its own confi...         | installer, cli, opencode                   | opencode gets a dedicated installer, like Pi: `upsertOpencode`/`removeOpencode` in the JSON write...                |
| 104 | accepted   | The handoff document closes with the resume prompt                   | handoff, handon, prompts                   | Every handoff document ends with a `Resume Prompt` section holding a fenced `prompt` block: the m...                |
| 103 | accepted   | Every handoff mode sweeps completed working papers, and c...         | docs, closeout, handoff                    | Both handoff modes and handon archive completed working papers by default, in src/tools/handoff/_...                |
| 102 | accepted   | Reinstall is one shell script behind three entry points              | cli, installer, devx                       | `scripts/reinstall.sh` owns the sequence and runs from the checkout it lives in; it refuses a dir...                |
| 101 | accepted   | Accept a comma-separated agent list in agent-commands                | cli, installer, agent-commands             | `resolveCommandTargets` now parses `options.agent` as a comma-separated list (arrays work too) an...                |
| 100 | accepted   | The TokenSave integration closes out: the adapter and its...         | tokensave, architecture, closeout          | Fold the plan record into this ADR, name it in the session handoff, and delete the source file; t...                |
| 099 | accepted   | Close out plan develop-consolidation                                 | docs, closeout, plan                       | Fold the record into this ADR and the session handoff, then delete the source file. The full text...                |
| 098 | accepted   | develop merges into main by area, and stays as an integra...         | process, git, merge                        | One merge commit, resolved by area rather than by hunk, followed by reconciliation commits. The O...                |
| 097 | accepted   | The release target is v0.1.0-beta, and the version toolin...         | release, versioning, changelog             | The version is 0.1.0-beta in package.json, server.json, both packaging manifests and the newest C...                |
| 096 | accepted   | TokenSave is the primary code graph, JavaScript is the fa...         | tokensave, architecture, adapter           | Add src/core/tokensave/ with three modules and a barrel. probe.js detects .tokensave/tokensave.db...                |
| 095 | accepted   | Close out the install and uninstall rework plan                      | docs, closeout, plan                       | Fold the record into this ADR and the session handoff, then delete the source file. The full text...                |
| 094 | accepted   | Rename the compression subsystem and apply it to every mo...         | compression, tokens, rename                | Rename the code, comments and configuration to neutral compression names: `_caveman*.js` becomes ...                |
| 093 | accepted   | Add an Open Source Steward persona for governance, contri...         | personas, open-source, governance          | Add `personas/oss.md` as an active persona named `Open Source Steward` with id `oss`. Its skills ...                |
| 092 | accepted   | Surface selection amends the install stack freeze with an...         | install, wizard, architecture              | Amend ADR 081 narrowly: the installer writes one grammar string (RULE_MCP_SURFACE) and the ...                      |
| 091 | accepted   | Install/uninstall rework keeps current stack, steps and c...         | install, wizard, architecture              | The install/uninstall rework changes wizard steps and contents only (order, copy, offered choices...                |
| 090 | accepted   | The setup wizard is the installer, and it asks which comm...         | installer, cli, wizard                     | The wizard is the installer. `src/cli/setup/` holds the whole flow - preflight, agents, mode, opt...                |
| 089 | accepted   | Skills own their guardrails, and three layers resolve bot...         | architecture, skills, guardrails           | A skill owns the rules that judge its subject. Guardrails move into skills/<name>/guardrails/*.js...                |
| 088 | accepted   | A persona topic is the binding scope of the run                      | personas, prompts, review                  | The topic becomes the binding scope everywhere the template speaks: the action line names the sco...                |
| 087 | superseded | Session close archives completed audits, reviews and plans           | process, handoff, docs                     | In close-session mode only, rule_tool_process_handoff folds each completed doc into one Nygard ADR...               |
| 086 | accepted   | Documentation site is hand-written static HTML from docs             | docs, site                                 | The documentation site is hand-written: a small Node generator in scripts/docs-site/ renders docs...                |
| 085 | superseded | Reset the project version to 0.1.0, first release will be...         | release, versioning                        | Reset the project version to 0.1.0 in package.json, server.json (both version fields), the CHANGE...                |
| 084 | accepted   | Keep the name with a written posture, no npm placeholder yet         | naming, legal                              | Keep the rule-mcp name with a written trademark posture (TRADEMARK.md) instead of a filing....                      |
| 083 | accepted   | Governance is an explicit BDFL with a path to co-maintainers         | governance, community                      | Governance is an explicit BDFL (pixu1980) with a documented path to co-maintainers. Disputes esca...                |
| 082 | accepted   | Release artifacts are GitHub tarballs, not registry packages         | registry, release                          | Release artifacts are signed GitHub Release tarballs, not registry packages: the pipeline packs t...                |
| 081 | accepted   | MCP registry identity is the GitHub owner, not a claimed ...         | registry, release                          | server.json name is io.github.pixu1980/rule, derived from repository.url. Registry publ...                          |
| 080 | superseded | One installer, a Node wizard with shell bootstraps                   | installer, cli, tui                        | One implementation, in Node, behind one command.                                                                    |
| 079 | superseded | Add the OSS Architect review persona                                 | persona, oss, open-source                  | Add the OSS Architect persona (id: oss) as src/roles/oss.md, status active, layer process, 25 yea...                |
| 078 | accepted   | Compress agent command files at write time                           | token-efficiency, compression, installer   | Compress the body of every agent command file at write time: renderAgentCommandFiles() applies th...                |
| 077 | accepted   | Compress every server->model list surface (prompts/list, t...        | token-efficiency, compression, mcp-surface | Compress the prose fields of all three list surfaces at the protocol boundary only: prompts/list ...                |
| 076 | accepted   | Coverage wave five raises the branch floor to 91                     | testing, coverage, ci                      | Cover the three biggest clusters that are not platform-locked and raise the floor to the measured...                |
| 075 | accepted   | Meta-frameworks get their own namespace and a narrow disp...         | skills, taxonomy, routing                  | Rename the four skills to rule-mcp-meta-astro, next, nuxt and remix, rename the occupying prompt to pi...           |
| 074 | accepted   | The CLI entry point loads no command handler it has not b...         | cli, startup, performance                  | Keep the command and option declarations static, and load the handlers inside their actions. The ...                |
| 073 | accepted   | Compression has four levels and no LLM in the output path            | compression, tokens, determinism           | Port the deterministic half and refuse the LLM half. Four levels (off, lite, full, ultra) select ...                |
| 072 | accepted   | The installer asks before copying bundled skills to the c...         | installer, skills, devx                    | Add a skills step to both installers that asks before copying. install.sh gains Phase 6c "Bundled...                |
| 071 | accepted   | The census generates eight numbered documents and three f...         | docs, census, generator                    | `docs/08-skills.md` through `docs/15-resources.md` are whole generated files, one inventory topic...                |
| 070 | accepted   | Installer mode step replaces the agent picker instead of ...         | installer, tui, devx                       | Bring bash to parity with PowerShell: on entering step 2, draw_mode_panel retitles the banner to ...                |
| 069 | accepted   | Coverage wave four holds the floor at 90 and fixes the da...         | testing, coverage, ci                      | Hold BRANCH_FLOOR at 90: the local measure (90.74) is below 91, so a raise would gate above what ...                |
| 068 | accepted   | src shared for every shareable helper                                |                                            | All cross-cutting helpers with more than one caller live in `src/shared/` with a barrel (`index.j...                |
| 067 | accepted   | co locate every test with its module                                 |                                            | Move every unit and integration suite from `tests/<area>/...` into `src/<area                                       | <module>>/**tests**... |
| 066 | accepted   | Remove externally derived skills from the served knowledg...         | skills, knowledge-base, attribution        | Remove all externally derived content from the served knowledge base. Permanently deleted 8 skill...                |
| 065 | accepted   | Coverage floor raised to 90                                          | testing, coverage, ci                      | Raise BRANCH_FLOOR from 89 to 90 in scripts/reports/coverage/_threshold.data.mjs. Ratchet mechani...                |
| 064 | accepted   | Coverage floor raised to 89 toward the 95 endpoint                   | testing, coverage, ci                      | Raise BRANCH_FLOOR in scripts/reports/coverage/_threshold.data.mjs from 87 to 89. The ratchet mec...                |
| 063 | accepted   | Coverage floor raised to 87; 95 remains the ratchet endpoint         | testing, coverage, ci                      | Raise BRANCH_FLOOR in scripts/reports/coverage/_threshold.data.mjs from 83 to 87. The gate and th...                |
| 062 | accepted   | Glob suite runner, co-located tests, and a branch-coverag...         | testing, ci, coverage                      | Four pieces. (1) `scripts/ci/run-tests/index.mjs` resolves a suite from glob patterns in `_suites...                |
| 061 | accepted   | One global shim, and hermetic PNPM_HOME in script tests              | installer, cli, shim                       | Three layers. (1) Every test that spawns the shell scripts sets `env.PNPM_HOME` to a sandbox dire...                |
| 060 | accepted   | Plans carry nested sub-steps and an exhaustiveness mandate           | documentation, personas, plans             | A finding passed to `rule_tool_plan_docs` may carry a `steps` array; the renderer nests each entry...               |
| 059 | accepted   | Persona plans are checklists with marks that survive the ...         | documentation, personas, plans             | The plan renderer emits a checklist instead of a table: one `- [ ] **Step N - <finding-id> (<seve...                |
| 058 | accepted   | One file per rule with underscore-barrel folders and a si...         | architecture, refactor, structure          | Split rule catalogs one file per rule under family folders (framework/js, framework/vanilla, qual...                |
| 057 | accepted   | Reorganize scripts, src and tests with 150-line code spli...         | architecture, refactor, testing            | Reorganize scripts/, src/ and test/ (renamed to tests/) into thematic subfolders by feature; appl...                |
| 056 | accepted   | Drop the VS Code extension and its installers                        | vscode, extension, installer               | Delete extensions/ (vscode-rule-mcp source + rule-mcp-vanilla-reactive.vsix). Remove the five extension fun...      |
| 055 | accepted   | Restructure the command surface: /rule router, rule-area-*,...       | commands, prompts, surface                 | Restructure the command surface: router rule-mcp -> rule-mcp; area prompts become rule-area-*; de...                |
| 054 | accepted   | Split review personas into per-operation commands (plan/a...         | personas, commands, prompts                | Give each active role three slash commands - `rule-persona-<role>-plan`, `rule-persona-<role>-audit...              |
| 053 | accepted   | Gateway as the single entrypoint with server-side receipt...         | gateway, guardrails, determinism           | Gateway is the single server-side orchestrating entrypoint for every implementation flow; it issu...                |
| 052 | accepted   | Pre-packaged MCP prompt registry (26 prompts, strict sche...         | prompts, registry, tdd                     | Adopt the 26-prompt pre-packaged registry in src/prompts/index.js with strict argument schemas, t...                |
| 051 | accepted   | Token-efficiency pipeline (caveman aggressive + tokensave...         | token-efficiency, caveman, tokensave       | 1. **Decoration lives at the MCP boundary** (`src/server.js` CallToolRequestSchema handler), n...                   |
| 050 | accepted   | Round-2 hardening - cycles, daemon/commands split, diagno...         | refactor, cycles, daemon                   | 1. **Break the init cycles**: `getSkillMetadata` moved into the skill store (`tools/router.js`...                   |
| 049 | accepted   | Split the hotspot modules (guardrails + installer)                   | refactor, maintainability, guardrails      | 1. **Guardrails**: each family moves to `src/core/guardrails/`, `shared.js`, `file-tree.js`, ...                    |
| 048 | accepted   | v1.0.0 release and the docs-accuracy guard                           | release, docs, accuracy                    | 1. Add `test/docs-accuracy.test.mjs`: it computes the runtime surface (`listTools`/`listResources...                |
| 047 | accepted   | rule-mcp-architect splits into a standalone web app rep...           | architect, split, repo                     | Split the architect product out of rule-mcp:                                                                        |
| 046 | accepted   | Installer self-heals its global shim, surfaces failures, ...         | installer, cli, cross-platform             | 1. **Verify before trust.** `shim_works()` (bash) / `Test-RuleMCPCli` (PS) run `rule-mcp --v...                     |
| 045 | accepted   | Migrate repo tooling to ESLint 10 flat config with eslint...         | eslint, toolchain, unicorn                 | Migrate the repo to ESLint 10.8 flat config (eslint.config.mjs: @eslint/js + eslint-plugin-unicor...                |
| 044 | accepted   | Adopt eslint-plugin-unicorn for JS/TS quality                        | eslint, toolchain, unicorn                 | Update rule-mcp-toolchain-eslint to ESLint 10 flat config + eslint-plugin-unicorn (preset and high-val...           |
| 043 | accepted   | Strengthen TypeScript discipline for large codebases                 | typescript, toolchain, strict              | Update rule-mcp-toolchain-typescript with exactOptionalPropertyTypes, verbatimModuleSyntax, explicit s...           |
| 042 | accepted   | Strengthen database relational constraint skills                     | database, sql, postgresql                  | Integrate these rules into the rule-mcp-data-sql, rule-mcp-data-postgresql, and rule-mcp-data-mysql skills, keep... |
| 041 | accepted   | Lossless installer: preserve toolPrefix and normalize rul...         | installer, idempotency, toolPrefix         | upsertJsonServer/upsertVscode merge the existing entry with the new config, preserving user keys ...                |
| 040 | accepted   | Per-invocation self-update with temporal throttle and fir...         | self-update, mcp-server, operational       | The check fires on every tool invocation but the actual git fetch is throttled: at most every PIX...                |
| 039 | superseded | Fix VS Code extension and derivatives install/uninstall              | vscode, extension, installer               | Add `installVscodeExtension` and `uninstallVscodeExtension` functions in install.js that install/...                |
| 038 | proposed   | native claude skills integration                                     |                                            | installNativeSkills() now copies skills to ~/.claude/skills/<name>/ with Claude-compatible YARD f...                |
| 037 | proposed   | documentation and see also in skills                                 |                                            | Added ## See also section with links to related skills in all missing skills.                                       |
| 036 | proposed   | lossless idempotent installer                                        |                                            | parseJson() now returns null on error, not {}. JSON file writes use atomicWrite with preventive b...                |
| 035 | proposed   | sandbox timeout with abortcontroller                                 |                                            | withTimeout() now uses AbortController to actually cancel the ongoing operation when the timeout ...                |
| 034 | proposed   | sse server with bearer auth                                          |                                            | The SSE server generates a bearer token at startup, requires Authorization: Bearer on /sse and /m...                |
| 033 | accepted   | Registry-driven clean slash commands for every agent and IDE         | architecture, cli, agents                  | Add `src/core/agent-command-targets.js` as the **single registry** of clean-command targets. One ...                |
| 032 | accepted   | The tool surface is ./skills and nothing else                        | architecture                               | The bundled `skills/` directory is the single source of truth for the tool surface.                                 |
| 031 | accepted   | Pin the self-update remote and drop root in the container            | architecture                               | Verify the update source before any network or merge operation. normalizeRemoteUrl() reduces a re...                |
| 030 | accepted   | Interview servers enforce same-origin and own their proce...         | architecture                               | Add skills/rule-mcp-architect/http-guard.mjs - a shared, pure checkLocalRequest()/denyForeignRe...                  |
| 029 | accepted   | Bind write authorization to destinations, not just content           | architecture                               | Split write authorization into a validated root, a validated destination, and a path-bound receip...                |
| 028 | accepted   | Clean /rule-mcp-* commands via user commands + prompt suppress...    | commands, claude, mcp                      | 1. Do NOT ship a Claude plugin. 2) Generate the clean command set from the MCP prompt registry as...                |
| 027 | accepted   | Add rule-mcp-toolchain-commits skill for atomic conventional c...    | taxonomy, skills, routing                  | Add a dedicated skill `rule-mcp-toolchain-commits` (tool `rule_tool_toolchain_commits`) in the rule-mcp-tool...     |
| 026 | accepted   | Rename rule-mcp-agents to rule-mcp-ai-agents and add rule-mcp-ai ... | taxonomy, skills, routing                  | Rename `rule-mcp-agents` to `rule-mcp-ai-agents` (tool becomes `rule_tool_ai_agents`) and add a new `...            |
| 025 | accepted   | Skill routing: pnpm package manager workspace monorepo setup         | tool, auto-log, routing                    | Use `rule-mcp-toolchain-pnpm` for this task.                                                                        |
| 024 | accepted   | Skill routing: Parcel bundler zero config build tool                 | tool, auto-log, routing                    | Use `rule-mcp-toolchain-parcel` for this task.                                                                      |
| 023 | accepted   | Skill routing: Husky git hooks pre-commit lint-staged com...         | tool, auto-log, routing                    | Use `rule-mcp-toolchain-husky` for this task.                                                                       |
| 022 | accepted   | Skill routing: Turborepo monorepo pipeline caching parall...         | tool, auto-log, routing                    | Use `rule-mcp-toolchain-turborepo` for this task.                                                                   |
| 021 | accepted   | Skill routing: ESLint flat config for TypeScript React pr...         | tool, auto-log, routing                    | Use `rule-mcp-toolchain-eslint` for this task.                                                                      |
| 020 | accepted   | Skill routing: TypeScript tsconfig strict mode configuration         | tool, auto-log, routing                    | Use `rule-mcp-toolchain-typescript` for this task.                                                                  |
| 019 | accepted   | use a persistent local bearer token for daemon transport             | architecture, security, mcp                | Store one 256-bit token at ~/.rule-mcp/state/sse-token with owner-only permissions. Daemon/...                      |
| 018 | accepted   | fail closed mcp enforcement and reusable agent commands              | architecture, security, mcp                | Wrap every MCP handler with mandatory preprocessing and postprocessing. Reject unsafe input and m...                |
| 017 | accepted   | forms per framework merger and distribution                          | architecture, forms, frontend              | ### 1. Merge React forms into `rule-mcp-frontend-react`                                                             |
| 016 | Accepted   | File-Based Skill Loading over Database                               |                                            | Use **file-based skill loading** with an in-memory LRU cache.                                                       |
| 015 | accepted   | toolchain skill isolation vite                                       | skills, toolchain, vite                    | Extract all Vite-related content from `rule-mcp-scaffold-frontend-react-vite` into a new `rule-mcp-toolchai...      |
| 014 | Accepted   | Official MCP SDK over Hand-Rolled Protocol                           |                                            | Replace the hand-rolled protocol with `@modelcontextprotocol/sdk` v1.29.0.                                          |
| 013 | Accepted   | Vanilla JS over TypeScript                                           |                                            | Use **Vanilla JavaScript (ESM)** throughout.                                                                        |
| 012 | accepted   | Database Skills                                                      | skills, database, sql                      | Create four database skills spanning relational and document databases:                                             |
| 011 | accepted   | Forms per Framework - Merger & Distribution                          | architecture, forms, frontend              | ### 1. Merge React forms into `rule-mcp-frontend-react`                                                             |
| 010 | accepted   | backend framework skills                                             | skills, backend, frameworks                | Add four backend framework skills covering the major Node.js HTTP framework ecosystems:                             |
| 009 | accepted   | Toolchain Skill Isolation (Vite)                                     | skills, toolchain, vite                    | Extract all Vite-related content from `rule-mcp-scaffold-frontend-react-vite` into a new `rule-mcp-toolchai...      |
| 008 | accepted   | scaffold skill consolidation                                         | infrastructure, skills, scaffolding        | ### 1. Rename and absorb `scaffold-backend-node` -> `backend-node`                                                  |
| 007 | accepted   | thematic skill taxonomy rename                                       | infrastructure, naming, taxonomy           | Adopt a prefix-based thematic taxonomy with the following categories:                                               |
| 006 | Accepted   | file based skill loading over database                               |                                            | Use **file-based skill loading** with an in-memory LRU cache.                                                       |
| 005 | accepted   | Backend Framework Skills                                             | skills, backend, frameworks                | Add four backend framework skills covering the major Node.js HTTP framework ecosystems:                             |
| 004 | accepted   | Scaffold Skill Consolidation                                         | infrastructure, skills, scaffolding        | ### 1. Rename and absorb `scaffold-backend-node` -> `backend-node`                                                  |
| 003 | Accepted   | official mcp sdk over hand rolled protocol                           |                                            | Replace the hand-rolled protocol with `@modelcontextprotocol/sdk` v1.29.0.                                          |
| 002 | Accepted   | vanilla js over typescript                                           |                                            | Use **Vanilla JavaScript (ESM)** throughout.                                                                        |
| 001 | accepted   | Thematic Skill Taxonomy Rename                                       | infrastructure, naming, taxonomy           | Adopt a prefix-based thematic taxonomy with the following categories:                                               |

### Recent Commits

```
8fa75c3e docs(adr): accept ADR 114 and 115 (28 seconds ago)
e65cc04d feat(tools): map tools, slash commands, and skills (35 seconds ago)
f33bedfb feat(directive): inject flight guidance on every prompt (50 seconds ago)
f7cc269c feat(commands): rename slash surface under process and persona namespaces (2 hours ago)
f805d2da chore(handoff): add session handoff 16-arch-7.1-shipped-god-file-splits (22 hours ago)
a5fbcce8 docs(architect): mark ARCH-7.1 complete (22 hours ago)
d25914eb refactor(skills): split shipped god files (22 hours ago)
b95bd543 docs(census): refresh the product-architecture digest for ADR 112 (25 hours ago)
2a0fab24 test(docs): hold the shipped skill trees to the 150-line cap (25 hours ago)
8f9a0cd1 test(skills): run the asset trees' node tests in the suite (25 hours ago)
b3514d37 docs(architect): record ARCH-6 as built (26 hours ago)
ca63dea4 refactor(architecture): fold flat helpers and actions behind barrels (26 hours ago)
efc06d1a docs(architect): record ARCH-5 5.1
```

### Documentation Status

**Roadmaps:**

- `docs/adr/054-split-review-personas-into-per-operation-commands-plan-audit-review.md` (2683B, last modified: 2026-09-22)
- `docs/adr/059-persona-plans-are-checklists-with-marks-that-survive-the-sync.md` (2073B, last modified: 2026-09-15)
- `docs/adr/060-plans-carry-nested-sub-steps-and-an-exhaustiveness-mandate.md` (2089B, last modified: 2026-09-15)
- `docs/adr/087-session-close-archives-completed-audits-reviews-and-plans.md` (2210B, last modified: 2026-09-17)
- `docs/adr/095-close-out-the-install-and-uninstall-rework-plan.md` (838B, last modified: 2026-09-15)
- `docs/adr/099-close-out-plan-develop-consolidation.md` (2066B, last modified: 2026-09-15)
- `docs/handoff/01-performance-plan-execution.md` (8804B, last modified: 2026-09-15)
- `docs/handoff/02-oss-audit-and-remediation-plan.md` (8565B, last modified: 2026-09-15)
- `docs/handoff/03-roadmap-execution-oss-phases-1-5.md` (8279B, last modified: 2026-09-15)
- `docs/handoff/07-landing-develop-on-main-and-closing-the-finished-plans.md` (5926B, last modified: 2026-09-15)

**Key documents:**

- `docs/02-product-architecture.md` (43640B, 2026-09-22)
- `docs/03-agent-instructions.md` (6725B, 2026-09-22)
- `docs/05-env-variables.md` (40201B, 2026-09-22)
- `docs/07-engineering-guides.md` (21851B, 2026-09-22)
- `docs/08-skills.md` (44852B, 2026-09-22)
- `docs/09-tools.md` (32433B, 2026-09-22)
- `docs/10-prompts.md` (24416B, 2026-09-22)
- `docs/11-instructions.md` (13120B, 2026-09-22)
- `docs/15-resources.md` (2150B, 2026-09-22)
- `docs/README.md` (4392B, 2026-09-22)

### Resume Prompt

next session opens with this block.

```prompt
Resume work on rule-mcp from `docs/handoff/17-flight-directive-and-surface-mapping.md`.
Run `rule_tool_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The ADR log and the context snapshot capture what has been decided; do not re-ask answered questions.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message.

Branch: `main` (ahead of origin/main; not pushed).
Commit range covered: `f805d2da..8fa75c3e` (includes prior rename `f7cc269c` plus ADR 114/115 work).
Live surface: 106 MCP tools, 244 agent slash commands, 153 MCP prompts.

First step: decide whether to push `main` and/or cut `0.2.0-rc` (`pnpm changelog` / tag); otherwise continue any remaining docs/census drift against ADR 115.
```

---

_Handoff: full, compress, ADR 114+115 session. Local only; never pushed._
