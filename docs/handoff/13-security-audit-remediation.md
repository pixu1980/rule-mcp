# Handoff - security/performance audit + remediation of all high-severity findings

- **Branch:** `feat/architect-context-pack` (not merged, never pushed)
- **Commits covered:** `92ff942..HEAD` - 8 commits from this session
- **Date:** 2026-08-04
- **Tree:** clean at handoff

## What this session delivered

A full-scope security and performance audit of the MCP server, then remediation of every high-severity finding.

- Report: `docs/reports/security-performance-audit-2026-08-04.md` (23 findings: 7 high, 16 medium)
- Web version: https://claude.ai/code/artifact/5f5a38d6-2eb6-41e8-b35d-8cc260aabec0
- ADRs: **030** (write authorization), **031** (interview servers), **032** (self-update trust + container), **033** (tool surface)

### Commits

| Commit    | What                                                                        |
| --------- | --------------------------------------------------------------------------- |
| `8898219` | `fix(security)` - write path + interview servers (findings 01-05)           |
| `c9f3202` | `docs(audit)` - audit report + ADR 030/031                                  |
| `3d041d9` | `fix(security)` - self-update remote pinning + container hardening (06, 07) |
| `1cb8547` | `fix(skills)` - tool surface is `./skills` and nothing else                 |
| `8c5560d` | `fix(self-update)` - no phantom update when the branch is ahead             |
| `a5d2792` | `fix(self-update)` - audit log only when HEAD actually moved                |

### Fixes by finding

- **01** `src/tools/apply.js` - `resolveProjectRoot()` refuses the filesystem root, home and system directories; `resolveWriteTarget()` refuses absolute paths, `..`, NUL, protected destinations (`.git`, `.ssh`, `.gnupg`, `.claude`, `.agents`, `node_modules`, shell rc files, key material) and symlink escapes proven by `realpath` on the deepest existing ancestor. The old guard was anchored to the caller's own `path` argument, so `path: "/"` made every destination "inside the project".
- **02** `src/tools/gateway.js` - path-bound receipts over `canonicalFilesDigest()` (length-prefixed path and content, order- and count-sensitive). The old digest joined contents with an in-band `---FILE---` separator, covered no paths, and let two different file shapes collide. Bindings are not interchangeable.
- **03** new `skills/rule-architect/http-guard.mjs` - `Sec-Fetch-Site` + `Origin` + `Host` enforced on every `/api/*` request in **both** interview servers. A cross-origin `text/plain` POST is a CORS simple request, so loopback binding and absent CORS headers did not stop the write.
- **04** `src/tools/architect.js` - child registry keyed by target dir: reuse instead of duplicate, listeners detached, output capped at 64 KB, killed after 30 min and on exit/SIGINT/SIGTERM, `process.execPath` instead of a PATH lookup.
- **05** `rule_tool_architect` added to `NON_CACHEABLE` - a replayed result handed the user a dead ephemeral port and skipped the spawn.
- **06** `src/core/self-update.js` - the remote is verified **before any fetch**: `normalizeRemoteUrl()` compares host+path (this repo's remote is scp-style SSH, `server.json` declares HTTPS), `resolveAllowedRemotes()` trusts only that declaration unless `RULE_MCP_UPDATE_REMOTE` replaces it. `RULE_MCP_UPDATE_REQUIRE_SIGNATURE=1` adds `git verify-commit`.
- **07** `docker-compose.yml` publishes `127.0.0.1:37999:37999`; `Dockerfile` drops to `USER node` before `CMD`, installs with `--ignore-scripts`, sets `RULE_MCP_DOCKER=1`.
- **Extra - tool surface** `src/tools/router.js` - `getSkillNames()` scans only `./skills` and accepts only `rule-*` names; `readSkill()` no longer reads the home directory (no shadowing); the `plugin.js` import from `~/.agents/skills` is gone.
- **Extra - phantom update** `git merge --ff-only <ancestor>` exits 0 without moving HEAD, which happens on every check while the branch is ahead. An unmoved HEAD is no longer reported as an update.

## Measured numbers

|                        | before                       | after                            |
| ---------------------- | ---------------------------- | -------------------------------- |
| tools exposed          | 176                          | **88**                           |
| `rule_tool_pix_*` tools | 79                           | **0**                            |
| `tools/list` payload   | 216,102 B (~54k tokens/turn) | **105,190 B (~26k tokens/turn)** |
| minimal mode           | -                            | 10 tools, 7,106 B (~1.8k tokens) |

Measured with the 79 stale `rule*` directories still on disk, so the reduction is a property of the code, not of the machine. `~/.agents/skills` was then cleaned from 88 directories to 9 (79 `rule*` removed at the user's request; list in the session scratchpad).

## Open items

1. **`pnpm run ci` is RED on a pre-existing failure.** `test/docs-architect.test.mjs` allows ≤6 `.md` files in `docs/`; the repo has 8 (`README.md`, `agent-instructions.md`, both tracked before this branch). It aborts the chain, so nothing downstream runs. Decide: delete `docs/agent-instructions.md` (41 lines, near-duplicate of `05-agent-instructions.md`) or raise the cap.
2. **`pnpm skills:install`** copies skills into `~/.agents/skills`, which the server now ignores - a no-op with a success message. Remove or repurpose.
3. **ADR index has duplicate numbers** (two 012/011/010, three 009, and more). The generator does not check for collisions.
4. **Findings 08-23 open.** Highest value next: 08 (minimal-tools as default + memoise `listTools()`), 09 (cache namespace ignores `SKILL.md` edits → stale replay), 19 (duplicated MANDATORY blocks in `~/.claude/CLAUDE.md`).
5. **Stated residuals.** 03: no one-time token (needs UI changes in both `interview.js` copies) and `force` is still on the wire. 05: no registration-time assertion against caching a spawning tool. 06: auto-apply stays forced, so a compromised upstream is mitigated only by enabling signature verification. 07: base image still a tag - no Docker available to resolve a digest, and inventing one would be worse.

## Verification traps - read before trusting a green run

- **`pnpm ci` does NOT run the `ci` script.** pnpm treats `ci` as a builtin clean install: it deletes `node_modules`, reinstalls, exits 0. Always `pnpm run ci`.
- **`rule_tool_check` reports false positives** on this repo's own committed source (verified on `src/transport/sse-auth.js`: 5 guardrails red, including `jsdoc-required` on a function that has a JSDoc block). The honest bar is parity with the baseline on untouched files, plus `pnpm lint` (0 errors, 43 warnings, limit 50).
- **Git sandboxes in tests:** `git add -A` commits the `.tokensave/tokensave.db` a local indexer drops into fresh repositories; the file then mutates, the tree reads dirty, and the self-update tests bail out on `dirty-tree` proving nothing. Stage explicit paths.
- **The running MCP server still holds the old code.** Self-update fast-forwards from the remote and does not load local commits - restart the server for these fixes to take effect.

## Commit convention (mandatory)

`type(scope): subject` - the scope is required, the `commit-msg` hook rejects messages without one. Atomic commits, one concern each; pending decision documents in a separate `docs(...)` commit; the generated handoff in its own `chore(handoff): ...` commit. Never push without an explicit request.

## Quick verification

```bash
pnpm lint
node --test test/skill-surface-embedded-only.test.mjs
node --test test/apply-containment.test.mjs test/gateway-receipt-paths.test.mjs
node --test test/architect-server-csrf.test.mjs test/architect-interview-lifecycle.test.mjs
node --test test/docker-hardening.test.mjs test/self-update-remote-pin.test.mjs
node test/self-update.test.mjs && node test/self-update-throttle.test.mjs
```
