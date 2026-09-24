# WS0 - Repository Discovery

Deliverable of WS0 of [`mcp-git-workflow-evolution-plan.md`](./mcp-git-workflow-evolution-plan.md):
an internal map of the existing architecture (`component -> file(s) -> responsibility`)
plus the reusable primitives the later workstreams must build on.

Status: complete (analysis only, no structural refactor).

## 1. Runtime and repository shape

| Fact            | Value                                                              |
| --------------- | ------------------------------------------------------------------ |
| Runtime         | Node.js >= 22 (ESM, `"type": "module"`)                            |
| Language        | JavaScript only - no TypeScript (`find src -name '*.ts'` is empty) |
| Package manager | pnpm (workspace at `pnpm-workspace.yaml`)                          |
| Test runner     | `node --test`, glob-driven by `scripts/ci/run-tests/index.mjs`     |
| Lint / format   | ESLint (`eslint.config.mjs`) + Prettier                            |
| Git hooks       | tracked `.githooks/` + shim installer - **not Husky**              |
| CI              | `.github/workflows/ci.yml` and `release.yml`                       |

Dependency pinning already satisfies plan §20: every entry in `package.json`
is an exact `x.y.z` (no `^` / `~`). The rule must be preserved, not added.

## 2. Component map

### 2.1 MCP runtime

| Component        | File(s)                                        | Responsibility                                                                 |
| ---------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Server bootstrap | `src/server/index.js`                          | Creates the MCP `Server`, wires tool/resource/prompt handlers, stdio transport |
| Prompt handlers  | `src/server/_prompt-handlers.js`               | `prompts/list`, `prompts/get`; compresses prompt bodies                        |
| Completions      | `src/server/_completions.js`                   | reserved prompt-argument completion                                            |
| Entry point      | `bin/rule-mcp.js`, `src/cli/_program.js` | CLI parsing (commander) and server start                                       |

### 2.2 Tool registry and invocation path

| Component      | File(s)                              | Responsibility                                                                    |
| -------------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| Registry       | `src/tools/router/_registry.js`      | `registerTool` (name-unique, idempotent), retention, generation counter           |
| Hooks          | `src/tools/router/_hooks.js`         | `before` / `post` / `after` tool hook registries                                  |
| Call pipeline  | `src/tools/router/call/_pipeline.js` | One call end to end: activity, self-update kick, resume banner, cache, telemetry  |
| Call stages    | `src/tools/router/call/_stages.js`   | Deterministic cache replay / store, finalize, after-hooks                         |
| Host seam      | `src/tools/router/call/_host.js`     | `registerCallHost({ beforeCall, banner })` - single-slot port used by self-update |
| Core tools     | `src/tools/_bootstrap.js`            | Registers gateway + apply outside the catalog                                     |
| Catalog loader | `src/core/skills/_load.js`           | Registers action families, ADR, handoff/handon, skill tools                       |

Every MCP tool is a `registerTool({ name, entry, description, zodSchema, handler })`
call. `entry` is one of `router | gateway | skill | action`. The tool result is a
deterministic function of its arguments and is cached unless it errors.

### 2.3 Slash commands / agents

| Component           | File(s)                                                     | Responsibility                                                                                     |
| ------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Command definitions | `src/core/agents/commands/_definitions.js`                  | Maps a command name to `{ description, argumentHint, body }`                                       |
| Command names       | `src/core/agents/commands/_names.js`                        | Canonical order, `ROUTER_COMMAND`, `CHECK_COMMAND`, `FIX_COMMAND`                                  |
| Session bodies      | `src/core/agents/commands/_bodies-session.js`               | Bodies for `/rule-handoff`, `/rule-handon`, `/rule-init`, `/rule-compress`, `/rule-stats`, `/rule-usage` |
| Prompt defs         | `src/prompts/_defs.data.js`, `src/prompts/_task-prompts.js` | Prompt schemas and one-shot task prompt bodies                                                     |
| Agent renderers     | `src/core/agents/command-targets/*`, `src/cli/installers/*` | Writes command files into each agent's config                                                      |

A slash command is **prose the model follows**, not executable code. It tells the
model which MCP tool to call. Therefore every new command (`/rule-git`,
`/rule-handoff --close-feature`) is a new body plus a new MCP tool; the
confirmation gate lives in the tool's two-step contract (report -> confirm ->
apply), never in the body.

### 2.4 `/rule-init`

| Component    | File(s)                                                     | Responsibility                                                                                                   |
| ------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| CLI init     | `src/cli/_init.js`                                          | `initProject()`: central recorder dir under the state dir, migrate a legacy local dir, optional `tokensave init` |
| MCP tool     | `src/tools/actions/_init.js`                                | `rule_tool_init` wrapping `initProject`                                                                           |
| Command body | `src/core/agents/commands/_bodies-session.js` (`INIT_BODY`) | Prose the model follows                                                                                          |

Current `/rule-init` writes **nothing into the repository** and has no concept of
git governance. WS3 extends `initProject()` with an idempotent "git governance"
step and reports it in `renderInit`.

### 2.5 `/rule-handoff` and `/rule-handon`

| Component           | File(s)                                          | Responsibility                                                              |
| ------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| Handoff build       | `src/tools/handoff/_build.js`                    | Assembles the document from sections, degrades format to fit a token budget |
| Handoff git reads   | `src/tools/handoff/_git.js`                      | `getGitDiff` (working tree, staged, untracked), `getGitLog` (last 20)       |
| Handoff sources     | `src/tools/handoff/_sources.js`                  | ADRs, `.context` values, project identity                                   |
| Closeout / renumber | `src/tools/handoff/_closeout.js`, `_renumber.js` | Archives completed audits/reviews/plans as ADRs, repairs numbering          |
| Handoff MCP tool    | `src/tools/handoff/_register.js`                 | `rule_tool_handoff`                                                          |
| Handon verify       | `src/tools/handon/_verify.js`, `_verify-refs.js` | Verifies branch, commit range, files, ADRs against git                      |
| Handon git reads    | `src/tools/handon/_git.js`                       | `git(cwd, args)` (array args, no shell), `gitKnows`                         |
| Handon MCP tool     | `src/tools/handon/_register.js`                  | `rule_tool_handon`                                                           |

The handoff flow currently reads only the **working tree** and the recent log. It
never computes a feature commit range, a merge-base, or a base branch. WS1/WS5/WS6
add those primitives and use them.

### 2.6 ADRs

| Component        | File(s)                                   | Responsibility                                      |
| ---------------- | ----------------------------------------- | --------------------------------------------------- |
| ADR files        | `src/tools/adr/_files.js`                 | `docs/adr`, numbering, slug, filename, existing set |
| ADR body / index | `src/tools/adr/_body.js`, `_adr-index.js` | Nygard template, `docs/adr/ADR.md` index            |
| ADR MCP tool     | `src/tools/adr/_register.js`              | `rule_tool_process_adr` (English-gated)              |
| Auto-log hook    | `src/tools/adr/_auto-log.js`              | Optional automatic decision capture                 |

### 2.7 Git execution today (the duplication WS1 removes)

| File                                  | Responsibility                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/shared/_process.js`              | Generic shell-outs: `tryExec`, `tryExecResult`, `tryExecFile` (never throw)             |
| `src/tools/handon/_git.js`            | `git(cwd, args)` array-arg runner, `gitKnows`                                           |
| `src/core/docs-numbering/_git.js`     | `gitOut(cwd, args)` + `createdAt`, `addedBy`, and `_rewrite-commits.js` history rewrite |
| `src/tools/handoff/_git.js`           | working-tree diff and recent log                                                        |
| `src/core/self-update/_git.js`        | fetch / fast-forward for self-update                                                    |
| `scripts/install/git-hooks/index.mjs` | installs `.githooks/` shims into this clone's `.git/hooks/`                             |

Six independent git runners exist. WS1 creates one shared git module and
re-expresses these on top of it (or leaves the read-only callers as delegators).

### 2.8 Conventional Commit validation today

| File                                           | Responsibility                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `scripts/build/commit-types/index.mjs`         | **Single source of truth**: `COMMIT_TYPES`, `isSystemSubject`, `SUBJECT` pattern, `--lint-range` |
| `.githooks/commit-msg`                         | Shell hook with an **inlined duplicate** of the same regex + DCO sign-off                        |
| `.github/workflows/ci.yml` (`commit-lint` job) | Calls `commit-types --lint-range`                                                                |

The regex is duplicated between the JS module and the shell hook. WS3.4 requires
one implementation used by hook, pre-push, tool and CI.

### 2.9 Hooks / CI / release infrastructure (WS7, WS8, WS9 mostly exist)

| Component           | File(s)                                                                             | Responsibility                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Changelog generator | `scripts/build/changelog/index.mjs`, `_history.mjs`, `_render.mjs`, `_sections.mjs` | `CHANGELOG.md` derived from commits between tags                                                          |
| Version sync        | `scripts/build/version/index.mjs`, `_hashes.mjs`                                    | One version across `package.json`, `server.json`, newest `CHANGELOG.md` heading                           |
| Release workflow    | `.github/workflows/release.yml`                                                     | Tag -> version check -> audit gate -> pack -> checksum -> SBOM -> GitHub release from the changelog entry |
| CI workflow         | `.github/workflows/ci.yml`                                                          | lint, test matrix, coverage, DCO, license headers, commit-lint, audit                                     |
| Hooks               | `.githooks/commit-msg`, `pre-commit`, `pre-push`                                    | commit format + DCO, census regeneration, Prettier check                                                  |

WS7/WS8 are largely satisfied by these; WS9's job is to **extend, not
replace**, with a semantic-version determination that derives PATCH/MINOR/MAJOR
from the commit types (today the version is checked for sync, not derived).

### 2.10 Tests

| Component          | File(s)                                                                                          | Responsibility                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Suite definitions  | `scripts/ci/run-tests/_suites.data.mjs`                                                          | Suites by glob: `quick`, `skills`, `foundations`, `installer`, `all` |
| Runner             | `scripts/ci/run-tests/index.mjs`                                                                 | Serial steps, one `node --test` over globs, trailing shell checks    |
| Existing git tests | `src/tools/handon/__tests__/_verification-git.test.mjs`, `scripts/install/git-hooks/__tests__/*` | Style reference for git-backed tests (real temp repos)               |

New test files are picked up by the glob covering their directory; adding a test
requires no runner edit.

## 3. Reusable primitives

| Concern                  | Primitive to reuse                                | Location                                                   |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------------------- |
| Shell / git execution    | `tryExec`, `tryExecResult`, `tryExecFile`         | `src/shared/_process.js`                                   |
| Git arg-array runner     | `git(cwd, args)`                                  | `src/tools/handon/_git.js` (to be promoted)                |
| Tool registration        | `registerTool`                                    | `src/tools/router/_registry.js`                            |
| Per-call host seam       | `registerCallHost`                                | `src/tools/router/call/_host.js` (single slot - see gap 5) |
| Tool result shape        | `{ isError?, content: [{ type: 'text', text }] }` | convention everywhere                                      |
| Zod schemas              | `zod/v4`                                          | every `_schema.js`                                         |
| Conventional Commit rule | `COMMIT_TYPES`, `isSystemSubject`, `SUBJECT`      | `scripts/build/commit-types/index.mjs`                     |
| ADR authoring            | `rule_tool_process_adr` handler                    | `src/tools/adr/_register.js`                               |
| Token budget degrade     | `estimateTokens`, `buildHandoff`                  | `src/tools/handoff/_format.js`, `_build.js`                |
| Caching                  | `cacheLookup` / `cacheStore`                      | `src/core/cache/tool-cache/index.js`                       |

## 4. Gaps the plan must close (deterministic-first)

1. **No shared git foundation.** Six runners; none exposes branch state, merge-base, divergence, or a feature range. WS1 fills this.
2. **No feature commit range primitive.** `getFeatureCommitRange()` does not exist. WS1.3 creates it.
3. **No base-branch detection.** No configured base; `TRUNKS` in `src/tools/handon/_constants.js` is only used for handon branch verification. WS1.2 adds detection with explicit config first.
4. **No working-tree safety gate.** No check for in-progress merge/rebase/cherry-pick. WS1.4 adds it (precondition for every rewrite).
5. **Host seam is single-slot.** `registerCallHost` replaces the whole host object, so a second registrar would silently evict self-update. WS2 must extend the seam (list of hosts, or a dedicated guard port) rather than register a second host.
6. **Tool result caching is content-addressed.** A freshness check must not be cached: live git state is an input. WS2 must either bypass the cache or run the check outside the cached core (the banner path is not cached).
7. **No confirmation gate abstraction.** The only pattern is the two-step tool contract already used by the gateway (validate -> receipt -> apply). WS4/WS6 adopt the same shape: a read-only report, then an explicit confirm flag on a second call.
8. **Commit regex duplicated** between `scripts/build/commit-types/index.mjs` and `.githooks/commit-msg`. WS3.4 unifies.
9. **No `/rule-git` command, no feature-close mode.** WS4/WS6 add both.
10. **Semantic version not derived.** Version sync exists but the next version is chosen by hand. WS8 derives it.
11. **`/rule-init` has no git governance.** WS3 adds an idempotent step, preserving any existing hook mechanism (this repo uses `.githooks/`, not Husky).

## 5. Constraints carried into every later workstream

- `/rule-init` must stay idempotent: `missing -> install`, `incomplete -> integrate`, `correct -> preserve`.
- Destructive git operations (rebase, reword, squash, merge removal) require an explicit confirmation gate; `--force` only _enables the proposal_, never bypasses the gate.
- After any history rewrite: `git tree before == git tree after`.
- No LLM for facts git can determine.
- All source files carry the SPDX header; commit messages require `type(scope): subject`, DCO sign-off, and a scope.
- Dependency specifiers stay exact `x.y.z` (plan §20).

## 6. Next

WS1 - Shared Git Foundation: `src/core/git/` with repository state, base-branch
detection, `getFeatureCommitRange()`, and working-tree safety, reusing
`src/shared/_process.js` and `src/tools/handon/_git.js`.
