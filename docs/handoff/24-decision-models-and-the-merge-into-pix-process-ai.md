# 24 - Decision models audit, and the merge of three skills into rule-process-ai

- **Branch**: `feat/guardrails-evolution`
- **Date**: 2026-10-20
- **Commit range**: `6b540b66..71a3d906` (16 commits)
- **Plans**: `docs/plans/skills/DEPENDENCIES.md`, `docs/plans/decision-models.md`, `docs/plans/skills/process/rule-process-ai.md`

## What this session did

Two threads. The first measured whether the llama.cpp decision-model endpoint is
worth using inside the server, and produced an audit, a review and a plan rather
than an opinion. The second executed a merge the developer asked for: three
skills folded into `rule-process-ai`, with their nine guardrails, their plans and
their index rows collapsing into one, and a dependency graph that puts that skill
first.

Before either, twelve red gates were closed: the tracked governance hooks were
restored, `site-dist` stopped being tracked, and a machine-wide `core.hooksPath`
can no longer be adopted by the installer. One gate remains red, the 150-line
ratchet over five pre-existing files.

### What the decision-model work found

- The installed `prithivMLmods/APUS-OpenJev-v1-9B` is a chat model: the endpoint
  answers `501 This model is not a decision model` after a successful 8.9 s load.
- Laya routes 3 of 3 on the audit set, costs 519 ms to load and 65 ms warm, and
  is deterministic to the last digit across runs.
- A decision model does not beat BM25 on the prompts BM25 misses: reranking the
  top five fixed 3 of 13, and offering all 83 skills fixed 1 of 13 while being
  confidently wrong. The value is elsewhere: a probability instead of a score,
  abstention, a second language, and checks no regex can express.
- A running server keeps the catalog it loaded at startup, so `skills reload`
  does not reach an already-attached stdio client.

### What the merge cost

Moving a body into `references/` removes it from the text the ranker indexes. The
routing corpus fell from 77 to 71 exact and a scope prompt lost its top route
until the scope contract and the house language were restated in `SKILL.md`. The
corpus is back to 76 exact and 89 top-or-alternative, above its floors.

### Commits

- `605f6f15` docs(plans): add the rule-process-tdd implementation plan
- `bca072ab` chore(docs): stop tracking the generated site
- `2956e5c3` fix(commit): never adopt a machine-wide core.hooksPath
- `e05fb191` fix(hooks): restore the tracked governance hooks
- `6757ae0a` chore(scripts): regenerate the published digests
- `23116f57` fix(cli): complete init in every shell and match the install script
- `66d49ba8` test(surface): count the core tool and the four hook events
- `07ba23fd` fix(tokensave): spell behavior the American way
- `6b60a5a4` docs(plans): stop naming the local article folder
- `cb36608e` chore(instructions): refresh the committed instruction block
- `d1c34b8f` feat(skills): merge simplicity, English and fingerprint into rule-process-ai
- `7ad3a593` test(skills): guard that every area router lists its children
- `76c02520` chore(audits): add the decision-models probe harness
- `e9d4c945` docs(plans): one plan for rule-process-ai and the next two skills
- `b0e99a30` docs(decision-models): audit the local endpoint and plan the work
- `71a3d906` docs(adr): record the merge into rule-process-ai

### Open, recorded in the plans

- `rule-process-ai` Phase 1-4: the eight guardrails the absorbed plans promised and
  never built (`ai-bidi-controls` blocking, seven advisory), the `-ogue` stem fix,
  the spelling-map gaps, and the reduction signal still undocumented.
- `rule-process-npm-release`: eight rules planned, none written, and the cooldown
  handed to `rule-toolchain-pnpm` beside `pkg-*`.
- `rule-process-code-review`: four rules planned, and three of them overlap what
  `validateTrio` already checks in this repository.
- `decision-models`: nine workstreams with four edges and a kill criterion each.
  Step 1 is the loopback client, which does not exist yet.
- Eight router rows are missing and recorded in `scripts/data/router-gaps.data.mjs`;
  the ratchet only shrinks.

### Project Identity

- Description: MCP server for rule-* skill ecosystem. Serves styleguides, component templates, framework best practices, and design system patterns.
- Version: 0.1.0

### Feature Range

- Base: `origin/main` (merge base `6967ac02a4c9da092665308204818f3887c624cb`)
- Range: `6967ac02a4c9da092665308204818f3887c624cb..HEAD` (60 commit(s))
- Conventional Commit violations: 0

### ADR Log

| #   | Status     | Title                                                         | Tags                                       | Decision                                                                                             |
| --- | ---------- | ------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 148 | accepted   | Merge simplicity, English and fingerprint into rule-proces...  | skills, process, guardrails                | One skill, rule-process-ai, owns the four bodies: SKILL.md keeps the lifecycle, the scope contract... |
| 147 | accepted   | Never install commit hooks into a machine-wide core.hooks...  | git, hooks, governance                     | The installer reads `core.hooksPath` with `--local`, so only a setting the repository itself carr... |
| 146 | accepted   | Remove the rule-styleguide-patterns cheat sheet                | skills, styleguide, duplication            | Delete the skill. Replace its references with the owner set: the architect and simplicity persona... |
| 145 | accepted   | Move the README skill from styleguide to process              | skills, process, styleguide                | Rename rule-styleguide-readme to rule-process-readme, change the tool to rule_tool_process_readme, m... |
| 144 | accepted   | Move the validation skill from styleguide to data             | skills, data, styleguide                   | Rename rule-styleguide-validation to rule-data-validation, change the tool to rule_tool_data_validat... |
| 143 | accepted   | Rename rule-toolchain-commits to rule-styleguide-git            | skills, styleguide, toolchain              | Rename the directory and the skill to rule-styleguide-git, change the generated tool to rule_tool_s... |
| 142 | accepted   | Rename rule-toolchain-project to rule-styleguide-configuration  | skills, styleguide, toolchain              | Rename the directory and the skill to rule-styleguide-configuration, change the generated tool to ... |
| 141 | accepted   | Merge the TypeScript compiler skill into rule-styleguide-t...  | skills, typescript, toolchain              | Remove rule-toolchain-typescript and move its content into skills/rule-styleguide-typescript/COMPIL... |
| 140 | proposed   | Give the meta-framework area its first server and client ...  | guardrails, meta, frontend                 | Create rule-meta/guardrails with seven rules. Tier A: meta-public-env-secret, meta-server-data-lea... |
| 139 | proposed   | Add a shared frontend guardrail family for XSS, lists and...  | guardrails, frontend, security             | Create rule-frontend/guardrails with seven rules. Tier A: xss-sink-sanitized, fe-list-key, fe-effe... |
| 138 | proposed   | Extend the data guardrail family with shared and per-engi...  | guardrails, data, database                 | Add nine rules split by owner: shared in rule-data (no-select-star, query-limit, query-timeout, db... |
| 137 | proposed   | Give the AI area its first source-cited guardrail family      | guardrails, ai, agents                     | Create rule-ai/guardrails with eight rules split into Tier A (ai-tool-schema, ai-call-timeout, ai-... |
| 136 | proposed   | Add a source-cited backend guardrail family and fix the s...  | guardrails, backend, security              | Extend the patterns of the six existing backend rules to the framework equivalents, then add twen... |
| 135 | proposed   | Extend the devops guardrail family with file-scoped, sour...  | guardrails, devops, quality-gate           | Add twenty guardrails across the five devops skills, each scoped to its target file name (Dockerf... |
| 134 | accepted   | Close features only after persisting the final handoff an...  | git, handoff, adr                          | Treat close-feature as implicit squash intent. Commit all pending work, closeout ADRs, and the fi... |
| 133 | accepted   | First release is v0.1.0, then SemVer from commits             | release, versioning, semver                | 1. The first cut is forced: `pnpm release --version 0.1.0` (and the matching tag `v0.1.0`). Th...    |
| 132 | accepted   | Rename rule_tool_plan_docs to rule_tool_impersonation           | tools, personas, naming                    | Rename the tool to `rule_tool_impersonation`. The module moves to `src/tools/actions/_impersonatio... |
| 131 | accepted   | An update moves a git-clone install to the newest release...  | update, release, install                   | After the fetch (now `-p -P`, so a withdrawn tag is never read as newest), `releaseState` compare... |
| 130 | accepted   | This server releases itself with pnpm release, and the pu...  | release, versioning, git                   | `scripts/release` plans then applies. The plan fetches origin with tags and refuses, all at once,... |
| 129 | accepted   | A file is reported on, a task is confirmed                    | hooks, guardrails, permissions             | A file is reported on. A task is confirmed.                                                          |
| 128 | accepted   | Consolidate the feature ADRs and handoffs into one commit...  | git, workflow, docs                        | `rule_tool_git action=squash` consolidates the feature's documents before the squash, behind the s... |
| 127 | accepted   | Derive the next version and the changelog from the commit...  | release, git, workflow                     | `scripts/build/version/index.mjs --next` derives the bump from the commits since the newest tag u... |
| 126 | accepted   | Close a feature with reset --soft onto the merge base and...  | git, workflow, history                     | The close runs `git reset --soft <merge-base>` (the same deterministic boundary every other consu... |
| 125 | accepted   | Normalize history on the merge base and hold every rewrit...  | git, workflow, history                     | Linearization runs `git rebase <merge-base>`: replaying the feature commits onto the fork point d... |
| 124 | accepted   | Make the tool-call host a list so invocation hosts coexist    | architecture, mcp, git                     | `registerCallHost` appends to a list. `hostBeforeCall(name)` runs every registered host's `before... |
| 123 | accepted   | Start the six case-study apps with one port-allocating co...  | tooling, case-studies, dev-server          | Add `pnpm case-studies` (scripts/case-studies/index.mjs) as the single entry point. The script al... |
| 122 | accepted   | The fix tool and command apply the deterministic guardrai...  | tools, commands, guardrails                | 1. rule_tool_fix is registered again, through registerActionTools, with a new job: apply the deter... |
| 121 | accepted   | The install reconciles the bundled skills when the step i...  | installer, skills, commands                | 1. skills uninstall is a real CLI action, with --scope and --dry-run, that removes only the names... |
| 120 | accepted   | Fold the per-operation persona commands into one per role...  | commands, personas, prompts                | 1. One prompt, one slash command and one skill per role: rule-persona-<role> (57 to 19 on each sur... |
| 119 | accepted   | Close out audit ui                                            | docs, closeout, audit                      | Fold the record into this ADR and the session handoff, then delete the source file. The full text... |
| 118 | accepted   | Close out review ui                                           | docs, closeout, review                     | Fold the record into this ADR and the session handoff, then delete the source file. The full text... |
| 117 | accepted   | Area slash commands are collectors only; leaves route fro...  | commands, prompts, areas                   | 1. **Slash and MCP area prompts**: emit only hub collectors (`/rule-area-ai`, `/rule-area-backend`,... |
| 116 | accepted   | Fold check slash siblings into the parent via keyword intent  | commands, guardrails, breaking             | 1. Delete every agent slash `/rule-area-*-check` sibling. No aliases. 2. Keep `/rule-check` as the ... |
| 115 | accepted   | Map tools, slash commands, and skills into one surface        | tools, commands, skills                    | ### Keep                                                                                             |
| 114 | accepted   | Flight is process-area guidance injected on every prompt,...  | commands, prompts, telemetry               | 1. Drop `/rule-process-flight` (and any `rule-flight` leftover) from the MCP prompt registry and fr... |
| 113 | accepted   | Rename the command surface under process and persona name...  | commands, prompts, personas                | Breaking rename of the public command/skill/tool surface:                                            |
| 112 | accepted   | Extend the file-size cap to the shipped skill trees           | architecture, quality-gate, file-size      | Add skills/ to the size-cap roots. Exempt the test files the skill trees ship beside their code, ... |
| 111 | accepted   | Close out audit security                                      | docs, closeout, audit                      | Fold the record into this ADR and the session handoff, then delete the source file. The full text... |
| 110 | accepted   | Close out review security                                     | docs, closeout, review                     | Fold the record into this ADR and the session handoff, then delete the source file. The full text... |
| 109 | accepted   | No corepack activation and no engines field in a generate...  | guardrails, pnpm, corepack                 | rule-mcp does not support either kind of field. Two guardrails own it: `pkg-no-corepack` fo... |
| 108 | accepted   | The handoff family gets a generated index, and the root H...  | handoff, docs, cli                         | docs/handoff/HANDOFF.md is generated from the numbered handoff files by handoff doctor, exactly a... |
| 107 | accepted   | The design-system persona becomes the UI/UX lead              | personas, ui, review                       | Rename the role id `design-system` to `ui` and its title to UI/UX Lead. Widen its lenses from fiv... |
| 106 | superseded | Check runs per area, and the general check auto-detects it    | commands, prompts, guardrails              | Remove `/rule-adr` and `/rule-process-check` from the MCP prompt registry. Give the agent command s... |
| 105 | accepted   | opencode gets a dedicated installer writing its own confi...  | installer, cli, opencode                   | opencode gets a dedicated installer, like Pi: `upsertOpencode`/`removeOpencode` in the JSON write... |
| 104 | accepted   | The handoff document closes with the resume prompt            | handoff, handon, prompts                   | Every handoff document ends with a `Resume Prompt` section holding a fenced `prompt` block: the m... |
| 103 | accepted   | Every handoff mode sweeps completed working papers, and c...  | docs, closeout, handoff                    | Both handoff modes and handon archive completed working papers by default, in src/tools/handoff/_... |
| 102 | accepted   | Reinstall is one shell script behind three entry points       | cli, installer, devx                       | `scripts/reinstall.sh` owns the sequence and runs from the checkout it lives in; it refuses a dir... |
| 101 | accepted   | Accept a comma-separated agent list in agent-commands         | cli, installer, agent-commands             | `resolveCommandTargets` now parses `options.agent` as a comma-separated list (arrays work too) an... |
| 100 | accepted   | The TokenSave integration closes out: the adapter and its...  | tokensave, architecture, closeout          | Fold the plan record into this ADR, name it in the session handoff, and delete the source file; t... |
| 099 | accepted   | Close out plan develop-consolidation                          | docs, closeout, plan                       | Fold the record into this ADR and the session handoff, then delete the source file. The full text... |
| 098 | accepted   | develop merges into main by area, and stays as an integra...  | process, git, merge                        | One merge commit, resolved by area rather than by hunk, followed by reconciliation commits. The O... |
| 097 | superseded | The release target is v0.1.0-beta, and the version toolin...  | release, versioning, changelog             | The version is 0.1.0-beta in package.json, server.json, both packaging manifests and the newest C... |
| 096 | accepted   | TokenSave is the primary code graph, JavaScript is the fa...  | tokensave, architecture, adapter           | Add src/core/tokensave/ with three modules and a barrel. probe.js detects .tokensave/tokensave.db... |
| 095 | accepted   | Close out the install and uninstall rework plan               | docs, closeout, plan                       | Fold the record into this ADR and the session handoff, then delete the source file. The full text... |
| 094 | accepted   | Rename the compression subsystem and apply it to every mo...  | compression, tokens, rename                | Rename the code, comments and configuration to neutral compression names: `_caveman*.js` becomes ... |
| 093 | accepted   | Add an Open Source Steward persona for governance, contri...  | personas, open-source, governance          | Add `personas/oss.md` as an active persona named `Open Source Steward` with id `oss`. Its skills ... |
| 092 | accepted   | Surface selection amends the install stack freeze with an...  | install, wizard, architecture              | Amend ADR 081 narrowly: the installer writes one grammar string (RULE_MCP_SURFACE) and the ... |
| 091 | accepted   | Install/uninstall rework keeps current stack, steps and c...  | install, wizard, architecture              | The install/uninstall rework changes wizard steps and contents only (order, copy, offered choices... |
| 090 | accepted   | The setup wizard is the installer, and it asks which comm...  | installer, cli, wizard                     | The wizard is the installer. `src/cli/setup/` holds the whole flow - preflight, agents, mode, opt... |
| 089 | accepted   | Skills own their guardrails, and three layers resolve bot...  | architecture, skills, guardrails           | A skill owns the rules that judge its subject. Guardrails move into skills/<name>/guardrails/*.js... |
| 088 | accepted   | A persona topic is the binding scope of the run               | personas, prompts, review                  | The topic becomes the binding scope everywhere the template speaks: the action line names the sco... |
| 087 | superseded | Session close archives completed audits, reviews and plans    | process, handoff, docs                     | In close-session mode only, rule_tool_process_handoff folds each completed doc into one Nygard ADR... |
| 086 | accepted   | Documentation site is hand-written static HTML from docs      | docs, site                                 | The documentation site is hand-written: a small Node generator in scripts/docs-site/ renders docs... |
| 085 | superseded | Reset the project version to 0.1.0, first release will be...  | release, versioning                        | Reset the project version to 0.1.0 in package.json, server.json (both version fields), the CHANGE... |
| 084 | accepted   | Keep the name with a written posture, no npm placeholder yet  | naming, legal                              | Keep the rule-mcp name with a written trademark posture (TRADEMARK.md) instead of a filing.... |
| 083 | accepted   | Governance is an explicit BDFL with a path to co-maintainers  | governance, community                      | Governance is an explicit BDFL (pixu1980) with a documented path to co-maintainers. Disputes esca... |
| 082 | accepted   | Release artifacts are GitHub tarballs, not registry packages  | registry, release                          | Release artifacts are signed GitHub Release tarballs, not registry packages: the pipeline packs t... |
| 081 | accepted   | MCP registry identity is the GitHub owner, not a claimed ...  | registry, release                          | server.json name is io.github.pixu1980/rule-mcp, derived from repository.url. Registry publ... |
| 080 | superseded | One installer, a Node wizard with shell bootstraps            | installer, cli, tui                        | One implementation, in Node, behind one command.                                                     |
| 079 | superseded | Add the OSS Architect review persona                          | persona, oss, open-source                  | Add the OSS Architect persona (id: oss) as src/roles/oss.md, status active, layer process, 25 yea... |
| 078 | accepted   | Compress agent command files at write time                    | token-efficiency, compression, installer   | Compress the body of every agent command file at write time: renderAgentCommandFiles() applies th... |
| 077 | accepted   | Compress every server->model list surface (prompts/list, t... | token-efficiency, compression, mcp-surface | Compress the prose fields of all three list surfaces at the protocol boundary only: prompts/list ... |
| 076 | accepted   | Coverage wave five raises the branch floor to 91              | testing, coverage, ci                      | Cover the three biggest clusters that are not platform-locked and raise the floor to the measured... |
| 075 | accepted   | Meta-frameworks get their own namespace and a narrow disp...  | skills, taxonomy, routing                  | Rename the four skills to rule-meta-astro, next, nuxt and remix, rename the occupying prompt to pi... |
| 074 | accepted   | The CLI entry point loads no command handler it has not b...  | cli, startup, performance                  | Keep the command and option declarations static, and load the handlers inside their actions. The ... |
| 073 | accepted   | Compression has four levels and no LLM in the output path     | compression, tokens, determinism           | Port the deterministic half and refuse the LLM half. Four levels (off, lite, full, ultra) select ... |
| 072 | accepted   | The installer asks before copying bundled skills to the c...  | installer, skills, devx                    | Add a skills step to both installers that asks before copying. install.sh gains Phase 6c "Bundled... |
| 071 | accepted   | The census generates eight numbered documents and three f...  | docs, census, generator                    | `docs/08-skills.md` through `docs/15-resources.md` are whole generated files, one inventory topic... |
| 070 | accepted   | Installer mode step replaces the agent picker instead of ...  | installer, tui, devx                       | Bring bash to parity with PowerShell: on entering step 2, draw_mode_panel retitles the banner to ... |
| 069 | accepted   | Coverage wave four holds the floor at 90 and fixes the da...  | testing, coverage, ci                      | Hold BRANCH_FLOOR at 90: the local measure (90.74) is below 91, so a raise would gate above what ... |
| 068 | accepted   | src shared for every shareable helper                         |                                            | All cross-cutting helpers with more than one caller live in `src/shared/` with a barrel (`index.j... |
| 067 | accepted   | co locate every test with its module                          |                                            | Move every unit and integration suite from `tests/<area>/...` into `src/<area                        | <module>>/**tests**... |
| 066 | accepted   | Remove externally derived skills from the served knowledg...  | skills, knowledge-base, attribution        | Remove all externally derived content from the served knowledge base. Permanently deleted 8 skill... |
| 065 | accepted   | Coverage floor raised to 90                                   | testing, coverage, ci                      | Raise BRANCH_FLOOR from 89 to 90 in scripts/reports/coverage/_threshold.data.mjs. Ratchet mechani... |
| 064 | accepted   | Coverage floor raised to 89 toward the 95 endpoint            | testing, coverage, ci                      | Raise BRANCH_FLOOR in scripts/reports/coverage/_threshold.data.mjs from 87 to 89. The ratchet mec... |
| 063 | accepted   | Coverage floor raised to 87; 95 remains the ratchet endpoint  | testing, coverage, ci                      | Raise BRANCH_FLOOR in scripts/reports/coverage/_threshold.data.mjs from 83 to 87. The gate and th... |
| 062 | accepted   | Glob suite runner, co-located tests, and a branch-coverag...  | testing, ci, coverage                      | Four pieces. (1) `scripts/ci/run-tests/index.mjs` resolves a suite from glob patterns in `_suites... |
| 061 | accepted   | One global shim, and hermetic PNPM_HOME in script tests       | installer, cli, shim                       | Three layers. (1) Every test that spawns the shell scripts sets `env.PNPM_HOME` to a sandbox dire... |
| 060 | accepted   | Plans carry nested sub-steps and an exhaustiveness mandate    | documentation, personas, plans             | A finding passed to `rule_tool_plan_docs` may carry a `steps` array; the renderer nests each entry... |
| 059 | accepted   | Persona plans are checklists with marks that survive the ...  | documentation, personas, plans             | The plan renderer emits a checklist instead of a table: one `- [ ] **Step N - <finding-id> (<seve... |
| 058 | accepted   | One file per rule with underscore-barrel folders and a si...  | architecture, refactor, structure          | Split rule catalogs one file per rule under family folders (framework/js, framework/vanilla, qual... |
| 057 | accepted   | Reorganize scripts, src and tests with 150-line code spli...  | architecture, refactor, testing            | Reorganize scripts/, src/ and test/ (renamed to tests/) into thematic subfolders by feature; appl... |
| 056 | accepted   | Drop the VS Code extension and its installers                 | vscode, extension, installer               | Delete extensions/ (vscode-rule source + rule-vanilla-reactive.vsix). Remove the five extension fun... |
| 055 | accepted   | Restructure the command surface: /rule router, rule-area-*,...  | commands, prompts, surface                 | Restructure the command surface: router rule-mcp -> rule; area prompts become rule-area-_; de... |
| 054 | accepted   | Split review personas into per-operation commands (plan/a...  | personas, commands, prompts                | Give each active role three slash commands - `rule-persona-<role>-plan`, `rule-persona-<role>-audit... |
| 053 | accepted   | Gateway as the single entrypoint with server-side receipt...  | gateway, guardrails, determinism           | Gateway is the single server-side orchestrating entrypoint for every implementation flow; it issu... |
| 052 | accepted   | Pre-packaged MCP prompt registry (26 prompts, strict sche...  | prompts, registry, tdd                     | Adopt the 26-prompt pre-packaged registry in src/prompts/index.js with strict argument schemas, t... |
| 051 | accepted   | Token-efficiency pipeline (caveman aggressive + tokensave...  | token-efficiency, caveman, tokensave       | 1. **Decoration lives at the MCP boundary** (`src/server.js` CallToolRequestSchema handler), n...    |
| 050 | accepted   | Round-2 hardening - cycles, daemon/commands split, diagno...  | refactor, cycles, daemon                   | 1. **Break the init cycles**: `getSkillMetadata` moved into the skill store (`tools/router.js`...    |
| 049 | accepted   | Split the hotspot modules (guardrails + installer)            | refactor, maintainability, guardrails      | 1. **Guardrails**: each family moves to `src/core/guardrails/`, `shared.js`, `file-tree.js`, ...     |
| 048 | accepted   | v1.0.0 release and the docs-accuracy guard                    | release, docs, accuracy                    | 1. Add `test/docs-accuracy.test.mjs`: it computes the runtime surface (`listTools`/`listResources... |
| 047 | accepted   | rule-mcp-architect splits into a standalone web app rep...  | architect, split, repo                     | Split the architect product out of rule-mcp:                                                   |
| 046 | accepted   | Installer self-heals its global shim, surfaces failures, ...  | installer, cli, cross-platform             | 1. **Verify before trust.** `shim_works()` (bash) / `Test-PixCli` (PS) run `rule-mcp --v...    |
| 045 | accepted   | Migrate repo tooling to ESLint 10 flat config with eslint...  | eslint, toolchain, unicorn                 | Migrate the repo to ESLint 10.8 flat config (eslint.config.mjs: @eslint/js + eslint-plugin-unicor... |
| 044 | accepted   | Adopt eslint-plugin-unicorn for JS/TS quality                 | eslint, toolchain, unicorn                 | Update rule-toolchain-eslint to ESLint 10 flat config + eslint-plugin-unicorn (preset and high-val... |
| 043 | accepted   | Strengthen TypeScript discipline for large codebases          | typescript, toolchain, strict              | Update rule-toolchain-typescript with exactOptionalPropertyTypes, verbatimModuleSyntax, explicit s... |
| 042 | accepted   | Strengthen database relational constraint skills              | database, sql, postgresql                  | Integrate these rules into the rule-data-sql, rule-data-postgresql, and rule-data-mysql skills, keep... |
| 041 | accepted   | Lossless installer: preserve toolPrefix and normalize rul...  | installer, idempotency, toolPrefix         | upsertJsonServer/upsertVscode merge the existing entry with the new config, preserving user keys ... |
| 040 | accepted   | Per-invocation self-update with temporal throttle and fir...  | self-update, mcp-server, operational       | The check fires on every tool invocation but the actual git fetch is throttled: at most every PIX... |
| 039 | superseded | Fix VS Code extension and derivatives install/uninstall       | vscode, extension, installer               | Add `installVscodeExtension` and `uninstallVscodeExtension` functions in install.js that install/... |
| 038 | proposed   | native claude skills integration                              |                                            | installNativeSkills() now copies skills to ~/.claude/skills/<name>/ with Claude-compatible YARD f... |
| 037 | proposed   | documentation and see also in skills                          |                                            | Added ## See also section with links to related skills in all missing skills.                        |
| 036 | proposed   | lossless idempotent installer                                 |                                            | parseJson() now returns null on error, not {}. JSON file writes use atomicWrite with preventive b... |
| 035 | proposed   | sandbox timeout with abortcontroller                          |                                            | withTimeout() now uses AbortController to actually cancel the ongoing operation when the timeout ... |
| 034 | proposed   | sse server with bearer auth                                   |                                            | The SSE server generates a bearer token at startup, requires Authorization: Bearer on /sse and /m... |
| 033 | accepted   | Registry-driven clean slash commands for every agent and IDE  | architecture, cli, agents                  | Add `src/core/agent-command-targets.js` as the **single registry** of clean-command targets. One ... |
| 032 | accepted   | The tool surface is ./skills and nothing else                 | architecture                               | The bundled `skills/` directory is the single source of truth for the tool surface.                  |
| 031 | accepted   | Pin the self-update remote and drop root in the container     | architecture                               | Verify the update source before any network or merge operation. normalizeRemoteUrl() reduces a re... |
| 030 | accepted   | Interview servers enforce same-origin and own their proce...  | architecture                               | Add skills/rule-mcp-architect/http-guard.mjs - a shared, pure checkLocalRequest()/denyForeignRe... |
| 029 | accepted   | Bind write authorization to destinations, not just content    | architecture                               | Split write authorization into a validated root, a validated destination, and a path-bound receip... |
| 028 | accepted   | Clean /rule-* commands via user commands + prompt suppress...  | commands, claude, mcp                      | 1. Do NOT ship a Claude plugin. 2) Generate the clean command set from the MCP prompt registry as... |
| 027 | accepted   | Add rule-toolchain-commits skill for atomic conventional c...  | taxonomy, skills, routing                  | Add a dedicated skill `rule-toolchain-commits` (tool `rule_tool_toolchain_commits`) in the rule-tool... |
| 026 | accepted   | Rename rule-mcp-agents to rule-ai-agents and add rule-ai ...  | taxonomy, skills, routing                  | Rename `rule-mcp-agents` to `rule-ai-agents` (tool becomes `rule_tool_ai_agents`) and add a new `... |
| 025 | accepted   | Skill routing: pnpm package manager workspace monorepo setup  | tool, auto-log, routing                    | Use `rule-toolchain-pnpm` for this task.                                                              |
| 024 | accepted   | Skill routing: Parcel bundler zero config build tool          | tool, auto-log, routing                    | Use `rule-toolchain-parcel` for this task.                                                            |
| 023 | accepted   | Skill routing: Husky git hooks pre-commit lint-staged com...  | tool, auto-log, routing                    | Use `rule-toolchain-husky` for this task.                                                             |
| 022 | accepted   | Skill routing: Turborepo monorepo pipeline caching parall...  | tool, auto-log, routing                    | Use `rule-toolchain-turborepo` for this task.                                                         |
| 021 | accepted   | Skill routing: ESLint flat config for TypeScript React pr...  | tool, auto-log, routing                    | Use `rule-toolchain-eslint` for this task.                                                            |
| 020 | accepted   | Skill routing: TypeScript tsconfig strict mode configuration  | tool, auto-log, routing                    | Use `rule-toolchain-typescript` for this task.                                                        |
| 019 | accepted   | use a persistent local bearer token for daemon transport      | architecture, security, mcp                | Store one 256-bit token at ~/.rule-mcp/state/sse-token with owner-only permissions. Daemon/... |
| 018 | accepted   | fail closed mcp enforcement and reusable agent commands       | architecture, security, mcp                | Wrap every MCP handler with mandatory preprocessing and postprocessing. Reject unsafe input and m... |
| 017 | accepted   | forms per framework merger and distribution                   | architecture, forms, frontend              | ### 1. Merge React forms into `rule-frontend-react`                                                   |
| 016 | Accepted   | File-Based Skill Loading over Database                        |                                            | Use **file-based skill loading** with an in-memory LRU cache.                                        |
| 015 | accepted   | toolchain skill isolation vite                                | skills, toolchain, vite                    | Extract all Vite-related content from `rule-scaffold-frontend-react-vite` into a new `rule-toolchai... |
| 014 | Accepted   | Official MCP SDK over Hand-Rolled Protocol                    |                                            | Replace the hand-rolled protocol with `@modelcontextprotocol/sdk` v1.29.0.                           |
| 013 | Accepted   | Vanilla JS over TypeScript                                    |                                            | Use **Vanilla JavaScript (ESM)** throughout.                                                         |
| 012 | accepted   | Database Skills                                               | skills, database, sql                      | Create four database skills spanning relational and document databases:                              |
| 011 | accepted   | Forms per Framework - Merger & Distribution                   | architecture, forms, frontend              | ### 1. Merge React forms into `rule-frontend-react`                                                   |
| 010 | accepted   | backend framework skills                                      | skills, backend, frameworks                | Add four backend framework skills covering the major Node.js HTTP framework ecosystems:              |
| 009 | accepted   | Toolchain Skill Isolation (Vite)                              | skills, toolchain, vite                    | Extract all Vite-related content from `rule-scaffold-frontend-react-vite` into a new `rule-toolchai... |
| 008 | accepted   | scaffold skill consolidation                                  | infrastructure, skills, scaffolding        | ### 1. Rename and absorb `scaffold-backend-node` -> `backend-node`                                   |
| 007 | accepted   | thematic skill taxonomy rename                                | infrastructure, naming, taxonomy           | Adopt a prefix-based thematic taxonomy with the following categories:                                |
| 006 | Accepted   | file based skill loading over database                        |                                            | Use **file-based skill loading** with an in-memory LRU cache.                                        |
| 005 | accepted   | Backend Framework Skills                                      | skills, backend, frameworks                | Add four backend framework skills covering the major Node.js HTTP framework ecosystems:              |
| 004 | accepted   | Scaffold Skill Consolidation                                  | infrastructure, skills, scaffolding        | ### 1. Rename and absorb `scaffold-backend-node` -> `backend-node`                                   |
| 003 | Accepted   | official mcp sdk over hand rolled protocol                    |                                            | Replace the hand-rolled protocol with `@modelcontextprotocol/sdk` v1.29.0.                           |
| 002 | Accepted   | vanilla js over typescript                                    |                                            | Use **Vanilla JavaScript (ESM)** throughout.                                                         |
| 001 | accepted   | Thematic Skill Taxonomy Rename                                | infrastructure, naming, taxonomy           | Adopt a prefix-based thematic taxonomy with the following categories:                                |

### Working Tree Changes (uncommitted)

Changed 1 file(s):

- `docs/handoff/HANDOFF.md`

### Semantic Changes (TokenSave)

- Changed files: 1
- Modified symbols: 4
- Impacted symbols: 0
- Affected tests: 0

### Decisions on record (TokenSave)

- Merge simplicity, English and fingerprint into rule-process-ai - One skill, rule-process-ai, owns four bodies: SKILL.md keeps lifecycle, scope contract and reference table, and references/simplicity.md, referen...
- Never install commit hooks into machine-wide core.hooksPath - installer reads `core.hooksPath` with `--local`, so only setting repository itself carries is treated as that project's mechanism. global or system...
- Remove rule-styleguide-patterns cheat sheet - Delete skill. Replace its references with owner set: architect and simplicity personas carry six styleguide owners in their evidence skills, rule...
- Move README skill from styleguide to process - Rename rule-styleguide-readme to rule-process-readme, change tool to rule_tool_process_readme, move its row from styleguide tables into process tables...
- Move validation skill from styleguide to data - Rename rule-styleguide-validation to rule-data-validation, change tool to rule_tool_data_validation, move its rows from styleguide tables into data tab...
- Rename rule-toolchain-commits to rule-styleguide-git - Rename directory and skill to rule-styleguide-git, change generated tool to rule_tool_styleguide_git, move its rows from toolchain tables into the...
- Rename rule-toolchain-project to rule-styleguide-configuration - Rename directory and skill to rule-styleguide-configuration, change generated tool to rule_tool_styleguide_configuration, move its row from toolch...
- Merge TypeScript compiler skill into rule-styleguide-typescript - Remove rule-toolchain-typescript and move its content into skills/rule-styleguide-typescript/COMPILER.md, linked from SKILL.md as compiler half of same sk...

### Recent Commits

```
71a3d906 docs(adr): record the merge into rule-process-ai (36 seconds ago)
b0e99a30 docs(decision-models): audit the local endpoint and plan the work (37 seconds ago)
e9d4c945 docs(plans): one plan for rule-process-ai and the next two skills (38 seconds ago)
76c02520 chore(audits): add the decision-models probe harness (48 seconds ago)
7ad3a593 test(skills): guard that every area router lists its children (49 seconds ago)
d1c34b8f feat(skills): merge simplicity, English and fingerprint into rule-process-ai (55 seconds ago)
cb36608e chore(instructions): refresh the committed instruction block (2 days ago)
8a5d8f2a docs(plans): stop naming the local article folder (2 days ago)
b96fb27e fix(tokensave): spell behavior the American way (2 days ago)
313a5438 test(surface): count the core tool and the four hook events (2 days ago)
ffb79405 fix(cli): complete init in every shell and match the install script (2 days ago)
ee5d73f9 chore(scripts): regenerate the published digests (2 days ago)
e05fb1
```

### Documentation Status

**Roadmaps:**

- `docs/adr/054-split-review-personas-into-per-operation-commands-plan-audit-review.md` (2683B, last modified: 2026-09-22)
- `docs/adr/059-persona-plans-are-checklists-with-marks-that-survive-the-sync.md` (2073B, last modified: 2026-09-15)
- `docs/adr/060-plans-carry-nested-sub-steps-and-an-exhaustiveness-mandate.md` (2089B, last modified: 2026-09-15)
- `docs/adr/087-session-close-archives-completed-audits-reviews-and-plans.md` (2210B, last modified: 2026-09-17)
- `docs/adr/095-close-out-the-install-and-uninstall-rework-plan.md` (838B, last modified: 2026-09-15)
- `docs/adr/099-close-out-plan-develop-consolidation.md` (2066B, last modified: 2026-09-15)
- `docs/adr/132-rename-rule-tool-plan-docs-to-rule-tool-impersonation.md` (1139B, last modified: 2026-10-01)
- `docs/handoff/01-performance-plan-execution.md` (8804B, last modified: 2026-09-15)
- `docs/handoff/02-oss-audit-and-remediation-plan.md` (8565B, last modified: 2026-09-15)
- `docs/handoff/03-roadmap-execution-oss-phases-1-5.md` (8279B, last modified: 2026-09-15)
- `docs/handoff/07-landing-develop-on-main-and-closing-the-finished-plans.md` (5926B, last modified: 2026-09-15)
- `docs/handoff/19-ui-plan-fixes-and-docs-site-refactor-commit.md` (8241B, last modified: 2026-09-29)
- `docs/plans/execution-plan.md` (1313B, last modified: 2026-10-12)

**Changelogs:**

- `docs/adr/125-normalize-history-on-the-merge-base-and-hold-every-rewrite-to-a-tree-invariant.md` (2485B, last modified: 2026-09-28)
- `docs/adr/127-derive-the-next-version-and-the-changelog-from-the-commit-rule.md` (2353B, last modified: 2026-09-29)

**Key documents:**

- `docs/02-architecture.md` (4165B, 2026-10-20)
- `docs/08-skills.md` (43644B, 2026-10-20)
- `docs/09-tools.md` (41406B, 2026-10-20)
- `docs/13-personas.md` (18620B, 2026-10-20)
- `docs/15-resources.md` (2190B, 2026-10-20)
- `docs/16-surface-map.md` (46696B, 2026-10-20)
- `docs/adr/148-merge-simplicity-english-and-fingerprint-into-rule-process-ai.md` (3152B, 2026-10-20)
- `docs/adr/ADR.md` (193422B, 2026-10-20)
- `docs/audits/decision-models.md` (16557B, 2026-10-20)
- `docs/handoff/HANDOFF.md` (4958B, 2026-10-20)

### Renumber

Renumbered 0 document(s); 0 file(s) had references updated; HANDOFF.md regenerated.
Commit messages are not rewritten; run `rule-mcp handoff doctor --fix-commits` to amend local ones.

### Resume Prompt

This document: `docs/handoff/24-decision-models-and-the-merge-into-rule-process-ai.md`.

```prompt
Resume work on rule-mcp from `docs/handoff/24-decision-models-and-the-merge-into-rule-process-ai.md`. Run `rule_tool_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The ADR log and the context snapshot capture what has been decided; do not re-ask answered questions. ADR 148 records the merge, and ADR 147 the hooks boundary.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message, and `pnpm hooks:check` says whether the hooks are installed.
The merged skill is `rule-process-ai` with nine `ai-*` guardrails and the tool `rule_tool_process_ai`; the three skills it absorbed no longer exist, and a running server needs a restart before it serves the new catalog.
First step: run `pnpm test:all` and confirm the only red gate is the 150-line ratchet over five pre-existing files, then start `rule-process-changelog` (#31 in `docs/plans/skills/README.md`) unless the developer prefers closing that ratchet first.
```
