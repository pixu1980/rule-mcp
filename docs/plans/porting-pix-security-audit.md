# Execution Plan - Porting rule-mcp → rule-mcp

- **Source:** `~/Projects/work/rule/ai/rule-mcp` - branch `feat/architect-context-pack` (8 commits, not pushed, tree clean)
- **Target:** `~/Projects/pixu1980/rule-mcp` - branch `main`
- **Date:** 2026-08-04
- **Status:** pending approval

## Decisions approved from the interview

| Decision                             | Choice                                                                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Scope                                | **Full parity** - security + architecture + docs + test + unicorn autofix                                                   |
| Branding                             | **Rename rule→rule during porting** (env `RULE_MCP_*`→`RULE_MCP_*`, `pix_*`→`pix_*`, `rule-*`→`rule-*`) |
| Conflicts                            | **Selective 3-way merge** - preserve existing rule changes in target (e.g. `46b5af9` unify rule-* commands)                   |
| Registry agent commands              | Yes, complete (registry + CLI install/sync/diagnose + prompt suppression)                                                   |
| Tool surface                         | Yes - only `./skills`, no shadowing from `~/.agents/skills`                                                                 |
| Self-update hardening                | Yes, all (remote pinning, signature verification, fix phantom update)                                                       |
| Container hardening                  | Yes (USER node, `--ignore-scripts`, bind 127.0.0.1)                                                                         |
| apply.js + gateway.js                | Yes, both (finding 01 and 02)                                                                                               |
| Architect interview servers          | Yes, all (http-guard + lifecycle registry, finding 03 and 04)                                                               |
| Cache NON_CACHEABLE + phantom update | Yes, both (finding 05)                                                                                                      |
| Test                                 | Yes, port the 11 new tests + wire to `test:all` / `ci` / `test:installer`                                                   |
| Docs & ADR                           | Yes, ADR 029-034 + handoff 13 + audit report + CHANGELOG                                                                    |
| Open items handoff                   | Yes, resolve them during porting                                                                                            |
| Commit                               | **Atomic conventional commits with scope** (`type(scope): subject`), respecting the target's `commit-msg` hook              |

## Cross-cutting conventions

- **Automatic rename rule→rule:** env vars (`RULE_MCP_*`→`RULE_MCP_*`, `RULE_MCP_*`→`RULE_MCP_*`), tool prefix (`pix_`→`pix_`), commands (`/rule-*`→`/rule-*`), skill folders (`rule-architect`→`rule-architect`), bin, messages and test.
- **3-way merge:** for each divergent file → diff source vs target, apply the source's new logic **on top** of the target's rule logic, never blindly overwrite.
- **Self-update remote pinning:** the source verifies the remote against the declaration in `server.json`; in the target the declared remote is `https://github.com/rule/rule-mcp` (github, not gitlab) → adapt.
- **Verification per phase:** after each phase `pnpm lint` + targeted phase tests; full `pnpm run ci` only at the end (note: `pnpm ci` is a pnpm builtin, not the script - always use `pnpm run ci`).
- **Before touching:** green baseline on target (run current `pnpm run ci` and record the result) and dedicated working branch.

---

## Phase 0 - Baseline and setup

- [ ] Verify target has a clean working tree (`git status`)
- [ ] Record baseline: `pnpm run ci` and `pnpm lint` on target **before** any modification (honest parity for untouched files)
- [ ] Create working branch: `feat/port-security-audit`
- [ ] Snapshot divergent files source↔target (`diff -rq src`) for reference

## Phase 1 - Core security: write containment + receipts (finding 01, 02)

- [ ] `src/tools/apply.js` - port `resolveProjectRoot()` (reject FS root, home, system dirs) and `resolveWriteTarget()` (reject absolute paths, `..`, NUL, protected targets `.git/.ssh/.gnupg/.claude/.agents/node_modules`, symlink escape via `realpath`) - 3-way merge on existing rule version
- [ ] `src/tools/gateway.js` - port path-bound receipts on `canonicalFilesDigest()` (path+content length-prefixed, order/count-sensitive)
- [ ] Test: `test/apply-containment.test.mjs`, `test/gateway-receipt-paths.test.mjs` (rename rule)
- [ ] Verify: `node --test test/apply-containment.test.mjs test/gateway-receipt-paths.test.mjs`
- [ ] Commit: `fix(security): bind writes to destinations and receipts to paths`

## Phase 2 - Architect interview servers (finding 03, 04, 05)

- [ ] `skills/rule-architect/http-guard.mjs` - new file: guard `Sec-Fetch-Site` + `Origin` + `Host` on every `/api/*` of **both** interview servers
- [ ] `skills/rule-architect-web/server.mjs` and `skills/rule-architect/assets/context-server.mjs` - import + apply the guard
- [ ] `src/tools/architect.js` - child registry keyed by target dir (reuse, listener detached, output cap 64 KB, kill after 30 min and on exit/SIGINT/SIGTERM, `process.execPath`)
- [ ] `src/core/tool-cache.js` - add `pix_architect` to `NON_CACHEABLE`
- [ ] Test: `test/architect-server-csrf.test.mjs`, `test/architect-interview-lifecycle.test.mjs`
- [ ] Verify: `node --test test/architect-server-csrf.test.mjs test/architect-interview-lifecycle.test.mjs`
- [ ] Commit: `fix(security): enforce same-origin on interview servers and own their lifecycle`

## Phase 3 - Self-update hardening (finding 06 + phantom update)

- [ ] `src/core/self-update.js` - `normalizeRemoteUrl()` (host+path compare; remote scp-style vs `server.json` declaration), `resolveAllowedRemotes()`, env `RULE_MCP_UPDATE_REMOTE`, `RULE_MCP_UPDATE_REQUIRE_SIGNATURE` (`git verify-commit`)
- [ ] Fix phantom update: `git merge --ff-only` with unmoved HEAD is not an update; audit log only when HEAD actually moves
- [ ] `src/tools/update.js` - related modification (3 lines from source)
- [ ] Test: `test/self-update-remote-pin.test.mjs` (+ tweaks to `test/self-update.test.mjs`, `test/self-update-throttle.test.mjs`)
- [ ] Verify: `node test/self-update.test.mjs && node test/self-update-throttle.test.mjs && node --test test/self-update-remote-pin.test.mjs`
- [ ] Commit: `fix(security): pin the self-update remote and stop reporting phantom updates`

## Phase 4 - Tool surface: only `./skills` (extra audit)

- [ ] `src/core/skills.js` - `getSkillNames()` scans only `./skills`, accepts only `rule-*` names; `readSkill()` no longer reads from home (no shadowing)
- [ ] `src/tools/router.js` - remove `plugin.js` import from `~/.agents/skills`
- [ ] `src/resources/index.js` - adjustment (5 lines)
- [ ] Test: `test/skill-surface-embedded-only.test.mjs`, tweak `test/minimal-tools.test.mjs`
- [ ] Verify: `node --test test/skill-surface-embedded-only.test.mjs test/minimal-tools.test.mjs`
- [ ] Commit: `fix(skills): the tool surface is ./skills and nothing else`

## Phase 5 - Agent commands registry (ADR 034)

- [ ] `src/core/agent-command-targets.js` - **new file** (309 lines): registry of `/rule-*` targets
- [ ] `src/core/agent-commands.js` - evolution: registry-driven, prompt suppression, handoff persisted and committed as `chore(handoff)`
- [ ] `src/cli/commands.js` (+67 lines), `src/cli/doctor.js` (+46), `src/cli/install.js` (refactor 72), `src/index.js` (+4) - `install/sync/diagnose` commands from the registry
- [ ] `scripts/install-agent-commands.sh` (registry-driven refactor), `scripts/uninstall.sh` (+46)
- [ ] 3-way merge with existing rule work in target (`46b5af9` unify rule-* commands, `agent-integrations.js`)
- [ ] Test: `test/agent-command-targets.test.mjs`, `test/agent-commands-generator.test.mjs`, `test/prompt-suppression.test.mjs`, `test/vscode-clean-commands.test.mjs`, `test/agent-commands-install.test.mjs`, `test/install-agent-commands.test.mjs`
- [ ] Verify: `node --test test/agent-command-targets.test.mjs test/agent-commands-generator.test.mjs test/prompt-suppression.test.mjs test/vscode-clean-commands.test.mjs` + installer test
- [ ] Commit: `feat(commands): registry-driven clean /rule-* command targets` + `chore(scripts): drive command install/removal off the registry`

## Phase 6 - Container hardening (finding 07)

- [ ] `Dockerfile` - `USER node` before `CMD`, install with `--ignore-scripts`, env `RULE_MCP_DOCKER=1` (rename from source)
- [ ] `docker-compose.yml` - publish `127.0.0.1:37999:37999` (merge with existing rule compose)
- [ ] Test: `test/docker-hardening.test.mjs`
- [ ] Verify: `node --test test/docker-hardening.test.mjs`
- [ ] Commit: `fix(security): drop root in the container and bind to loopback`

## Phase 7 - ESLint unicorn autofix repo-wide (full parity)

- [ ] Verify the target's eslint config (`eslint.config.mjs`, already ESLint 10 flat + unicorn) is aligned with the source's
- [ ] Apply unicorn fix (equivalents of commit `92ff942`) on src/test/scripts - clean diffs, without touching logic
- [ ] Verify: `pnpm lint` (0 errors, warnings ≤ limit)
- [ ] Commit: `chore(repo): apply ESLint unicorn autofix`

## Phase 8 - Test wiring

- [ ] `package.json` - update `test:installer`, `test:all`, `ci` with new tests (merge with existing rule scripts, keeping rule bin names)
- [ ] Verify: full `pnpm run ci`
- [ ] Commit: `chore(scripts): wire security regression tests into ci`

## Phase 9 - Docs & ADR

- [ ] ADR **029** clean commands / **030** write authorization / **031** interview servers / **032** self-update remote / **033** tool surface / **034** registry-driven commands - port with numbering consistent with target's index (verify target doesn't already have a different 029)
- [ ] `docs/reports/security-performance-audit-2026-08-04.md` (283 lines, rename rule)
- [ ] `docs/handoff/13-security-audit-remediation.md` (adapted to target)
- [ ] `docs/02-tools-operations.md`, `docs/05-agent-instructions.md`, `docs/06-env-variables.md` (rename + new env vars)
- [ ] `CHANGELOG.md` - entry for ported fixes
- [ ] Commit: `docs(adr): record decisions 029-034 and the security audit` + `docs(project): update tooling and command docs` + `docs(handoff): add handoff 13`

## Phase 10 - Handoff open items

- [ ] **docs-architect cap:** `test/docs-architect.test.mjs` allows ≤6 `.md` in `docs/` but the repo has 8 → raise the cap (or remove `docs/agent-instructions.md` if still duplicated)
- [ ] **`pnpm skills:install` no-op:** the script copies to `~/.agents/skills` which the server now ignores → remove or reorient, update related tests
- [ ] **ADR index with duplicate numbers:** the generator doesn't check collisions → deduplicate the target's index
- [ ] Verify: `pnpm run ci` fully green
- [ ] Commit: `fix(docs): raise docs cap and dedupe the ADR index` + `chore(scripts): drop no-op skills:install`

## Phase 11 - Final verification and delivery

- [ ] `pnpm lint` clean
- [ ] `pnpm run ci` green (parity with baseline on untouched files)
- [ ] Final source↔target diff to confirm no fixes left unported
- [ ] Restart/verify dev server (`pnpm dev` on first free port 3000-6000)
- [ ] CHANGELOG summary of the porting

---

## Risks and notes

- **Real divergence:** the target has its own commits (e.g. `46b5af9`, `021c0f6`, `2153697`) - 3-way merge is mandatory, never blind copy.
- **Self-update remote:** the source declares gitlab (scp-style), the target github → the `normalizeRemoteUrl` logic must be tested with the target's actual remote.
- **`pnpm run ci` baseline:** the handoff reports that the source's `ci` is RED on a pre-existing test; verify target baseline at the start (Phase 0) to avoid attributing pre-existing failures to the porting.
- **Git sandbox in tests:** in tests that create git repos, do `git add` of explicit paths, never `git add -A` (the `.tokensave` db dirties the tree).
- **Commit-msg hook:** every commit MUST have a scope (`type(scope): subject`); generated merge messages are exempt.
